const groceryListContainer = document.getElementById("groceryListContainer");
const clearCheckedBtn = document.getElementById("clearCheckedBtn");

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
    pint: ["pint", "pints"]
  };

  const forms = unitMap[unit] || [unit, unit];
  return quantity === 1 ? forms[0] : forms[1];
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
        item.unit === groceryItem.unit
      )
  );

  saveGroceryList(updatedGroceryList);
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

    text.innerHTML = `
      <strong>${item.name}</strong><br>
      <span>Buy: ${quantityText}</span><br>
      <span>Needed: ${item.quantityNeeded} ${formatUnit(item.quantityNeeded, item.unit)} | In Inventory: ${item.quantityInInventory} ${formatUnit(item.quantityInInventory, item.unit)}</span>
    `;

    if (item.checked) {
      text.style.opacity = "0.5";
      text.style.textDecoration = "line-through";
    }

    left.appendChild(checkbox);
    left.appendChild(text);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Add to Inventory";

    addBtn.addEventListener("click", () => {
    addItemToInventory(item);
    });

    row.appendChild(left);
    row.appendChild(addBtn);
    groceryListContainer.appendChild(row);
    });
}

clearCheckedBtn.addEventListener("click", () => {
  const items = getGroceryList();
  const filtered = items.filter(item => !item.checked);
  saveGroceryList(filtered);
  renderGroceryList();
});

renderGroceryList();