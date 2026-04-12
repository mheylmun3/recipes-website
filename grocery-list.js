const groceryListContainer = document.getElementById("groceryListContainer");
const clearCheckedBtn = document.getElementById("clearCheckedBtn");

const grocerySearchInput = document.getElementById("grocerySearchInput");
const grocerySuggestions = document.getElementById("grocerySuggestions");
const groceryQuantity = document.getElementById("groceryQuantity");
const groceryUnit = document.getElementById("groceryUnit");
const addManualGroceryBtn = document.getElementById("addManualGroceryBtn");
const addNewManualItemBtn = document.getElementById("addNewManualItemBtn");

let selectedCatalogItem = null;

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getGroceryList() {
  try {
    const saved = localStorage.getItem("groceryList");
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to parse groceryList:", error);
    return [];
  }
}

function saveGroceryList(items) {
  localStorage.setItem("groceryList", JSON.stringify(items));
}

function getInventory() {
  try {
    const saved = localStorage.getItem("inventoryItems");
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to parse inventoryItems:", error);
    return [];
  }
}

function saveInventory(items) {
  localStorage.setItem("inventoryItems", JSON.stringify(items));
}

function getItemCatalog() {
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
    console.error("Failed to load item catalog:", error);
    return [];
  }
}

function saveItemCatalog(catalog) {
  localStorage.setItem("ingredientCatalog", JSON.stringify(catalog));
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
  return quantity === 1 ? forms[0] : forms[1];
}

function renderSuggestions(searchTerm) {
  const catalog = getItemCatalog();
  grocerySuggestions.innerHTML = "";
  selectedCatalogItem = null;

  const trimmed = searchTerm.trim().toLowerCase();

  let matches;
  if (!trimmed) {
    matches = catalog
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);
  } else {
    matches = catalog
      .filter(item => item.name.toLowerCase().includes(trimmed))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);
  }

  if (!matches.length) {
    grocerySuggestions.style.display = "none";
    return;
  }

  matches.forEach(item => {
    const option = document.createElement("div");
    option.className = "suggestion-item";
    option.textContent = item.name;

    option.addEventListener("click", () => {
      selectedCatalogItem = item;
      grocerySearchInput.value = item.name;
      grocerySuggestions.innerHTML = "";
      grocerySuggestions.style.display = "none";
    });

    grocerySuggestions.appendChild(option);
  });

  grocerySuggestions.style.display = "block";
}

function clearManualAddForm() {
  grocerySearchInput.value = "";
  groceryQuantity.value = "";
  groceryUnit.value = "count";
  grocerySuggestions.innerHTML = "";
  grocerySuggestions.style.display = "none";
  selectedCatalogItem = null;
}

function addManualItemToGroceryList(item) {
  const quantity = parseFloat(groceryQuantity.value);
  const unit = groceryUnit.value;

  if (Number.isNaN(quantity) || quantity <= 0) {
    alert("Enter a valid quantity greater than 0.");
    return;
  }

  const current = getGroceryList();

  const existing = current.find(
    groceryItem =>
      groceryItem.ingredientId === item.id &&
      groceryItem.unit === unit &&
      groceryItem.source === "manual"
  );

  if (existing) {
    existing.quantityToBuy += quantity;
    existing.quantityNeeded = existing.quantityToBuy;
  } else {
    current.push({
      ingredientId: item.id,
      name: item.name,
      unit,
      quantityNeeded: quantity,
      quantityInInventory: 0,
      quantityToBuy: quantity,
      source: "manual",
      checked: false
    });
  }

  current.sort((a, b) => a.name.localeCompare(b.name));
  saveGroceryList(current);
  renderGroceryList();
  clearManualAddForm();
}

function addNewItemName() {
  const name = grocerySearchInput.value.trim();

  if (!name) {
    alert("Enter an item name first.");
    return;
  }

  const catalog = getItemCatalog();
  const existing = catalog.find(
    item => item.name.toLowerCase() === name.toLowerCase()
  );

  if (existing) {
    selectedCatalogItem = existing;
    grocerySearchInput.value = existing.name;
    grocerySuggestions.innerHTML = "";
    grocerySuggestions.style.display = "none";
    return;
  }

  const newItem = {
    id: slugify(name),
    name
  };

  catalog.push(newItem);
  saveItemCatalog(catalog);

  selectedCatalogItem = newItem;
  grocerySearchInput.value = newItem.name;
  grocerySuggestions.innerHTML = "";
  grocerySuggestions.style.display = "none";
}

