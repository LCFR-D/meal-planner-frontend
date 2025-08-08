import React, { useEffect, useMemo, useState } from "react";
import { CONFIG } from "./config";

// Types via JSDoc for clarity
/**
 * @typedef {"Produce"|"Meat"|"Seafood"|"Bakery"|"Dairy"|"Pantry"|"Frozen"|"Deli"|"Household"} Section
 * @typedef {{ item: string, qty?: string, section?: Section }} Ingredient
 * @typedef {{ id: string, name: string, tags: string[], serves?: number, ingredients: Ingredient[], steps?: string[] }} Recipe
 */

const norm = (s) => s.toLowerCase().trim();
const unique = (arr) => [...new Set(arr)];
const fmtDateKey = (d) => new Date(d).toISOString().slice(0,10);
const addDays = (d, n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth()+1, 0);

function recipeBlockedBy(recipe, dislikedTokens) {
  if (!dislikedTokens.length) return false;
  const tokens = new Set(dislikedTokens.map(norm));
  const fields = [recipe.name, ...recipe.tags, ...recipe.ingredients.map((i) => i.item)].map(norm);
  return fields.some((f) => [...tokens].some((t) => f.includes(t)));
}

// Local storage (versioned)
const STORE_KEY = "mp_au_store_v2";
const DEFAULT_STATE = {
  dislikes: ["seafood", "pork", "star anise"],
  suggestCount: 8,
  selectedMealIds: [],
  currentMonthISO: new Date().toISOString(),
  placements: /** @type {Record<string,string>} */ ({}),
  pantry: ["salt", "pepper", "olive oil"],
  servesPerMeal: 4,
};

function useStore() {
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : DEFAULT_STATE; } catch { return DEFAULT_STATE; }
  });
  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} }, [state]);
  return [state, setState];
}

