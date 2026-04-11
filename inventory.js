const ingredientSearch = document.getElementById("ingredientSearch");
const ingredientSuggestions = document.getElementById("ingredientSuggestions");
const ingredientQuantity = document.getElementById("ingredientQuantity");
const ingredientUnit = document.getElementById("ingredientUnit");
const addSelectedBtn = document.getElementById("addSelectedBtn");
const addNewBtn = document.getElementById("addNewBtn");
const inventoryList = document.getElementById("inventoryList");

let selectedIngredient = null;

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
    const saved = localStorage.getItem("ingredientCatalog");

    if (!saved) {
      localStorage.setItem("ingredientCatalog", JSON.stringify(defaultIngredients));
      return [...defaultIngredients];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...defaultIngredients];
  } catch (error) {
    console.error("Failed to load ingredient catalog:", error);
    return [...defaultIngredients];
  }
}

function saveIngredientCatalog(catalog) {
  localStorage.setItem("ingredientCatalog", JSON.stringify(catalog));
}

function getInventory() {
  try {
    const saved = localStorage.getItem("inventoryItems");
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load inventory:", error);
    return [];
  }
}

function saveInventory(items) {
  localStorage.setItem("inventoryItems", JSON.stringify(items));
}

function renderSuggestions(searchTerm) {
  const catalog = getIngredientCatalog();
  ingredientSuggestions.innerHTML = "";
  selectedIngredient = null;

  const trimmed = searchTerm.trim().toLowerCase();

  if (!trimmed) {
    ingredientSuggestions.style.display = "none";
    return;
  }

  const matches = catalog
    .filter(item => item.name.toLowerCase().includes(trimmed))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);

  if (!matches.length) {
    ingredientSuggestions.style.display = "none";
    return;
  }

  matches.forEach(item => {
    const option = document.createElement("div");
    option.className = "suggestion-item";
    option.textContent = item.name;

    option.addEventListener("click", () => {
      selectedIngredient = item;
      ingredientSearch.value = item.name;
      ingredientSuggestions.innerHTML = "";
      ingredientSuggestions.style.display = "none";
    });

    ingredientSuggestions.appendChild(option);
  });

  ingredientSuggestions.style.display = "block";
}

function clearIngredientForm() {
  ingredientSearch.value = "";
  ingredientQuantity.value = "";
  ingredientUnit.value = "count";
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
    cloves: ["clove", "cloves"]
  };

  const forms = unitMap[unit] || [unit, unit];

  return quantity === 1 ? forms[0] : forms[1];
}

function renderInventory() {
  const items = getInventory();
  inventoryList.innerHTML = "";

  if (!items.length) {
    inventoryList.innerHTML = "<p>No ingredients in inventory yet.</p>";
    return;
  }

  items
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(item => {
      const row = document.createElement("div");
      row.className = "inventory-item";

      const name = document.createElement("span");

      const formattedUnit = formatUnit(item.quantity, item.unit);

      name.textContent = `${item.name} — ${item.quantity} ${formattedUnit}`;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.type = "button";

      removeBtn.addEventListener("click", () => {
        const current = getInventory().filter(inv => inv.id !== item.id);
        saveInventory(current);
        renderInventory();
      });

      row.appendChild(name);
      row.appendChild(removeBtn);
      inventoryList.appendChild(row);
    });
}

function addIngredientToInventory(ingredient) {
  const quantityValue = parseFloat(ingredientQuantity.value);
  const unitValue = ingredientUnit.value;

  if (Number.isNaN(quantityValue) || quantityValue <= 0) {
    alert("Enter a valid quantity greater than 0.");
    return;
  }

  const currentInventory = getInventory();
  const existingItem = currentInventory.find(item => item.id === ingredient.id);

  if (existingItem) {
    if (existingItem.unit !== unitValue) {
      alert(
        `This ingredient already exists with unit "${existingItem.unit}". Please use the same unit.`
      );
      return;
    }

    existingItem.quantity += quantityValue;
  } else {
    currentInventory.push({
      id: ingredient.id,
      name: ingredient.name,
      quantity: quantityValue,
      unit: unitValue
    });
  }

  saveInventory(currentInventory);
  renderInventory();
  clearIngredientForm();
}

function addNewIngredient() {
  const name = ingredientSearch.value.trim();

  if (!name) {
    alert("Enter an ingredient name first.");
    return;
  }

  const quantityValue = parseFloat(ingredientQuantity.value);
  if (Number.isNaN(quantityValue) || quantityValue <= 0) {
    alert("Enter a valid quantity greater than 0.");
    return;
  }

  const catalog = getIngredientCatalog();
  const existing = catalog.find(
    item => item.name.toLowerCase() === name.toLowerCase()
  );

  if (existing) {
    addIngredientToInventory(existing);
    return;
  }

  const newIngredient = {
    id: slugify(name),
    name
  };

  catalog.push(newIngredient);
  saveIngredientCatalog(catalog);
  addIngredientToInventory(newIngredient);
}

ingredientSearch.addEventListener("input", () => {
  renderSuggestions(ingredientSearch.value);
});

addSelectedBtn.addEventListener("click", () => {
  if (!selectedIngredient) {
    alert("Select an ingredient from the dropdown first.");
    return;
  }

  addIngredientToInventory(selectedIngredient);
});

addNewBtn.addEventListener("click", () => {
  addNewIngredient();
});

document.addEventListener("click", event => {
  if (
    !ingredientSearch.contains(event.target) &&
    !ingredientSuggestions.contains(event.target)
  ) {
    ingredientSuggestions.style.display = "none";
  }
});

renderInventory();