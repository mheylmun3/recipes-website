let ingredientModalState = {
  existingIngredients: [],
  categories: [],
  onCreated: null
};

function normalizeModalIngredientName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getIngredientModalElements() {
  return {
    modal: document.getElementById("newIngredientModal"),
    nameInput: document.getElementById("modalIngredientName"),
    unitSelect: document.getElementById("modalIngredientUnit"),
    categorySelect: document.getElementById("modalIngredientCategory"),
    suggestions: document.getElementById("modalIngredientSuggestions"),
    message: document.getElementById("modalIngredientMessage"),
    closeBtn: document.getElementById("closeNewIngredientModalBtn"),
    cancelBtn: document.getElementById("cancelNewIngredientBtn"),
    confirmBtn: document.getElementById("confirmNewIngredientBtn")
  };
}

function showIngredientModalMessage(message) {
  const elements = getIngredientModalElements();

  if (elements.message) {
    elements.message.textContent = message;
  }
}

function clearIngredientModalMessage() {
  const elements = getIngredientModalElements();

  if (elements.message) {
    elements.message.textContent = "";
  }
}

function getDefaultModalCategory() {
  return (
    ingredientModalState.categories.find(
      category => category.slug === "household-other"
    ) ||
    ingredientModalState.categories[0] ||
    null
  );
}

function populateModalCategorySelect() {
  const { categorySelect } = getIngredientModalElements();

  if (!categorySelect) {
    return;
  }

  categorySelect.innerHTML = "";

  ingredientModalState.categories.forEach(category => {
    const option = document.createElement("option");

    option.value = category.id;
    option.textContent = category.name;

    categorySelect.appendChild(option);
  });

  const defaultCategory = getDefaultModalCategory();

  if (defaultCategory) {
    categorySelect.value = defaultCategory.id;
  }
}

function getModalIngredientMatches(searchTerm) {
  const normalizedSearch =
    normalizeModalIngredientName(searchTerm);

  if (!normalizedSearch) {
    return [];
  }

  return ingredientModalState.existingIngredients
    .filter(ingredient =>
      normalizeModalIngredientName(
        ingredient.name
      ).includes(normalizedSearch)
    )
    .sort((a, b) => {
      const aName =
        normalizeModalIngredientName(a.name);

      const bName =
        normalizeModalIngredientName(b.name);

      const aStarts =
        aName.startsWith(normalizedSearch);

      const bStarts =
        bName.startsWith(normalizedSearch);

      if (aStarts !== bStarts) {
        return aStarts ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    })
    .slice(0, 8);
}

function renderModalIngredientSuggestions(searchTerm) {
  const { suggestions } =
    getIngredientModalElements();

  if (!suggestions) {
    return;
  }

  suggestions.innerHTML = "";

  const matches =
    getModalIngredientMatches(searchTerm);

  if (!matches.length) {
    suggestions.style.display = "none";
    return;
  }

  matches.forEach(ingredient => {
    const option =
      document.createElement("div");

    option.className =
      "suggestion-item ingredient-modal-suggestion";

    const name =
      document.createElement("strong");

    name.textContent =
      ingredient.name;

    option.appendChild(name);

    option.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      showIngredientModalMessage(
        `${ingredient.name} already exists. Use the existing ingredient instead.`
      );
    });

    suggestions.appendChild(option);
  });

  suggestions.style.display = "block";
}

async function loadModalCategories() {
  try {
    const categories =
      await fetchIngredientCategoriesFromSupabase();

    ingredientModalState.categories =
      Array.isArray(categories)
        ? categories
            .slice()
            .sort(
              (a, b) =>
                Number(a.sort_order) -
                Number(b.sort_order)
            )
        : [];

    populateModalCategorySelect();
  } catch (error) {
    console.error(
      "Failed to load ingredient categories:",
      error
    );

    ingredientModalState.categories = [];

    showIngredientModalMessage(
      "Ingredient categories could not be loaded."
    );
  }
}

