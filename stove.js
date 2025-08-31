const recipes = [
    "Tacos",
    "Meatballs and Spaghetti",
    "Cheeseburger Sliders",
    "Ravioli",
    "Gigi Hadid Pasta",
    "Creamy Sausage Bowtie Pasta",
    "French Onion Pasta",
    "French Onion Chicken",
    "Breaded Chicken",
    "Barbecue Chicken Bake",
    "Sausage and Peppers",
    "Ricotta Meatballs",
    "Rigatoni P",
    "Stir Fry",
    "Asian-Style Beef Burgers",
    "Beef and Broccoli"
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
  