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

export default function App() {
  // --- state
  const [dislikes, setDislikes] = useState(["seafood", "pork", "star anise"]);
  const [recipes, setRecipes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // filters + week nav
  const [selectedTags, setSelectedTags] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => dayjs().startOf("week").add(weekOffset, "week"), [weekOffset]);
  const from = weekStart.format("YYYY-MM-DD");
  const to = weekStart.add(6, "day").format("YYYY-MM-DD");
  const dislikesCsv = useMemo(() => dislikes.join(", "), [dislikes]);
// state
const [selectedTags, setSelectedTags] = useState([]);
const [weekOffset, setWeekOffset] = useState(0);

// NEW:
const [page, setPage] = useState(0);
const [pageSize, setPageSize] = useState(12);

// derive tags
const allTags = useMemo(
  () => Array.from(new Set(recipes.flatMap(r => (r.tags || r.cuisines || []).map(t => t.trim()).filter(Boolean)))).sort(),
  [recipes]
);

// fetch when dislikes/tags/page/pageSize change
useEffect(() => {
  let ignore = false;
  (async () => {
    setLoading(true);
    setError("");
    try {
      const rs = await fetchRecipes({
        dislikesCsv,
        page,
        pageSize,
        includeTags: selectedTags
      });
      const ps = await fetchPlans({ from, to });
      if (!ignore) {
        setRecipes(rs);
        setPlans(ps);
      }
    } catch (e) {
      if (!ignore) setError(e.message || "Failed to load");
    } finally {
      if (!ignore) setLoading(false);
    }
  })();
  return () => { ignore = true; };
}, [dislikesCsv, selectedTags, page, pageSize, from, to]);

// when filters change, reset to page 0
useEffect(() => { setPage(0); }, [selectedTags, dislikesCsv]);
  // derive all tags from recipes
  const allTags = useMemo(
    () => Array.from(new Set(recipes.flatMap(r => (r.tags || r.cuisines || []).map(t => t.trim()).filter(Boolean)))).sort(),
    [recipes]
  );

  // filter recipes by selected tags (ANY)
  const filteredRecipes = useMemo(() => {
    if (!selectedTags.length) return recipes;
    const set = new Set(selectedTags);
    return recipes.filter(r => (r.tags || r.cuisines || []).some(t => set.has(t)));
  }, [recipes, selectedTags]);

  // load recipes + plans when dislikes or week range changes
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [rs, ps] = await Promise.all([fetchRecipes(dislikesCsv), fetchPlans({ from, to })]);
        if (!ignore) {
          setRecipes(rs);
          setPlans(Array.isArray(ps) ? ps : (ps?.items ?? [])); // safety
        }
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [dislikesCsv, from, to]);

  // drop/assign handler (called by WeekPlanner)
  const onAssign = async (dateISO, slot, recipe) => {
    try {
      await savePlan({ dateISO, slot, recipeId: recipe.id });
      setPlans(prev => [...prev, { userId: "public", date: dateISO, slot, recipeId: recipe.id }]);
      setToast({ title: "Added to calendar", desc: `${recipe.name || recipe.title} on ${dayjs(dateISO).format("ddd D MMM")} (${slot})` });
    } catch (e) {
      setToast({ title: "Could not save", desc: e.message, error: true });
    }
  };

  // build shopping list from current plans
  const shoppingList = useMemo(() => {
    const byId = Object.fromEntries(recipes.map(r => [String(r.id), r]));
    const items = {};
    for (const p of plans) {
      const rec = byId[String(p.recipeId)];
      if (!rec?.ingredients) continue;
      for (const ing of rec.ingredients) {
        const key = (ing.name || ing.item).toLowerCase();
        const label = ing.name || ing.item;
        items[key] = items[key] || { item: label, qtys: [] };
        const qty = [ing.amount, ing.unit].filter(Boolean).join(" ").trim();
        if (qty) items[key].qtys.push(qty);
      }
    }
    return Object.values(items).map(x => ({ item: x.item, qty: x.qtys.join(", ") }));
  }, [plans, recipes]);

  return (
    <div className="min-h-screen">
      <Navbar onOpenShopping={() => setShoppingOpen(true)} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 pb-6">
        <section className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow">
              <h2 className="text-lg font-semibold mb-3">Dislikes</h2>
              <p className="text-sm text-slate-500 mb-3">We’ll avoid meals with these ingredients.</p>
              <DislikesField value={dislikes} onChange={setDislikes} />
            </div>

            <TagFilter
              allTags={allTags}
              selected={selectedTags}
              onToggle={t => setSelectedTags(s => (s.includes(t) ? s.filter(x => x !== t) : [...s, t]))}
              onClear={() => setSelectedTags([])}
            />

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow">
              <h2 className="text-lg font-semibold mb-3">This Week</h2>
              <WeekPlanner
                weekStartISO={weekStart.format("YYYY-MM-DD")}
                plans={plans}
                recipes={filteredRecipes}
                onAssign={onAssign}
                onPrevWeek={() => setWeekOffset(o => o - 1)}
                onThisWeek={() => setWeekOffset(0)}
                onNextWeek={() => setWeekOffset(o => o + 1)}
              />
            </div>
          </div>

          {/* Suggestions */}
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
<div className="flex items-center gap-2">
  <label className="text-xs text-slate-600">Per page</label>
  <select
    value={pageSize}
    onChange={e => setPage(parseInt(0)) || setPageSize(parseInt(e.target.value, 10))}
    className="border rounded px-2 py-1 text-sm"
  >
    <option value={8}>8</option>
    <option value={12}>12</option>
    <option value={16}>16</option>
    <option value={24}>24</option>
  </select>
  <button onClick={() => setPage(p => Math.max(p - 1, 0))} className="px-2 py-1 border rounded text-sm">Prev</button>
  <span className="text-sm">Page {page + 1}</span>
  <button onClick={() => setPage(p => p + 1)} className="px-2 py-1 border rounded text-sm">Next</button>
</div>
            <RecipesGrid loading={loading} error={error} recipes={filteredRecipes} />
          </div>
        </section>
      </main>
      <ShoppingListPanel open={shoppingOpen} onClose={() => setShoppingOpen(false)} items={shoppingList} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}