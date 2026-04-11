const recipeSearchInput = document.getElementById("recipeSearchInput");
const recipeSuggestions = document.getElementById("recipeSuggestions");
const addRecipeToPlanBtn = document.getElementById("addRecipeToPlanBtn");
const mealPlanList = document.getElementById("mealPlanList");

let allRecipes = [];
let selectedRecipe = null;

function getUserRecipes() {
  try {
    const saved = localStorage.getItem("userRecipes");
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to parse userRecipes:", error);
    return [];
  }
}

function getEditedRecipes() {
  try {
    const saved = localStorage.getItem("editedRecipes");
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to parse editedRecipes:", error);
    return [];
  }
}

function getInventory() {
  try {
    const saved = localStorage.getItem("inventoryItems");
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to parse inventoryItems:", error);
    return [];
  }
}

function getMealPlan() {
  try {
    const saved = localStorage.getItem("mealPlan");
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to parse mealPlan:", error);
    return [];
  }
}

function saveMealPlan(plan) {
  localStorage.setItem("mealPlan", JSON.stringify(plan));
}

function saveGroceryList(items) {
  localStorage.setItem("groceryList", JSON.stringify(items));
}

function loadAllRecipes() {
  return fetch("all-recipes.json")
    .then(res => res.json())
    .then(jsonRecipes => {
      const userRecipes = getUserRecipes();
      const editedRecipes = getEditedRecipes();

      const recipeMap = new Map();

      jsonRecipes.forEach(recipe => recipeMap.set(recipe.slug, recipe));
      userRecipes.forEach(recipe => recipeMap.set(recipe.slug, recipe));
      editedRecipes.forEach(recipe => recipeMap.set(recipe.slug, recipe));

      allRecipes = Array.from(recipeMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    });
}

function renderRecipeSuggestions(searchTerm) {
  recipeSuggestions.innerHTML = "";
  selectedRecipe = null;

  const trimmed = searchTerm.trim().toLowerCase();

  let matches;
  if (!trimmed) {
    matches = allRecipes.slice(0, 8);
  } else {
    matches = allRecipes
      .filter(recipe => recipe.name.toLowerCase().includes(trimmed))
      .slice(0, 8);
  }

  if (!matches.length) {
    recipeSuggestions.style.display = "none";
    return;
  }

  matches.forEach(recipe => {
    const option = document.createElement("div");
    option.className = "suggestion-item";
    option.textContent = recipe.name;

    option.addEventListener("click", () => {
      selectedRecipe = recipe;
      recipeSearchInput.value = recipe.name;
      recipeSuggestions.innerHTML = "";
      recipeSuggestions.style.display = "none";
    });

    recipeSuggestions.appendChild(option);
  });

  recipeSuggestions.style.display = "block";
}

function buildGroceryListFromMealPlan() {
  const mealPlan = getMealPlan();
  const inventory = getInventory();

  const neededMap = new Map();

  mealPlan.forEach(planItem => {
    const recipe = allRecipes.find(r => r.slug === planItem.slug);
    if (!recipe || !Array.isArray(recipe.ingredients)) return;

    const multiplier = planItem.count || 1;

    recipe.ingredients.forEach(ingredient => {
      if (
        !ingredient ||
        typeof ingredient === "string" ||
        !ingredient.ingredientId ||
        ingredient.quantity == null ||
        !ingredient.unit
      ) {
        return;
      }

      const key = `${ingredient.ingredientId}__${ingredient.unit}`;
      const existing = neededMap.get(key);

      const neededQuantity = ingredient.quantity * multiplier;

      if (existing) {
        existing.quantityNeeded += neededQuantity;
      } else {
        neededMap.set(key, {
          ingredientId: ingredient.ingredientId,
          name: ingredient.name,
          unit: ingredient.unit,
          quantityNeeded: neededQuantity
        });
      }
    });
  });

  const groceryList = [];

  neededMap.forEach(needed => {
    const inventoryMatch = inventory.find(
      item => item.id === needed.ingredientId && item.unit === needed.unit
    );

    const quantityInInventory = inventoryMatch ? inventoryMatch.quantity : 0;
    const quantityToBuy = needed.quantityNeeded - quantityInInventory;

    if (quantityToBuy > 0) {
      groceryList.push({
        ingredientId: needed.ingredientId,
        name: needed.name,
        unit: needed.unit,
        quantityNeeded: needed.quantityNeeded,
        quantityInInventory,
        quantityToBuy
      });
    }
  });

  groceryList.sort((a, b) => a.name.localeCompare(b.name));
  saveGroceryList(groceryList);
}

function renderMealPlan() {
  const mealPlan = getMealPlan();
  mealPlanList.innerHTML = "";

  if (!mealPlan.length) {
    mealPlanList.innerHTML = "<p>No recipes in the meal plan yet.</p>";
    return;
  }

  mealPlan.forEach(item => {
    const recipe = allRecipes.find(r => r.slug === item.slug);
    if (!recipe) return;

    const row = document.createElement("div");
    row.className = "inventory-item";

    const left = document.createElement("div");
    left.className = "meal-plan-item-info";

    const title = document.createElement("span");
    title.textContent = recipe.name;

    const countInput = document.createElement("input");
    countInput.type = "number";
    countInput.min = "1";
    countInput.step = "1";
    countInput.value = item.count || 1;
    countInput.className = "meal-plan-count-input";

    countInput.addEventListener("change", () => {
      const updatedPlan = getMealPlan().map(planItem =>
        planItem.slug === item.slug
          ? { ...planItem, count: Math.max(1, parseInt(countInput.value, 10) || 1) }
          : planItem
      );

      saveMealPlan(updatedPlan);
      buildGroceryListFromMealPlan();
      renderMealPlan();
    });

    left.appendChild(title);
    left.appendChild(countInput);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";

    removeBtn.addEventListener("click", () => {
      const updatedPlan = getMealPlan().filter(planItem => planItem.slug !== item.slug);
      saveMealPlan(updatedPlan);
      buildGroceryListFromMealPlan();
      renderMealPlan();
    });

    row.appendChild(left);
    row.appendChild(removeBtn);
    mealPlanList.appendChild(row);
  });
}

function addSelectedRecipeToMealPlan() {
  if (!selectedRecipe) {
    alert("Select a recipe first.");
    return;
  }

  const mealPlan = getMealPlan();
  const existing = mealPlan.find(item => item.slug === selectedRecipe.slug);

  if (existing) {
    existing.count += 1;
  } else {
    mealPlan.push({
      slug: selectedRecipe.slug,
      count: 1
    });
  }

  saveMealPlan(mealPlan);
  buildGroceryListFromMealPlan();
  renderMealPlan();

  recipeSearchInput.value = "";
  recipeSuggestions.innerHTML = "";
  recipeSuggestions.style.display = "none";
  selectedRecipe = null;
}

recipeSearchInput.addEventListener("input", () => {
  renderRecipeSuggestions(recipeSearchInput.value);
});

recipeSearchInput.addEventListener("focus", () => {
  renderRecipeSuggestions(recipeSearchInput.value);
});

addRecipeToPlanBtn.addEventListener("click", () => {
  addSelectedRecipeToMealPlan();
});

document.addEventListener("click", event => {
  if (
    !recipeSearchInput.contains(event.target) &&
    !recipeSuggestions.contains(event.target)
  ) {
    recipeSuggestions.style.display = "none";
  }
});

loadAllRecipes()
  .then(() => {
    buildGroceryListFromMealPlan();
    renderMealPlan();
  })
  .catch(error => {
    console.error("Failed to load recipes for meal plan:", error);
    mealPlanList.innerHTML = "<p>Failed to load meal plan recipes.</p>";
  });