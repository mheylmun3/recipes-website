const recipeGrid = document.getElementById("recipeGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
let allRecipes = [];

console.log("all-recipes.js loaded");
console.log("recipeGrid:", recipeGrid);
console.log("searchInput:", searchInput);
console.log("sortSelect:", sortSelect);

// Track recipe clicks using localStorage
function trackRecipeClick(slug) {
  const key = `clicks-${slug}`;
  const current = localStorage.getItem(key);
  localStorage.setItem(key, current ? parseInt(current, 10) + 1 : 1);
}

// Render filtered recipe cards
function displayRecipes(filter = "", sortBy = "alphabetical") {
  console.log("displayRecipes called");
  console.log("allRecipes length:", allRecipes.length);

  recipeGrid.innerHTML = "";

  let filtered = allRecipes.filter(recipe =>
    recipe.name.toLowerCase().includes(filter.toLowerCase())
  );

  console.log("filtered length:", filtered.length);

  if (sortBy === "alphabetical") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "popularity") {
    filtered.sort((a, b) => {
      const aClicks = parseInt(localStorage.getItem(`clicks-${a.slug}`), 10) || 0;
      const bClicks = parseInt(localStorage.getItem(`clicks-${b.slug}`), 10) || 0;
      return bClicks - aClicks;
    });
  }

  filtered.forEach(recipe => {
    const card = document.createElement("a");
    card.className = "recipe-card";
    card.href = `recipe.html?slug=${encodeURIComponent(recipe.slug)}`;
    card.addEventListener("click", () => trackRecipeClick(recipe.slug));

    card.innerHTML = `
      <h4>${recipe.name}</h4>
    `;

    recipeGrid.appendChild(card);
  });

  if (!filtered.length) {
    recipeGrid.innerHTML = "<p>No recipes found.</p>";
  }
}

async function loadRecipes() {
  try {
    console.log("Loading recipes from Supabase...");
    allRecipes = await fetchAllRecipesFromSupabase();
    console.log("Recipes loaded from Supabase:", allRecipes.length);

    displayRecipes(searchInput.value, sortSelect?.value || "alphabetical");
  } catch (err) {
    console.error("Error loading recipes from Supabase:", err);
    recipeGrid.innerHTML = "<p>Failed to load recipes.</p>";
  }
}

// Event listeners
searchInput.addEventListener("input", () => {
  displayRecipes(searchInput.value, sortSelect?.value || "alphabetical");
});

sortSelect?.addEventListener("change", () => {
  displayRecipes(searchInput.value, sortSelect.value);
});

loadRecipes();