const groceryListContainer = document.getElementById(
  "groceryListContainer"
);

const grocerySearchInput = document.getElementById(
  "grocerySearchInput"
);

const grocerySuggestions = document.getElementById(
  "grocerySuggestions"
);

const groceryQuantity = document.getElementById(
  "groceryQuantity"
);

const groceryUnit = document.getElementById(
  "groceryUnit"
);

const addManualGroceryBtn = document.getElementById(
  "addManualGroceryBtn"
);

const addNewManualItemBtn = document.getElementById(
  "addNewManualItemBtn"
);

const groceryMessageModal = document.getElementById(
  "groceryMessageModal"
);

const groceryMessageTitle = document.getElementById(
  "groceryMessageTitle"
);

const groceryMessageText = document.getElementById(
  "groceryMessageText"
);

const closeGroceryMessageBtn = document.getElementById(
  "closeGroceryMessageBtn"
);

let isSignedIn = false;
let selectedCatalogItem = null;
let ingredientCatalog = [];
let currentGroceryList = [];
let localCheckedState = {};

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function formatUnit(quantity, unit) {
  const unitMap = {
    count: ["item", "items"],
    tsp: ["tsp", "tsp"],
    tbsp: ["tbsp", "tbsp"],
    cups: ["cup", "cups"],
    oz: ["oz", "oz"],
    lbs: ["lb", "lbs"],
    ml: ["mL", "mL"],
    liters: ["liter", "liters"],
    gallon: ["gallon", "gallons"],
    cans: ["can", "cans"],
    jars: ["jar", "jars"],
    cloves: ["clove", "cloves"],
    box: ["box", "boxes"],
    bag: ["bag", "bags"],
    stick: ["stick", "sticks"],
    pint: ["pint", "pints"],
    container: ["container", "containers"]
  };

  const forms =
    unitMap[unit] || [unit, unit];

  return Number(quantity) === 1
    ? forms[0]
    : forms[1];
}

function showGroceryMessage(title, message) {
  if (!groceryMessageModal) {
    return;
  }

  if (groceryMessageTitle) {
    groceryMessageTitle.textContent = title;
  }

  if (groceryMessageText) {
    groceryMessageText.textContent = message;
  }

  groceryMessageModal.style.display = "flex";
}

function hideGroceryMessage() {
  if (groceryMessageModal) {
    groceryMessageModal.style.display = "none";
  }
}

function handleGroceryAuthError(
  error,
  fallbackMessage
) {
  const message = String(
    error?.message || ""
  );

  const lowerMessage =
    message.toLowerCase();

  if (
    lowerMessage.includes(
      "auth session missing"
    ) ||
    lowerMessage.includes(
      "you must be signed in"
    ) ||
    lowerMessage.includes("jwt") ||
    lowerMessage.includes(
      "not authenticated"
    )
  ) {
    showGroceryMessage(
      "Please Login",
      "Please login to update the grocery list or inventory."
    );

    return true;
  }

  showGroceryMessage(
    "Unable to Complete Action",
    fallbackMessage ||
      message ||
      "Something went wrong."
  );

  return false;
}

async function refreshAuthState() {
  try {
    const { data, error } =
      await supabaseClient.auth.getUser();

    if (error) {
      throw error;
    }

    isSignedIn = !!data.user;
  } catch (error) {
    console.error(
      "Failed to get auth state:",
      error
    );

    isSignedIn = false;
  }
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
      "Failed to load ingredient catalog:",
      error
    );

    ingredientCatalog = [];
  }
}

async function loadGroceryList() {
  try {
    currentGroceryList =
      await fetchGroceryListFromSupabase();

    renderGroceryList();
  } catch (error) {
    console.error(
      "Failed to load grocery list from Supabase:",
      error
    );

    groceryListContainer.innerHTML =
      "<p>Failed to load grocery list.</p>";
  }
}

