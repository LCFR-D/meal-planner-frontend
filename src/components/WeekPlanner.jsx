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
