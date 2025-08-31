const fs = require("fs");
const path = require("path");

// Load recipe data
const recipes = require("../all-recipes.json");

// HTML template function
const buildHtml = (recipe) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${recipe.name}</title>
  <link rel="stylesheet" href="../styles.css" />
</head>
<body>
  <header>
    <nav class="navbar">
      <h1><a href="../index.html">My Recipes</a></h1>
      <ul>
        <li><a href="../all-recipes.html">All Recipes</a></li>
        <li><a href="#">Add Recipe</a></li>
        <li><a href="#">Inventory</a></li>
        <li><a href="#">Grocery List</a></li>
      </ul>
    </nav>
  </header>

  <main class="recipe-detail">
    <h2>${recipe.name}</h2>
    <h3>Ingredients:</h3>
    <ul>
      ${recipe.ingredients.map(item => `<li>${item}</li>`).join("\n")}
    </ul>

    <h3>Instructions:</h3>
    <p>${recipe.instructions}</p>
  </main>

  <footer>
    <p>&copy; 2025 My Recipes</p>
  </footer>
</body>
</html>
`;

// Create output folder if needed
const outputDir = path.join(__dirname, "recipes");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// Generate each HTML file
recipes.forEach(recipe => {
  const filePath = path.join(outputDir, `${recipe.slug}.html`);
  fs.writeFileSync(filePath, buildHtml(recipe));
});

console.log("✅ Recipe pages generated in /recipes");
