const addRecipeForm = document.getElementById("addRecipeForm");

const recipeNameInput = document.getElementById("recipeName");
const recipeCategoryInput = document.getElementById("recipeCategory");
const recipeServingsInput = document.getElementById("recipeServings");
const recipeCaloriesInput = document.getElementById("recipeCalories");
const recipeProteinInput = document.getElementById("recipeProtein");
const recipeFiberInput = document.getElementById("recipeFiber");
const recipeInstructionsInput = document.getElementById(
  "recipeInstructions"
);

const recipeImageInput = document.getElementById("recipeImage");
const recipeImagePreview = document.getElementById(
  "recipeImagePreview"
);

const addIngredientsList = document.getElementById(
  "addIngredientsList"
);
const addIngredientRowBtn = document.getElementById(
  "addIngredientRowBtn"
);
const openNewIngredientModalBtn = document.getElementById(
  "openNewIngredientModalBtn"
);

const authRequiredModal = document.getElementById(
  "authRequiredModal"
);
const authRequiredMessage = document.getElementById(
  "authRequiredMessage"
);
const closeAuthRequiredBtn = document.getElementById(
  "closeAuthRequiredBtn"
);
const goToLoginBtn = document.getElementById(
  "goToLoginBtn"
);

let pendingRecipeImage = "";
let ingredientCatalog = [];

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function showAuthRequiredModal(
  message = "Please login to add or change any recipes."
) {
  if (!authRequiredModal) {
    alert(message);
    return;
  }

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

function isAuthenticationError(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("auth session missing") ||
    message.includes("you must be signed in") ||
    message.includes("jwt") ||
    message.includes("not authenticated")
  );
}

async function loadIngredientCatalog() {
  try {
    ingredientCatalog =
      await fetchIngredientsFromSupabase();

    ingredientCatalog.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } catch (error) {
    console.error(
      "Failed to load ingredients from Supabase:",
      error
    );

    ingredientCatalog = [];
    throw error;
  }
}

function getIngredientMatches(searchTerm) {
  const normalizedSearch = normalizeName(searchTerm);

  if (!normalizedSearch) {
    return ingredientCatalog.slice(0, 8);
  }

  return ingredientCatalog
    .filter(ingredient =>
      normalizeName(ingredient.name).includes(
        normalizedSearch
      )
    )
    .slice(0, 8);
}

function findCatalogIngredient(ingredient = {}) {
  const possibleId =
    ingredient.ingredientId ||
    ingredient.ingredient_id ||
    ingredient.slug ||
    "";

  return ingredientCatalog.find(item => {
    const idMatches =
      item.slug === possibleId ||
      item.id === possibleId;

    const nameMatches =
      normalizeName(item.name) ===
      normalizeName(ingredient.name);

    return idMatches || nameMatches;
  });
}

function createIngredientRow(ingredient = {}) {
  if (!addIngredientsList) {
    console.error("addIngredientsList was not found.");
    return null;
  }

  const catalogMatch =
    findCatalogIngredient(ingredient);

  const initialName =
    catalogMatch?.name ||
    ingredient.name ||
    ingredient.ingredient_name ||
    "";

  const initialSlug =
    catalogMatch?.slug ||
    ingredient.ingredientId ||
    ingredient.ingredient_id ||
    ingredient.slug ||
    "";

  const initialUnit =
    catalogMatch?.default_unit ||
    ingredient.unit ||
    ingredient.default_unit ||
    "";

  const initialQuantity =
    ingredient.quantity ?? "";

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
        value="${escapeHtml(initialName)}"
        autocomplete="off"
      />

      <input
        type="hidden"
        class="ingredient-id-hidden"
        value="${escapeHtml(initialSlug)}"
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
      value="${escapeHtml(initialQuantity)}"
    />

    <input
      type="text"
      class="ingredient-unit"
      value="${escapeHtml(initialUnit)}"
      placeholder=""
      readonly
      tabindex="-1"
    />

    <button
      type="button"
      class="remove-ingredient-btn"
    >
      Remove
    </button>
  `;

  const searchInput = row.querySelector(
    ".ingredient-search-input"
  );
  const hiddenId = row.querySelector(
    ".ingredient-id-hidden"
  );
  const unitInput = row.querySelector(
    ".ingredient-unit"
  );
  const suggestionsBox = row.querySelector(
    `#${suggestionsId}`
  );
  const removeBtn = row.querySelector(
    ".remove-ingredient-btn"
  );

  function hideSuggestions() {
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
  }

  function selectIngredient(selectedIngredient) {
    searchInput.value = selectedIngredient.name;
    hiddenId.value = selectedIngredient.slug;
    unitInput.value =
      selectedIngredient.default_unit || "";

    hideSuggestions();
  }

  function renderSuggestions(searchTerm) {
    suggestionsBox.innerHTML = "";

    const matches =
      getIngredientMatches(searchTerm);

    if (!matches.length) {
      suggestionsBox.style.display = "none";
      return;
    }

    matches.forEach(item => {
      const option = document.createElement("div");
      option.className = "suggestion-item";

      // Only display the ingredient name.
      // The unit fills after selection.
      option.textContent = item.name;

      option.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

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
      hideSuggestions();
    }
  });

  addIngredientsList.appendChild(row);

  return row;
}

