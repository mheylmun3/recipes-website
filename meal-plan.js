const recipeSearchInput = document.getElementById("recipeSearchInput");
const recipeSuggestions = document.getElementById("recipeSuggestions");
const addRecipeToPlanBtn = document.getElementById("addRecipeToPlanBtn");
const mealPlanList = document.getElementById("mealPlanList");

let allRecipes = [];
let currentMealPlan = [];
let selectedRecipe = null;

async function loadAllRecipes() {
  try {
    allRecipes = await fetchAllRecipesFromSupabase();
    allRecipes.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to load recipes from Supabase:", error);
    allRecipes = [];
    throw error;
  }
}

async function loadMealPlan() {
  try {
    currentMealPlan = await fetchMealPlanFromSupabase();
    renderMealPlan();
  } catch (error) {
    console.error("Failed to load meal plan from Supabase:", error);
    mealPlanList.innerHTML = "<p>Failed to load meal plan.</p>";
    throw error;
  }
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

function renderMealPlan() {
  mealPlanList.innerHTML = "";

  if (!currentMealPlan.length) {
    mealPlanList.innerHTML = "<p>No recipes in the meal plan yet.</p>";
    return;
  }

  currentMealPlan.forEach(item => {
    const recipe = item.recipe || allRecipes.find(r => r.slug === item.slug);
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

    countInput.addEventListener("change", async () => {
      try {
        await updateMealPlanItemCountInSupabase(
          item.id,
          Math.max(1, parseInt(countInput.value, 10) || 1)
        );
        await rebuildMealPlanGroceryListInSupabase();
        await loadMealPlan();
      } catch (error) {
        console.error("Failed to update meal plan count:", error);
        alert(error.message || "Failed to update meal plan.");
      }
    });

    left.appendChild(title);
    left.appendChild(countInput);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";

    removeBtn.addEventListener("click", async () => {
      try {
        await deleteMealPlanItemFromSupabase(item.id);
        await rebuildMealPlanGroceryListInSupabase();
        await loadMealPlan();
      } catch (error) {
        console.error("Failed to remove meal plan item:", error);
        alert(error.message || "Failed to remove recipe.");
      }
    });

    row.appendChild(left);
    row.appendChild(removeBtn);
    mealPlanList.appendChild(row);
  });
}

async function addSelectedRecipeToMealPlan() {
  if (!selectedRecipe) {
    alert("Select a recipe first.");
    return;
  }

  try {
    await upsertMealPlanItemInSupabase(selectedRecipe.slug, 1);
    await rebuildMealPlanGroceryListInSupabase();
    await loadMealPlan();

    recipeSearchInput.value = "";
    recipeSuggestions.innerHTML = "";
    recipeSuggestions.style.display = "none";
    selectedRecipe = null;
  } catch (error) {
    console.error("Failed to add recipe to meal plan:", error);
    alert(error.message || "Failed to add recipe to meal plan.");
  }
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

Promise.all([loadAllRecipes(), loadMealPlan()])
  .catch(error => {
    console.error("Failed to initialize meal plan page:", error);
    mealPlanList.innerHTML = "<p>Failed to load meal plan recipes.</p>";
  });