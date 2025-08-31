const recipeGrid = document.getElementById("recipeGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
let allRecipes = [];

// Track recipe clicks using localStorage
function trackRecipeClick(slug) {
  const key = `clicks-${slug}`;
  const current = localStorage.getItem(key);
  localStorage.setItem(key, current ? parseInt(current) + 1 : 1);
}

// Render filtered recipe cards
function displayRecipes(filter = "", sortBy = "alphabetical") {
  recipeGrid.innerHTML = "";

  let filtered = allRecipes.filter(recipe =>
    recipe.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (sortBy === "alphabetical") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "popularity") {
    filtered.sort((a, b) => {
      const aClicks = parseInt(localStorage.getItem(`clicks-${a.slug}`)) || 0;
      const bClicks = parseInt(localStorage.getItem(`clicks-${b.slug}`)) || 0;
      return bClicks - aClicks;
    });
  }

  filtered.forEach(recipe => {
    const card = document.createElement("a");
    card.className = "recipe-card";
    card.href = `recipes/${recipe.slug}.html`;
    card.onclick = () => trackRecipeClick(recipe.slug);
    card.innerHTML = `<h4>${recipe.name}</h4>`;
    recipeGrid.appendChild(card);
  });
}

// Fetch recipe data from JSON file
fetch("all-recipes.json")
  .then(res => res.json())
  .then(data => {
    // De-duplicate
    const uniqueByName = new Map();
    const seen = new Set();
    const duplicates = [];

    data.forEach(recipe => {
      const key = recipe.name.toLowerCase().trim();
      if (!uniqueByName.has(key)) {
        uniqueByName.set(key, recipe);
      } else {
        duplicates.push(recipe.name);
      }
    });

    if (duplicates.length) {
      console.warn("Duplicate recipes found:", duplicates);
    }

    allRecipes = Array.from(uniqueByName.values());

    displayRecipes(searchInput.value, sortSelect?.value || "alphabetical");
  })
  .catch(err => {
    recipeGrid.innerHTML = "<p>Failed to load recipes.</p>";
    console.error("Error loading recipes:", err);
  });

// Event listeners
searchInput.addEventListener("input", () => {
  displayRecipes(searchInput.value, sortSelect?.value || "alphabetical");
});

sortSelect?.addEventListener("change", () => {
  displayRecipes(searchInput.value, sortSelect.value);
});
