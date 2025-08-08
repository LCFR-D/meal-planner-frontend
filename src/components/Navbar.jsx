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
