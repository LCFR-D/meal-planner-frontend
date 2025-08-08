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
