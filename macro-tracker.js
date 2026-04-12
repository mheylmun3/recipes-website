const macroSummary = document.getElementById("macroSummary");
const macroRecipeList = document.getElementById("macroRecipeList");

function safeNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value : 0;
}

function formatMacro(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function createSummaryCard(label, value, suffix = "") {
  const card = document.createElement("div");
  card.className = "macro-summary-card";
  card.innerHTML = `
    <span class="macro-summary-label">${label}</span>
    <strong class="macro-summary-value">${formatMacro(value)}${suffix}</strong>
  `;
  return card;
}

function renderMacroSummary(totals) {
  macroSummary.innerHTML = "";

  macroSummary.appendChild(createSummaryCard("Calories", totals.calories));
  macroSummary.appendChild(createSummaryCard("Protein", totals.protein, "g"));
  macroSummary.appendChild(createSummaryCard("Fiber", totals.fiber, "g"));
}

function renderMacroRecipeList(items) {
  macroRecipeList.innerHTML = "";

  if (!items.length) {
    macroRecipeList.innerHTML = "<p>No meal plan recipes found.</p>";
    return;
  }

  items.forEach(item => {
    const recipe = item.recipe;
    if (!recipe) return;

    const count = safeNumber(item.count || 1);
    const calories = safeNumber(recipe.calories) * count;
    const protein = safeNumber(recipe.protein) * count;
    const fiber = safeNumber(recipe.fiber) * count;

    const row = document.createElement("div");
    row.className = "inventory-item macro-breakdown-item";

    row.innerHTML = `
      <div>
        <strong>${recipe.name}</strong><br>
        <span>Count: ${count}</span><br>
        <span>Calories: ${formatMacro(calories)}</span><br>
        <span>Protein: ${formatMacro(protein)}g</span><br>
        <span>Fiber: ${formatMacro(fiber)}g</span>
      </div>
    `;

    macroRecipeList.appendChild(row);
  });
}

async function loadMacroTracker() {
  try {
    const mealPlanItems = await fetchMealPlanFromSupabase();

    let totalCalories = 0;
    let totalProtein = 0;
    let totalFiber = 0;

    mealPlanItems.forEach(item => {
      const recipe = item.recipe;
      if (!recipe) return;

      const count = safeNumber(item.count || 1);

      totalCalories += safeNumber(recipe.calories) * count;
      totalProtein += safeNumber(recipe.protein) * count;
      totalFiber += safeNumber(recipe.fiber) * count;
    });

    renderMacroSummary({
      calories: totalCalories,
      protein: totalProtein,
      fiber: totalFiber
    });

    renderMacroRecipeList(mealPlanItems);
  } catch (error) {
    console.error("Failed to load macro tracker:", error);
    macroSummary.innerHTML = "<p>Failed to load macro totals.</p>";
    macroRecipeList.innerHTML = "<p>Failed to load macro breakdown.</p>";
  }
}

loadMacroTracker();