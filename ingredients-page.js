const newIngredientName = document.getElementById("newIngredientName");
const newIngredientUnit = document.getElementById("newIngredientUnit");
const newIngredientSuggestions = document.getElementById(
  "newIngredientSuggestions"
);
const createIngredientBtn = document.getElementById("createIngredientBtn");

const ingredientListSearch = document.getElementById("ingredientListSearch");
const ingredientList = document.getElementById("ingredientList");

const ingredientMessageModal = document.getElementById(
  "ingredientMessageModal"
);
const ingredientMessageTitle = document.getElementById(
  "ingredientMessageTitle"
);
const ingredientMessageText = document.getElementById(
  "ingredientMessageText"
);
const closeIngredientMessageBtn = document.getElementById(
  "closeIngredientMessageBtn"
);

const archiveIngredientModal = document.getElementById(
  "archiveIngredientModal"
);
const cancelArchiveIngredientBtn = document.getElementById(
  "cancelArchiveIngredientBtn"
);
const confirmArchiveIngredientBtn = document.getElementById(
  "confirmArchiveIngredientBtn"
);

let allIngredients = [];
let ingredientPendingArchive = null;
let suggestionTimer = null;

function showIngredientMessage(title, message) {
  if (!ingredientMessageModal) return;

  ingredientMessageTitle.textContent = title;
  ingredientMessageText.textContent = message;
  ingredientMessageModal.style.display = "flex";
}

function hideIngredientMessage() {
  if (ingredientMessageModal) {
    ingredientMessageModal.style.display = "none";
  }
}

function showArchiveModal(ingredient) {
  ingredientPendingArchive = ingredient;
  archiveIngredientModal.style.display = "flex";
}

function hideArchiveModal() {
  ingredientPendingArchive = null;
  archiveIngredientModal.style.display = "none";
}

function clearCreateForm() {
  newIngredientName.value = "";
  newIngredientUnit.value = "count";
  newIngredientSuggestions.innerHTML = "";
  newIngredientSuggestions.style.display = "none";
}

function getMatchingIngredients(searchTerm) {
  const normalizedSearch = normalizeIngredientName(searchTerm);

  if (!normalizedSearch) return [];

  return allIngredients
    .filter(ingredient =>
      ingredient.normalized_name.includes(normalizedSearch)
    )
    .slice(0, 8);
}

function renderNewIngredientSuggestions(searchTerm) {
  newIngredientSuggestions.innerHTML = "";

  const matches = getMatchingIngredients(searchTerm);

  if (!matches.length) {
    newIngredientSuggestions.style.display = "none";
    return;
  }

  matches.forEach(ingredient => {
    const option = document.createElement("div");
    option.className = "suggestion-item";

    option.innerHTML = `
      <strong>${ingredient.name}</strong>
      <span>${ingredient.default_unit}</span>
    `;

    option.addEventListener("click", () => {
      newIngredientName.value = ingredient.name;
      newIngredientUnit.value = ingredient.default_unit || "count";
      newIngredientSuggestions.innerHTML = "";
      newIngredientSuggestions.style.display = "none";

      showIngredientMessage(
        "Ingredient Already Exists",
        `${ingredient.name} is already in the ingredient list.`
      );
    });

    newIngredientSuggestions.appendChild(option);
  });

  newIngredientSuggestions.style.display = "block";
}

