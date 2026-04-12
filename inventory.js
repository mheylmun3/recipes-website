const ingredientSearch = document.getElementById("ingredientSearch");
const ingredientSuggestions = document.getElementById("ingredientSuggestions");
const ingredientQuantity = document.getElementById("ingredientQuantity");
const ingredientUnit = document.getElementById("ingredientUnit");
const addSelectedBtn = document.getElementById("addSelectedBtn");
const addNewBtn = document.getElementById("addNewBtn");
const inventoryList = document.getElementById("inventoryList");
const inventorySearch = document.getElementById("inventorySearch");

let selectedIngredient = null;
let currentInventory = [];

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

function renderInventory() {
  const searchTerm = inventorySearch ? inventorySearch.value.trim().toLowerCase() : "";

  inventoryList.innerHTML = "";

  let filteredItems = currentInventory;

  if (searchTerm) {
    filteredItems = currentInventory.filter(item =>
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
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(item => {
      const row = document.createElement("div");
      row.className = "inventory-item";

      const name = document.createElement("span");
      const formattedUnit = formatUnit(item.quantity, item.unit);
      name.textContent = `${item.name} — ${item.quantity} ${formattedUnit}`;

      row.appendChild(name);
      inventoryList.appendChild(row);
    });
}

async function addIngredientToInventory(ingredient) {
  const quantityValue = parseFloat(ingredientQuantity.value);
  const unitValue = ingredientUnit.value;

  if (Number.isNaN(quantityValue) || quantityValue === 0) {
    alert("Enter a quantity greater than 0 or less than 0.");
    return;
  }

  try {
    await upsertInventoryItemInSupabase({
      ingredientSlug: ingredient.id,
      ingredientName: ingredient.name,
      quantity: quantityValue,
      unit: unitValue
    });

    clearIngredientForm();
    await loadInventory();
    await rebuildMealPlanGroceryListInSupabase();
  } catch (error) {
    console.error("Failed to update inventory:", error);
    alert(error.message || "Failed to update inventory.");
  }
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

async function loadInventory() {
  try {
    currentInventory = await fetchInventoryFromSupabase();
    renderInventory();
  } catch (error) {
    console.error("Failed to load inventory from Supabase:", error);
    inventoryList.innerHTML = "<p>Failed to load inventory.</p>";
  }
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

inventorySearch.addEventListener("input", () => {
  renderInventory();
});

loadInventory();