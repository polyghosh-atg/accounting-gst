import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import { AddWarehouseButton, WarehouseButtons, type Warehouse } from '@/components/inventory-modals';

export default function Warehouses({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader title="Warehouse" sub="Storage locations with quantities" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const like = `%${query}%`;
  const rows = await q<Warehouse>(
    query
      ? `SELECT w.*, COALESCE((SELECT SUM(qty) FROM stock_entries s WHERE s.warehouse=w.name),0) qty
         FROM warehouses w WHERE w.name ILIKE $1 OR w.code ILIKE $1 OR w.description ILIKE $1 ORDER BY w.name`
      : `SELECT w.*, COALESCE((SELECT SUM(qty) FROM stock_entries s WHERE s.warehouse=w.name),0) qty
         FROM warehouses w ORDER BY w.name`,
    query ? [like] : []
  );
  const maxQty = Math.max(1, ...rows.map((w) => Number((w as unknown as Record<string, unknown>).qty ?? 0)));
  const THEMES = [
    'from-indigo-500 to-violet-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600',
    'from-sky-500 to-cyan-600', 'from-rose-500 to-pink-600', 'from-purple-500 to-fuchsia-600',
  ];
  return (
    <>
      <form method="GET" className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <span className="mr-auto text-sm text-slate-500">{rows.length} warehouses</span>
        <input name="q" defaultValue={query} placeholder="Search name, code..."
          className="w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white sm:w-52" />
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Search</button>
        {query && <a href="/inventory/warehouses" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <AddWarehouseButton />
      </form>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((w, i) => {
          const qtyN = Number((w as unknown as Record<string, unknown>).qty ?? 0);
          const pct = Math.max(3, Math.round((qtyN / maxQty) * 100));
          const grad = THEMES[i % THEMES.length];
          return (
            <div key={w.id} className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className={`h-1.5 bg-gradient-to-r ${grad}`} />
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-extrabold text-white shadow ${grad}`}>
                    {String(w.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-bold text-slate-900">{w.name}</div>
                    <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-px font-mono text-[11px] font-bold text-slate-600 ring-1 ring-inset ring-slate-200">{w.code || '—'}</span>
                  </div>
                  <div className="ml-auto shrink-0"><WarehouseButtons w={w} /></div>
                </div>
                <p className="mt-2 line-clamp-2 min-h-8 text-xs text-slate-500">{w.description || 'No description'}</p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-500">Stock Qty</span>
                  <span className="font-extrabold tabular-nums text-slate-900">{qtyN.toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div style={{ width: `${pct}%` }} className={`h-full rounded-full bg-gradient-to-r transition-all ${grad}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {rows.length === 0 && <div className="rounded-2xl border bg-white px-3 py-8 text-center text-sm text-slate-400">No warehouses found</div>}
    </>
  );
}
