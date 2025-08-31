// Read URL param
const params = new URLSearchParams(window.location.search);
const category = params.get("type");

// DOM elements
const title = document.getElementById("categoryTitle");
const desc = document.getElementById("categoryDescription");
const recipeGrid = document.getElementById("recipeGrid");

// Descriptions (optional)
const descriptions = {
  "sweet-treats": "Indulgent and protein-packed desserts to satisfy your cravings.",
  "breakfast": "Start your day with high-protein, nutritious meals and snacks.",
  "soups": "Hearty, comforting bowls of goodness for any season.",
  "crockpot-meals": "Set it, forget it, and enjoy slow-cooked flavor-packed meals.",
  "stove": "Quick and satisfying dishes you can whip up on the stove.",
  "side-dishes": "Perfect pairings to complete your meals."
};

// Display
function displayCategory(name, recipes) {
  title.textContent = name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  desc.textContent = descriptions[category] || "";

  recipeGrid.innerHTML = "";
  recipes.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.innerHTML = `<h4>${recipe}</h4>`;
    recipeGrid.appendChild(card);
  });
}

if (category in recipeCategories) {
  displayCategory(category, recipeCategories[category]);
} else {
  title.textContent = "Category Not Found";
  desc.textContent = "Please check the URL or return to the homepage.";
}
