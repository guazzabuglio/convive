// All Mealie API calls go through the /mealie/... proxy.
// In dev: Vite proxies to your local Mealie instance.
// In production: nginx inside the Docker container proxies to MEALIE_HOST.

export async function testConnection(token) {
  const res = await fetch("/mealie/api/app/about", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchRecipes(token, perPage = 60) {
  const res = await fetch(
    `/mealie/api/recipes?page=1&perPage=${perPage}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Mealie API error: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

export async function fetchRecipeDetail(token, slug) {
  const res = await fetch(`/mealie/api/recipes/${slug}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Recipe fetch error: ${res.status}`);
  return res.json();
}

// Mealie image URLs use the recipe ID (UUID), not the slug.
// Accept either a recipe object or a raw id for convenience.
export function recipeImageUrl(recipe) {
  const id = typeof recipe === "object" ? recipe.id : recipe;
  return `/mealie/api/media/recipes/${id}/images/original.webp`;
}

export function mealieRecipeUrl(slug) {
  return `/mealie/recipe/${slug}`;
}
