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
