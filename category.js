const params = new URLSearchParams(window.location.search);
const category = params.get("type");

const title = document.getElementById("categoryTitle");
const desc = document.getElementById("categoryDescription");
const recipeGrid = document.getElementById("recipeGrid");

const descriptions = {
  "sweet-treats": "Indulgent and protein-packed desserts to satisfy your cravings.",
  "breakfast": "Start your day with high-protein, nutritious meals and snacks.",
  "soups": "Hearty, comforting bowls of goodness for any season.",
  "crockpot-meals": "Set it, forget it, and enjoy slow-cooked flavor-packed meals.",
  "stove": "Quick and satisfying dishes you can whip up on the stove.",
  "side-dishes": "Perfect pairings to complete your meals."
};

function trackRecipeClick(slug) {
  const key = `clicks-${slug}`;
  const current = localStorage.getItem(key);
  localStorage.setItem(key, current ? parseInt(current, 10) + 1 : 1);
}

function getUserRecipes() {
  const saved = localStorage.getItem("userRecipes");
  return saved ? JSON.parse(saved) : [];
}

function formatCategoryTitle(name) {
  return name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function displayCategory(categoryName, recipes) {
  title.textContent = formatCategoryTitle(categoryName);
  desc.textContent = descriptions[categoryName] || "";
  recipeGrid.innerHTML = "";

  if (!recipes.length) {
    recipeGrid.innerHTML = "<p>No recipes found in this category.</p>";
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement("a");
    card.className = "recipe-card";
    card.href = `recipe.html?slug=${encodeURIComponent(recipe.slug)}`;
    card.addEventListener("click", () => trackRecipeClick(recipe.slug));

    card.innerHTML = `
      <h4>${recipe.name}</h4>
    `;

    recipeGrid.appendChild(card);
  });
}

async function loadCategoryPage() {
  if (!category || !(category in descriptions)) {
    title.textContent = "Category Not Found";
    desc.textContent = "Please check the URL or return to the homepage.";
    recipeGrid.innerHTML = "";
    return;
  }

  try {
    const response = await fetch("all-recipes.json");
    const jsonRecipes = await response.json();
    const userRecipes = getUserRecipes();

    const allRecipes = [...jsonRecipes, ...userRecipes];

    const matchedRecipes = allRecipes.filter(recipe => recipe.category === category);

    const uniqueRecipes = [];
    const seen = new Set();

    matchedRecipes.forEach(recipe => {
      const key = recipe.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecipes.push(recipe);
      }
    });

    displayCategory(category, uniqueRecipes);
  } catch (error) {
    console.error("Error loading category recipes:", error);
    title.textContent = formatCategoryTitle(category);
    desc.textContent = descriptions[category] || "";
    recipeGrid.innerHTML = "<p>Failed to load recipes.</p>";
  }
}

loadCategoryPage();