function getIngredientMatches(searchTerm) {
  const normalizedSearch =
    normalizeName(searchTerm);

  if (!normalizedSearch) {
    return ingredientCatalog
      .slice()
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      .slice(0, 8);
  }

  return ingredientCatalog
    .filter(item =>
      normalizeName(item.name).includes(
        normalizedSearch
      )
    )
    .sort((a, b) => {
      const aName =
        normalizeName(a.name);

      const bName =
        normalizeName(b.name);

      const aStarts =
        aName.startsWith(
          normalizedSearch
        );

      const bStarts =
        bName.startsWith(
          normalizedSearch
        );

      if (aStarts !== bStarts) {
        return aStarts ? -1 : 1;
      }

      return a.name.localeCompare(
        b.name
      );
    })
    .slice(0, 8);
}

function renderSuggestions(searchTerm) {
  grocerySuggestions.innerHTML = "";

  const matches =
    getIngredientMatches(searchTerm);

  if (!matches.length) {
    grocerySuggestions.style.display =
      "none";

    return;
  }

  matches.forEach(item => {
    const option =
      document.createElement("div");

    option.className =
      "suggestion-item";

    option.textContent = item.name;

    option.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        selectedCatalogItem = item;

        grocerySearchInput.value =
          item.name;

        groceryUnit.value =
          item.default_unit || "";

        grocerySuggestions.innerHTML =
          "";

        grocerySuggestions.style.display =
          "none";
      }
    );

    grocerySuggestions.appendChild(
      option
    );
  });

  grocerySuggestions.style.display =
    "block";
}

function clearManualAddForm() {
  grocerySearchInput.value = "";
  groceryQuantity.value = "";
  groceryUnit.value = "";

  grocerySuggestions.innerHTML = "";
  grocerySuggestions.style.display =
    "none";

  selectedCatalogItem = null;
}

async function addManualItemToGroceryList(
  item
) {
  const quantity = parseFloat(
    groceryQuantity.value
  );

  const unit =
    item.default_unit ||
    groceryUnit.value;

  if (
    Number.isNaN(quantity) ||
    quantity <= 0
  ) {
    showGroceryMessage(
      "Invalid Quantity",
      "Enter a valid quantity greater than 0."
    );

    return;
  }

  if (!item?.slug) {
    showGroceryMessage(
      "Item Not Found",
      "Select an ingredient from the list first."
    );

    return;
  }

  if (!unit) {
    showGroceryMessage(
      "Missing Unit",
      "The selected ingredient does not have a default unit."
    );

    return;
  }

  try {
    await upsertManualGroceryItemInSupabase({
      ingredientSlug: item.slug,
      ingredientName: item.name,
      quantity,
      unit
    });

    clearManualAddForm();

    await loadGroceryList();
  } catch (error) {
    console.error(
      "Failed to add manual grocery item:",
      error
    );

    handleGroceryAuthError(
      error,
      "Failed to add grocery item."
    );
  }
}

function openNewItemModal() {
  if (
    typeof openIngredientModal !==
    "function"
  ) {
    console.error(
      "openIngredientModal is unavailable. Confirm ingredient-modal.js is loaded before grocery-list.js."
    );

    showGroceryMessage(
      "Unable to Add Ingredient",
      "The Add Ingredient window could not be opened."
    );

    return;
  }

  openIngredientModal({
    initialName:
      grocerySearchInput.value,

    ingredients:
      ingredientCatalog,

    onCreated:
      createdIngredient => {
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

          ingredientCatalog.sort(
            (a, b) =>
              a.name.localeCompare(
                b.name
              )
          );
        }

        selectedCatalogItem =
          createdIngredient;

        grocerySearchInput.value =
          createdIngredient.name;

        groceryUnit.value =
          createdIngredient.default_unit ||
          "";

        groceryQuantity.focus();
      }
  });
}

async function addItemToInventory(
  groceryItem
) {
  try {
    await upsertInventoryItemInSupabase({
      ingredientSlug:
        groceryItem.ingredientId,

      ingredientName:
        groceryItem.name,

      quantity:
        groceryItem.quantityToBuy,

      unit:
        groceryItem.unit
    });

    await deleteGroceryItemFromSupabase(
      groceryItem.rowId
    );

    await loadGroceryList();
  } catch (error) {
    console.error(
      "Failed to add grocery item to inventory:",
      error
    );

    handleGroceryAuthError(
      error,
      "Failed to add item to inventory."
    );
  }
}

