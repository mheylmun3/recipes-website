const recipes = [
    "Chicken Enchilada Soup",
    "Chili",
    "Tortellini Soup",
    "Crack Chicken Noodle Soup",
    "Chicken Noodle Soup",
    "Loaded Potato Soup",
    "Lasagna Soup",
    "Lemon Chicken Orzo"
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
  