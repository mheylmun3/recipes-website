function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function requireSignedInUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  if (!data.user) {
    throw new Error("You must be signed in to make changes.");
  }
  return data.user;
}

async function fetchAllRecipesFromSupabase() {
  const { data: recipes, error } = await supabaseClient
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
            name
            )
        )
    `)
    .order("name", { ascending: true });

  if (error) throw error;

  return (recipes || []).map(mapRecipeRowToFrontend);
}

async function fetchRecipeBySlugFromSupabase(slug) {
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
            name
            )
        )
    `)
    .eq("slug", slug)
    .single();

  if (error) throw error;

  return mapRecipeRowToFrontend(data);
}

function mapRecipeRowToFrontend(row) {
  const ingredients = (row.recipe_ingredients || [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(item => ({
      ingredientId: item.ingredients?.slug || "",
      name: item.ingredients?.name || "",
      quantity: item.quantity,
      unit: item.unit,
      text:
        item.display_text ||
        formatIngredientText(
          item.ingredients?.name || "",
          item.quantity,
          item.unit
        )
    }));

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

function formatIngredientText(name, quantity, unit) {
  if (quantity == null || Number.isNaN(quantity)) return name;
  if (!unit) return `${quantity} ${name}`;
  return `${quantity} ${unit} ${name}`;
}

async function getOrCreateIngredient(nameOrSlug) {
  const normalizedName = String(nameOrSlug).trim();
  const slug = slugify(normalizedName);

  let { data: existing, error: selectError } = await supabaseClient
    .from("ingredients")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabaseClient
    .from("ingredients")
    .insert({
      slug,
      name: normalizedName
    })
    .select("id, slug, name")
    .single();

  if (insertError) throw insertError;
  return created;
}

async function createRecipeInSupabase(recipe) {
  await requireSignedInUser();

  const { ingredients, image, ...recipeCore } = recipe;

  const { data: insertedRecipe, error: recipeError } = await supabaseClient
    .from("recipes")
    .insert({
        slug: recipeCore.slug,
        name: recipeCore.name,
        category: recipeCore.category,
        servings: recipeCore.servings,
        calories: recipeCore.calories ?? null,
        protein: recipeCore.protein ?? null,
        fiber: recipeCore.fiber ?? null,
        instructions: recipeCore.instructions,
        image_path: image || null
    })
    .select("id")
    .single();

  if (recipeError) throw recipeError;

  const recipeIngredientsRows = [];

  for (let i = 0; i < ingredients.length; i += 1) {
    const item = ingredients[i];
    const ingredientRecord = await getOrCreateIngredient(item.name);

    recipeIngredientsRows.push({
      recipe_id: insertedRecipe.id,
      ingredient_id: ingredientRecord.id,
      quantity: item.quantity ?? null,
      unit: item.unit || null,
      sort_order: i,
      display_text: item.text || formatIngredientText(item.name, item.quantity, item.unit)
    });
  }

  if (recipeIngredientsRows.length) {
    const { error: ingredientError } = await supabaseClient
      .from("recipe_ingredients")
      .insert(recipeIngredientsRows);

    if (ingredientError) throw ingredientError;
  }

  return fetchRecipeBySlugFromSupabase(recipe.slug);
}

async function updateRecipeInSupabase(recipe) {
  await requireSignedInUser();

  const { ingredients, image, ...recipeCore } = recipe;

  const { data: recipeRow, error: recipeLookupError } = await supabaseClient
    .from("recipes")
    .select("id")
    .eq("slug", recipe.slug)
    .single();

  if (recipeLookupError) throw recipeLookupError;

  const { error: recipeUpdateError } = await supabaseClient
    .from("recipes")
    .update({
      name: recipeCore.name,
      category: recipeCore.category,
      servings: recipeCore.servings,
      calories: recipeCore.calories ?? null,
      protein: recipeCore.protein ?? null,
      fiber: recipeCore.fiber ?? null,
      instructions: recipeCore.instructions,
      image_path: image || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", recipeRow.id);

  if (recipeUpdateError) throw recipeUpdateError;

  const { error: deleteIngredientsError } = await supabaseClient
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipeRow.id);

  if (deleteIngredientsError) throw deleteIngredientsError;

  const recipeIngredientsRows = [];

  for (let i = 0; i < ingredients.length; i += 1) {
    const item = ingredients[i];
    const ingredientRecord = await getOrCreateIngredient(item.name);

    recipeIngredientsRows.push({
      recipe_id: recipeRow.id,
      ingredient_id: ingredientRecord.id,
      quantity: item.quantity ?? null,
      unit: item.unit || null,
      sort_order: i,
      display_text: item.text || formatIngredientText(item.name, item.quantity, item.unit)
    });
  }

  if (recipeIngredientsRows.length) {
    const { error: insertIngredientsError } = await supabaseClient
      .from("recipe_ingredients")
      .insert(recipeIngredientsRows);

    if (insertIngredientsError) throw insertIngredientsError;
  }

  return fetchRecipeBySlugFromSupabase(recipe.slug);
}

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
        name
      )
    `)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    rowId: row.id,
    id: row.ingredients?.slug || "",
    name: row.ingredients?.name || "",
    quantity: row.quantity,
    unit: row.unit
  }));
}

async function upsertInventoryItemInSupabase({ ingredientSlug, ingredientName, quantity, unit }) {
  await requireSignedInUser();

  const ingredientRecord = await getOrCreateIngredient(ingredientName || ingredientSlug);

  const { data: existing, error: fetchError } = await supabaseClient
    .from("inventory_items")
    .select("id, quantity, unit")
    .eq("ingredient_id", ingredientRecord.id)
    .eq("unit", unit)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    const newQuantity = Number(existing.quantity) + Number(quantity);

    if (newQuantity <= 0) {
      const { error: deleteError } = await supabaseClient
        .from("inventory_items")
        .delete()
        .eq("id", existing.id);

      if (deleteError) throw deleteError;

      return { removed: true };
    }

    const { error: updateError } = await supabaseClient
      .from("inventory_items")
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);

    if (updateError) throw updateError;

    return { removed: false };
  }

  if (Number(quantity) < 0) {
    throw new Error("You cannot subtract an ingredient that is not currently in inventory.");
  }

  const { error: insertError } = await supabaseClient
    .from("inventory_items")
    .insert({
      ingredient_id: ingredientRecord.id,
      quantity: Number(quantity),
      unit
    });

  if (insertError) throw insertError;

  return { removed: false };
}

async function deleteInventoryItemFromSupabase(rowId) {
  await requireSignedInUser();

  const { error } = await supabaseClient
    .from("inventory_items")
    .delete()
    .eq("id", rowId);

  if (error) throw error;
}

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
            name
          )
        )
      )
    `)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    slug: row.recipes?.slug || "",
    count: row.count || 1,
    recipe: row.recipes ? mapRecipeRowToFrontend(row.recipes) : null
  }));
}