async function removeGroceryItem(
  targetItem
) {
  try {
    await deleteGroceryItemFromSupabase(
      targetItem.rowId
    );

    await loadGroceryList();
  } catch (error) {
    console.error(
      "Failed to remove grocery item:",
      error
    );

    handleGroceryAuthError(
      error,
      "Failed to remove grocery item."
    );
  }
}

function toggleLocalCheckedState(itemId) {
  localCheckedState[itemId] =
    !localCheckedState[itemId];

  renderGroceryList();
}

function getItemCheckedState(item) {
  if (isSignedIn) {
    return !!item.checked;
  }

  return !!localCheckedState[item.rowId];
}

function getGroceryCategory(item) {
  if (item.category) {
    return {
      id:
        item.category.id || "",

      name:
        item.category.name ||
        "Household & Other",

      slug:
        item.category.slug ||
        "household-other",

      sortOrder:
        Number(
          item.category.sortOrder
        ) || 999
    };
  }

  return {
    id: "",
    name: "Household & Other",
    slug: "household-other",
    sortOrder: 999
  };
}

function groupGroceryItemsByCategory(items) {
  const groups = new Map();

  items.forEach(item => {
    const category =
      getGroceryCategory(item);

    const key =
      category.id ||
      category.slug ||
      "household-other";

    if (!groups.has(key)) {
      groups.set(key, {
        category,
        items: []
      });
    }

    groups.get(key).items.push(item);
  });

  return Array.from(groups.values())
    .sort(
      (a, b) =>
        a.category.sortOrder -
        b.category.sortOrder
    );
}

function sortItemsWithinCategory(items) {
  return [...items].sort((a, b) => {
    const aChecked =
      getItemCheckedState(a);

    const bChecked =
      getItemCheckedState(b);

    if (aChecked !== bChecked) {
      return Number(aChecked) -
        Number(bChecked);
    }

    return a.name.localeCompare(
      b.name
    );
  });
}

function createGroceryItemRow(item) {
  const row =
    document.createElement("div");

  row.className =
    "inventory-item grocery-list-item";

  const left =
    document.createElement("div");

  left.className =
    "grocery-item-left";

  const checkbox =
    document.createElement("input");

  checkbox.type = "checkbox";

  const text =
    document.createElement("div");

  const quantityText =
    `${item.quantityToBuy} ${formatUnit(
      item.quantityToBuy,
      item.unit
    )}`;

  const sourceLabel =
    item.source === "manual"
      ? "Manual"
      : "Meal Plan";

  if (item.source === "manual") {
    text.innerHTML = `
      <strong>${item.name}</strong><br>
      <span>Buy: ${quantityText}</span><br>
      <span>Source: ${sourceLabel}</span>
    `;
  } else {
    text.innerHTML = `
      <strong>${item.name}</strong><br>
      <span>Buy: ${quantityText}</span><br>
      <span>
        Needed:
        ${item.quantityNeeded}
        ${formatUnit(
          item.quantityNeeded,
          item.unit
        )}
        |
        In Inventory:
        ${item.quantityInInventory}
        ${formatUnit(
          item.quantityInInventory,
          item.unit
        )}
      </span><br>
      <span>Source: ${sourceLabel}</span>
    `;
  }

  const checked =
    getItemCheckedState(item);

  checkbox.checked = checked;

  if (checked) {
    text.style.opacity = "0.5";
    text.style.textDecoration =
      "line-through";

    if (!isSignedIn) {
      row.classList.add(
        "locally-checked"
      );
    }
  }

  if (isSignedIn) {
    checkbox.addEventListener(
      "change",
      async event => {
        event.stopPropagation();

        try {
          await updateGroceryItemCheckedInSupabase(
            item.rowId,
            checkbox.checked
          );

          await loadGroceryList();
        } catch (error) {
          console.error(
            "Failed to update grocery item check state:",
            error
          );

          handleGroceryAuthError(
            error,
            "Failed to update grocery item."
          );
        }
      }
    );
  } else {
    checkbox.addEventListener(
      "click",
      event => {
        event.stopPropagation();

        toggleLocalCheckedState(
          item.rowId
        );
      }
    );

    row.addEventListener(
      "click",
      () => {
        toggleLocalCheckedState(
          item.rowId
        );
      }
    );
  }

  left.appendChild(checkbox);
  left.appendChild(text);

  row.appendChild(left);

  if (isSignedIn) {
    const buttonGroup =
      document.createElement("div");

    buttonGroup.className =
      "grocery-item-actions";

    const addBtn =
      document.createElement("button");

    addBtn.type = "button";
    addBtn.textContent =
      "Add to Inventory";

    addBtn.addEventListener(
      "click",
      event => {
        event.stopPropagation();

        addItemToInventory(item);
      }
    );

    const removeBtn =
      document.createElement("button");

    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.className =
      "remove-btn";

    removeBtn.addEventListener(
      "click",
      event => {
        event.stopPropagation();

        removeGroceryItem(item);
      }
    );

    buttonGroup.appendChild(addBtn);
    buttonGroup.appendChild(
      removeBtn
    );

    row.appendChild(buttonGroup);
  }

  return row;
}

