import type { ReactNode } from 'react';

export function Table({ heads, rows, align, compact }: {
  heads: string[];
  rows: ReactNode[][];
  align?: ('l' | 'r')[];
  compact?: boolean;
}) {
  return (
    <div className="slim-scroll overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <table className={`w-full border-collapse ${compact ? 'min-w-[560px] text-xs' : 'min-w-[640px] text-sm'}`}>
        <thead className="sticky top-0 bg-gradient-to-r from-indigo-50/95 via-slate-50/95 to-violet-50/95 backdrop-blur">
          <tr>
            {heads.map((h, i) => (
              <th key={h} className={`whitespace-nowrap font-bold uppercase tracking-wide text-slate-800 ${compact ? 'px-2.5 py-2 text-[11px]' : 'px-3 py-2.5 text-[13px]'} ${align?.[i] === 'r' ? 'text-right' : 'text-left'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <tr><td colSpan={heads.length} className="px-3 py-8 text-center text-slate-400">No records found</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
              {r.map((c, j) => (
                <td key={j} className={`whitespace-nowrap text-slate-700 ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'} ${align?.[j] === 'r' ? 'text-right tabular-nums' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, total, per }: { page: number; total: number; per: number }) {
  const pages = Math.max(1, Math.ceil(total / per));
  const btn = 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40';
  return (
    <div className="my-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <span className="mr-auto">Page <b className="text-slate-900">{page}</b> of {pages} · {total.toLocaleString('en-IN')} rows</span>
      <a className={btn} aria-disabled={page <= 1} href={page > 1 ? `?page=${page - 1}` : `?page=${page}`}>← Prev</a>
      <a className={btn} aria-disabled={page >= pages} href={page < pages ? `?page=${page + 1}` : `?page=${page}`}>Next →</a>
    </div>
  );
}
