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

function getUserRecipes() {
  try {
    const saved = localStorage.getItem("userRecipes");
    console.log("Raw userRecipes from localStorage:", saved);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to parse userRecipes from localStorage:", error);
    return [];
  }
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

// Fetch recipe data from JSON file + localStorage
fetch("all-recipes.json")
  .then(res => {
    console.log("Fetch response status:", res.status);
    return res.json();
  })
  .then(data => {
    console.log("JSON recipes loaded:", data.length);

    const userRecipes = getUserRecipes();
    console.log("User recipes loaded:", userRecipes.length);

    const combinedRecipes = [...data, ...userRecipes];
    console.log("Combined recipes length:", combinedRecipes.length);

    const uniqueByName = new Map();
    const duplicates = [];

    combinedRecipes.forEach(recipe => {
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
    console.log("Final allRecipes length:", allRecipes.length);

    displayRecipes(searchInput.value, sortSelect?.value || "alphabetical");
  })
  .catch(err => {
    console.error("Error loading recipes:", err);

    const userRecipes = getUserRecipes();
    console.log("Fallback user recipes length:", userRecipes.length);

    if (userRecipes.length) {
      allRecipes = userRecipes;
      displayRecipes(searchInput.value, sortSelect?.value || "alphabetical");
    } else {
      recipeGrid.innerHTML = "<p>Failed to load recipes.</p>";
    }
  });

// Event listeners
searchInput.addEventListener("input", () => {
  displayRecipes(searchInput.value, sortSelect?.value || "alphabetical");
});

sortSelect?.addEventListener("change", () => {
  displayRecipes(searchInput.value, sortSelect.value);
});