function createGroceryCategorySection(
  category,
  items
) {
  const section =
    document.createElement("section");

  section.className =
    "grocery-category-group";

  section.dataset.category =
    category.slug;

  const heading =
    document.createElement("h4");

  heading.className =
    "grocery-category-heading";

  heading.textContent =
    category.name;

  const itemContainer =
    document.createElement("div");

  itemContainer.className =
    "grocery-category-items";

  sortItemsWithinCategory(items)
    .forEach(item => {
      itemContainer.appendChild(
        createGroceryItemRow(item)
      );
    });

  section.appendChild(heading);
  section.appendChild(
    itemContainer
  );

  return section;
}

function renderGroceryList() {
  groceryListContainer.innerHTML = "";

  if (!currentGroceryList.length) {
    groceryListContainer.innerHTML =
      "<p>No grocery items needed right now.</p>";

    return;
  }

  const groups =
    groupGroceryItemsByCategory(
      currentGroceryList
    );

  groups.forEach(group => {
    groceryListContainer.appendChild(
      createGroceryCategorySection(
        group.category,
        group.items
      )
    );
  });
}

/* =========================================================
   EVENT LISTENERS
========================================================= */

if (closeGroceryMessageBtn) {
  closeGroceryMessageBtn.addEventListener(
    "click",
    hideGroceryMessage
  );
}

if (groceryMessageModal) {
  groceryMessageModal.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        groceryMessageModal
      ) {
        hideGroceryMessage();
      }
    }
  );
}

if (grocerySearchInput) {
  grocerySearchInput.addEventListener(
    "input",
    () => {
      selectedCatalogItem = null;
      groceryUnit.value = "";

      renderSuggestions(
        grocerySearchInput.value
      );
    }
  );

  grocerySearchInput.addEventListener(
    "focus",
    () => {
      renderSuggestions(
        grocerySearchInput.value
      );
    }
  );
}

if (addManualGroceryBtn) {
  addManualGroceryBtn.addEventListener(
    "click",
    () => {
      if (!selectedCatalogItem) {
        showGroceryMessage(
          "Item Not Selected",
          "Select an ingredient from the list first. If it does not exist, use Add New Item Name."
        );

        return;
      }

      addManualItemToGroceryList(
        selectedCatalogItem
      );
    }
  );
}

if (addNewManualItemBtn) {
  addNewManualItemBtn.addEventListener(
    "click",
    openNewItemModal
  );
}

document.addEventListener(
  "click",
  event => {
    if (
      grocerySearchInput &&
      grocerySuggestions &&
      !grocerySearchInput.contains(
        event.target
      ) &&
      !grocerySuggestions.contains(
        event.target
      )
    ) {
      grocerySuggestions.style.display =
        "none";
    }
  }
);

/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeGroceryListPage() {
  await Promise.all([
    refreshAuthState(),
    loadIngredientCatalog()
  ]);

  await loadGroceryList();
}

initializeGroceryListPage();