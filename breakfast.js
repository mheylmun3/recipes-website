const recipes = [
    "Chia Seed Pudding",
    "Protein Overnight Oats",
    "Protein Muffins",
    "Overnight Oats",
    "Green Smoothie"
  ];
  
  const recipeGrid = document.getElementById("recipeGrid");
  
  function displayRecipes() {
    recipes.forEach(name => {
      const card = document.createElement("div");
      card.className = "recipe-card";
      card.innerHTML = `<h4>${name}</h4>`;
      recipeGrid.appendChild(card);
    });
  }
  
  window.addEventListener("DOMContentLoaded", displayRecipes);
  