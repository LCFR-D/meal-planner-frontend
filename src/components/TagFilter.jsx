import React from 'react';

export function TagFilter({ allTags, selected, onToggle, onClear }) {
  if (!allTags.length) return null;
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Filter by tags</h2>
        <button onClick={onClear} className="text-xs text-sky-700 underline disabled:opacity-40" disabled={!selected.length}>
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {allTags.map(t => {
          const on = selected.includes(t);
          return (
            <button
              key={t}
              onClick={() => onToggle(t)}
              className={
                "text-xs px-3 py-1.5 rounded-full border " +
                (on ? "bg-sky-600 text-white border-sky-700" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50")
              }
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}