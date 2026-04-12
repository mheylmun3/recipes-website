import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const jsonPath = path.join(projectRoot, 'all-recipes.json')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
}

const supabase = createClient(supabaseUrl, supabaseKey)

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function normalizeText(value) {
  if (value == null) return ''
  return String(value).trim()
}

function parseIngredientSlug(ingredient) {
  if (ingredient?.ingredientId) return ingredient.ingredientId

  const base =
    normalizeText(ingredient?.name) ||
    normalizeText(ingredient?.text)

  return slugify(base)
}

async function main() {
  const raw = await fs.readFile(jsonPath, 'utf8')
  const recipes = JSON.parse(raw)

  if (!Array.isArray(recipes)) {
    throw new Error('all-recipes.json must contain a top-level array')
  }

  console.log(`Found ${recipes.length} recipes`)

  for (const recipe of recipes) {
    const recipeSlug = normalizeText(recipe.slug) || slugify(recipe.name)

    if (!recipe.name || !recipeSlug) {
      console.warn('Skipping recipe with missing name/slug:', recipe)
      continue
    }

    const recipePayload = {
      slug: recipeSlug,
      name: normalizeText(recipe.name),
      category: recipe.category ? normalizeText(recipe.category) : null,
      servings: Number.isInteger(recipe.servings) ? recipe.servings : 1,
      instructions: recipe.instructions ? normalizeText(recipe.instructions) : '',
      image_path: recipe.image ? normalizeText(recipe.image) : '',
      calories: recipe.calories ?? null,
      protein: recipe.protein ?? null,
      fiber: recipe.fiber ?? null
    }

    const { data: recipeRow, error: recipeError } = await supabase
      .from('recipes')
      .upsert(recipePayload, { onConflict: 'slug' })
      .select('id, slug')
      .single()

    if (recipeError) {
      throw new Error(`Failed upserting recipe "${recipe.name}": ${recipeError.message}`)
    }

    const recipeId = recipeRow.id
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []

    const joinRows = []

    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i]
      const ingredientName =
        normalizeText(ing?.name) ||
        normalizeText(ing?.text)

      if (!ingredientName) continue

      const ingredientSlug = parseIngredientSlug(ing)

      const ingredientPayload = {
        slug: ingredientSlug,
        name: ingredientName
      }

      const { data: ingredientRow, error: ingredientError } = await supabase
        .from('ingredients')
        .upsert(ingredientPayload, { onConflict: 'slug' })
        .select('id, slug')
        .single()

      if (ingredientError) {
        throw new Error(
          `Failed upserting ingredient "${ingredientName}" for recipe "${recipe.name}": ${ingredientError.message}`
        )
      }

      joinRows.push({
        recipe_id: recipeId,
        ingredient_id: ingredientRow.id,
        quantity: ing?.quantity ?? null,
        unit: ing?.unit ? normalizeText(ing.unit) : null,
        sort_order: i + 1,
        display_text: normalizeText(ing?.text) || ingredientName
      })
    }

    if (joinRows.length > 0) {
      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId)

      if (deleteError) {
        throw new Error(
          `Failed clearing old recipe_ingredients for "${recipe.name}": ${deleteError.message}`
        )
      }

      const { error: joinError } = await supabase
        .from('recipe_ingredients')
        .insert(joinRows)

      if (joinError) {
        throw new Error(
          `Failed inserting recipe_ingredients for "${recipe.name}": ${joinError.message}`
        )
      }
    }

    console.log(`Imported: ${recipe.name}`)
  }

  console.log('Import complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})