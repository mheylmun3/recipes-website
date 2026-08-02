const backToRecipeLink = document.getElementById("backToRecipeLink");
const editRecipeForm = document.getElementById("editRecipeForm");
const recipeNameInput = document.getElementById("recipeName");
const recipeCategoryInput = document.getElementById("recipeCategory");
const recipeServingsInput = document.getElementById("recipeServings");
const recipeCaloriesInput = document.getElementById("recipeCalories");
const recipeProteinInput = document.getElementById("recipeProtein");
const recipeFiberInput = document.getElementById("recipeFiber");
const recipeInstructionsInput = document.getElementById("recipeInstructions");
const editIngredientsList = document.getElementById("editIngredientsList");
const addIngredientRowBtn = document.getElementById("addIngredientRowBtn");

const recipeImageInput = document.getElementById("recipeImage");
const recipeImagePreview = document.getElementById("recipeImagePreview");
const removeRecipeImageBtn = document.getElementById("removeRecipeImageBtn");

const deleteRecipeBtn = document.getElementById("deleteRecipeBtn");
const deleteRecipeModal = document.getElementById("deleteRecipeModal");
const cancelDeleteRecipeBtn = document.getElementById("cancelDeleteRecipeBtn");
const confirmDeleteRecipeBtn = document.getElementById("confirmDeleteRecipeBtn");

const openNewIngredientModalBtn = document.getElementById("openNewIngredientModalBtn");

let pendingRecipeImage = "";
let removeRecipeImage = false;

const ingredientUnits = [
  "",
  "count",
  "tsp",
  "tbsp",
  "cups",
  "oz",
  "lbs",
  "ml",
  "liters",
  "gallon",
  "cans",
  "jars",
  "cloves",
  "box",
  "bag",
  "stick",
  "pint", 
  "container"
];

let currentSlug = null;
let originalRecipe = null;

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug");
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getIngredientCatalog() {
  try {
    const fallbackDefaults =
      typeof defaultIngredients !== "undefined" && Array.isArray(defaultIngredients)
        ? defaultIngredients
        : [];

    const saved = localStorage.getItem("ingredientCatalog");

    if (!saved) {
      localStorage.setItem("ingredientCatalog", JSON.stringify(fallbackDefaults));
      return [...fallbackDefaults];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...fallbackDefaults];
  } catch (error) {
    console.error("Failed to load ingredient catalog:", error);
    return [];
  }
}

function saveIngredientCatalog(catalog) {
  localStorage.setItem("ingredientCatalog", JSON.stringify(catalog));
}

function formatIngredientText(name, quantity, unit) {
  if (quantity == null || Number.isNaN(quantity)) {
    return name;
  }

  if (!unit) {
    return `${quantity} ${name}`;
  }

  return `${quantity} ${unit} ${name}`;
}

