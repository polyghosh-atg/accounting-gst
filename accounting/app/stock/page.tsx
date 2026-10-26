import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import { AddStockButton, StockButtons, type StockRec } from '@/components/inventory-modals';

export default function Stock() {
  return (
    <div className="space-y-4">
      <PageHeader title="Stock Entry" sub="Inventory IN / OUT movements" />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const rows = await q<StockRec>('SELECT * FROM stock_entries ORDER BY id DESC LIMIT 200');
  const wh = await q<{ name: string }>('SELECT name FROM warehouses ORDER BY name');
  const prods = await q<{ name: string }>('SELECT name FROM products ORDER BY name');
  const warehouses = wh.map((w) => w.name);
  const products = prods.map((p) => p.name);
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-auto text-sm text-slate-500">{rows.length} entries (latest 200)</span>
        <AddStockButton warehouses={warehouses} products={products} />
      </div>
      <div className="space-y-2.5 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-bold">{r.product}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.entry_type === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{r.entry_type}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">{r.warehouse} · {r.entry_date ? String(r.entry_date).slice(0, 10) : ''}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm tabular-nums">Qty {r.qty} {r.unit}</span>
              <StockButtons s={r} warehouses={warehouses} products={products} />
            </div>
          </div>
        ))}
      </div>
      <div className="slim-scroll hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] md:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>{['Warehouse', 'Product', 'Qty', 'Unit', 'Cost', 'Sell', 'Type', 'Date', 'Action'].map((h, i) => (
              <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i === 2 || i === 4 || i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                <td className="whitespace-nowrap px-3 py-2 font-medium">{r.warehouse}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.product}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums">{r.qty}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.unit}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{inr(r.cost)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{inr(r.sell_price)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.entry_type === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{r.entry_type}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.entry_date ? String(r.entry_date).slice(0, 10) : ''}</td>
                <td className="whitespace-nowrap px-3 py-2"><StockButtons s={r} warehouses={warehouses} products={products} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
