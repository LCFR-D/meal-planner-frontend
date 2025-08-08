import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { fetchRecipes, fetchPlans, savePlan } from "./lib/api";
import { Navbar } from "./components/Navbar";
import { DislikesField } from "./components/DislikesField";
import { TagFilter } from "./components/TagFilter";
import { RecipesGrid } from "./components/RecipesGrid";
import { WeekPlanner } from "./components/WeekPlanner";
import { ShoppingListPanel } from "./components/ShoppingListPanel";
import { Toast } from "./components/Toast";
import { TagFilter } from "./components/TagFilter";
import { WeekPlanner } from "./components/WeekPlanner";


export default function App() {
  const [dislikes, setDislikes] = useState(["seafood","pork","star anise"]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState([]);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [toast, setToast] = useState(null);
const [selectedTags, setSelectedTags] = useState([]);

  const [selectedTags, setSelectedTags] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const dislikesCsv = useMemo(() => dislikes.join(", "), [dislikes]);
  const weekStart = useMemo(() => dayjs().startOf('week').add(weekOffset, 'week'), [weekOffset]);
  const from = weekStart.format('YYYY-MM-DD');
  const to = weekStart.add(6, 'day').format('YYYY-MM-DD');

// derive tag list from recipes
const allTags = useMemo(() =>
  Array.from(new Set(recipes.flatMap(r => (r.tags || r.cuisines || []).map(t => t.trim()).filter(Boolean)))).sort()
, [recipes]);

// filter recipes by selected tags (ANY)
const filteredRecipes = useMemo(() => {
  if (!selectedTags.length) return recipes;
  const set = new Set(selectedTags);
  return recipes.filter(r => (r.tags || r.cuisines || []).some(t => set.has(t)));
}, [recipes, selectedTags]);


  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [rs, ps] = await Promise.all([
          fetchRecipes(dislikesCsv),
          fetchPlans({ from, to })
        ]);
        if (!ignore) { setRecipes(rs); setPlans(ps); }
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [dislikesCsv, from, to]);

  const onAssign = async (dateISO, slot, recipe) => {
    try {
      await savePlan({ dateISO, slot, recipeId: recipe.id });
      setToast({ title: "Added to calendar", desc: `${recipe.name} on ${dayjs(dateISO).format("ddd D MMM")} (${slot})` });
      setPlans(prev => [...prev, { userId: "public", date: dateISO, slot, recipeId: recipe.id }]);
    } catch (e) {
      setToast({ title: "Could not save", desc: e.message, error: true });
    }
  };

  const shoppingList = useMemo(() => {
    const idx = Object.fromEntries(recipes.map(r => [String(r.id), r]));
    const items = {};
    for (const p of plans) {
      const rec = idx[String(p.recipeId)];
      if (rec?.ingredients) {
        for (const ing of rec.ingredients) {
          const key = ing.item.toLowerCase();
          items[key] = items[key] || { item: ing.item, qtys: [] };
          if (ing.qty) items[key].qtys.push(ing.qty);
        }
      }
    }
    return Object.values(items).map(x => ({ item: x.item, qty: x.qtys.join(", ") }));
  }, [plans, recipes]);

  return (
    <div className="min-h-screen">
      <Navbar onOpenShopping={() => setShoppingOpen(true)} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 pb-6">
        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow">
              <h2 className="text-lg font-semibold mb-3">Dislikes</h2>
              <p className="text-sm text-slate-500 mb-3">We’ll avoid meals with these ingredients.</p>
              <DislikesField value={dislikes} onChange={setDislikes} />
            </div>

<TagFilter
  allTags={allTags}
  selected={selectedTags}
  onToggle={(t) => setSelectedTags(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t])}
  onClear={() => setSelectedTags([])}
/>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow">
              <h2 className="text-lg font-semibold mb-3">This Week</h2>
              <WeekPlanner
                weekStartISO={weekStart.format('YYYY-MM-DD')}
                plans={plans}
                recipes={filteredRecipes}
                onAssign={onAssign}
                onPrevWeek={() => setWeekOffset(o => o - 1)}
                onThisWeek={() => setWeekOffset(0)}
                onNextWeek={() => setWeekOffset(o => o + 1)}
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Suggested meals</h2>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700"
              >
                Refresh
              </button>
            </div>
<RecipesGrid
  loading={loading}
  error={error}
  recipes={filteredRecipes}
/>
          </div>
        </section>
      </main>
      <ShoppingListPanel open={shoppingOpen} onClose={() => setShoppingOpen(false)} items={shoppingList} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}