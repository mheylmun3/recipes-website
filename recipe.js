const recipeTitle = document.getElementById("recipeTitle");
const recipeServings = document.getElementById("recipeServings");
const recipeImageDisplay = document.getElementById("recipeImageDisplay");
const ingredientsList = document.getElementById("ingredientsList");
const instructionsText = document.getElementById("instructionsText");
const editRecipeLink = document.getElementById("editRecipeLink");

function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug");
}

function getUserRecipes() {
  try {
    const saved = localStorage.getItem("userRecipes");
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to parse userRecipes:", error);
    return [];
  }
}

function displayRecipe(recipe) {
  recipeTitle.textContent = recipe.name;
  editRecipeLink.href = `edit-recipe.html?slug=${encodeURIComponent(recipe.slug)}`;
  recipeServings.textContent = recipe.servings
    ? `Servings: ${recipe.servings}`
    : "";

  ingredientsList.innerHTML = "";

  if (Array.isArray(recipe.ingredients)) {
    recipe.ingredients.forEach(ingredient => {
      const li = document.createElement("li");

      if (typeof ingredient === "string") {
      li.textContent = ingredient;
      } else if (ingredient.quantity != null && ingredient.unit) {
      li.textContent = `${ingredient.name} — ${ingredient.quantity} ${ingredient.unit}`;
      } else {
      li.textContent = ingredient.name || ingredient.text || "Unnamed ingredient";
      }

      ingredientsList.appendChild(li);
    });
  }

  if (recipe.image) {
    recipeImageDisplay.src = recipe.image;
    recipeImageDisplay.style.display = "block";
  } else {
    recipeImageDisplay.src = "";
    recipeImageDisplay.style.display = "none";
  }

    instructionsText.textContent = recipe.instructions || "";
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

function displayNotFound() {
  recipeTitle.textContent = "Recipe not found";
  recipeServings.textContent = "";
  recipeImageDisplay.src = "";
  recipeImageDisplay.style.display = "none";
  ingredientsList.innerHTML = "<li>We could not find the ingredients for this recipe.</li>";
  instructionsText.textContent = "We could not find the recipe you were looking for.";
}

async function loadRecipe() {
  const slug = getSlugFromUrl();
  console.log("Slug from URL:", slug);

  if (!slug) {
    displayNotFound();
    return;
  }

  try {
  const response = await fetch("all-recipes.json");
  const jsonRecipes = await response.json();
  const userRecipes = getUserRecipes();
  const editedRecipes = getEditedRecipes();

  const recipe =
    editedRecipes.find(item => item.slug === slug) ||
    userRecipes.find(item => item.slug === slug) ||
    jsonRecipes.find(item => item.slug === slug);

  console.log("Matched recipe:", recipe);

  if (!recipe) {
    displayNotFound();
    return;
  }

  displayRecipe(recipe);
} catch (error) {
    console.error("Error loading recipe:", error);

    const userRecipes = getUserRecipes();
    const editedRecipes = getEditedRecipes();
    const allRecipes = [...editedRecipes, ...userRecipes];

    const recipe = allRecipes.find(item => item.slug === slug);

    if (!recipe) {
      displayNotFound();
      return;
    }

    displayRecipe(recipe);
  }
}

loadRecipe();