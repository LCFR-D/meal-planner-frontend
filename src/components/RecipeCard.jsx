import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';

function stripHtml(s) { return s ? s.replace(/<[^>]+>/g, "") : ""; }

export function RecipeCard({ recipe }) {
  const [open, setOpen] = useState(false);
  const name = recipe.name || recipe.title || 'Untitled';
  const serves = recipe.serves ?? recipe.servings ?? 1;
  const tags = (recipe.tags || recipe.cuisines || []).filter(Boolean);
  const kcal = Number.isFinite(recipe.caloriesPerServing) ? Math.round(recipe.caloriesPerServing) : null;

  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: `recipe-${recipe.id}`,
    data: { recipe }
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50, opacity: 0.9 } : undefined;

  return (
    <div ref={setNodeRef} style={style}
      className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow ${isDragging ? 'ring-2 ring-sky-500' : ''}`}>
      {/* Header row with drag handle */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold truncate mr-2">{name}</h3>
        <button
          aria-label="Drag to plan"
          title="Drag to plan"
          className="cursor-grab select-none text-slate-500 hover:text-slate-800"
          {...listeners}
          {...attributes}
        >
          ⠿
        </button>
      </div>

      <div className="relative">
        {recipe.image ? (
          <img src={recipe.image} alt={name} className="h-32 w-full object-cover rounded-xl" />
        ) : (
          <div className="h-32 w-full rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center">
            <span className="text-4xl font-extrabold text-slate-400">{(name||'?')[0]}</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className="rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[11px] border border-slate-200">
            {kcal ? `${kcal} kcal / serve` : `kcal n/a`}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-2">Serves {serves}</p>
      <div className="flex flex-wrap gap-1 mt-1">
        {tags.slice(0, 6).map((t) => (
          <span key={t} className="text-[10px] rounded-full bg-slate-100 px-2 py-1 text-slate-600">{t}</span>
        ))}
      </div>

      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
      >
        View ingredients & recipe
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm grid place-items-center p-4 z-50" onClick={()=>setOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-5" onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h4 className="text-lg font-semibold">{name}</h4>
              <button onClick={()=>setOpen(false)} className="text-slate-500 hover:text-slate-800">✕</button>
            </div>

            <div className="mt-3 grid gap-3 max-h-[75vh] overflow-auto pr-1">
              <div>
                <strong className="text-sm">Ingredients</strong>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                  {(recipe.ingredients || []).map((i, idx) => (
                    <li key={idx}>{[i.amount, i.unit, i.name].filter(Boolean).join(" ")}</li>
                  ))}
                </ul>
              </div>

              {recipe.instructions && (
                <div>
                  <strong className="text-sm">Instructions</strong>
                  <pre className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                    {stripHtml(recipe.instructions)}
                  </pre>
                </div>
              )}

              {recipe.sourceUrl && (
                <a href={recipe.sourceUrl} target="_blank" rel="noreferrer"
                   className="mt-1 inline-block text-sm text-sky-700 underline">Open full recipe (optional)</a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}