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

  const catalog = getIngredientCatalog();

  const unitOptions = ingredientUnits
    .map(unit => {
      const selected = (ingredient.unit || "") === unit ? "selected" : "";
      const label = unit === "" ? "No Unit" : unit;
      return `<option value="${unit}" ${selected}>${label}</option>`;
    })
    .join("");

  const suggestionsId = `suggestions-${Math.random().toString(36).slice(2, 9)}`;

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
        value="${ingredient.ingredientId || ""}"
      />
      <div id="${suggestionsId}" class="ingredient-suggestions suggestions-list"></div>
    </div>

    <input
      type="number"
      class="ingredient-quantity"
      placeholder="Quantity"
      step="any"
      value="${ingredient.quantity ?? ""}"
    />

    <select class="ingredient-unit">
      ${unitOptions}
    </select>

    <button type="button" class="add-new-ingredient-btn">Add New</button>
    <button type="button" class="remove-ingredient-btn">Remove</button>
  `;

  const searchInput = row.querySelector(".ingredient-search-input");
  const hiddenId = row.querySelector(".ingredient-id-hidden");
  const suggestionsBox = row.querySelector(`#${suggestionsId}`);
  const addNewBtn = row.querySelector(".add-new-ingredient-btn");
  const removeBtn = row.querySelector(".remove-ingredient-btn");

  function renderSuggestions(searchTerm) {
    const currentCatalog = getIngredientCatalog();
    suggestionsBox.innerHTML = "";

    const trimmed = searchTerm.trim().toLowerCase();

    let matches;
    if (!trimmed) {
      matches = currentCatalog
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8);
    } else {
      matches = currentCatalog
        .filter(item => item.name.toLowerCase().includes(trimmed))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8);
    }

    if (!matches.length) {
      suggestionsBox.style.display = "none";
      return;
    }

    matches.forEach(item => {
      const option = document.createElement("div");
      option.className = "suggestion-item";
      option.textContent = item.name;

      option.addEventListener("click", () => {
        searchInput.value = item.name;
        hiddenId.value = item.id;
        suggestionsBox.innerHTML = "";
        suggestionsBox.style.display = "none";
      });

      suggestionsBox.appendChild(option);
    });

    suggestionsBox.style.display = "block";
  }

  searchInput.addEventListener("input", () => {
    hiddenId.value = "";
    renderSuggestions(searchInput.value);
  });

  searchInput.addEventListener("focus", () => {
    renderSuggestions(searchInput.value);
  });

  addNewBtn.addEventListener("click", () => {
    const name = searchInput.value.trim();

    if (!name) {
      alert("Enter an ingredient name first.");
      return;
    }

    const currentCatalog = getIngredientCatalog();
    const existing = currentCatalog.find(
      item => item.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      searchInput.value = existing.name;
      hiddenId.value = existing.id;
      suggestionsBox.innerHTML = "";
      suggestionsBox.style.display = "none";
      return;
    }

    const newIngredient = {
      id: slugify(name),
      name
    };

    currentCatalog.push(newIngredient);
    saveIngredientCatalog(currentCatalog);

    searchInput.value = newIngredient.name;
    hiddenId.value = newIngredient.id;
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
  });

  removeBtn.addEventListener("click", () => {
    row.remove();
  });

  editIngredientsList.appendChild(row);
}

function loadRecipeIntoForm(recipe) {
  recipeNameInput.value = recipe.name || "";
  recipeCategoryInput.value = recipe.category || "stove";
  recipeServingsInput.value = recipe.servings || 1;
  recipeCaloriesInput.value = recipe.calories ?? "";
  recipeProteinInput.value = recipe.protein ?? "";
  recipeFiberInput.value = recipe.fiber ?? "";
  recipeInstructionsInput.value = recipe.instructions || "";

  removeRecipeImage = false;
  pendingRecipeImage = recipe.image || "";

  if (recipeImagePreview) {
    if (pendingRecipeImage) {
      recipeImagePreview.src = pendingRecipeImage;
      recipeImagePreview.style.display = "block";
    } else {
      recipeImagePreview.src = "";
      recipeImagePreview.style.display = "none";
    }
  }

  if (recipeImageInput) {
    recipeImageInput.value = "";
  }

  editIngredientsList.innerHTML = "";

  if (Array.isArray(recipe.ingredients) && recipe.ingredients.length) {
    recipe.ingredients.forEach(ingredient => {
      if (typeof ingredient === "string") {
        createIngredientRow({
          name: ingredient,
          ingredientId: "",
          quantity: null,
          unit: ""
        });
      } else {
        createIngredientRow({
          name: ingredient.name || "",
          ingredientId: ingredient.ingredientId || "",
          quantity: ingredient.quantity ?? null,
          unit: ingredient.unit || ""
        });
      }
    });
  } else {
    createIngredientRow();
  }
}

function collectIngredientsFromForm() {
  const rows = Array.from(editIngredientsList.querySelectorAll(".edit-ingredient-row"));
  const catalog = getIngredientCatalog();

  return rows
    .map(row => {
      const nameInput = row.querySelector(".ingredient-search-input").value.trim();
      const ingredientId = row.querySelector(".ingredient-id-hidden").value.trim();
      const quantityRaw = row.querySelector(".ingredient-quantity").value.trim();
      const unit = row.querySelector(".ingredient-unit").value.trim();

      if (!nameInput && !ingredientId && !quantityRaw && !unit) {
        return null;
      }

      let selectedIngredient = null;

      if (ingredientId) {
        selectedIngredient = catalog.find(item => item.id === ingredientId);
      }

      if (!selectedIngredient && nameInput) {
        selectedIngredient = catalog.find(
          item => item.name.toLowerCase() === nameInput.toLowerCase()
        );
      }

      if (!selectedIngredient) {
        const newIngredient = {
          id: slugify(nameInput),
          name: nameInput
        };

        const updatedCatalog = getIngredientCatalog();
        const exists = updatedCatalog.some(item => item.id === newIngredient.id);

        if (!exists) {
          updatedCatalog.push(newIngredient);
          saveIngredientCatalog(updatedCatalog);
        }

        selectedIngredient = newIngredient;
      }

      const quantity = quantityRaw === "" ? null : parseFloat(quantityRaw);

      return {
        ingredientId: selectedIngredient.id,
        name: selectedIngredient.name,
        quantity,
        unit: unit || null,
        text: formatIngredientText(selectedIngredient.name, quantity, unit)
      };
    })
    .filter(Boolean);
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
    alert(error.message || "Failed to update recipe.");
  }
});

addIngredientRowBtn.addEventListener("click", () => {
  createIngredientRow();
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

loadRecipe();