function collectIngredientsFromForm() {
  const rows = addIngredientsList.querySelectorAll(
    ".edit-ingredient-row"
  );

  const ingredients = [];

  for (const row of rows) {
    const searchInput = row.querySelector(
      ".ingredient-search-input"
    );
    const hiddenId = row.querySelector(
      ".ingredient-id-hidden"
    );
    const quantityInput = row.querySelector(
      ".ingredient-quantity"
    );
    const unitInput = row.querySelector(
      ".ingredient-unit"
    );

    const name = searchInput.value.trim();
    const ingredientId = hiddenId.value.trim();
    const quantityText =
      quantityInput.value.trim();
    const unit = unitInput.value.trim();

    const rowIsEmpty =
      !name &&
      !ingredientId &&
      !quantityText &&
      !unit;

    if (rowIsEmpty) {
      continue;
    }

    if (!name || !ingredientId) {
      throw new Error(
        `Select "${name || "the ingredient"}" from the ingredient suggestions.`
      );
    }

    if (!unit) {
      throw new Error(
        `${name} does not have a default unit. Update it on the Ingredients page.`
      );
    }

    let quantity = null;

    if (quantityText !== "") {
      quantity = parseFloat(quantityText);

      if (Number.isNaN(quantity)) {
        throw new Error(
          `Enter a valid quantity for ${name}.`
        );
      }
    }

    ingredients.push({
      ingredientId,
      name,
      quantity,
      unit,
      displayText: formatIngredientText(
        name,
        quantity,
        unit
      )
    });
  }

  return ingredients;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(
        reader.error ||
          new Error("Failed to read image.")
      );
    };

    reader.readAsDataURL(file);
  });
}

async function handleImageSelection() {
  const file = recipeImageInput?.files?.[0];

  if (!file) {
    pendingRecipeImage = "";

    if (recipeImagePreview) {
      recipeImagePreview.removeAttribute("src");
      recipeImagePreview.style.display = "none";
    }

    return;
  }

  try {
    pendingRecipeImage =
      await readFileAsDataURL(file);

    if (recipeImagePreview) {
      recipeImagePreview.src =
        pendingRecipeImage;

      recipeImagePreview.style.display =
        "block";
    }
  } catch (error) {
    console.error(
      "Failed to read image:",
      error
    );

    alert("Failed to load image.");
  }
}

