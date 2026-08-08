const newIngredientName = document.getElementById(
  "newIngredientName"
);

const newIngredientUnit = document.getElementById(
  "newIngredientUnit"
);

const newIngredientCategory = document.getElementById(
  "newIngredientCategory"
);

const newIngredientSuggestions = document.getElementById(
  "newIngredientSuggestions"
);

const createIngredientBtn = document.getElementById(
  "createIngredientBtn"
);

const ingredientListSearch = document.getElementById(
  "ingredientListSearch"
);

const ingredientList = document.getElementById(
  "ingredientList"
);

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
let ingredientCategories = [];

let ingredientPendingArchive = null;
let suggestionTimer = null;

const ingredientUnits = [
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

function showIngredientMessage(
  title,
  message
) {
  if (!ingredientMessageModal) {
    return;
  }

  if (ingredientMessageTitle) {
    ingredientMessageTitle.textContent =
      title;
  }

  if (ingredientMessageText) {
    ingredientMessageText.textContent =
      message;
  }

  ingredientMessageModal.style.display =
    "flex";
}

function hideIngredientMessage() {
  if (ingredientMessageModal) {
    ingredientMessageModal.style.display =
      "none";
  }
}

function showArchiveModal(ingredient) {
  ingredientPendingArchive =
    ingredient;

  if (archiveIngredientModal) {
    archiveIngredientModal.style.display =
      "flex";
  }
}

function hideArchiveModal() {
  ingredientPendingArchive = null;

  if (archiveIngredientModal) {
    archiveIngredientModal.style.display =
      "none";
  }
}

function getDefaultCategory() {
  return (
    ingredientCategories.find(
      category =>
        category.slug ===
        "household-other"
    ) ||
    ingredientCategories[0] ||
    null
  );
}

function clearCreateForm() {
  if (newIngredientName) {
    newIngredientName.value = "";
  }

  if (newIngredientUnit) {
    newIngredientUnit.value = "count";
  }

  if (newIngredientCategory) {
    const defaultCategory =
      getDefaultCategory();

    newIngredientCategory.value =
      defaultCategory?.id || "";
  }

  if (newIngredientSuggestions) {
    newIngredientSuggestions.innerHTML =
      "";

    newIngredientSuggestions.style.display =
      "none";
  }
}

function populateCreateCategorySelect() {
  if (!newIngredientCategory) {
    return;
  }

  newIngredientCategory.innerHTML = "";

  ingredientCategories.forEach(
    category => {
      const option =
        document.createElement(
          "option"
        );

      option.value = category.id;
      option.textContent =
        category.name;

      newIngredientCategory.appendChild(
        option
      );
    }
  );

  const defaultCategory =
    getDefaultCategory();

  if (defaultCategory) {
    newIngredientCategory.value =
      defaultCategory.id;
  }
}

function createUnitSelect(
  selectedUnit = "count"
) {
  const unitSelect =
    document.createElement("select");

  ingredientUnits.forEach(
    ([value, label]) => {
      const option =
        document.createElement(
          "option"
        );

      option.value = value;
      option.textContent = label;

      unitSelect.appendChild(option);
    }
  );

  unitSelect.value =
    selectedUnit || "count";

  return unitSelect;
}

function createCategorySelect(
  selectedCategoryId = ""
) {
  const categorySelect =
    document.createElement("select");

  ingredientCategories.forEach(
    category => {
      const option =
        document.createElement(
          "option"
        );

      option.value = category.id;
      option.textContent =
        category.name;

      categorySelect.appendChild(
        option
      );
    }
  );

  const defaultCategory =
    getDefaultCategory();

  categorySelect.value =
    selectedCategoryId ||
    defaultCategory?.id ||
    "";

  return categorySelect;
}

function getMatchingIngredients(
  searchTerm
) {
  const normalizedSearch =
    normalizeIngredientName(
      searchTerm
    );

  if (!normalizedSearch) {
    return [];
  }

  return allIngredients
    .filter(ingredient =>
      normalizeIngredientName(
        ingredient.name
      ).includes(normalizedSearch)
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    .slice(0, 8);
}

function renderNewIngredientSuggestions(
  searchTerm
) {
  if (!newIngredientSuggestions) {
    return;
  }

  newIngredientSuggestions.innerHTML =
    "";

  const matches =
    getMatchingIngredients(
      searchTerm
    );

  if (!matches.length) {
    newIngredientSuggestions.style.display =
      "none";

    return;
  }

  matches.forEach(ingredient => {
    const option =
      document.createElement("div");

    option.className =
      "suggestion-item";

    const name =
      document.createElement("strong");

    name.textContent =
      ingredient.name;

    option.appendChild(name);

    option.addEventListener(
      "click",
      () => {
        if (newIngredientName) {
          newIngredientName.value =
            ingredient.name;
        }

        if (newIngredientUnit) {
          newIngredientUnit.value =
            ingredient.default_unit ||
            "count";
        }

        if (
          newIngredientCategory &&
          ingredient.category_id
        ) {
          newIngredientCategory.value =
            ingredient.category_id;
        }

        newIngredientSuggestions.innerHTML =
          "";

        newIngredientSuggestions.style.display =
          "none";

        showIngredientMessage(
          "Ingredient Already Exists",
          `${ingredient.name} is already in the ingredient list.`
        );
      }
    );

    newIngredientSuggestions.appendChild(
      option
    );
  });

  newIngredientSuggestions.style.display =
    "block";
}

function getIngredientCategorySortOrder(
  ingredient
) {
  if (
    ingredient.category?.sortOrder != null
  ) {
    return Number(
      ingredient.category.sortOrder
    );
  }

  const category =
    ingredientCategories.find(
      item =>
        item.id ===
        ingredient.category_id
    );

  return category
    ? Number(category.sort_order)
    : 999;
}

function sortIngredientsForDisplay(
  ingredients
) {
  return [...ingredients].sort(
    (a, b) => {
      const categoryDifference =
        getIngredientCategorySortOrder(a) -
        getIngredientCategorySortOrder(b);

      if (categoryDifference !== 0) {
        return categoryDifference;
      }

      return a.name.localeCompare(
        b.name
      );
    }
  );
}

function renderIngredientList() {
  if (!ingredientList) {
    return;
  }

  const searchTerm =
    normalizeIngredientName(
      ingredientListSearch?.value || ""
    );

  ingredientList.innerHTML = "";

  let filteredIngredients =
    allIngredients.filter(
      ingredient => {
        if (!searchTerm) {
          return true;
        }

        const normalizedName =
          normalizeIngredientName(
            ingredient.name
          );

        const normalizedCategory =
          normalizeIngredientName(
            ingredient.category?.name ||
              ""
          );

        return (
          normalizedName.includes(
            searchTerm
          ) ||
          normalizedCategory.includes(
            searchTerm
          )
        );
      }
    );

  filteredIngredients =
    sortIngredientsForDisplay(
      filteredIngredients
    );

  if (!filteredIngredients.length) {
    ingredientList.innerHTML =
      "<p>No matching ingredients found.</p>";

    return;
  }

  filteredIngredients.forEach(
    ingredient => {
      const row =
        document.createElement("div");

      row.className =
        "inventory-item ingredient-management-item";

      const fields =
        document.createElement("div");

      fields.className =
        "ingredient-management-edit-fields";

      /*
       * Ingredient Name
       */
      const nameInput =
        document.createElement("input");

      nameInput.type = "text";
      nameInput.value =
        ingredient.name;

      nameInput.setAttribute(
        "aria-label",
        `Name for ${ingredient.name}`
      );

      /*
       * Default Unit
       */
      const unitSelect =
        createUnitSelect(
          ingredient.default_unit ||
            "count"
        );

      unitSelect.setAttribute(
        "aria-label",
        `Default unit for ${ingredient.name}`
      );

      /*
       * Category
       */
      const categorySelect =
        createCategorySelect(
          ingredient.category_id
        );

      categorySelect.setAttribute(
        "aria-label",
        `Category for ${ingredient.name}`
      );

      fields.appendChild(nameInput);
      fields.appendChild(unitSelect);
      fields.appendChild(
        categorySelect
      );

      /*
       * Buttons
       */
      const actions =
        document.createElement("div");

      actions.className =
        "grocery-item-actions";

      const saveBtn =
        document.createElement(
          "button"
        );

      saveBtn.type = "button";
      saveBtn.textContent = "Save";

      saveBtn.addEventListener(
        "click",
        async () => {
          try {
            const updatedIngredient =
              await updateIngredientInSupabase(
                ingredient.id,
                {
                  name:
                    nameInput.value,

                  defaultUnit:
                    unitSelect.value,

                  categoryId:
                    categorySelect.value
                }
              );

            const index =
              allIngredients.findIndex(
                item =>
                  item.id ===
                  ingredient.id
              );

            if (index !== -1) {
              allIngredients[index] =
                updatedIngredient;
            }

            renderIngredientList();

            showIngredientMessage(
              "Ingredient Updated",
              `${updatedIngredient.name} was updated successfully.`
            );
          } catch (error) {
            console.error(
              "Failed to update ingredient:",
              error
            );

            showIngredientMessage(
              "Unable to Update Ingredient",
              error.message ||
                "The ingredient could not be updated."
            );
          }
        }
      );

      const archiveBtn =
        document.createElement(
          "button"
        );

      archiveBtn.type = "button";
      archiveBtn.textContent =
        "Archive";

      archiveBtn.className =
        "remove-btn";

      archiveBtn.addEventListener(
        "click",
        () => {
          showArchiveModal(
            ingredient
          );
        }
      );

      actions.appendChild(saveBtn);
      actions.appendChild(
        archiveBtn
      );

      row.appendChild(fields);
      row.appendChild(actions);

      ingredientList.appendChild(row);
    }
  );
}

async function loadCategories() {
  try {
    ingredientCategories =
      await fetchIngredientCategoriesFromSupabase();

    ingredientCategories.sort(
      (a, b) =>
        Number(a.sort_order) -
        Number(b.sort_order)
    );

    populateCreateCategorySelect();
  } catch (error) {
    console.error(
      "Failed to load ingredient categories:",
      error
    );

    ingredientCategories = [];

    showIngredientMessage(
      "Unable to Load Categories",
      error.message ||
        "Ingredient categories could not be loaded."
    );
  }
}

async function loadIngredients() {
  try {
    allIngredients =
      await fetchIngredientsFromSupabase();

    renderIngredientList();
  } catch (error) {
    console.error(
      "Failed to load ingredients:",
      error
    );

    if (ingredientList) {
      ingredientList.innerHTML =
        "<p>Failed to load ingredients.</p>";
    }
  }
}

async function createIngredient() {
  const name =
    cleanIngredientName(
      newIngredientName?.value || ""
    );

  const defaultUnit =
    newIngredientUnit?.value ||
    "count";

  const categoryId =
    newIngredientCategory?.value ||
    getDefaultCategory()?.id ||
    null;

  if (!name) {
    showIngredientMessage(
      "Missing Ingredient Name",
      "Enter an ingredient name first."
    );

    return;
  }

  if (!categoryId) {
    showIngredientMessage(
      "Missing Category",
      "Select an ingredient category."
    );

    return;
  }

  const existing =
    allIngredients.find(
      ingredient =>
        normalizeIngredientName(
          ingredient.name
        ) ===
        normalizeIngredientName(name)
    );

  if (existing) {
    showIngredientMessage(
      "Ingredient Already Exists",
      `${existing.name} is already in the ingredient list.`
    );

    return;
  }

  try {
    const createdIngredient =
      await createIngredientInSupabase({
        name,
        defaultUnit,
        categoryId
      });

    allIngredients.push(
      createdIngredient
    );

    clearCreateForm();
    renderIngredientList();

    showIngredientMessage(
      "Ingredient Added",
      `${createdIngredient.name} was added successfully.`
    );
  } catch (error) {
    console.error(
      "Failed to create ingredient:",
      error
    );

    showIngredientMessage(
      "Unable to Add Ingredient",
      error.message ||
        "The ingredient could not be added."
    );
  }
}

/* =========================================================
   EVENT LISTENERS
========================================================= */

if (newIngredientName) {
  newIngredientName.addEventListener(
    "input",
    () => {
      clearTimeout(
        suggestionTimer
      );

      suggestionTimer =
        setTimeout(() => {
          renderNewIngredientSuggestions(
            newIngredientName.value
          );
        }, 150);
    }
  );

  newIngredientName.addEventListener(
    "focus",
    () => {
      renderNewIngredientSuggestions(
        newIngredientName.value
      );
    }
  );
}

if (createIngredientBtn) {
  createIngredientBtn.addEventListener(
    "click",
    createIngredient
  );
}

if (ingredientListSearch) {
  ingredientListSearch.addEventListener(
    "input",
    renderIngredientList
  );
}

if (closeIngredientMessageBtn) {
  closeIngredientMessageBtn.addEventListener(
    "click",
    hideIngredientMessage
  );
}

if (ingredientMessageModal) {
  ingredientMessageModal.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        ingredientMessageModal
      ) {
        hideIngredientMessage();
      }
    }
  );
}

