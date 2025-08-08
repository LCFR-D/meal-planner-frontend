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
