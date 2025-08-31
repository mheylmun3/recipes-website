const recipes = [
    "Chicken Fajitas",
    "Roast",
    "Carnitas",
    "Chicken Pot Pie",
    "Chicken and Dumplings",
    "Pulled Pork",
    "Crockpot Chicken Alfredo",
    "Beef Short Ribs",
    "Chicken Piccata",
    "Creamy Lemon Chicken",
    "Teriyaki Chicken",
    "Birria Tacos",
    "Butter Chicken",
    "Creamy Chicken Pasta",
    "Soupy Chicken"
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
  