if (cancelArchiveIngredientBtn) {
  cancelArchiveIngredientBtn.addEventListener(
    "click",
    hideArchiveModal
  );
}

if (archiveIngredientModal) {
  archiveIngredientModal.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        archiveIngredientModal
      ) {
        hideArchiveModal();
      }
    }
  );
}

if (confirmArchiveIngredientBtn) {
  confirmArchiveIngredientBtn.addEventListener(
    "click",
    async () => {
      if (
        !ingredientPendingArchive
      ) {
        return;
      }

      const ingredientToArchive =
        ingredientPendingArchive;

      try {
        await archiveIngredientInSupabase(
          ingredientToArchive.id
        );

        allIngredients =
          allIngredients.filter(
            ingredient =>
              ingredient.id !==
              ingredientToArchive.id
          );

        hideArchiveModal();
        renderIngredientList();

        showIngredientMessage(
          "Ingredient Archived",
          "The ingredient was hidden from future ingredient selections."
        );
      } catch (error) {
        console.error(
          "Failed to archive ingredient:",
          error
        );

        hideArchiveModal();

        showIngredientMessage(
          "Unable to Archive Ingredient",
          error.message ||
            "The ingredient could not be archived."
        );
      }
    }
  );
}

document.addEventListener(
  "click",
  event => {
    if (
      newIngredientName &&
      newIngredientSuggestions &&
      !newIngredientName.contains(
        event.target
      ) &&
      !newIngredientSuggestions.contains(
        event.target
      )
    ) {
      newIngredientSuggestions.style.display =
        "none";
    }
  }
);

/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeIngredientsPage() {
  try {
    /*
     * Categories need to load first so both the
     * create form and existing ingredient rows
     * can build their category dropdowns.
     */
    await loadCategories();
    await loadIngredients();

    clearCreateForm();
  } catch (error) {
    console.error(
      "Failed to initialize Ingredients page:",
      error
    );
  }
}

initializeIngredientsPage();