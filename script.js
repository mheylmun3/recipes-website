const featuredContainer = document.querySelector(".recipe-card-container");

function trackRecipeClick(slug) {
  const key = `clicks-${slug}`;
  const count = localStorage.getItem(key);
  localStorage.setItem(key, count ? parseInt(count, 10) + 1 : 1);
}

function getRecipeClicks(slug) {
  return parseInt(localStorage.getItem(`clicks-${slug}`), 10) || 0;
}

function truncateText(text, maxLength = 110) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function buildMacroPills(recipe) {
  const pills = [];

  if (recipe.calories != null) {
    pills.push(`<span class="featured-macro-pill">${recipe.calories} cal</span>`);
  }

  if (recipe.protein != null) {
    pills.push(`<span class="featured-macro-pill">${recipe.protein}g protein</span>`);
  }

  if (recipe.fiber != null) {
    pills.push(`<span class="featured-macro-pill">${recipe.fiber}g fiber</span>`);
  }

  return pills.join("");
}

function buildFeaturedCard(recipe) {
  const card = document.createElement("a");
  card.href = `recipe.html?slug=${encodeURIComponent(recipe.slug)}`;
  card.className = "recipe-card featured-recipe-card";

  card.addEventListener("click", () => {
    trackRecipeClick(recipe.slug);
  });

  const imageMarkup = recipe.image
    ? `<div class="featured-image-wrap">
        <img src="${recipe.image}" alt="${recipe.name}" class="featured-recipe-image" />
      </div>`
    : "";

  const description =
    truncateText(recipe.instructions, 95) ||
    "A delicious recipe from Gab's Italian Kitchen.";

  const macroMarkup = buildMacroPills(recipe);

  card.innerHTML = `
    ${imageMarkup}
    <div class="featured-card-content">
      <h4>${recipe.name}</h4>
      <p>${description}</p>
      ${macroMarkup ? `<div class="featured-macro-row">${macroMarkup}</div>` : ""}
    </div>
  `;

  return card;
}

async function loadFeaturedRecipes() {
  if (!featuredContainer) return;

  try {
    let recipes = await fetchAllRecipesFromSupabase();

    recipes = recipes.map(recipe => ({
      ...recipe,
      clicks: getRecipeClicks(recipe.slug)
    }));

    const sorted = [...recipes]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 4);

    // fallback if no one has clicked anything yet
    const featuredRecipes =
      sorted.some(recipe => recipe.clicks > 0)
        ? sorted
        : recipes.slice(0, 4);

    featuredContainer.innerHTML = "";

    featuredRecipes.forEach(recipe => {
      const card = buildFeaturedCard(recipe);
      featuredContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading featured recipes:", error);
    featuredContainer.innerHTML = "<p>Failed to load featured recipes.</p>";
  }
}

loadFeaturedRecipes();