async function handleRecipeSubmit(event) {
  event.preventDefault();

  const name = recipeNameInput.value.trim();
  const category =
    recipeCategoryInput.value;
  const servings = parseInt(
    recipeServingsInput.value,
    10
  );
  const instructions =
    recipeInstructionsInput.value.trim();

  if (!name) {
    alert("Enter a recipe name.");
    return;
  }

  if (!category) {
    alert("Select a category.");
    return;
  }

  if (
    !Number.isInteger(servings) ||
    servings < 1
  ) {
    alert("Enter a valid servings value.");
    return;
  }

  if (!instructions) {
    alert("Enter recipe instructions.");
    return;
  }

  const caloriesText =
    recipeCaloriesInput?.value.trim() || "";
  const proteinText =
    recipeProteinInput?.value.trim() || "";
  const fiberText =
    recipeFiberInput?.value.trim() || "";

  const calories =
    caloriesText === ""
      ? null
      : parseFloat(caloriesText);

  const protein =
    proteinText === ""
      ? null
      : parseFloat(proteinText);

  const fiber =
    fiberText === ""
      ? null
      : parseFloat(fiberText);

  if (
    caloriesText !== "" &&
    Number.isNaN(calories)
  ) {
    alert("Enter a valid calorie value.");
    return;
  }

  if (
    proteinText !== "" &&
    Number.isNaN(protein)
  ) {
    alert("Enter a valid protein value.");
    return;
  }

  if (
    fiberText !== "" &&
    Number.isNaN(fiber)
  ) {
    alert("Enter a valid fiber value.");
    return;
  }

  let ingredients;

  try {
    ingredients = collectIngredientsFromForm();
  } catch (error) {
    alert(error.message);
    return;
  }

  if (!ingredients.length) {
    alert("Add at least one ingredient.");
    return;
  }

  const slug = slugify(name);

  try {
    const existingRecipes =
      await fetchAllRecipesFromSupabase();

    const slugAlreadyExists =
      existingRecipes.some(
        recipe => recipe.slug === slug
      );

    if (slugAlreadyExists) {
      alert(
        "A recipe with this name already exists."
      );
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

    window.location.href =
      `recipe.html?slug=${encodeURIComponent(slug)}`;
  } catch (error) {
    console.error(
      "Failed to save recipe:",
      error
    );

    if (isAuthenticationError(error)) {
      showAuthRequiredModal(
        "Please login to add or change any recipes."
      );
      return;
    }

    alert(
      error.message ||
        "Failed to save recipe."
    );
  }
}

function openNewIngredientModal() {
  if (
    typeof openIngredientModal !== "function"
  ) {
    console.error(
      "openIngredientModal is unavailable. Confirm ingredient-modal.js loads before add-recipe.js."
    );

    alert(
      "The Add Ingredient window could not be opened."
    );

    return;
  }

  openIngredientModal({
    ingredients: ingredientCatalog,

    onCreated: createdIngredient => {
      const alreadyLoaded =
        ingredientCatalog.some(
          ingredient =>
            ingredient.id ===
            createdIngredient.id
        );

      if (!alreadyLoaded) {
        ingredientCatalog.push(
          createdIngredient
        );

        ingredientCatalog.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      }

      const newRow = createIngredientRow({
        ingredientId:
          createdIngredient.slug,
        name: createdIngredient.name,
        quantity: "",
        unit:
          createdIngredient.default_unit || ""
      });

      newRow
        ?.querySelector(
          ".ingredient-quantity"
        )
        ?.focus();
    }
  });
}

if (addRecipeForm) {
  addRecipeForm.addEventListener(
    "submit",
    handleRecipeSubmit
  );
}

if (recipeImageInput) {
  recipeImageInput.addEventListener(
    "change",
    handleImageSelection
  );
}

if (addIngredientRowBtn) {
  addIngredientRowBtn.addEventListener(
    "click",
    () => {
      createIngredientRow();
    }
  );
}

if (openNewIngredientModalBtn) {
  openNewIngredientModalBtn.addEventListener(
    "click",
    openNewIngredientModal
  );
}

if (closeAuthRequiredBtn) {
  closeAuthRequiredBtn.addEventListener(
    "click",
    hideAuthRequiredModal
  );
}

if (goToLoginBtn) {
  goToLoginBtn.addEventListener(
    "click",
    () => {
      window.location.href = "login.html";
    }
  );
}

if (authRequiredModal) {
  authRequiredModal.addEventListener(
    "click",
    event => {
      if (event.target === authRequiredModal) {
        hideAuthRequiredModal();
      }
    }
  );
}

async function initializeAddRecipePage() {
  try {
    /*
     * Load Supabase ingredients before creating the initial row,
     * so search suggestions and unit autofill work immediately.
     */
    await loadIngredientCatalog();

    createIngredientRow();
  } catch (error) {
    console.error(
      "Failed to initialize Add Recipe page:",
      error
    );

    alert(
      error.message ||
        "Failed to load ingredients."
    );
  }
}

initializeAddRecipePage();