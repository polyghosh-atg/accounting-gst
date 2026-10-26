'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 print:hidden"
    >
      🖨 Print
    </button>
  );
}
