const ingredientSearch = document.getElementById("ingredientSearch");

const ingredientSuggestions = document.getElementById(
  "ingredientSuggestions"
);

const ingredientQuantity = document.getElementById(
  "ingredientQuantity"
);

const ingredientUnit = document.getElementById(
  "ingredientUnit"
);

const addSelectedBtn = document.getElementById(
  "addSelectedBtn"
);

const addNewBtn = document.getElementById(
  "addNewBtn"
);

const inventoryList = document.getElementById(
  "inventoryList"
);

const inventorySearch = document.getElementById(
  "inventorySearch"
);

let ingredientCatalog = [];
let selectedIngredient = null;
let currentInventory = [];

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isAuthenticationError(error) {
  const message = String(
    error?.message || ""
  ).toLowerCase();

  return (
    message.includes("auth session missing") ||
    message.includes("you must be signed in") ||
    message.includes("not authenticated") ||
    message.includes("jwt")
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
      "Failed to load ingredient catalog:",
      error
    );

    ingredientCatalog = [];
  }
}

function selectIngredient(ingredient) {
  selectedIngredient = ingredient;

  ingredientSearch.value =
    ingredient.name;

  ingredientUnit.value =
    ingredient.default_unit || "";

  ingredientSuggestions.innerHTML = "";
  ingredientSuggestions.style.display =
    "none";
}

function getIngredientMatches(searchTerm) {
  const normalizedSearch =
    normalizeName(searchTerm);

  if (!normalizedSearch) {
    return [];
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
  ingredientSuggestions.innerHTML = "";

  const matches =
    getIngredientMatches(searchTerm);

  if (!matches.length) {
    ingredientSuggestions.style.display =
      "none";

    return;
  }

  matches.forEach(item => {
    const option =
      document.createElement("div");

    option.className =
      "suggestion-item";

    /*
     * Only show the ingredient name here.
     * The unit is automatically filled when
     * the ingredient is selected.
     */
    option.textContent = item.name;

    option.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        selectIngredient(item);
      }
    );

    ingredientSuggestions.appendChild(
      option
    );
  });

  ingredientSuggestions.style.display =
    "block";
}

function clearIngredientForm() {
  ingredientSearch.value = "";
  ingredientQuantity.value = "";
  ingredientUnit.value = "";

  ingredientSuggestions.innerHTML = "";
  ingredientSuggestions.style.display =
    "none";

  selectedIngredient = null;
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
    container: [
      "container",
      "containers"
    ]
  };

  const forms =
    unitMap[unit] || [unit, unit];

  return Number(quantity) === 1
    ? forms[0]
    : forms[1];
}