function renderIngredientList() {
  const searchTerm = normalizeIngredientName(ingredientListSearch.value);

  ingredientList.innerHTML = "";

  const filteredIngredients = allIngredients.filter(ingredient => {
    if (!searchTerm) return true;

    return ingredient.normalized_name.includes(searchTerm);
  });

  if (!filteredIngredients.length) {
    ingredientList.innerHTML = "<p>No matching ingredients found.</p>";
    return;
  }

  filteredIngredients.forEach(ingredient => {
    const row = document.createElement("div");
    row.className = "inventory-item ingredient-management-item";

    const fields = document.createElement("div");
    fields.className = "ingredient-management-edit-fields";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = ingredient.name;
    nameInput.setAttribute("aria-label", `Name for ${ingredient.name}`);

    const unitSelect = document.createElement("select");

    const units = [
      ["count", "Count"],
      ["tsp", "tsp"],
      ["tbsp", "tbsp"],
      ["cups", "Cups"],
      ["oz", "oz"],
      ["lbs", "lbs"],
      ["ml", "mL"],
      ["liters", "Liters"],
      ["gallon", "Gallon"],
      ["cans", "Cans"],
      ["jars", "Jars"],
      ["cloves", "Cloves"],
      ["box", "Box"],
      ["bag", "Bag"],
      ["stick", "Stick"],
      ["pint", "Pint"],
      ["container", "Container"]
    ];

    units.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      unitSelect.appendChild(option);
    });

    unitSelect.value = ingredient.default_unit || "count";

    fields.appendChild(nameInput);
    fields.appendChild(unitSelect);

    const actions = document.createElement("div");
    actions.className = "grocery-item-actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Save";

    saveBtn.addEventListener("click", async () => {
      try {
        const updatedIngredient = await updateIngredientInSupabase(
          ingredient.id,
          {
            name: nameInput.value,
            defaultUnit: unitSelect.value
          }
        );

        const index = allIngredients.findIndex(
          item => item.id === ingredient.id
        );

        if (index !== -1) {
          allIngredients[index] = updatedIngredient;
        }

        renderIngredientList();

        showIngredientMessage(
          "Ingredient Updated",
          `${updatedIngredient.name} was updated successfully.`
        );
      } catch (error) {
        console.error("Failed to update ingredient:", error);

        showIngredientMessage(
          "Unable to Update Ingredient",
          error.message || "The ingredient could not be updated."
        );
      }
    });

    const archiveBtn = document.createElement("button");
    archiveBtn.type = "button";
    archiveBtn.textContent = "Archive";
    archiveBtn.className = "remove-btn";

    archiveBtn.addEventListener("click", () => {
      showArchiveModal(ingredient);
    });

    actions.appendChild(saveBtn);
    actions.appendChild(archiveBtn);

    row.appendChild(fields);
    row.appendChild(actions);
    ingredientList.appendChild(row);
  });
}

async function loadIngredients() {
  try {
    allIngredients = await fetchIngredientsFromSupabase();
    renderIngredientList();
  } catch (error) {
    console.error("Failed to load ingredients:", error);
    ingredientList.innerHTML = "<p>Failed to load ingredients.</p>";
  }
}

async function createIngredient() {
  const name = cleanIngredientName(newIngredientName.value);
  const defaultUnit = newIngredientUnit.value;

  if (!name) {
    showIngredientMessage(
      "Missing Ingredient Name",
      "Enter an ingredient name first."
    );
    return;
  }

  const existing = allIngredients.find(
    ingredient =>
      ingredient.normalized_name === normalizeIngredientName(name)
  );

  if (existing) {
    showIngredientMessage(
      "Ingredient Already Exists",
      `${existing.name} is already in the ingredient list.`
    );
    return;
  }

  try {
    const createdIngredient = await createIngredientInSupabase({
      name,
      defaultUnit
    });

    allIngredients.push(createdIngredient);
    allIngredients.sort((a, b) => a.name.localeCompare(b.name));

    clearCreateForm();
    renderIngredientList();

    showIngredientMessage(
      "Ingredient Added",
      `${createdIngredient.name} was added successfully.`
    );
  } catch (error) {
    console.error("Failed to create ingredient:", error);

    showIngredientMessage(
      "Unable to Add Ingredient",
      error.message || "The ingredient could not be added."
    );
  }
}

newIngredientName.addEventListener("input", () => {
  clearTimeout(suggestionTimer);

  suggestionTimer = setTimeout(() => {
    renderNewIngredientSuggestions(newIngredientName.value);
  }, 150);
});

newIngredientName.addEventListener("focus", () => {
  renderNewIngredientSuggestions(newIngredientName.value);
});

createIngredientBtn.addEventListener("click", createIngredient);

ingredientListSearch.addEventListener("input", renderIngredientList);

closeIngredientMessageBtn.addEventListener("click", hideIngredientMessage);

ingredientMessageModal.addEventListener("click", event => {
  if (event.target === ingredientMessageModal) {
    hideIngredientMessage();
  }
});

cancelArchiveIngredientBtn.addEventListener("click", hideArchiveModal);

archiveIngredientModal.addEventListener("click", event => {
  if (event.target === archiveIngredientModal) {
    hideArchiveModal();
  }
});

confirmArchiveIngredientBtn.addEventListener("click", async () => {
  if (!ingredientPendingArchive) return;

  try {
    await archiveIngredientInSupabase(ingredientPendingArchive.id);

    allIngredients = allIngredients.filter(
      ingredient => ingredient.id !== ingredientPendingArchive.id
    );

    hideArchiveModal();
    renderIngredientList();

    showIngredientMessage(
      "Ingredient Archived",
      "The ingredient was hidden from future ingredient selections."
    );
  } catch (error) {
    console.error("Failed to archive ingredient:", error);

    hideArchiveModal();

    showIngredientMessage(
      "Unable to Archive Ingredient",
      error.message || "The ingredient could not be archived."
    );
  }
});

document.addEventListener("click", event => {
  if (
    !newIngredientName.contains(event.target) &&
    !newIngredientSuggestions.contains(event.target)
  ) {
    newIngredientSuggestions.style.display = "none";
  }
});

loadIngredients();