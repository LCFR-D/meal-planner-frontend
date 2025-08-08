import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { fetchRecipes, fetchPlans, savePlan } from "./lib/api";
import { Navbar } from "./components/Navbar";
import { DislikesField } from "./components/DislikesField";
import { RecipesGrid } from "./components/RecipesGrid";
import { WeekPlanner } from "./components/WeekPlanner";
import { ShoppingListPanel } from "./components/ShoppingListPanel";
import { Toast } from "./components/Toast";

export default function App() {
  const [dislikes, setDislikes] = useState(["seafood","pork","star anise"]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState([]);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const dislikesCsv = useMemo(() => dislikes.join(", "), [dislikes]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [rs, ps] = await Promise.all([fetchRecipes(dislikesCsv), fetchPlans()]);
        if (!ignore) { setRecipes(rs); setPlans(ps); }
      } catch (e) { setError(e.message || "Failed to load"); }
      finally { if (!ignore) setLoading(false); }
    }
    load();
    return () => { ignore = true; }
  }, [dislikesCsv]);

  const onAssign = async (dateISO, recipe) => {
    try {
      await savePlan({ dateISO, recipeId: recipe.id });
      setToast({ title: "Added to calendar", desc: `${recipe.name} on ${dayjs(dateISO).format("ddd D MMM")}` });
      setPlans(prev => [...prev, { userId: "public", date: dateISO, recipeId: recipe.id }]);
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
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow">
              <h2 className="text-lg font-semibold mb-3">This Week</h2>
              <WeekPlanner plans={plans} recipes={recipes} onAssign={onAssign} />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Suggested meals</h2>
              <button onClick={() => window.location.reload()} className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700">
                Refresh
              </button>
            </div>
            <RecipesGrid loading={loading} error={error} recipes={recipes} onAssign={onAssign} />
          </div>
        </section>
      </main>
      <ShoppingListPanel open={shoppingOpen} onClose={() => setShoppingOpen(false)} items={shoppingList} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
