const addRecipeForm = document.getElementById("addRecipeForm");
const recipeNameInput = document.getElementById("recipeName");
const recipeCategoryInput = document.getElementById("recipeCategory");
const recipeInstructionsInput = document.getElementById("recipeInstructions");
const addIngredientsList = document.getElementById("addIngredientsList");
const addIngredientRowBtn = document.getElementById("addIngredientRowBtn");
const recipeServingsInput = document.getElementById("recipeServings");
const recipeCaloriesInput = document.getElementById("recipeCalories");
const recipeProteinInput = document.getElementById("recipeProtein");
const recipeFiberInput = document.getElementById("recipeFiber");
const recipeImageInput = document.getElementById("recipeImage");
const recipeImagePreview = document.getElementById("recipeImagePreview");

const authRequiredModal = document.getElementById("authRequiredModal");
const authRequiredMessage = document.getElementById("authRequiredMessage");
const closeAuthRequiredBtn = document.getElementById("closeAuthRequiredBtn");
const goToLoginBtn = document.getElementById("goToLoginBtn");

const openNewIngredientModalBtn = document.getElementById("openNewIngredientModalBtn");

let pendingRecipeImage = "";
let ingredientCatalog = [];

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
  "containers"
];

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

  addIngredientsList.appendChild(row);

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

addRecipeForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name = recipeNameInput.value.trim();
  const category = recipeCategoryInput.value;
  const servings = parseInt(recipeServingsInput.value, 10);
  const caloriesRaw = recipeCaloriesInput.value.trim();
  const proteinRaw = recipeProteinInput.value.trim();
  const fiberRaw = recipeFiberInput.value.trim();

  const calories = caloriesRaw === "" ? null : parseFloat(caloriesRaw);
  const protein = proteinRaw === "" ? null : parseFloat(proteinRaw);
  const fiber = fiberRaw === "" ? null : parseFloat(fiberRaw);
  const instructions = recipeInstructionsInput.value.trim();
  const ingredients = collectIngredientsFromForm();
  const slug = slugify(name);

  if (!Number.isInteger(servings) || servings < 1) {
    alert("Enter a valid servings value.");
    return;
  }

  if (!name) {
    alert("Enter a recipe name.");
    return;
  }

  if (!category) {
    alert("Select a category.");
    return;
  }

  if (!instructions) {
    alert("Enter recipe instructions.");
    return;
  }

  if (!ingredients.length) {
    alert("Add at least one ingredient.");
    return;
  }

  try {
    const existingRecipes = await fetchAllRecipesFromSupabase();
    const slugAlreadyExists = existingRecipes.some(recipe => recipe.slug === slug);

    if (slugAlreadyExists) {
      alert("A recipe with this name already exists.");
      return;
    }

    const newRecipe = {
      name,
      slug,
      category,
      servings,
      calories,
      protein,
      fiber,
      image: pendingRecipeImage || "",
      ingredients,
      instructions
    };

    await createRecipeInSupabase(newRecipe);

    window.location.href = `recipe.html?slug=${encodeURIComponent(slug)}`;
  } catch (error) {
    console.error("Failed to save recipe:", error);

    const message = error?.message || "";

    if (
      message.toLowerCase().includes("auth session missing") ||
      message.toLowerCase().includes("you must be signed in") ||
      message.toLowerCase().includes("jwt")
    ) {
      showAuthRequiredModal("Please login to add or change any recipes.");
      return;
    }

    alert(message || "Failed to save recipe.");
  }
});

addIngredientRowBtn.addEventListener("click", () => {
  createIngredientRow();
});

createIngredientRow();

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showAuthRequiredModal(
  message = "Please login to add or change any recipes."
) {
  if (!authRequiredModal) return;
  if (authRequiredMessage) {
    authRequiredMessage.textContent = message;
  }
  authRequiredModal.style.display = "flex";
}

function hideAuthRequiredModal() {
  if (authRequiredModal) {
    authRequiredModal.style.display = "none";
  }
}

recipeImageInput.addEventListener("change", async () => {
  const file = recipeImageInput.files?.[0];
  if (!file) {
    pendingRecipeImage = "";
    if (recipeImagePreview) {
      recipeImagePreview.style.display = "none";
      recipeImagePreview.src = "";
    }
    return;
  }

  try {
    const dataUrl = await readFileAsDataURL(file);
    pendingRecipeImage = dataUrl;

    if (recipeImagePreview) {
      recipeImagePreview.src = dataUrl;
      recipeImagePreview.style.display = "block";
    }
  } catch (error) {
    console.error("Failed to read image:", error);
    alert("Failed to load image.");
  }
});

if (closeAuthRequiredBtn) {
  closeAuthRequiredBtn.addEventListener("click", hideAuthRequiredModal);
}

if (goToLoginBtn) {
  goToLoginBtn.addEventListener("click", () => {
    window.location.href = "login.html";
  });
}

if (authRequiredModal) {
  authRequiredModal.addEventListener("click", event => {
    if (event.target === authRequiredModal) {
      hideAuthRequiredModal();
    }
  });
}

async function loadIngredientCatalog() {
  try {
    ingredientCatalog = await fetchIngredientsFromSupabase();
  } catch (error) {
    console.error("Failed to load ingredients from Supabase:", error);
    ingredientCatalog = [];
  }
}

function getIngredientMatches(searchTerm) {
  const cleanedSearch = searchTerm.trim().toLowerCase();

  if (!cleanedSearch) {
    return ingredientCatalog.slice(0, 8);
  }

  return ingredientCatalog
    .filter(ingredient =>
      ingredient.name.toLowerCase().includes(cleanedSearch)
    )
    .slice(0, 8);
}

matches.forEach(ingredient => {
  const option = document.createElement("div");
  option.className = "suggestion-item";
  option.textContent = ingredient.name;

  option.addEventListener("click", () => {
    nameInput.value = ingredient.name;
    nameInput.dataset.ingredientId = ingredient.slug;
    unitSelect.value = ingredient.default_unit || "count";

    suggestions.innerHTML = "";
    suggestions.style.display = "none";
  });

  suggestions.appendChild(option);
});

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

(async function initAddRecipePage() {
  await loadIngredientCatalog();
  createIngredientRow();
})();

openNewIngredientModalBtn?.addEventListener("click", () => {
  openIngredientModal({
    ingredients: ingredientCatalog,

    onCreated: createdIngredient => {
      ingredientCatalog.push(createdIngredient);

      ingredientCatalog.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      createIngredientRow({
        ingredientId: createdIngredient.slug,
        name: createdIngredient.name,
        quantity: "",
        unit: createdIngredient.default_unit
      });
    }
  });
});