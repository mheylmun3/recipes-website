function trackRecipeClick(slug) {
    const key = `clicks-${slug}`;
    let count = localStorage.getItem(key);
    localStorage.setItem(key, count ? parseInt(count) + 1 : 1);
  }

const featuredContainer = document.querySelector(".recipe-card-container");

fetch("all-recipes.json")
  .then(res => res.json())
  .then(recipes => {
    recipes.forEach(r => {
      const clicks = localStorage.getItem(`clicks-${r.slug}`) || 0;
      r.clicks = parseInt(clicks);
    });

    const sorted = recipes.sort((a, b) => b.clicks - a.clicks).slice(0, 4);

    featuredContainer.innerHTML = "";
    sorted.forEach(recipe => {
      const card = document.createElement("a");
      card.href = `recipes/${recipe.slug}.html`;
      card.onclick = () => trackRecipeClick(recipe.slug);
      card.className = "recipe-card";
      card.innerHTML = `
        <h4>${recipe.name}</h4>
        <p>${recipe.instructions.slice(0, 100)}...</p>
      `;
      featuredContainer.appendChild(card);
    });
  });
