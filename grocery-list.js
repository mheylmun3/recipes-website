const groceryListContainer = document.getElementById("groceryListContainer"); 

const grocerySearchInput = document.getElementById("grocerySearchInput");
const grocerySuggestions = document.getElementById("grocerySuggestions");
const groceryQuantity = document.getElementById("groceryQuantity");
const groceryUnit = document.getElementById("groceryUnit");
const addManualGroceryBtn = document.getElementById("addManualGroceryBtn");
const addNewManualItemBtn = document.getElementById("addNewManualItemBtn");

let isSignedIn = false;
let selectedCatalogItem = null;
let currentGroceryList = [];

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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

async function loadGroceryList() {
  try {
    currentGroceryList = await fetchGroceryListFromSupabase();
    renderGroceryList();
  } catch (error) {
    console.error("Failed to load grocery list from Supabase:", error);
    groceryListContainer.innerHTML = "<p>Failed to load grocery list.</p>";
  }
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

async function addManualItemToGroceryList(item) {
  const quantity = parseFloat(groceryQuantity.value);
  const unit = groceryUnit.value;

  if (Number.isNaN(quantity) || quantity <= 0) {
    alert("Enter a valid quantity greater than 0.");
    return;
  }

  try {
    await upsertManualGroceryItemInSupabase({
      ingredientSlug: item.id,
      ingredientName: item.name,
      quantity,
      unit
    });

    clearManualAddForm();
    await loadGroceryList();
  } catch (error) {
    console.error("Failed to add manual grocery item:", error);
    alert(error.message || "Failed to add grocery item.");
  }
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

async function addItemToInventory(groceryItem) {
  try {
    await upsertInventoryItemInSupabase({
      ingredientSlug: groceryItem.ingredientId,
      ingredientName: groceryItem.name,
      quantity: groceryItem.quantityToBuy,
      unit: groceryItem.unit
    });

    await deleteGroceryItemFromSupabase(groceryItem.rowId);
    await loadGroceryList();
  } catch (error) {
    console.error("Failed to add grocery item to inventory:", error);
    alert(error.message || "Failed to add item to inventory.");
  }
}

async function removeGroceryItem(targetItem) {
  try {
    await deleteGroceryItemFromSupabase(targetItem.rowId);
    await loadGroceryList();
  } catch (error) {
    console.error("Failed to remove grocery item:", error);
    alert(error.message || "Failed to remove grocery item.");
  }
}

function toggleLocalCheckedState(row, text, checkbox) {
  const checked = !checkbox.checked;
  checkbox.checked = checked;

  if (checked) {
    text.style.opacity = "0.5";
    text.style.textDecoration = "line-through";
    row.classList.add("locally-checked");
  } else {
    text.style.opacity = "";
    text.style.textDecoration = "";
    row.classList.remove("locally-checked");
  }
}

async function refreshAuthState() {
  try {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) throw error;
    isSignedIn = !!data.user;
  } catch (error) {
    console.error("Failed to get auth state:", error);
    isSignedIn = false;
  }
}

function renderGroceryList() {
  groceryListContainer.innerHTML = "";

  if (!currentGroceryList.length) {
    groceryListContainer.innerHTML = "<p>No grocery items needed right now.</p>";
    return;
  }

  currentGroceryList.forEach(item => {
    const row = document.createElement("div");
    row.className = "inventory-item grocery-list-item";

    const left = document.createElement("div");
    left.className = "grocery-item-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!item.checked;

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

    if (isSignedIn) {
      checkbox.addEventListener("change", async () => {
        try {
          await updateGroceryItemCheckedInSupabase(item.rowId, checkbox.checked);
          await loadGroceryList();
        } catch (error) {
          console.error("Failed to update grocery item check state:", error);
          if (!handleGroceryAuthError(error, "Failed to update grocery item.")) {
            return;
          }
        }
      });
    } else {
      checkbox.addEventListener("click", event => {
        event.stopPropagation();
      });

      row.addEventListener("click", () => {
        toggleLocalCheckedState(row, text, checkbox);
      });
    }

    left.appendChild(checkbox);
    left.appendChild(text);

    row.appendChild(left);

    if (isSignedIn) {
      const buttonGroup = document.createElement("div");
      buttonGroup.className = "grocery-item-actions";

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.textContent = "Add to Inventory";
      addBtn.addEventListener("click", event => {
        event.stopPropagation();
        addItemToInventory(item);
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.className = "remove-btn";
      removeBtn.addEventListener("click", event => {
        event.stopPropagation();
        removeGroceryItem(item);
      });

      buttonGroup.appendChild(addBtn);
      buttonGroup.appendChild(removeBtn);
      row.appendChild(buttonGroup);
    }

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

document.addEventListener("click", event => {
  if (
    !grocerySearchInput.contains(event.target) &&
    !grocerySuggestions.contains(event.target)
  ) {
    grocerySuggestions.style.display = "none";
  }
});

(async function initGroceryListPage() {
  await refreshAuthState();
  await loadGroceryList();
})();