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
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((w) => (
          <div key={w.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-bold text-slate-900">{w.name}</span>
              <WarehouseButtons w={w} />
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-mono font-bold text-indigo-700">{w.code || '—'}</span>
              <span className="truncate">{w.description}</span>
            </div>
            <div className="mt-2 text-right text-sm font-extrabold tabular-nums">Qty {String((w as unknown as Record<string, unknown>).qty ?? '')}</div>
          </div>
        ))}
      </div>
      {rows.length === 0 && <div className="rounded-2xl border bg-white px-3 py-8 text-center text-sm text-slate-400">No warehouses found</div>}
    </>
  );
}
