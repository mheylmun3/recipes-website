const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Route to display form
app.get('/new-recipe', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'new-recipe.html'));
});

// Route to handle form submission
app.post('/submit-recipe', upload.single('image'), (req, res) => {
    const { category, title, ingredients, instructions } = req.body;
    const fileName = title.toLowerCase().replace(/\s+/g, '_') + '.html';
    const imageUrl = req.file ? `/images/${req.file.filename}` : '';

    const recipeContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="stylesheet" href="../styles.css">
    </head>
    <body>
        <div class="navbar">
            <div class="dropdown">
                <button class="dropbtn" onclick="toggleMenu()">&#9776; Menu</button>
                <div class="dropdown-content" id="menuDropdown">
                    <a href="../index.html" onclick="openTab(event, 'Recipes')">Recipes</a>
                    <div class="sub-dropdown">
                        <a href="#" class="sub-dropbtn" onclick="toggleSubMenu()">&#9654; Recipes</a>
                        <div class="sub-dropdown-content" id="recipesSubMenu">
                            <a href="../index.html" onclick="openSubTab(event, 'MainDishes')">Main Dishes</a>
                            <a href="../index.html" onclick="openSubTab(event, 'SideDishes')">Side Dishes</a>
                            <a href="../index.html" onclick="openSubTab(event, 'SweetTreats')">Sweet Treats</a>
                        </div>
                    </div>
                    <a href="../index.html" onclick="openTab(event, 'GroceryList')">Grocery List</a>
                    <a href="../index.html" onclick="openTab(event, 'Inventory')">Inventory</a>
                </div>
            </div>
            <h1>Gab's Cuisines</h1>
        </div>

        <div class="recipe-content">
            <h2>${title}</h2>
            <h3>Ingredients</h3>
            <ul>
                ${ingredients.split('\n').map(item => `<li>${item}</li>`).join('')}
            </ul>
            <h3>Instructions</h3>
            <p>${instructions}</p>
            ${imageUrl ? `<img src="${imageUrl}" alt="${title}">` : ''}
        </div>

        <script src="../script.js"></script>
    </body>
    </html>
    `;

    fs.writeFile(path.join(__dirname, 'public', 'recipes', fileName), recipeContent, (err) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }

        // Append the new recipe link to the appropriate category list in index.html
        fs.readFile(path.join(__dirname, 'public', 'index.html'), 'utf8', (err, data) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }

            const updatedData = data.replace(`id="${category.replace(' ', '')}List">`, `id="${category.replace(' ', '')}List">\n<li><a href="recipes/${fileName}">${title}</a></li>`);
            
            fs.writeFile(path.join(__dirname, 'public', 'index.html'), updatedData, (err) => {
                if (err) {
                    console.error(err);
                    return res.sendStatus(500);
                }
                res.redirect(`/recipes/${fileName}`);
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
