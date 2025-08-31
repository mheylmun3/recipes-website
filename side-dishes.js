const recipes = [
    "Parmesan-Crusted Oven Roasted Potatoes",
    "Parmesan-Garlic Butter Pizza Rolls",
    "Mac n Cheese",
    "Mashed Potatoes",
    "Roasted Garlic"
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
  