async function openIngredientModal({
  initialName = "",
  ingredients = [],
  onCreated = null
} = {}) {
  const {
    modal,
    nameInput,
    unitSelect,
    categorySelect,
    suggestions
  } = getIngredientModalElements();

  if (
    !modal ||
    !nameInput ||
    !unitSelect ||
    !categorySelect
  ) {
    console.error(
      "The Add Ingredient modal HTML is missing required elements."
    );

    return;
  }

  ingredientModalState.existingIngredients =
    Array.isArray(ingredients)
      ? ingredients
      : [];

  ingredientModalState.onCreated =
    typeof onCreated === "function"
      ? onCreated
      : null;

  nameInput.value = initialName;
  unitSelect.value = "count";

  if (suggestions) {
    suggestions.innerHTML = "";
    suggestions.style.display = "none";
  }

  clearIngredientModalMessage();

  await loadModalCategories();

  const defaultCategory =
    getDefaultModalCategory();

  if (defaultCategory) {
    categorySelect.value =
      defaultCategory.id;
  }

  modal.style.display = "flex";

  requestAnimationFrame(() => {
    nameInput.focus();

    if (initialName) {
      nameInput.select();

      renderModalIngredientSuggestions(
        initialName
      );
    }
  });
}

function closeIngredientModal() {
  const {
    modal,
    nameInput,
    unitSelect,
    categorySelect,
    suggestions,
    confirmBtn
  } = getIngredientModalElements();

  if (modal) {
    modal.style.display = "none";
  }

  if (nameInput) {
    nameInput.value = "";
  }

  if (unitSelect) {
    unitSelect.value = "count";
  }

  if (categorySelect) {
    categorySelect.innerHTML = "";
  }

  if (suggestions) {
    suggestions.innerHTML = "";
    suggestions.style.display = "none";
  }

  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Add Ingredient";
  }

  clearIngredientModalMessage();

  ingredientModalState = {
    existingIngredients: [],
    categories: [],
    onCreated: null
  };
}

async function submitNewIngredientModal() {
  const {
    nameInput,
    unitSelect,
    categorySelect,
    confirmBtn
  } = getIngredientModalElements();

  if (
    !nameInput ||
    !unitSelect ||
    !categorySelect ||
    !confirmBtn
  ) {
    return;
  }

  const name = String(nameInput.value || "")
    .trim()
    .replace(/\s+/g, " ");

  const defaultUnit =
    unitSelect.value || "count";

  const categoryId =
    categorySelect.value || "";

  if (!name) {
    showIngredientModalMessage(
      "Enter an ingredient name."
    );

    return;
  }

  if (!categoryId) {
    showIngredientModalMessage(
      "Select an ingredient category."
    );

    return;
  }

  const normalizedName =
    normalizeModalIngredientName(name);

  const existing =
    ingredientModalState.existingIngredients.find(
      ingredient =>
        normalizeModalIngredientName(
          ingredient.name
        ) === normalizedName
    );

  if (existing) {
    showIngredientModalMessage(
      `${existing.name} already exists. Use the existing ingredient instead.`
    );

    renderModalIngredientSuggestions(name);

    return;
  }

  try {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Adding...";

    const createdIngredient =
      await createIngredientInSupabase({
        name,
        defaultUnit,
        categoryId
      });

    const callback =
      ingredientModalState.onCreated;

    closeIngredientModal();

    if (callback) {
      callback(createdIngredient);
    }
  } catch (error) {
    console.error(
      "Failed to create ingredient:",
      error
    );

    showIngredientModalMessage(
      error.message ||
        "The ingredient could not be added."
    );

    confirmBtn.disabled = false;
    confirmBtn.textContent = "Add Ingredient";
  }
}

function initializeIngredientModal() {
  const {
    modal,
    nameInput,
    suggestions,
    closeBtn,
    cancelBtn,
    confirmBtn
  } = getIngredientModalElements();

  if (!modal || !nameInput) {
    return;
  }

  nameInput.addEventListener("input", () => {
    clearIngredientModalMessage();

    renderModalIngredientSuggestions(
      nameInput.value
    );
  });

  nameInput.addEventListener("focus", () => {
    renderModalIngredientSuggestions(
      nameInput.value
    );
  });

  nameInput.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        event.preventDefault();

        submitNewIngredientModal();
      }

      if (event.key === "Escape") {
        closeIngredientModal();
      }
    }
  );

  closeBtn?.addEventListener(
    "click",
    closeIngredientModal
  );

  cancelBtn?.addEventListener(
    "click",
    closeIngredientModal
  );

  confirmBtn?.addEventListener(
    "click",
    submitNewIngredientModal
  );

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeIngredientModal();
    }
  });

  document.addEventListener("click", event => {
    if (
      suggestions &&
      !nameInput.contains(event.target) &&
      !suggestions.contains(event.target)
    ) {
      suggestions.style.display = "none";
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeIngredientModal
  );
} else {
  initializeIngredientModal();
}