const recipes = [
    "No Bake Cookies",
    "Protein Balls",
    "Chocolate Chip Cookies",
    "Chocolate Covered Raspberries",
    "S'mores Cookie Bars"
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
  