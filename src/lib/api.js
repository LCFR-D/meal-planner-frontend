import { CONFIG } from '../config';
const base = CONFIG.API_BASE_URL;

export async function fetchRecipes(dislikesCsv = "") {
  const qs = dislikesCsv ? `?exclude=${encodeURIComponent(dislikesCsv)}` : "";
  const r = await fetch(`${base}/recipes${qs}`);
  if (!r.ok) throw new Error("Failed to fetch recipes");
  return r.json();
}

// NEW: accept {from,to}
export async function fetchPlans({ from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const r = await fetch(`${base}/plans${qs}`);
  if (!r.ok) throw new Error("Failed to fetch plans");
  return r.json();
}

// NEW: accept slot
export async function savePlan({ dateISO, slot = "main", recipeId }) {
  const r = await fetch(`${base}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: dateISO, slot, recipeId })
  });
  if (!r.ok) throw new Error("Failed to save plan");
  return r.json();
}