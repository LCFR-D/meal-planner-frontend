import { CONFIG } from '../config';
const base = CONFIG.API_BASE_URL;

export async function fetchRecipes(dislikesCsv = "") {
  const qs = dislikesCsv ? `?exclude=${encodeURIComponent(dislikesCsv)}` : "";
  const r = await fetch(`${base}/recipes${qs}`);
  if (!r.ok) throw new Error("Failed to fetch recipes");
  return r.json();
}
export async function fetchPlans() {
  const r = await fetch(`${base}/plans`);
  if (!r.ok) throw new Error("Failed to fetch plans");
  return r.json();
}
export async function savePlan({ dateISO, recipeId }) {
  const r = await fetch(`${base}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: dateISO, recipeId })
  });
  if (!r.ok) throw new Error("Failed to save plan");
  return r.json();
}
