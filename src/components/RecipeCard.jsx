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
  const kcal = Number.isFinite(recipe.caloriesPerServing) ? Math.round(recipe.caloriesPerServing) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative">
        {img ? (
          <img src={img} alt={recipe.name} className="h-32 w-full object-cover rounded-xl" />
        ) : (
          <Placeholder name={recipe.name} />
        )}
        <div className="absolute top-2 right-2">
          <span className="rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[11px] border border-slate-200">
            {kcal ? `${kcal} kcal / serve` : `kcal n/a`}
          </span>
        </div>
      </div>

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