function createIngredientRow(ingredient = {}) {
  const row = document.createElement("div");
  row.className = "edit-ingredient-row";

  const suggestionsId = `suggestions-${Math.random()
    .toString(36)
    .slice(2, 9)}`;

  row.innerHTML = `
    <div class="ingredient-search-wrapper">
      <input
        type="text"
        class="ingredient-search-input"
        placeholder="Search ingredient"
        value="${ingredient.name || ""}"
        autocomplete="off"
      />

      <input
        type="hidden"
        class="ingredient-id-hidden"
        value="${ingredient.ingredientId || ingredient.slug || ""}"
      />

      <div
        id="${suggestionsId}"
        class="ingredient-suggestions suggestions-list"
      ></div>
    </div>

    <input
      type="number"
      class="ingredient-quantity"
      placeholder="Quantity"
      step="any"
      value="${ingredient.quantity ?? ""}"
    />

    <input
      type="text"
      class="ingredient-unit"
      value="${ingredient.unit || ingredient.default_unit || ""}"
      placeholder="Unit"
      readonly
      tabindex="-1"
    />

    <button type="button" class="remove-ingredient-btn">
      Remove
    </button>
  `;

  const searchInput = row.querySelector(".ingredient-search-input");
  const hiddenId = row.querySelector(".ingredient-id-hidden");
  const unitInput = row.querySelector(".ingredient-unit");
  const suggestionsBox = row.querySelector(`#${suggestionsId}`);
  const removeBtn = row.querySelector(".remove-ingredient-btn");

  function selectIngredient(selectedIngredient) {
    searchInput.value = selectedIngredient.name;
    hiddenId.value = selectedIngredient.slug;
    unitInput.value = selectedIngredient.default_unit || "count";

    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
  }

  function renderSuggestions(searchTerm) {
    suggestionsBox.innerHTML = "";

    const matches = getIngredientMatches(searchTerm);

    if (!matches.length) {
      suggestionsBox.style.display = "none";
      return;
    }

    matches.forEach(item => {
      const option = document.createElement("div");
      option.className = "suggestion-item";

      const name = document.createElement("span");
      name.textContent = item.name;

      const unit = document.createElement("small");
      unit.textContent = item.default_unit || "count";

      option.appendChild(name);
      option.appendChild(unit);

      option.addEventListener("click", () => {
        selectIngredient(item);
      });

      suggestionsBox.appendChild(option);
    });

    suggestionsBox.style.display = "block";
  }

  searchInput.addEventListener("input", () => {
    hiddenId.value = "";
    unitInput.value = "";
    renderSuggestions(searchInput.value);
  });

  searchInput.addEventListener("focus", () => {
    renderSuggestions(searchInput.value);
  });

  removeBtn.addEventListener("click", () => {
    row.remove();
  });

  document.addEventListener("click", event => {
    if (!row.contains(event.target)) {
      suggestionsBox.style.display = "none";
    }
  });

  editIngredientsList.appendChild(row);

  if (ingredient.name) {
    const existingIngredient = ingredientCatalog.find(
      item =>
        item.slug === ingredient.ingredientId ||
        normalizeIngredientName(item.name) ===
          normalizeIngredientName(ingredient.name)
    );

    if (existingIngredient) {
      hiddenId.value = existingIngredient.slug;

      if (!unitInput.value) {
        unitInput.value =
          existingIngredient.default_unit || "count";
      }
    }
  }

  return row;
}

function collectIngredientsFromForm() {
  const rows = document.querySelectorAll(".edit-ingredient-row");

  return Array.from(rows)
    .map(row => {
      const searchInput = row.querySelector(".ingredient-search-input");
      const hiddenId = row.querySelector(".ingredient-id-hidden");
      const quantityInput = row.querySelector(".ingredient-quantity");
      const unitInput = row.querySelector(".ingredient-unit");

      const name = searchInput.value.trim();
      const ingredientId = hiddenId.value;
      const unit = unitInput.value.trim();

      if (!name || !ingredientId) {
        return null;
      }

      return {
        ingredientId,
        name,
        quantity:
          quantityInput.value === ""
            ? null
            : parseFloat(quantityInput.value),
        unit
      };
    })
    .filter(Boolean);
}

if (deleteRecipeBtn) {
  deleteRecipeBtn.addEventListener("click", () => {
    if (deleteRecipeModal) {
      deleteRecipeModal.style.display = "flex";
    }
  });
}

if (cancelDeleteRecipeBtn) {
  cancelDeleteRecipeBtn.addEventListener("click", () => {
    if (deleteRecipeModal) {
      deleteRecipeModal.style.display = "none";
    }
  });
}

if (deleteRecipeModal) {
  deleteRecipeModal.addEventListener("click", event => {
    if (event.target === deleteRecipeModal) {
      deleteRecipeModal.style.display = "none";
    }
  });
}

if (confirmDeleteRecipeBtn) {
  confirmDeleteRecipeBtn.addEventListener("click", async () => {
    if (!currentSlug) {
      alert("No recipe found to hide.");
      return;
    }

    try {
      await softDeleteRecipeInSupabase(currentSlug);
      window.location.href = "all-recipes.html";
    } catch (error) {
      console.error("Failed to hide recipe:", error);
      alert(error.message || "Failed to hide recipe.");
    }
  });
}

async function loadRecipe() {
  currentSlug = getSlugFromUrl();

  if (!currentSlug) {
    alert("No recipe slug found.");
    return;
  }

  backToRecipeLink.href = `recipe.html?slug=${encodeURIComponent(currentSlug)}`;

  try {
    originalRecipe = await fetchRecipeBySlugFromSupabase(currentSlug);

    if (!originalRecipe) {
      alert("Recipe not found.");
      return;
    }

    loadRecipeIntoForm(originalRecipe);
  } catch (error) {
    console.error("Error loading recipe:", error);
    alert("Recipe not found.");
  }
}

editRecipeForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!originalRecipe) {
    alert("No recipe loaded to edit.");
    return;
  }

  const servings = parseInt(recipeServingsInput.value, 10);

  if (!Number.isInteger(servings) || servings < 1) {
    alert("Enter a valid servings value.");
    return;
  }

  const caloriesRaw = recipeCaloriesInput.value.trim();
  const proteinRaw = recipeProteinInput.value.trim();
  const fiberRaw = recipeFiberInput.value.trim();

  const calories = caloriesRaw === "" ? null : parseFloat(caloriesRaw);
  const protein = proteinRaw === "" ? null : parseFloat(proteinRaw);
  const fiber = fiberRaw === "" ? null : parseFloat(fiberRaw);

  const updatedRecipe = {
    ...originalRecipe,
    name: recipeNameInput.value.trim(),
    slug: currentSlug,
    category: recipeCategoryInput.value,
    servings,
    calories,
    protein,
    fiber,
    image: removeRecipeImage ? "" : (pendingRecipeImage || originalRecipe.image || ""),
    instructions: recipeInstructionsInput.value.trim(),
    ingredients: collectIngredientsFromForm()
  };

  try {
    await updateRecipeInSupabase(updatedRecipe);
    window.location.href = `recipe.html?slug=${encodeURIComponent(currentSlug)}`;
  } catch (error) {
    console.error("Failed to update recipe:", error);

    const message = error?.message || "";

    if (
      message.toLowerCase().includes("auth session missing") ||
      message.toLowerCase().includes("you must be signed in") ||
      message.toLowerCase().includes("jwt")
    ) {
      showAuthRequiredModal("Please login to add or change any recipes.");
      return;
    }

    alert(message || "Failed to update recipe.");
  }
});

recipeImageInput.addEventListener("change", async () => {
  const file = recipeImageInput.files?.[0];
  if (!file) return;

  try {
    const dataUrl = await readFileAsDataURL(file);
    pendingRecipeImage = dataUrl;
    removeRecipeImage = false;

    if (recipeImagePreview) {
      recipeImagePreview.src = dataUrl;
      recipeImagePreview.style.display = "block";
    }
  } catch (error) {
    console.error("Failed to read image:", error);
    alert("Failed to load image.");
  }
});

removeRecipeImageBtn.addEventListener("click", () => {
  pendingRecipeImage = "";
  removeRecipeImage = true;

  if (recipeImageInput) {
    recipeImageInput.value = "";
  }

  if (recipeImagePreview) {
    recipeImagePreview.src = "";
    recipeImagePreview.style.display = "none";
  }
});

if (addIngredientRowBtn) {
  addIngredientRowBtn.addEventListener("click", () => {
    createIngredientRow();
  });
}

if (recipeImageInput) {
  recipeImageInput.addEventListener("change", async () => {
    const file = recipeImageInput.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataURL(file);
      pendingRecipeImage = dataUrl;
      removeRecipeImage = false;

      if (recipeImagePreview) {
        recipeImagePreview.src = dataUrl;
        recipeImagePreview.style.display = "block";
      }
    } catch (error) {
      console.error("Failed to read image:", error);
      alert("Failed to load image.");
    }
  });
}

if (removeRecipeImageBtn) {
  removeRecipeImageBtn.addEventListener("click", () => {
    pendingRecipeImage = "";
    removeRecipeImage = true;

    if (recipeImageInput) {
      recipeImageInput.value = "";
    }

    if (recipeImagePreview) {
      recipeImagePreview.src = "";
      recipeImagePreview.style.display = "none";
    }
  });
}

openNewIngredientModalBtn?.addEventListener("click", () => {
  openIngredientModal({
    ingredients: ingredientCatalog,

    onCreated: createdIngredient => {
      ingredientCatalog.push(createdIngredient);

      ingredientCatalog.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      const newRow = createIngredientRow({
        ingredientId: createdIngredient.slug,
        name: createdIngredient.name,
        quantity: "",
        unit: createdIngredient.default_unit
      });

      const searchInput = newRow.querySelector(
        ".ingredient-search-input"
      );

      searchInput?.focus();
    }
  });
});

loadRecipe();