const recipeGrid = document.getElementById("recipeGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

const categoryFilterButtons = document.querySelectorAll(
  ".category-filter-btn"
);

let allRecipes = [];
let selectedCategory = "";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function trackRecipeClick(slug) {
  const key = `clicks-${slug}`;
  const currentCount =
    parseInt(localStorage.getItem(key), 10) || 0;

  localStorage.setItem(
    key,
    String(currentCount + 1)
  );
}

function getRecipeClickCount(recipe) {
  return (
    parseInt(
      localStorage.getItem(`clicks-${recipe.slug}`),
      10
    ) || 0
  );
}

function recipeMatchesSearch(recipe, searchTerm) {
  if (!searchTerm) {
    return true;
  }

  const normalizedName = normalizeText(recipe.name);
  const normalizedCategory = normalizeText(
    recipe.category
  );

  return (
    normalizedName.includes(searchTerm) ||
    normalizedCategory.includes(searchTerm)
  );
}

function recipeMatchesCategory(recipe) {
  if (!selectedCategory) {
    return true;
  }

  return (
    normalizeText(recipe.category) ===
    normalizeText(selectedCategory)
  );
}

function sortRecipes(recipes, sortBy) {
  const sortedRecipes = [...recipes];

  if (sortBy === "popularity") {
    sortedRecipes.sort((a, b) => {
      const clickDifference =
        getRecipeClickCount(b) -
        getRecipeClickCount(a);

      if (clickDifference !== 0) {
        return clickDifference;
      }

      return a.name.localeCompare(b.name);
    });

    return sortedRecipes;
  }

  sortedRecipes.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return sortedRecipes;
}

function createRecipeCard(recipe) {
  const card = document.createElement("a");

  card.className = "recipe-card";
  card.href =
    `recipe.html?slug=${encodeURIComponent(recipe.slug)}`;

  const title = document.createElement("h4");
  title.textContent = recipe.name;

  card.appendChild(title);

  card.addEventListener("click", () => {
    trackRecipeClick(recipe.slug);
  });

  return card;
}

function displayRecipes() {
  if (!recipeGrid) {
    return;
  }

  const searchTerm = normalizeText(
    searchInput?.value
  );

  const sortBy =
    sortSelect?.value || "alphabetical";

  const filteredRecipes = allRecipes.filter(
    recipe =>
      recipeMatchesSearch(recipe, searchTerm) &&
      recipeMatchesCategory(recipe)
  );

  const sortedRecipes = sortRecipes(
    filteredRecipes,
    sortBy
  );

  recipeGrid.innerHTML = "";

  if (!sortedRecipes.length) {
    const emptyMessage =
      document.createElement("p");

    emptyMessage.className =
      "recipe-grid-empty-message";

    emptyMessage.textContent =
      selectedCategory || searchTerm
        ? "No recipes match the selected filters."
        : "No recipes found.";

    recipeGrid.appendChild(emptyMessage);
    return;
  }

  const fragment =
    document.createDocumentFragment();

  sortedRecipes.forEach(recipe => {
    fragment.appendChild(
      createRecipeCard(recipe)
    );
  });

  recipeGrid.appendChild(fragment);
}

function setSelectedCategory(selectedButton) {
  selectedCategory =
    selectedButton.dataset.category || "";

  categoryFilterButtons.forEach(button => {
    const isActive =
      button === selectedButton;

    button.classList.toggle(
      "active",
      isActive
    );

    button.setAttribute(
      "aria-pressed",
      String(isActive)
    );
  });

  displayRecipes();
}

async function loadRecipes() {
  if (!recipeGrid) {
    return;
  }

  try {
    allRecipes =
      await fetchAllRecipesFromSupabase();

    if (!Array.isArray(allRecipes)) {
      allRecipes = [];
    }

    displayRecipes();
  } catch (error) {
    console.error(
      "Error loading recipes from Supabase:",
      error
    );

    recipeGrid.innerHTML =
      "<p>Failed to load recipes.</p>";
  }
}

if (searchInput) {
  searchInput.addEventListener(
    "input",
    displayRecipes
  );
}

if (sortSelect) {
  sortSelect.addEventListener(
    "change",
    displayRecipes
  );
}

categoryFilterButtons.forEach(button => {
  button.addEventListener("click", () => {
    setSelectedCategory(button);
  });
});

loadRecipes();