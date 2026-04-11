function trackRecipeClick(slug) {
  const key = `clicks-${slug}`;
  const count = localStorage.getItem(key);
  localStorage.setItem(key, count ? parseInt(count, 10) + 1 : 1);
}

function getUserRecipes() {
  const saved = localStorage.getItem("userRecipes");
  return saved ? JSON.parse(saved) : [];
}

const featuredContainer = document.querySelector(".recipe-card-container");

fetch("all-recipes.json")
  .then(res => res.json())
  .then(jsonRecipes => {
    const userRecipes = getUserRecipes();
    const recipes = [...jsonRecipes, ...userRecipes];

    recipes.forEach(recipe => {
      const clicks = localStorage.getItem(`clicks-${recipe.slug}`) || 0;
      recipe.clicks = parseInt(clicks, 10);
    });

    const uniqueRecipes = [];
    const seen = new Set();

    recipes.forEach(recipe => {
      const key = recipe.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecipes.push(recipe);
      }
    });

    const sorted = uniqueRecipes
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 4);

    featuredContainer.innerHTML = "";

    sorted.forEach(recipe => {
      const card = document.createElement("a");
      card.href = `recipe.html?slug=${encodeURIComponent(recipe.slug)}`;
      card.className = "recipe-card";

      card.addEventListener("click", () => {
        trackRecipeClick(recipe.slug);
      });

      card.innerHTML = `
        <h4>${recipe.name}</h4>
        <p>${recipe.instructions.slice(0, 100)}...</p>
      `;

      featuredContainer.appendChild(card);
    });
  })
  .catch(error => {
    console.error("Error loading featured recipes:", error);
    featuredContainer.innerHTML = "<p>Failed to load featured recipes.</p>";
  });