import React, { useMemo } from 'react';
import dayjs from 'dayjs';

const SLOTS = ["breakfast", "lunch", "dinner"];

function SlotRow({ dateISO, slot, plan, recipes, onAssign }) {
  const recipe = recipes.find(r => String(r.id) === String(plan?.recipeId));
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-500 capitalize w-20">{slot}</span>
      {recipe ? (
        <div className="text-sm font-medium flex-1 ml-2">{recipe.name}</div>
      ) : (
        <button
          onClick={() => { const first = recipes[0]; if (first) onAssign(dateISO, slot, first); }}
          className="text-xs text-sky-700 underline ml-2"
        >
          + Assign first suggestion
        </button>
      )}
    </div>
  );
}

function DayCard({ dateISO, plansBySlot, recipes, onAssign }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 bg-white">
      <div className="mb-2 text-xs text-slate-500">{dayjs(dateISO).format('ddd D MMM')}</div>
      {SLOTS.map(slot => (
        <SlotRow
          key={slot}
          dateISO={dateISO}
          slot={slot}
          plan={plansBySlot[slot]}
          recipes={recipes}
          onAssign={onAssign}
        />
      ))}
    </div>
  );
}

export function WeekPlanner({ weekStartISO, plans, recipes, onAssign, onPrevWeek, onThisWeek, onNextWeek }) {
  const start = dayjs(weekStartISO);
  const days = Array.from({length:7}).map((_,i)=> start.add(i, 'day').format('YYYY-MM-DD'));

  // plans come as [{date: 'YYYY-MM-DD', slot: 'breakfast'|'lunch'|'dinner'|... , recipeId: '...'}]
  const byDateSlot = useMemo(() => {
    const map = {};
    for (const p of plans) {
      const d = p.date;
      const s = (p.slot || 'main').toLowerCase();
      map[d] = map[d] || {};
      map[d][s] = p;
      // legacy "main" → show under dinner
      if (s === 'main') map[d]['dinner'] = p;
    }
    return map;
  }, [plans]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">{start.format('D MMM')} – {start.add(6,'day').format('D MMM YYYY')}</div>
        <div className="flex gap-2">
          <button onClick={onPrevWeek} className="px-2 py-1 rounded-md border text-xs">← Prev</button>
          <button onClick={onThisWeek} className="px-2 py-1 rounded-md border text-xs">This week</button>
          <button onClick={onNextWeek} className="px-2 py-1 rounded-md border text-xs">Next →</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {days.map(d => (
          <DayCard
            key={d}
            dateISO={d}
            plansBySlot={byDateSlot[d] || {}}
            recipes={recipes}
            onAssign={onAssign}
          />
        ))}
      </div>
    </div>
  );
}