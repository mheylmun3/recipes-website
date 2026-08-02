let ingredientModalState = {
  existingIngredients: [],
  onCreated: null
};

function normalizeModalIngredientName(name) {
  return String(name)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getIngredientModalElements() {
  return {
    modal: document.getElementById("newIngredientModal"),
    nameInput: document.getElementById("modalIngredientName"),
    unitSelect: document.getElementById("modalIngredientUnit"),
    suggestions: document.getElementById("modalIngredientSuggestions"),
    message: document.getElementById("modalIngredientMessage"),
    closeBtn: document.getElementById("closeNewIngredientModalBtn"),
    cancelBtn: document.getElementById("cancelNewIngredientBtn"),
    confirmBtn: document.getElementById("confirmNewIngredientBtn")
  };
}

function showIngredientModalMessage(message) {
  const { message: messageElement } = getIngredientModalElements();

  if (messageElement) {
    messageElement.textContent = message;
  }
}

function clearIngredientModalMessage() {
  const { message } = getIngredientModalElements();

  if (message) {
    message.textContent = "";
  }
}

function renderModalIngredientSuggestions(searchTerm) {
  const { suggestions } = getIngredientModalElements();

  if (!suggestions) return;

  suggestions.innerHTML = "";

  const normalizedSearch = normalizeModalIngredientName(searchTerm);

  if (!normalizedSearch) {
    suggestions.style.display = "none";
    return;
  }

  const matches = ingredientModalState.existingIngredients
    .filter(ingredient =>
      normalizeModalIngredientName(ingredient.name).includes(normalizedSearch)
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);

  if (!matches.length) {
    suggestions.style.display = "none";
    return;
  }

  matches.forEach(ingredient => {
    const option = document.createElement("div");
    option.className = "suggestion-item ingredient-modal-suggestion";

    const name = document.createElement("strong");
    name.textContent = ingredient.name;

    const unit = document.createElement("span");
    unit.textContent = ingredient.default_unit || "count";

    option.appendChild(name);
    option.appendChild(unit);

    option.addEventListener("click", () => {
      showIngredientModalMessage(
        `${ingredient.name} already exists. Select it from the ingredient search instead.`
      );
    });

    suggestions.appendChild(option);
  });

  suggestions.style.display = "block";
}

function openIngredientModal({
  initialName = "",
  ingredients = [],
  onCreated = null
} = {}) {
  const {
    modal,
    nameInput,
    unitSelect,
    suggestions
  } = getIngredientModalElements();

  if (!modal || !nameInput || !unitSelect) {
    console.error("The Add Ingredient modal HTML is missing from this page.");
    return;
  }

  ingredientModalState = {
    existingIngredients: Array.isArray(ingredients) ? ingredients : [],
    onCreated: typeof onCreated === "function" ? onCreated : null
  };

  nameInput.value = initialName;
  unitSelect.value = "count";

  if (suggestions) {
    suggestions.innerHTML = "";
    suggestions.style.display = "none";
  }

  clearIngredientModalMessage();

  modal.style.display = "flex";

  requestAnimationFrame(() => {
    nameInput.focus();
    nameInput.select();
  });

  renderModalIngredientSuggestions(initialName);
}

function closeIngredientModal() {
  const {
    modal,
    nameInput,
    unitSelect,
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
    onCreated: null
  };
}

async function submitNewIngredientModal() {
  const {
    nameInput,
    unitSelect,
    confirmBtn
  } = getIngredientModalElements();

  if (!nameInput || !unitSelect || !confirmBtn) return;

  const name = String(nameInput.value)
    .trim()
    .replace(/\s+/g, " ");

  const defaultUnit = unitSelect.value || "count";

  if (!name) {
    showIngredientModalMessage("Enter an ingredient name.");
    return;
  }

  const normalizedName = normalizeModalIngredientName(name);

  const existing = ingredientModalState.existingIngredients.find(
    ingredient =>
      normalizeModalIngredientName(ingredient.name) === normalizedName
  );

  if (existing) {
    showIngredientModalMessage(
      `${existing.name} already exists. Select it from the ingredient search instead.`
    );
    return;
  }

  try {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Adding...";

    const createdIngredient = await createIngredientInSupabase({
      name,
      defaultUnit
    });

    const callback = ingredientModalState.onCreated;

    closeIngredientModal();

    if (callback) {
      callback(createdIngredient);
    }
  } catch (error) {
    console.error("Failed to create ingredient:", error);

    showIngredientModalMessage(
      error.message || "The ingredient could not be added."
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

  if (!modal) return;

  nameInput?.addEventListener("input", () => {
    clearIngredientModalMessage();
    renderModalIngredientSuggestions(nameInput.value);
  });

  nameInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitNewIngredientModal();
    }

    if (event.key === "Escape") {
      closeIngredientModal();
    }
  });

  closeBtn?.addEventListener("click", closeIngredientModal);
  cancelBtn?.addEventListener("click", closeIngredientModal);
  confirmBtn?.addEventListener("click", submitNewIngredientModal);

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeIngredientModal();
    }
  });

  document.addEventListener("click", event => {
    if (
      nameInput &&
      suggestions &&
      !nameInput.contains(event.target) &&
      !suggestions.contains(event.target)
    ) {
      suggestions.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", initializeIngredientModal);