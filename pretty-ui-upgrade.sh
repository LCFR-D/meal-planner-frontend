#!/usr/bin/env bash
set -euo pipefail

echo "➡️  Creating folders"
mkdir -p src/components src/lib .github/workflows

echo "➡️  Writing package.json (React + Tailwind + motion)"
cat > package.json <<'EOF'
{
  "name": "meal-planner-frontend",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "dayjs": "^1.11.11",
    "framer-motion": "^11.3.17",
    "lucide-react": "^0.453.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.7",
    "vite": "^5.4.1"
  }
}
EOF

echo "➡️  Writing Vite/Tailwind config"
cat > tailwind.config.js <<'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      boxShadow: { glow: "0 10px 30px rgba(2,132,199,0.25)" },
      backgroundImage: { 'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))' }
    }
  },
  plugins: []
}
EOF

cat > postcss.config.js <<'EOF'
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
EOF

cat > vite.config.js <<'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()] });
EOF

echo "➡️  Writing index.html + styles"
cat > index.html <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0ea5e9">
    <title>Meal Planner AU</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  </head>
  <body class="bg-slate-50">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

cat > src/styles.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }
EOF

echo "➡️  Writing config + API client"
cat > src/config.js <<'EOF'
export const CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "https://api.meal.lcfr.xyz",
};
EOF

cat > src/lib/api.js <<'EOF'
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
EOF

echo "➡️  Writing React entry"
cat > src/main.jsx <<'EOF'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
EOF

echo "➡️  Writing App + components"
cat > src/App.jsx <<'EOF'
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
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
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
EOF

cat > src/components/Navbar.jsx <<'EOF'
import React from 'react';
import { Utensils, ShoppingCart } from 'lucide-react';

export function Navbar({ onOpenShopping }) {
  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-sky-200 via-white to-white" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-sky-500 text-white grid place-items-center shadow-glow">
            <Utensils size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Meal Planner AU</h1>
            <p className="text-xs text-slate-500 -mt-1">Metric • Aussie-friendly</p>
          </div>
        </div>
        <button onClick={onOpenShopping} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700">
          <ShoppingCart size={18} /> Shopping list
        </button>
      </div>
    </header>
  );
}
EOF

cat > src/components/DislikesField.jsx <<'EOF'
import React, { useState } from 'react';
import { X } from 'lucide-react';

export function DislikesField({ value, onChange }) {
  const [input, setInput] = useState("");
  const addToken = (t) => {
    const v = t.trim();
    if (!v) return;
    if (value.includes(v)) return;
    onChange([...value, v]);
    setInput("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 px-2.5 py-1 text-xs">
            {t}
            <button className="opacity-70 hover:opacity-100" onClick={() => onChange(value.filter(x => x !== t))}>
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Add ingredient to avoid…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addToken(input); }}
        />
        <button onClick={() => addToken(input)} className="px-3 py-2 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600">
          Add
        </button>
      </div>
    </div>
  );
}
EOF

cat > src/components/RecipeCard.jsx <<'EOF'
import React from 'react';
import { Plus } from 'lucide-react';

function Placeholder({ name }) {
  return (
    <div className="h-32 w-full rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center">
      <span className="text-4xl font-extrabold text-slate-400">{(name||'?')[0]}</span>
    </div>
  );
}

export function RecipeCard({ recipe, onAssign }) {
  const img = recipe.image || null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      {img ? (
        <img src={img} alt={recipe.name} className="h-32 w-full object-cover rounded-xl" />
      ) : (<Placeholder name={recipe.name} />)}
      <div className="mt-3">
        <h3 className="font-semibold">{recipe.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">Serves {recipe.serves || 4}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {(recipe.tags || []).slice(0, 4).map((t) => (
            <span key={t} className="text-[10px] rounded-full bg-slate-100 px-2 py-1 text-slate-600">{t}</span>
          ))}
        </div>
        <button
          onClick={() => onAssign(new Date().toISOString().slice(0,10), recipe)}
          className="mt-3 inline-flex items-center gap-2 w-full justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          title="Quick add to today"
        >
          <Plus size={16} /> Add today
        </button>
      </div>
    </div>
  );
}
EOF

cat > src/components/RecipesGrid.jsx <<'EOF'
import React from 'react';
import { RecipeCard } from './RecipeCard';

export function RecipesGrid({ loading, error, recipes, onAssign }) {
  if (loading) return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">{Array.from({length:9}).map((_,i)=>(<div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />))}</div>;
  if (error) return <div className="text-sm text-red-600">Error: {error}</div>;
  if (!recipes?.length) return <div className="text-sm text-slate-500">No recipes found. Try removing some dislikes or change provider.</div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
      {recipes.map((r) => <RecipeCard key={r.id} recipe={r} onAssign={onAssign} />)}
    </div>
  );
}
EOF

cat > src/components/WeekPlanner.jsx <<'EOF'
import React, { useMemo } from 'react';
import dayjs from 'dayjs';

function DayCell({ dateISO, plan, recipes, onAssign }) {
  const recipe = recipes.find(r => String(r.id) === String(plan?.recipeId));
  return (
    <div className="rounded-xl border border-slate-200 p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">{dayjs(dateISO).format('ddd D MMM')}</span>
      </div>
      {recipe ? (
        <div className="text-sm font-medium">{recipe.name}</div>
      ) : (
        <button
          onClick={() => {
            const first = recipes[0];
            if (first) onAssign(dateISO, first);
          }}
          className="text-xs text-sky-700 underline"
        >
          + Assign first suggestion
        </button>
      )}
    </div>
  );
}

export function WeekPlanner({ plans, recipes, onAssign }) {
  const start = dayjs().startOf('week'); // Sunday
  const days = Array.from({length:7}).map((_,i)=> start.add(i, 'day').format('YYYY-MM-DD'));
  const plansByDate = useMemo(() => Object.fromEntries(plans.map(p => [p.date, p])), [plans]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {days.map(d => (
        <DayCell key={d} dateISO={d} plan={plansByDate[d]} recipes={recipes} onAssign={onAssign} />
      ))}
    </div>
  );
}
EOF

cat > src/components/ShoppingListPanel.jsx <<'EOF'
import React from 'react';
import { X } from 'lucide-react';

export function ShoppingListPanel({ open, onClose, items }) {
  return (
    <div className={"fixed inset-0 z-50 transition " + (open ? "pointer-events-auto" : "pointer-events-none")}>
      <div className={"absolute inset-0 bg-black/30 " + (open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={"absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-6 transition-transform " + (open ? "translate-x-0" : "translate-x-full")}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Shopping list</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        {items?.length ? (
          <ul className="space-y-2 max-h-[80vh] overflow-auto pr-2">
            {items.map((it) => (
              <li key={it.item} className="flex items-start justify-between rounded-lg border border-slate-200 p-3">
                <span className="text-sm">{it.item}</span>
                <span className="text-xs text-slate-500">{it.qty}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Add meals to the calendar to build your shopping list.</p>
        )}
      </div>
    </div>
  );
}
EOF

cat > src/components/Toast.jsx <<'EOF'
import React, { useEffect } from 'react';

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className={"rounded-xl px-4 py-3 shadow bg-white border " + (toast.error ? "border-red-300" : "border-slate-200")}>
        <div className="text-sm font-medium">{toast.title}</div>
        {toast.desc && <div className="text-xs text-slate-500">{toast.desc}</div>}
      </div>
    </div>
  );
}
EOF

# .gitignore (ensures node_modules/dist not committed)
cat > .gitignore <<'EOF'
node_modules/
dist/
.DS_Store
EOF

echo "✅ UI files written."
