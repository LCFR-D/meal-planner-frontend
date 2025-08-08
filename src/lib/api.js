import { CONFIG } from '../config';
const base = CONFIG.API_BASE_URL;

export async function fetchRecipes({ dislikesCsv = "", page = 0, pageSize = 12, includeTags = [] } = {}) {
  const params = new URLSearchParams();
  if (dislikesCsv) params.set("exclude", dislikesCsv);
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(pageSize));
  if (includeTags.length) params.set("includeTags", includeTags.join(","));
  const r = await fetch(`${base}/recipes?${params.toString()}`);
  if (!r.ok) throw new Error("Failed to fetch recipes");
  return r.json();
}

export async function fetchPlans({ from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const r = await fetch(`${base}/plans?${params.toString()}`);
  if (!r.ok) throw new Error("Failed to fetch plans");
  const data = await r.json();
  return Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
}

export async function savePlan({ dateISO, slot = "main", recipeId }) {
  const r = await fetch(`${base}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: dateISO, slot, recipeId })
  });
  if (!r.ok) throw new Error("Failed to save plan");
  return r.json();
}