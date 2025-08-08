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