// API client
const ApiClient = {
  /** @returns {Promise<Recipe[]>} */
  async listRecipes() {
    const res = await fetch(`${CONFIG.API_BASE_URL}/recipes`);
    if (!res.ok) throw new Error("Failed to load recipes");
    return res.json();
  },
  async getPlans(from, to) {
    const qs = new URLSearchParams({ from, to }).toString();
    const res = await fetch(`${CONFIG.API_BASE_URL}/plans?${qs}`);
    if (!res.ok) throw new Error("Failed to load plans");
    return res.json();
  },
  async savePlan({ date, recipeId }) {
    const res = await fetch(`${CONFIG.API_BASE_URL}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, recipeId }),
    });
    if (!res.ok) throw new Error("Failed to save plan");
    return res.json();
  },
};

// App
export default function App() {
  const [state, setState] = useStore();
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState(/** @type {Recipe[]} */([]));
  const [activeAssignId, setActiveAssignId] = useState(null);

  // load recipes
  useEffect(() => {
    ApiClient.listRecipes().then(setRecipes).catch(console.error);
  }, []);

  const monthDate = useMemo(() => new Date(state.currentMonthISO), [state.currentMonthISO]);

  const filtered = useMemo(() => {
    const q = norm(query);
    const base = recipes.filter((r) => !recipeBlockedBy(r, state.dislikes));
    const narrowed = q
      ? base.filter((r) => [r.name, ...r.tags, ...r.ingredients?.map((i) => i.item || "")].some((f) => norm(f).includes(q)))
      : base;
    return narrowed.slice(0, state.suggestCount);
  }, [recipes, state.dislikes, state.suggestCount, query]);

  const selectedMeals = useMemo(() => recipes.filter((r) => state.selectedMealIds.includes(r.id)), [recipes, state.selectedMealIds]);

  const daysInGrid = useMemo(() => {
    const start = startOfMonth(monthDate);
    const gridStart = addDays(start, -start.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [monthDate]);

  const shoppingList = useMemo(() => {
    /** @type {Record<string, { qty: string[], section: string }>} */
    const map = {};
    Object.entries(state.placements).forEach(([dateKey, recipeId]) => {
      const recipe = recipes.find((r) => r.id === recipeId);
      if (!recipe) return;
      (recipe.ingredients || []).forEach((ing) => {
        const itemKey = norm(ing.item);
        if (state.pantry.map(norm).includes(itemKey)) return;
        if (!map[itemKey]) map[itemKey] = { qty: [], section: ing.section || "" };
        map[itemKey].qty.push(ing.qty || "");
      });
    });
    return Object.entries(map).map(([item, v]) => ({
      item,
      quantity: v.qty.filter(Boolean).join(" + ") || "",
      section: v.section,
    })).sort((a,b) => (a.section||"").localeCompare(b.section||"") || a.item.localeCompare(b.item));
  }, [state.placements, recipes, state.pantry]);

  function set(partial) { setState({ ...state, ...partial }); }
  function setDislikes(fn) { setState({ ...state, dislikes: typeof fn === 'function' ? fn(state.dislikes) : fn }); }
  function toggleSelectMeal(id) { setState({ ...state, selectedMealIds: state.selectedMealIds.includes(id) ? state.selectedMealIds.filter((x) => x !== id) : [...state.selectedMealIds, id] }); }
  function assignMealToDate(id, dt) { setState({ ...state, placements: { ...state.placements, [fmtDateKey(dt)]: id } }); }
  function clearDate(dt) { const k = fmtDateKey(dt); const copy = { ...state.placements }; delete copy[k]; setState({ ...state, placements: copy }); }
  function addDislikeFromInput() { const token = query.trim(); if (!token) return; if (!state.dislikes.map(norm).includes(norm(token))) setDislikes([...state.dislikes, token]); setQuery(""); }
  function autoFillWeek(startDt) { if (!selectedMeals.length) return; const copy = { ...state.placements }; for (let i=0;i<7;i++){ const d=addDays(startDt,i); copy[fmtDateKey(d)] = selectedMeals[i % selectedMeals.length].id; } setState({ ...state, placements: copy }); }

  function download(filename, text, mime = "text/plain") {
    const a = document.createElement("a");
    a.href = `data:${mime};charset=utf-8,` + encodeURIComponent(text);
    a.download = filename; a.style.display = "none"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  function toCSV(rows) { return rows.map((r) => r.map((c) => `"${String(c).replaceAll('"','""')}"`).join(",")).join("\n"); }
  function createICS(events) {
    const header = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//MealPlannerAU//EN",`X-WR-TIMEZONE:${CONFIG.TIMEZONE}`];
    const body = events.map((e, idx) => {
      const dtstamp = new Date().toISOString().replace(/[-:]/g,"").split(".")[0] + "Z";
      const dt = new Date(e.dt);
      const y = dt.getFullYear();
      const m = String(dt.getMonth()+1).padStart(2,"0");
      const d = String(dt.getDate()).padStart(2,"0");
      const DTSTART = `${y}${m}${d}`;
      return ["BEGIN:VEVENT",`UID:${dtstamp}-${idx}@mealplannerau`,`DTSTAMP:${dtstamp}`,`DTSTART;VALUE=DATE:${DTSTART}`,`SUMMARY:${e.title}`,e.description ? `DESCRIPTION:${e.description.replaceAll("\n","\\n")}` : null,"END:VEVENT"].filter(Boolean).join("\n");
    });
    return [...header, ...body, "END:VCALENDAR"].join("\n");
  }
  function exportCSV() {
    const rows = [["Item","Quantity","Section"], ...shoppingList.map((r)=>[r.item, r.quantity, r.section||""])];
    download("shopping-list-au.csv", toCSV(rows), "text/csv");
  }
  function exportICS() {
    const events = Object.entries(state.placements).map(([dateKey, id]) => {
      const r = recipes.find((x) => x.id === id);
      return { title: r ? r.name : id, dt: new Date(dateKey), description: r ? ((r.ingredients||[]).map(i => `• ${i.qty ? i.qty + ' ' : ''}${i.item}`).join("\n")) : undefined };
    });
    download("meal-plan-au.ics", createICS(events));
  }
  async function saveDay(k) {
    const recipeId = state.placements[k];
    if (!recipeId) return;
    await ApiClient.savePlan({ date: k, recipeId });
  }

  // UI
  const inAU = { locale: CONFIG.LOCALE };
  const daysOfWeek = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" lang="en-AU">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Meal Planner AU</h1>
            <p className="text-slate-600">Avoid dislikes. Plan meals. Shop once, fuss less.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCSV} className="rounded-xl border px-3 py-2 shadow-sm hover:bg-white">Export Shopping List (CSV)</button>
            <button onClick={exportICS} className="rounded-xl border px-3 py-2 shadow-sm hover:bg-white">Export Calendar (.ics)</button>
            <button onClick={() => { if(confirm("Clear the whole plan?")) setState({ ...DEFAULT_STATE, currentMonthISO: new Date().toISOString() }); }} className="rounded-xl border px-3 py-2 shadow-sm hover:bg-rose-50">Reset</button>
          </div>
        </header>

        <section className="mb-6 rounded-2xl bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Settings (AU)</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex items-center justify-between gap-3 rounded-xl border p-2">
              <span className="text-sm">Suggestions to show</span>
              <input type="number" min={1} max={24} value={state.suggestCount} onChange={(e)=>set({ suggestCount: parseInt(e.target.value||"8") })} className="w-20 rounded border px-2 py-1" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border p-2">
              <span className="text-sm">Default serves per meal</span>
              <input type="number" min={1} max={10} value={state.servesPerMeal} onChange={(e)=>set({ servesPerMeal: parseInt(e.target.value||"4") })} className="w-20 rounded border px-2 py-1" />
            </label>
            <div className="rounded-xl border p-2">
              <div className="text-sm mb-1">Pantry staples (excluded)</div>
              <div className="flex flex-wrap gap-2">
                {state.pantry.map((p) => (
                  <span key={p} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs">
                    {p}
                    <button onClick={() => set({ pantry: state.pantry.filter((x)=>x!==p) })} className="text-slate-500 hover:text-slate-800">×</button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input placeholder="Add pantry item…" className="w-full rounded border px-3 py-1" onKeyDown={(e)=>{ if(e.key==='Enter'){ const v=e.currentTarget.value.trim(); if(v){ set({ pantry: unique([...state.pantry, v]) }); e.currentTarget.value=''; } } }} />
              </div>
            </div>
            <div className="rounded-xl border p-2 text-sm">
              <div className="font-medium">Backend</div>
              <p className="text-slate-500">API: On • Origin: {CONFIG.API_BASE_URL}</p>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl bg-white p-4 shadow">
          <h2 className="mb-2 text-lg font-semibold">Disliked ingredients or cuisines</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {state.dislikes.map((d) => (
              <span key={d} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm">
                {d}
                <button onClick={() => setDislikes(state.dislikes.filter((x)=>norm(x)!==norm(d)))} className="text-slate-500 hover:text-slate-800">×</button>
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addDislikeFromInput(); }}
              placeholder="Type to filter recipes or add a dislike… (press Enter to add)"
              className="w-full rounded-xl border px-3 py-2"
            />
            <div className="flex items-center gap-2">
              <button onClick={addDislikeFromInput} className="rounded-xl border px-3 py-2 shadow-sm hover:bg-white">Add dislike</button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-2 text-lg font-semibold">Suggestions</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => (
                <article key={r.id} className={`rounded-xl border p-3 ${state.selectedMealIds.includes(r.id) ? 'ring-2 ring-emerald-400' : ''}`}>
                  <h3 className="font-medium">{r.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{r.tags.join(" • ")}{r.serves?` • serves ${r.serves}`:''}</p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 max-h-24 overflow-auto">
                    {(r.ingredients||[]).slice(0, 6).map((i, idx) => (
                      <li key={idx}>{i.qty ? i.qty + " " : ""}{i.item}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => toggleSelectMeal(r.id)} className="rounded-lg border px-2 py-1 text-sm hover:bg-white">
                      {state.selectedMealIds.includes(r.id) ? 'Remove' : 'Select'}
                    </button>
                    <button onClick={() => setActiveAssignId(r.id)} className="rounded-lg border px-2 py-1 text-sm hover:bg-white">Assign to a date</button>
                  </div>
                </article>
              ))}
              {filtered.length === 0 && (
                <div className="text-sm text-slate-600">No suggestions. Remove a dislike or clear the search.</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-2 text-lg font-semibold">Selected meals</h2>
            <ul className="space-y-2">
              {selectedMeals.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg border p-2">
                  <span className="text-sm">{r.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveAssignId(r.id)} className="rounded border px-2 py-1 text-xs">Assign</button>
                    <button onClick={() => toggleSelectMeal(r.id)} className="rounded border px-2 py-1 text-xs">Remove</button>
                  </div>
                </li>
              ))}
              {selectedMeals.length === 0 && <p className="text-sm text-slate-500">Pick a few meals to plan.</p>}
            </ul>
            <hr className="my-3"/>
            <button onClick={() => autoFillWeek(new Date())} className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-white" disabled={!selectedMeals.length}>Autofill next 7 days</button>
          </div>
        </section>

        <section className="mb-6 rounded-2xl bg-white p-4 shadow">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Calendar</h2>
              <p className="text-xs text-slate-500">Click a date to place the active meal {activeAssignId ? <span className="font-medium text-emerald-600">({recipes.find(r => r.id === activeAssignId)?.name})</span> : <span className="text-slate-400">(pick a meal)</span>}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => set({ currentMonthISO: new Date(monthDate.getFullYear(), monthDate.getMonth()-1, 1).toISOString() })} className="rounded border px-2 py-1">◀</button>
              <div className="min-w-[12ch] text-center font-medium">{monthDate.toLocaleString(inAU.locale, { month: 'long', year: 'numeric' })}</div>
              <button onClick={() => set({ currentMonthISO: new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 1).toISOString() })} className="rounded border px-2 py-1">▶</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-xs font-medium text-slate-500">
            {daysOfWeek.map((d) => (<div key={d} className="px-2 py-1">{d}</div>))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-2">
            {daysInGrid.map((d, idx) => {
              const inMonth = d.getMonth() === monthDate.getMonth();
              const k = fmtDateKey(d);
              const meal = state.placements[k] ? recipes.find((r) => r.id === state.placements[k]) : null;
              return (
                <div key={idx} className={`min-h-[84px] rounded-xl border p-2 ${inMonth ? '' : 'bg-slate-50 opacity-60'}`}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{d.getDate()}</span>
                    {meal && <button onClick={() => clearDate(d)} className="rounded px-1 text-slate-400 hover:text-rose-500">clear</button>}
                  </div>
                  <button
                    className={`w-full rounded-lg border px-2 py-1 text-left text-sm ${activeAssignId ? 'hover:bg-emerald-50' : 'opacity-60'}`}
                    onClick={async () => { 
                      if (activeAssignId) { 
                        assignMealToDate(activeAssignId, d);
                        try { await saveDay(k); } catch (e) { console.error(e); }
                      }
                    }}
                    title={activeAssignId ? 'Place active meal here' : 'Select a meal then click a date'}
                  >
                    {meal ? (
                      <span className="block truncate">{meal.name}</span>
                    ) : (
                      <span className="block text-slate-400">— empty —</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-10 rounded-2xl bg-white p-4 shadow">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Shopping list</h2>
            <span className="text-sm text-slate-500">{Object.keys(state.placements).length} planned days</span>
          </div>
          {shoppingList.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="p-2">Item</th>
                    <th className="p-2">Quantity</th>
                    <th className="p-2">Section</th>
                  </tr>
                </thead>
                <tbody>
                  {shoppingList.map((row) => (
                    <tr key={row.item} className="border-b">
                      <td className="p-2 capitalize">{row.item}</td>
                      <td className="p-2">{row.quantity}</td>
                      <td className="p-2">{row.section}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Add meals to the calendar to build your shopping list.</p>
          )}
        </section>

        <footer className="pb-8 text-center text-xs text-slate-500">
          <p>Built for Australia • Metric • Ready for API at {CONFIG.API_BASE_URL}</p>
        </footer>
      </div>
    </div>
  );
}