function addItemToInventory(groceryItem) {
  const inventory = getInventory();

  const existing = inventory.find(
    item =>
      item.id === groceryItem.ingredientId &&
      item.unit === groceryItem.unit
  );

  if (existing) {
    existing.quantity += groceryItem.quantityToBuy;
  } else {
    inventory.push({
      id: groceryItem.ingredientId,
      name: groceryItem.name,
      quantity: groceryItem.quantityToBuy,
      unit: groceryItem.unit
    });
  }

  saveInventory(inventory);

  const updatedGroceryList = getGroceryList().filter(
    item =>
      !(
        item.ingredientId === groceryItem.ingredientId &&
        item.unit === groceryItem.unit &&
        item.source === groceryItem.source
      )
  );

  saveGroceryList(updatedGroceryList);
  renderGroceryList();
}

function removeGroceryItem(targetItem) {
  const items = getGroceryList();

  const updated = items.filter(item =>
    !(
      item.ingredientId === targetItem.ingredientId &&
      item.unit === targetItem.unit &&
      item.source === targetItem.source
    )
  );

  saveGroceryList(updated);
  renderGroceryList();
}

function renderGroceryList() {
  const items = getGroceryList();
  groceryListContainer.innerHTML = "";

  if (!items.length) {
    groceryListContainer.innerHTML = "<p>No grocery items needed right now.</p>";
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "inventory-item grocery-list-item";

    const left = document.createElement("div");
    left.className = "grocery-item-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!item.checked;

    checkbox.addEventListener("change", () => {
      const updated = getGroceryList();
      updated[index].checked = checkbox.checked;
      saveGroceryList(updated);
      renderGroceryList();
    });

    const text = document.createElement("div");
    const quantityText = `${item.quantityToBuy} ${formatUnit(item.quantityToBuy, item.unit)}`;
    const sourceLabel = item.source === "manual" ? "Manual" : "Meal Plan";

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
        <span>Needed: ${item.quantityNeeded} ${formatUnit(item.quantityNeeded, item.unit)} | In Inventory: ${item.quantityInInventory} ${formatUnit(item.quantityInInventory, item.unit)}</span><br>
        <span>Source: ${sourceLabel}</span>
      `;
    }

    if (item.checked) {
      text.style.opacity = "0.5";
      text.style.textDecoration = "line-through";
    }

    left.appendChild(checkbox);
    left.appendChild(text);

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "grocery-item-actions";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Add to Inventory";
    addBtn.addEventListener("click", () => {
    addItemToInventory(item);
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.className = "remove-btn";

    removeBtn.addEventListener("click", () => {
    removeGroceryItem(item);
    });

    buttonGroup.appendChild(addBtn);
    buttonGroup.appendChild(removeBtn);

    row.appendChild(left);
    row.appendChild(buttonGroup);
    groceryListContainer.appendChild(row);
  });
}

grocerySearchInput.addEventListener("input", () => {
  selectedCatalogItem = null;
  renderSuggestions(grocerySearchInput.value);
});

grocerySearchInput.addEventListener("focus", () => {
  renderSuggestions(grocerySearchInput.value);
});

addManualGroceryBtn.addEventListener("click", () => {
  if (!selectedCatalogItem) {
    const name = grocerySearchInput.value.trim();
    if (!name) {
      alert("Select or enter an item first.");
      return;
    }

    const catalog = getItemCatalog();
    const match = catalog.find(
      item => item.name.toLowerCase() === name.toLowerCase()
    );

    if (!match) {
      alert("Select an item from the list or click Add New Item Name first.");
      return;
    }

    selectedCatalogItem = match;
  }

  addManualItemToGroceryList(selectedCatalogItem);
});

addNewManualItemBtn.addEventListener("click", () => {
  addNewItemName();
});

clearCheckedBtn.addEventListener("click", () => {
  const items = getGroceryList();
  const filtered = items.filter(item => !item.checked);
  saveGroceryList(filtered);
  renderGroceryList();
});

document.addEventListener("click", event => {
  if (
    !grocerySearchInput.contains(event.target) &&
    !grocerySuggestions.contains(event.target)
  ) {
    grocerySuggestions.style.display = "none";
  }
});

renderGroceryList();