async function upsertMealPlanItemInSupabase(recipeSlug, countToAdd = 1) {
  await requireSignedInUser();

  const { data: recipeRow, error: recipeError } = await supabaseClient
    .from("recipes")
    .select("id, slug")
    .eq("slug", recipeSlug)
    .single();

  if (recipeError) throw recipeError;

  const { data: existing, error: existingError } = await supabaseClient
    .from("meal_plan_items")
    .select("id, count")
    .eq("recipe_id", recipeRow.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error: updateError } = await supabaseClient
      .from("meal_plan_items")
      .update({
        count: (existing.count || 1) + countToAdd
      })
      .eq("id", existing.id);

    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabaseClient
    .from("meal_plan_items")
    .insert({
      recipe_id: recipeRow.id,
      count: countToAdd
    });

  if (insertError) throw insertError;
}

async function updateMealPlanItemCountInSupabase(itemId, newCount) {
  await requireSignedInUser();

  if (newCount <= 0) {
    const { error: deleteError } = await supabaseClient
      .from("meal_plan_items")
      .delete()
      .eq("id", itemId);

    if (deleteError) throw deleteError;
    return;
  }

  const { error } = await supabaseClient
    .from("meal_plan_items")
    .update({ count: newCount })
    .eq("id", itemId);

  if (error) throw error;
}

async function deleteMealPlanItemFromSupabase(itemId) {
  await requireSignedInUser();

  const { error } = await supabaseClient
    .from("meal_plan_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
}

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
        name
      )
    `)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    rowId: row.id,
    ingredientId: row.ingredients?.slug || "",
    name: row.ingredients?.name || "",
    quantityNeeded: row.quantity_needed,
    quantityInInventory: row.quantity_in_inventory,
    quantityToBuy: row.quantity_to_buy,
    unit: row.unit,
    source: row.source,
    checked: row.checked
  }));
}

async function upsertManualGroceryItemInSupabase({ ingredientSlug, ingredientName, quantity, unit }) {
  await requireSignedInUser();

  const ingredientRecord = await getOrCreateIngredient(ingredientName || ingredientSlug);

  const { data: existing, error: existingError } = await supabaseClient
    .from("grocery_list_items")
    .select("id, quantity_to_buy, quantity_needed")
    .eq("ingredient_id", ingredientRecord.id)
    .eq("unit", unit)
    .eq("source", "manual")
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error: updateError } = await supabaseClient
      .from("grocery_list_items")
      .update({
        quantity_to_buy: Number(existing.quantity_to_buy || 0) + Number(quantity),
        quantity_needed: Number(existing.quantity_needed || 0) + Number(quantity),
        checked: false
      })
      .eq("id", existing.id);

    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabaseClient
    .from("grocery_list_items")
    .insert({
      ingredient_id: ingredientRecord.id,
      quantity_needed: Number(quantity),
      quantity_in_inventory: 0,
      quantity_to_buy: Number(quantity),
      unit,
      source: "manual",
      checked: false
    });

  if (insertError) throw insertError;
}

async function updateGroceryItemCheckedInSupabase(rowId, checked) {
  await requireSignedInUser();

  const { error } = await supabaseClient
    .from("grocery_list_items")
    .update({ checked })
    .eq("id", rowId);

  if (error) throw error;
}

async function deleteGroceryItemFromSupabase(rowId) {
  await requireSignedInUser();

  const { error } = await supabaseClient
    .from("grocery_list_items")
    .delete()
    .eq("id", rowId);

  if (error) throw error;
}

async function clearCheckedGroceryItemsInSupabase() {
  await requireSignedInUser();

  const { error } = await supabaseClient
    .from("grocery_list_items")
    .delete()
    .eq("checked", true);

  if (error) throw error;
}