function getInventoryCategory(item) {
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

function groupInventoryByCategory(items) {
  const groups = new Map();

  items.forEach(item => {
    const category =
      getInventoryCategory(item);

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

function createInventoryItemRow(item) {
  const row =
    document.createElement("div");

  row.className = "inventory-item";

  const name =
    document.createElement("span");

  const formattedUnit =
    formatUnit(
      item.quantity,
      item.unit
    );

  name.textContent =
    `${item.name} — ${item.quantity} ${formattedUnit}`;

  row.appendChild(name);

  return row;
}

function createInventoryCategorySection(
  category,
  items
) {
  const section =
    document.createElement("section");

  section.className =
    "inventory-category-group";

  section.dataset.category =
    category.slug;

  const heading =
    document.createElement("h4");

  heading.className =
    "inventory-category-heading";

  heading.textContent =
    category.name;

  section.appendChild(heading);

  const categoryItems =
    document.createElement("div");

  categoryItems.className =
    "inventory-category-items";

  items
    .slice()
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    .forEach(item => {
      categoryItems.appendChild(
        createInventoryItemRow(item)
      );
    });

  section.appendChild(
    categoryItems
  );

  return section;
}

function renderInventory() {
  const searchTerm =
    inventorySearch
      ? normalizeName(
          inventorySearch.value
        )
      : "";

  inventoryList.innerHTML = "";

  let filteredItems = [
    ...currentInventory
  ];

  if (searchTerm) {
    filteredItems =
      filteredItems.filter(item => {
        const nameMatches =
          normalizeName(
            item.name
          ).includes(searchTerm);

        const categoryMatches =
          normalizeName(
            item.category?.name || ""
          ).includes(searchTerm);

        return (
          nameMatches ||
          categoryMatches
        );
      });
  }

  if (!filteredItems.length) {
    inventoryList.innerHTML =
      searchTerm
        ? "<p>No matching inventory items found.</p>"
        : "<p>No ingredients in inventory yet.</p>";

    return;
  }

  const groupedInventory =
    groupInventoryByCategory(
      filteredItems
    );

  groupedInventory.forEach(group => {
    inventoryList.appendChild(
      createInventoryCategorySection(
        group.category,
        group.items
      )
    );
  });
}

async function addIngredientToInventory(
  ingredient
) {
  const quantityValue =
    parseFloat(
      ingredientQuantity.value
    );

  const unitValue =
    ingredient.default_unit ||
    ingredientUnit.value;

  if (
    Number.isNaN(quantityValue) ||
    quantityValue === 0
  ) {
    alert(
      "Enter a quantity greater than 0 or less than 0."
    );

    return;
  }

  if (!ingredient?.slug) {
    alert(
      "Select an ingredient from the dropdown first."
    );

    return;
  }

  if (!unitValue) {
    alert(
      "The selected ingredient does not have a default unit."
    );

    return;
  }

  try {
    await upsertInventoryItemInSupabase({
      ingredientSlug:
        ingredient.slug,

      ingredientName:
        ingredient.name,

      quantity:
        quantityValue,

      unit:
        unitValue
    });

    clearIngredientForm();

    await loadInventory();

    await rebuildMealPlanGroceryListInSupabase();
  } catch (error) {
    console.error(
      "Failed to update inventory:",
      error
    );

    if (
      isAuthenticationError(error)
    ) {
      alert(
        "Please login to make changes to inventory."
      );

      return;
    }

    alert(
      error.message ||
        "Failed to update inventory."
    );
  }
}

async function loadInventory() {
  try {
    currentInventory =
      await fetchInventoryFromSupabase();

    renderInventory();
  } catch (error) {
    console.error(
      "Failed to load inventory from Supabase:",
      error
    );

    currentInventory = [];

    inventoryList.innerHTML =
      "<p>Failed to load inventory.</p>";
  }
}

function openNewIngredientModal() {
  if (
    typeof openIngredientModal !==
    "function"
  ) {
    console.error(
      "openIngredientModal is unavailable. Confirm ingredient-modal.js loads before inventory.js."
    );

    alert(
      "The Add Ingredient window could not be opened."
    );

    return;
  }

  openIngredientModal({
    initialName:
      ingredientSearch.value,

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

        selectIngredient(
          createdIngredient
        );

        ingredientQuantity.focus();
      }
  });
}

/* =========================================================
   EVENT LISTENERS
========================================================= */

if (ingredientSearch) {
  ingredientSearch.addEventListener(
    "input",
    () => {
      selectedIngredient = null;

      ingredientUnit.value = "";

      renderSuggestions(
        ingredientSearch.value
      );
    }
  );

  ingredientSearch.addEventListener(
    "focus",
    () => {
      renderSuggestions(
        ingredientSearch.value
      );
    }
  );

  ingredientSearch.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape"
      ) {
        ingredientSuggestions.style.display =
          "none";
      }
    }
  );
}

if (addSelectedBtn) {
  addSelectedBtn.addEventListener(
    "click",
    () => {
      if (!selectedIngredient) {
        alert(
          "Select an ingredient from the dropdown first. If it does not exist, use Add New Ingredient."
        );

        return;
      }

      addIngredientToInventory(
        selectedIngredient
      );
    }
  );
}

if (addNewBtn) {
  addNewBtn.addEventListener(
    "click",
    openNewIngredientModal
  );
}

document.addEventListener(
  "click",
  event => {
    if (
      ingredientSearch &&
      ingredientSuggestions &&
      !ingredientSearch.contains(
        event.target
      ) &&
      !ingredientSuggestions.contains(
        event.target
      )
    ) {
      ingredientSuggestions.style.display =
        "none";
    }
  }
);

if (inventorySearch) {
  inventorySearch.addEventListener(
    "input",
    renderInventory
  );
}

/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeInventoryPage() {
  await Promise.all([
    loadIngredientCatalog(),
    loadInventory()
  ]);
}

initializeInventoryPage();