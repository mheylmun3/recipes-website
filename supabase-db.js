function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeIngredientName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function cleanIngredientName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}

function isDuplicateIngredientError(error) {
  return error?.code === "23505";
}

function formatIngredientText(name, quantity, unit) {
  if (quantity == null || Number.isNaN(quantity)) {
    return name;
  }

  if (!unit) {
    return `${quantity} ${name}`;
  }

  return `${quantity} ${unit} ${name}`;
}

async function requireSignedInUser() {
  const { data, error } =
    await supabaseClient.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error(
      "You must be signed in to make changes."
    );
  }

  return data.user;
}

/* =========================================================
   INGREDIENT CATEGORIES
========================================================= */

async function fetchIngredientCategoriesFromSupabase() {
  const { data, error } = await supabaseClient
    .from("ingredient_categories")
    .select(`
      id,
      name,
      slug,
      sort_order,
      created_at,
      updated_at
    `)
    .order("sort_order", {
      ascending: true
    });

  if (error) {
    throw error;
  }

  return data || [];
}

async function findIngredientCategoryBySlugFromSupabase(
  slug
) {
  const { data, error } = await supabaseClient
    .from("ingredient_categories")
    .select(`
      id,
      name,
      slug,
      sort_order
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function getDefaultIngredientCategoryId() {
  const category =
    await findIngredientCategoryBySlugFromSupabase(
      "household-other"
    );

  if (!category) {
    throw new Error(
      'Default ingredient category "Household & Other" was not found.'
    );
  }

  return category.id;
}

/* =========================================================
   RECIPES
========================================================= */

async function fetchAllRecipesFromSupabase() {
  const { data: recipes, error } =
    await supabaseClient
      .from("recipes")
      .select(`
        id,
        slug,
        name,
        category,
        servings,
        calories,
        protein,
        fiber,
        instructions,
        image_path,
        recipe_ingredients (
          sort_order,
          quantity,
          unit,
          display_text,
          ingredients (
            id,
            slug,
            name,
            default_unit,
            category_id,
            ingredient_categories (
              id,
              name,
              slug,
              sort_order
            )
          )
        )
      `)
      .eq("is_deleted", false)
      .order("name", {
        ascending: true
      });

  if (error) {
    throw error;
  }

  return (recipes || []).map(
    mapRecipeRowToFrontend
  );
}

async function fetchRecipeBySlugFromSupabase(
  slug
) {
  const { data, error } = await supabaseClient
    .from("recipes")
    .select(`
      id,
      slug,
      name,
      category,
      servings,
      calories,
      protein,
      fiber,
      instructions,
      image_path,
      recipe_ingredients (
        sort_order,
        quantity,
        unit,
        display_text,
        ingredients (
          id,
          slug,
          name,
          default_unit,
          category_id,
          ingredient_categories (
            id,
            name,
            slug,
            sort_order
          )
        )
      )
    `)
    .eq("slug", slug)
    .eq("is_deleted", false)
    .single();

  if (error) {
    throw error;
  }

  return mapRecipeRowToFrontend(data);
}

function mapRecipeRowToFrontend(row) {
  const ingredients =
    (row.recipe_ingredients || [])
      .slice()
      .sort(
        (a, b) =>
          (a.sort_order ?? 0) -
          (b.sort_order ?? 0)
      )
      .map(item => {
        const ingredient =
          item.ingredients || {};

        const category =
          ingredient.ingredient_categories ||
          null;

        return {
          ingredientId:
            ingredient.slug || "",

          ingredientUuid:
            ingredient.id || "",

          name:
            ingredient.name || "",

          quantity:
            item.quantity,

          unit:
            item.unit ||
            ingredient.default_unit ||
            "",

          defaultUnit:
            ingredient.default_unit ||
            "",

          categoryId:
            ingredient.category_id ||
            category?.id ||
            "",

          category: category
            ? {
                id: category.id,
                name: category.name,
                slug: category.slug,
                sortOrder:
                  category.sort_order
              }
            : null,

          text:
            item.display_text ||
            formatIngredientText(
              ingredient.name || "",
              item.quantity,
              item.unit ||
                ingredient.default_unit ||
                ""
            )
        };
      });

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    servings: row.servings,
    calories: row.calories ?? null,
    protein: row.protein ?? null,
    fiber: row.fiber ?? null,
    instructions: row.instructions,
    image: row.image_path || "",
    ingredients
  };
}

async function getOrCreateIngredient(
  nameOrSlug,
  defaultUnit = "count",
  categoryId = null
) {
  const cleanedName =
    cleanIngredientName(nameOrSlug);

  const existing =
    await findIngredientByNameFromSupabase(
      cleanedName
    );

  if (existing?.is_active) {
    return existing;
  }

  return createIngredientInSupabase({
    name: cleanedName,
    defaultUnit,
    categoryId
  });
}

async function createRecipeInSupabase(recipe) {
  await requireSignedInUser();

  const {
    ingredients,
    image,
    ...recipeCore
  } = recipe;

  const {
    data: insertedRecipe,
    error: recipeError
  } = await supabaseClient
    .from("recipes")
    .insert({
      slug: recipeCore.slug,
      name: recipeCore.name,
      category: recipeCore.category,
      servings: recipeCore.servings,
      calories:
        recipeCore.calories ?? null,
      protein:
        recipeCore.protein ?? null,
      fiber:
        recipeCore.fiber ?? null,
      instructions:
        recipeCore.instructions,
      image_path:
        image || null
    })
    .select("id")
    .single();

  if (recipeError) {
    throw recipeError;
  }

  const recipeIngredientsRows = [];

  for (
    let i = 0;
    i < ingredients.length;
    i += 1
  ) {
    const item = ingredients[i];

    let ingredientRecord = null;

    if (item.ingredientId) {
      const { data, error } =
        await supabaseClient
          .from("ingredients")
          .select(`
            id,
            slug,
            name,
            default_unit,
            category_id,
            is_active
          `)
          .eq(
            "slug",
            item.ingredientId
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      ingredientRecord = data;
    }

    if (!ingredientRecord) {
      ingredientRecord =
        await getOrCreateIngredient(
          item.name,
          item.unit || "count",
          item.categoryId || null
        );
    }

    const finalUnit =
      item.unit ||
      ingredientRecord.default_unit ||
      null;

    recipeIngredientsRows.push({
      recipe_id:
        insertedRecipe.id,

      ingredient_id:
        ingredientRecord.id,

      quantity:
        item.quantity ?? null,

      unit:
        finalUnit,

      sort_order:
        i,

      display_text:
        item.text ||
        item.displayText ||
        formatIngredientText(
          item.name,
          item.quantity,
          finalUnit
        )
    });
  }

  if (recipeIngredientsRows.length) {
    const {
      error: ingredientError
    } = await supabaseClient
      .from("recipe_ingredients")
      .insert(recipeIngredientsRows);

    if (ingredientError) {
      throw ingredientError;
    }
  }

  return fetchRecipeBySlugFromSupabase(
    recipe.slug
  );
}

async function updateRecipeInSupabase(recipe) {
  await requireSignedInUser();

  const {
    ingredients,
    image,
    ...recipeCore
  } = recipe;

  const {
    data: recipeRow,
    error: recipeLookupError
  } = await supabaseClient
    .from("recipes")
    .select("id")
    .eq("slug", recipe.slug)
    .single();

  if (recipeLookupError) {
    throw recipeLookupError;
  }

  const {
    error: recipeUpdateError
  } = await supabaseClient
    .from("recipes")
    .update({
      name: recipeCore.name,
      category: recipeCore.category,
      servings: recipeCore.servings,
      calories:
        recipeCore.calories ?? null,
      protein:
        recipeCore.protein ?? null,
      fiber:
        recipeCore.fiber ?? null,
      instructions:
        recipeCore.instructions,
      image_path:
        image || null,
      updated_at:
        new Date().toISOString()
    })
    .eq("id", recipeRow.id);

  if (recipeUpdateError) {
    throw recipeUpdateError;
  }

  const {
    error: deleteIngredientsError
  } = await supabaseClient
    .from("recipe_ingredients")
    .delete()
    .eq(
      "recipe_id",
      recipeRow.id
    );

  if (deleteIngredientsError) {
    throw deleteIngredientsError;
  }

  const recipeIngredientsRows = [];

  for (
    let i = 0;
    i < ingredients.length;
    i += 1
  ) {
    const item = ingredients[i];

    let ingredientRecord = null;

    if (item.ingredientId) {
      const { data, error } =
        await supabaseClient
          .from("ingredients")
          .select(`
            id,
            slug,
            name,
            default_unit,
            category_id,
            is_active
          `)
          .eq(
            "slug",
            item.ingredientId
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      ingredientRecord = data;
    }

    if (!ingredientRecord) {
      ingredientRecord =
        await getOrCreateIngredient(
          item.name,
          item.unit || "count",
          item.categoryId || null
        );
    }

    const finalUnit =
      item.unit ||
      ingredientRecord.default_unit ||
      null;

    recipeIngredientsRows.push({
      recipe_id:
        recipeRow.id,

      ingredient_id:
        ingredientRecord.id,

      quantity:
        item.quantity ?? null,

      unit:
        finalUnit,

      sort_order:
        i,

      display_text:
        item.text ||
        item.displayText ||
        formatIngredientText(
          item.name,
          item.quantity,
          finalUnit
        )
    });
  }

  if (recipeIngredientsRows.length) {
    const {
      error: insertIngredientsError
    } = await supabaseClient
      .from("recipe_ingredients")
      .insert(recipeIngredientsRows);

    if (insertIngredientsError) {
      throw insertIngredientsError;
    }
  }

  return fetchRecipeBySlugFromSupabase(
    recipe.slug
  );
}

async function softDeleteRecipeInSupabase(
  slug
) {
  await requireSignedInUser();

  const { error } = await supabaseClient
    .from("recipes")
    .update({
      is_deleted: true,
      updated_at:
        new Date().toISOString()
    })
    .eq("slug", slug);

  if (error) {
    throw error;
  }
}

/* =========================================================
   INVENTORY
========================================================= */

async function fetchInventoryFromSupabase() {
  const { data, error } = await supabaseClient
    .from("inventory_items")
    .select(`
      id,
      quantity,
      unit,
      ingredients (
        id,
        slug,
        name,
        default_unit,
        category_id,
        ingredient_categories (
          id,
          name,
          slug,
          sort_order
        )
      )
    `)
    .order("updated_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  return (data || []).map(row => {
    const ingredient =
      row.ingredients || {};

    const category =
      ingredient.ingredient_categories ||
      null;

    return {
      rowId:
        row.id,

      id:
        ingredient.slug || "",

      ingredientUuid:
        ingredient.id || "",

      name:
        ingredient.name || "",

      quantity:
        row.quantity,

      unit:
        row.unit ||
        ingredient.default_unit ||
        "",

      categoryId:
        ingredient.category_id ||
        category?.id ||
        "",

      category: category
        ? {
            id: category.id,
            name: category.name,
            slug: category.slug,
            sortOrder:
              category.sort_order
          }
        : null
    };
  });
}

async function upsertInventoryItemInSupabase({
  ingredientSlug,
  ingredientName,
  quantity,
  unit
}) {
  await requireSignedInUser();

  let ingredientRecord = null;

  if (ingredientSlug) {
    const { data, error } =
      await supabaseClient
        .from("ingredients")
        .select(`
          id,
          slug,
          name,
          default_unit,
          category_id
        `)
        .eq(
          "slug",
          ingredientSlug
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    ingredientRecord = data;
  }

  if (!ingredientRecord) {
    ingredientRecord =
      await getOrCreateIngredient(
        ingredientName ||
          ingredientSlug,
        unit || "count"
      );
  }

  const finalUnit =
    ingredientRecord.default_unit ||
    unit ||
    "count";

  const {
    data: existing,
    error: fetchError
  } = await supabaseClient
    .from("inventory_items")
    .select(`
      id,
      quantity,
      unit
    `)
    .eq(
      "ingredient_id",
      ingredientRecord.id
    )
    .eq("unit", finalUnit)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing) {
    const newQuantity =
      Number(existing.quantity) +
      Number(quantity);

    if (newQuantity <= 0) {
      const {
        error: deleteError
      } = await supabaseClient
        .from("inventory_items")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        throw deleteError;
      }

      return {
        removed: true
      };
    }

    const {
      error: updateError
    } = await supabaseClient
      .from("inventory_items")
      .update({
        quantity:
          newQuantity,
        updated_at:
          new Date().toISOString()
      })
      .eq("id", existing.id);

    if (updateError) {
      throw updateError;
    }

    return {
      removed: false
    };
  }

  if (Number(quantity) < 0) {
    throw new Error(
      "You cannot subtract an ingredient that is not currently in inventory."
    );
  }

  const {
    error: insertError
  } = await supabaseClient
    .from("inventory_items")
    .insert({
      ingredient_id:
        ingredientRecord.id,
      quantity:
        Number(quantity),
      unit:
        finalUnit
    });

  if (insertError) {
    throw insertError;
  }

  return {
    removed: false
  };
}

async function deleteInventoryItemFromSupabase(
  rowId
) {
  await requireSignedInUser();

  const { error } = await supabaseClient
    .from("inventory_items")
    .delete()
    .eq("id", rowId);

  if (error) {
    throw error;
  }
}

/* =========================================================
   MEAL PLAN
========================================================= */

async function fetchMealPlanFromSupabase() {
  const { data, error } = await supabaseClient
    .from("meal_plan_items")
    .select(`
      id,
      count,
      recipes (
        id,
        slug,
        name,
        category,
        servings,
        calories,
        protein,
        fiber,
        instructions,
        image_path,
        recipe_ingredients (
          sort_order,
          quantity,
          unit,
          display_text,
          ingredients (
            id,
            slug,
            name,
            default_unit,
            category_id,
            ingredient_categories (
              id,
              name,
              slug,
              sort_order
            )
          )
        )
      )
    `)
    .order("created_at", {
      ascending: true
    });

  if (error) {
    throw error;
  }

  return (data || []).map(row => ({
    id:
      row.id,

    slug:
      row.recipes?.slug || "",

    count:
      row.count || 1,

    recipe:
      row.recipes
        ? mapRecipeRowToFrontend(
            row.recipes
          )
        : null
  }));
}

async function upsertMealPlanItemInSupabase(
  recipeSlug,
  countToAdd = 1
) {
  await requireSignedInUser();

  const {
    data: recipeRow,
    error: recipeError
  } = await supabaseClient
    .from("recipes")
    .select(`
      id,
      slug
    `)
    .eq("slug", recipeSlug)
    .single();

  if (recipeError) {
    throw recipeError;
  }

  const {
    data: existing,
    error: existingError
  } = await supabaseClient
    .from("meal_plan_items")
    .select(`
      id,
      count
    `)
    .eq(
      "recipe_id",
      recipeRow.id
    )
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    const {
      error: updateError
    } = await supabaseClient
      .from("meal_plan_items")
      .update({
        count:
          (existing.count || 1) +
          countToAdd
      })
      .eq("id", existing.id);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const {
    error: insertError
  } = await supabaseClient
    .from("meal_plan_items")
    .insert({
      recipe_id:
        recipeRow.id,
      count:
        countToAdd
    });

  if (insertError) {
    throw insertError;
  }
}

async function updateMealPlanItemCountInSupabase(
  itemId,
  newCount
) {
  await requireSignedInUser();

  if (newCount <= 0) {
    const {
      error: deleteError
    } = await supabaseClient
      .from("meal_plan_items")
      .delete()
      .eq("id", itemId);

    if (deleteError) {
      throw deleteError;
    }

    return;
  }

  const { error } = await supabaseClient
    .from("meal_plan_items")
    .update({
      count: newCount
    })
    .eq("id", itemId);

  if (error) {
    throw error;
  }
}

async function deleteMealPlanItemFromSupabase(
  itemId
) {
  await requireSignedInUser();

  const { error } = await supabaseClient
    .from("meal_plan_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw error;
  }
}

/* =========================================================
   GROCERY LIST
========================================================= */

async function fetchGroceryListFromSupabase() {
  const { data, error } = await supabaseClient
    .from("grocery_list_items")
    .select(`
      id,
      quantity_needed,
      quantity_in_inventory,
      quantity_to_buy,
      unit,
      source,
      checked,
      ingredients (
        id,
        slug,
        name,
        default_unit,
        category_id,
        ingredient_categories (
          id,
          name,
          slug,
          sort_order
        )
      )
    `)
    .order("created_at", {
      ascending: true
    });

  if (error) {
    throw error;
  }

  return (data || []).map(row => {
    const ingredient =
      row.ingredients || {};

    const category =
      ingredient.ingredient_categories ||
      null;

    return {
      rowId:
        row.id,

      ingredientId:
        ingredient.slug || "",

      ingredientUuid:
        ingredient.id || "",

      name:
        ingredient.name || "",

      quantityNeeded:
        row.quantity_needed,

      quantityInInventory:
        row.quantity_in_inventory,

      quantityToBuy:
        row.quantity_to_buy,

      unit:
        row.unit ||
        ingredient.default_unit ||
        "",

      source:
        row.source,

      checked:
        row.checked,

      categoryId:
        ingredient.category_id ||
        category?.id ||
        "",

      category: category
        ? {
            id: category.id,
            name: category.name,
            slug: category.slug,
            sortOrder:
              category.sort_order
          }
        : null
    };
  });
}

async function upsertManualGroceryItemInSupabase({
  ingredientSlug,
  ingredientName,
  quantity,
  unit
}) {
  await requireSignedInUser();

  let ingredientRecord = null;

  if (ingredientSlug) {
    const { data, error } =
      await supabaseClient
        .from("ingredients")
        .select(`
          id,
          slug,
          name,
          default_unit,
          category_id
        `)
        .eq(
          "slug",
          ingredientSlug
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    ingredientRecord = data;
  }

  if (!ingredientRecord) {
    ingredientRecord =
      await getOrCreateIngredient(
        ingredientName ||
          ingredientSlug,
        unit || "count"
      );
  }

  const finalUnit =
    ingredientRecord.default_unit ||
    unit ||
    "count";

  const {
    data: existing,
    error: existingError
  } = await supabaseClient
    .from("grocery_list_items")
    .select(`
      id,
      quantity_to_buy,
      quantity_needed
    `)
    .eq(
      "ingredient_id",
      ingredientRecord.id
    )
    .eq("unit", finalUnit)
    .eq("source", "manual")
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    const {
      error: updateError
    } = await supabaseClient
      .from("grocery_list_items")
      .update({
        quantity_to_buy:
          Number(
            existing.quantity_to_buy ||
              0
          ) +
          Number(quantity),

        quantity_needed:
          Number(
            existing.quantity_needed ||
              0
          ) +
          Number(quantity),

        checked:
          false
      })
      .eq("id", existing.id);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const {
    error: insertError
  } = await supabaseClient
    .from("grocery_list_items")
    .insert({
      ingredient_id:
        ingredientRecord.id,

      quantity_needed:
        Number(quantity),

      quantity_in_inventory:
        0,

      quantity_to_buy:
        Number(quantity),

      unit:
        finalUnit,

      source:
        "manual",

      checked:
        false
    });

  if (insertError) {
    throw insertError;
  }
}

async function updateGroceryItemCheckedInSupabase(
  rowId,
  checked
) {
  await requireSignedInUser();

  const { error } = await supabaseClient
    .from("grocery_list_items")
    .update({
      checked
    })
    .eq("id", rowId);

  if (error) {
    throw error;
  }
}

async function deleteGroceryItemFromSupabase(
  rowId
) {
  await requireSignedInUser();

  const { error } = await supabaseClient
    .from("grocery_list_items")
    .delete()
    .eq("id", rowId);

  if (error) {
    throw error;
  }
}

async function clearCheckedGroceryItemsInSupabase() {
  await requireSignedInUser();

  const { error } = await supabaseClient
    .from("grocery_list_items")
    .delete()
    .eq("checked", true);

  if (error) {
    throw error;
  }
}

async function rebuildMealPlanGroceryListInSupabase() {
  await requireSignedInUser();

  const mealPlanItems =
    await fetchMealPlanFromSupabase();

  const inventoryItems =
    await fetchInventoryFromSupabase();

  const neededMap = new Map();

  mealPlanItems.forEach(planItem => {
    const recipe =
      planItem.recipe;

    if (
      !recipe ||
      !Array.isArray(
        recipe.ingredients
      )
    ) {
      return;
    }

    const multiplier =
      planItem.count || 1;

    recipe.ingredients.forEach(
      ingredient => {
        if (
          !ingredient ||
          typeof ingredient ===
            "string" ||
          !ingredient.ingredientId ||
          ingredient.quantity == null ||
          !ingredient.unit
        ) {
          return;
        }

        const key =
          `${ingredient.ingredientId}__${ingredient.unit}`;

        const existing =
          neededMap.get(key);

        const neededQuantity =
          Number(
            ingredient.quantity
          ) *
          Number(multiplier);

        if (existing) {
          existing.quantityNeeded +=
            neededQuantity;
        } else {
          neededMap.set(key, {
            ingredientSlug:
              ingredient.ingredientId,

            name:
              ingredient.name,

            unit:
              ingredient.unit,

            quantityNeeded:
              neededQuantity
          });
        }
      }
    );
  });

  const {
    error: deleteError
  } = await supabaseClient
    .from("grocery_list_items")
    .delete()
    .eq(
      "source",
      "meal-plan"
    );

  if (deleteError) {
    throw deleteError;
  }

  const rowsToInsert = [];

  for (
    const needed
    of neededMap.values()
  ) {
    const {
      data: ingredientRow,
      error: ingredientError
    } = await supabaseClient
      .from("ingredients")
      .select(`
        id,
        slug,
        default_unit,
        category_id
      `)
      .eq(
        "slug",
        needed.ingredientSlug
      )
      .single();

    if (ingredientError) {
      throw ingredientError;
    }

    const finalUnit =
      ingredientRow.default_unit ||
      needed.unit;

    const inventoryMatch =
      inventoryItems.find(
        item =>
          item.id ===
            needed.ingredientSlug &&
          item.unit ===
            finalUnit
      );

    const quantityInInventory =
      inventoryMatch
        ? Number(
            inventoryMatch.quantity
          )
        : 0;

    const quantityToBuy =
      Number(
        needed.quantityNeeded
      ) -
      quantityInInventory;

    if (quantityToBuy > 0) {
      rowsToInsert.push({
        ingredient_id:
          ingredientRow.id,

        quantity_needed:
          needed.quantityNeeded,

        quantity_in_inventory:
          quantityInInventory,

        quantity_to_buy:
          quantityToBuy,

        unit:
          finalUnit,

        source:
          "meal-plan",

        checked:
          false
      });
    }
  }

  if (rowsToInsert.length) {
    const {
      error: insertError
    } = await supabaseClient
      .from("grocery_list_items")
      .insert(rowsToInsert);

    if (insertError) {
      throw insertError;
    }
  }
}

/* =========================================================
   INGREDIENTS
========================================================= */

async function fetchIngredientsFromSupabase(
  searchTerm = ""
) {
  let query = supabaseClient
    .from("ingredients")
    .select(`
      id,
      name,
      normalized_name,
      slug,
      default_unit,
      category_id,
      is_active,
      created_at,
      updated_at,
      ingredient_categories (
        id,
        name,
        slug,
        sort_order
      )
    `)
    .eq("is_active", true)
    .order("name", {
      ascending: true
    });

  const cleanedSearch =
    cleanIngredientName(
      searchTerm
    );

  if (cleanedSearch) {
    query = query.ilike(
      "name",
      `%${cleanedSearch}%`
    );
  }

  const { data, error } =
    await query;

  if (error) {
    throw error;
  }

  return (data || []).map(row => ({
    ...row,

    category:
      row.ingredient_categories
        ? {
            id:
              row
                .ingredient_categories
                .id,

            name:
              row
                .ingredient_categories
                .name,

            slug:
              row
                .ingredient_categories
                .slug,

            sortOrder:
              row
                .ingredient_categories
                .sort_order
          }
        : null
  }));
}

async function fetchIngredientByIdFromSupabase(
  id
) {
  const { data, error } = await supabaseClient
    .from("ingredients")
    .select(`
      id,
      name,
      normalized_name,
      slug,
      default_unit,
      category_id,
      is_active,
      created_at,
      updated_at,
      ingredient_categories (
        id,
        name,
        slug,
        sort_order
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,

    category:
      data.ingredient_categories
        ? {
            id:
              data
                .ingredient_categories
                .id,

            name:
              data
                .ingredient_categories
                .name,

            slug:
              data
                .ingredient_categories
                .slug,

            sortOrder:
              data
                .ingredient_categories
                .sort_order
          }
        : null
  };
}

async function findIngredientByNameFromSupabase(
  name
) {
  const normalizedName =
    normalizeIngredientName(
      name
    );

  if (!normalizedName) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("ingredients")
    .select(`
      id,
      name,
      normalized_name,
      slug,
      default_unit,
      category_id,
      is_active,
      ingredient_categories (
        id,
        name,
        slug,
        sort_order
      )
    `)
    .eq(
      "normalized_name",
      normalizedName
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,

    category:
      data.ingredient_categories
        ? {
            id:
              data
                .ingredient_categories
                .id,

            name:
              data
                .ingredient_categories
                .name,

            slug:
              data
                .ingredient_categories
                .slug,

            sortOrder:
              data
                .ingredient_categories
                .sort_order
          }
        : null
  };
}

async function createIngredientInSupabase({
  name,
  defaultUnit = "count",
  categoryId = null
}) {
  await requireSignedInUser();

  const cleanedName =
    cleanIngredientName(name);

  if (!cleanedName) {
    throw new Error(
      "Enter an ingredient name."
    );
  }

  const normalizedName =
    normalizeIngredientName(
      cleanedName
    );

  const existing =
    await findIngredientByNameFromSupabase(
      cleanedName
    );

  if (existing?.is_active) {
    throw new Error(
      "That ingredient already exists."
    );
  }

  const finalCategoryId =
    categoryId ||
    existing?.category_id ||
    await getDefaultIngredientCategoryId();

  /*
   * If the ingredient already exists but
   * was archived, reactivate it instead
   * of creating a duplicate.
   */
  if (
    existing &&
    !existing.is_active
  ) {
    const {
      data,
      error
    } = await supabaseClient
      .from("ingredients")
      .update({
        name:
          cleanedName,

        normalized_name:
          normalizedName,

        slug:
          slugify(cleanedName),

        default_unit:
          defaultUnit ||
          "count",

        category_id:
          finalCategoryId,

        is_active:
          true,

        updated_at:
          new Date().toISOString()
      })
      .eq("id", existing.id)
      .select(`
        id,
        name,
        normalized_name,
        slug,
        default_unit,
        category_id,
        is_active,
        ingredient_categories (
          id,
          name,
          slug,
          sort_order
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    return {
      ...data,

      category:
        data.ingredient_categories
          ? {
              id:
                data
                  .ingredient_categories
                  .id,

              name:
                data
                  .ingredient_categories
                  .name,

              slug:
                data
                  .ingredient_categories
                  .slug,

              sortOrder:
                data
                  .ingredient_categories
                  .sort_order
            }
          : null
    };
  }

  const {
    data,
    error
  } = await supabaseClient
    .from("ingredients")
    .insert({
      name:
        cleanedName,

      normalized_name:
        normalizedName,

      slug:
        slugify(cleanedName),

      default_unit:
        defaultUnit ||
        "count",

      category_id:
        finalCategoryId,

      is_active:
        true
    })
    .select(`
      id,
      name,
      normalized_name,
      slug,
      default_unit,
      category_id,
      is_active,
      ingredient_categories (
        id,
        name,
        slug,
        sort_order
      )
    `)
    .single();

  if (error) {
    if (
      isDuplicateIngredientError(
        error
      )
    ) {
      throw new Error(
        "That ingredient already exists."
      );
    }

    throw error;
  }

  return {
    ...data,

    category:
      data.ingredient_categories
        ? {
            id:
              data
                .ingredient_categories
                .id,

            name:
              data
                .ingredient_categories
                .name,

            slug:
              data
                .ingredient_categories
                .slug,

            sortOrder:
              data
                .ingredient_categories
                .sort_order
          }
        : null
  };
}

async function updateIngredientInSupabase(
  id,
  {
    name,
    defaultUnit,
    categoryId
  }
) {
  await requireSignedInUser();

  const cleanedName =
    cleanIngredientName(name);

  if (!cleanedName) {
    throw new Error(
      "Enter an ingredient name."
    );
  }

  const normalizedName =
    normalizeIngredientName(
      cleanedName
    );

  const existingNameMatch =
    await findIngredientByNameFromSupabase(
      cleanedName
    );

  if (
    existingNameMatch &&
    existingNameMatch.id !== id
  ) {
    throw new Error(
      "That ingredient already exists."
    );
  }

  const current =
    await fetchIngredientByIdFromSupabase(
      id
    );

  const finalCategoryId =
    categoryId ||
    current.category_id ||
    await getDefaultIngredientCategoryId();

  const {
    data,
    error
  } = await supabaseClient
    .from("ingredients")
    .update({
      name:
        cleanedName,

      normalized_name:
        normalizedName,

      slug:
        slugify(cleanedName),

      default_unit:
        defaultUnit ||
        current.default_unit ||
        "count",

      category_id:
        finalCategoryId,

      updated_at:
        new Date().toISOString()
    })
    .eq("id", id)
    .select(`
      id,
      name,
      normalized_name,
      slug,
      default_unit,
      category_id,
      is_active,
      ingredient_categories (
        id,
        name,
        slug,
        sort_order
      )
    `)
    .single();

  if (error) {
    if (
      isDuplicateIngredientError(
        error
      )
    ) {
      throw new Error(
        "That ingredient already exists."
      );
    }

    throw error;
  }

  return {
    ...data,

    category:
      data.ingredient_categories
        ? {
            id:
              data
                .ingredient_categories
                .id,

            name:
              data
                .ingredient_categories
                .name,

            slug:
              data
                .ingredient_categories
                .slug,

            sortOrder:
              data
                .ingredient_categories
                .sort_order
          }
        : null
  };
}

async function archiveIngredientInSupabase(
  id
) {
  await requireSignedInUser();

  const { error } = await supabaseClient
    .from("ingredients")
    .update({
      is_active:
        false,

      updated_at:
        new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  return {
    id,
    is_active: false
  };
}