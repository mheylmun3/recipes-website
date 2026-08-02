const ingredientSearch = document.getElementById("ingredientSearch");
const ingredientSuggestions = document.getElementById("ingredientSuggestions");
const ingredientQuantity = document.getElementById("ingredientQuantity");
const ingredientUnit = document.getElementById("ingredientUnit");
const addSelectedBtn = document.getElementById("addSelectedBtn");
const addNewBtn = document.getElementById("addNewBtn");
const inventoryList = document.getElementById("inventoryList");
const inventorySearch = document.getElementById("inventorySearch");

let ingredientCatalog = [];
let selectedIngredient = null;
let currentInventory = [];

async function loadIngredientCatalog() {
  try {
    ingredientCatalog = await fetchIngredientsFromSupabase();

    ingredientCatalog.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } catch (error) {
    console.error("Failed to load ingredient catalog:", error);
    ingredientCatalog = [];
  }
}

function selectIngredient(ingredient) {
  selectedIngredient = ingredient;

  ingredientSearch.value = ingredient.name;
  ingredientUnit.value = ingredient.default_unit || "count";

  ingredientSuggestions.innerHTML = "";
  ingredientSuggestions.style.display = "none";
}

function renderSuggestions(searchTerm) {
  ingredientSuggestions.innerHTML = "";
  selectedIngredient = null;

  const trimmed = searchTerm.trim().toLowerCase();

  if (!trimmed) {
    ingredientSuggestions.style.display = "none";
    return;
  }

  const matches = ingredientCatalog
    .filter(item =>
      item.name.toLowerCase().includes(trimmed)
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    .slice(0, 8);

  if (!matches.length) {
    ingredientSuggestions.style.display = "none";
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

    ingredientSuggestions.appendChild(option);
  });

  ingredientSuggestions.style.display = "block";
}

function clearIngredientForm() {
  ingredientSearch.value = "";
  ingredientQuantity.value = "";
  ingredientUnit.value = "";
  ingredientSuggestions.innerHTML = "";
  ingredientSuggestions.style.display = "none";
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
    container: ["container", "containers"]
  };

  const forms = unitMap[unit] || [unit, unit];

  return quantity === 1
    ? forms[0]
    : forms[1];
}

function renderInventory() {
  const searchTerm = inventorySearch
    ? inventorySearch.value.trim().toLowerCase()
    : "";

  inventoryList.innerHTML = "";

  let filteredItems = [...currentInventory];

  if (searchTerm) {
    filteredItems = filteredItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm)
    );
  }

  if (!filteredItems.length) {
    inventoryList.innerHTML = searchTerm
      ? "<p>No matching inventory items found.</p>"
      : "<p>No ingredients in inventory yet.</p>";

    return;
  }

  filteredItems
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    .forEach(item => {
      const row = document.createElement("div");
      row.className = "inventory-item";

      const name = document.createElement("span");

      const formattedUnit = formatUnit(
        item.quantity,
        item.unit
      );

      name.textContent =
        `${item.name} — ${item.quantity} ${formattedUnit}`;

      row.appendChild(name);
      inventoryList.appendChild(row);
    });
}

async function addIngredientToInventory(ingredient) {
  const quantityValue = parseFloat(
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

  if (!unitValue) {
    alert(
      "The selected ingredient does not have a default unit."
    );
    return;
  }

  try {
    await upsertInventoryItemInSupabase({
      ingredientSlug: ingredient.slug,
      ingredientName: ingredient.name,
      quantity: quantityValue,
      unit: unitValue
    });

    clearIngredientForm();

    await loadInventory();
    await rebuildMealPlanGroceryListInSupabase();
  } catch (error) {
    console.error(
      "Failed to update inventory:",
      error
    );

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

    inventoryList.innerHTML =
      "<p>Failed to load inventory.</p>";
  }
}

ingredientSearch.addEventListener("input", () => {
  selectedIngredient = null;
  ingredientUnit.value = "";

  renderSuggestions(
    ingredientSearch.value
  );
});

ingredientSearch.addEventListener("focus", () => {
  renderSuggestions(
    ingredientSearch.value
  );
});

addSelectedBtn.addEventListener("click", () => {
  if (!selectedIngredient) {
    alert(
      "Select an ingredient from the dropdown first."
    );
    return;
  }

  addIngredientToInventory(
    selectedIngredient
  );
});

addNewBtn.addEventListener("click", () => {
  openIngredientModal({
    initialName: ingredientSearch.value,
    ingredients: ingredientCatalog,

    onCreated: createdIngredient => {
      ingredientCatalog.push(
        createdIngredient
      );

      ingredientCatalog.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      selectIngredient(
        createdIngredient
      );

      ingredientQuantity.focus();
    }
  });
});

document.addEventListener("click", event => {
  if (
    !ingredientSearch.contains(event.target) &&
    !ingredientSuggestions.contains(event.target)
  ) {
    ingredientSuggestions.style.display = "none";
  }
});

inventorySearch.addEventListener("input", () => {
  renderInventory();
});

(async function initInventoryPage() {
  await Promise.all([
    loadIngredientCatalog(),
    loadInventory()
  ]);
})();