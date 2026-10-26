import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import { DeleteScrapProduct } from '@/components/inventory-modals';

export default function ScrapProducts() {
  return (
    <div>
      <PageHeader
        title="All Scrap Products"
        sub="Scrap stock across warehouses"
        actions={<a href="/inventory/scrap-products/export" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">⤓ Export Excel</a>}
      />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const rows = await q('SELECT * FROM scrap_products ORDER BY warehouse, product');
  return (
    <div className="slim-scroll overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-slate-50/95">
          <tr>{['Product Name', 'Batch No', 'Quantity', 'Cost (Rs)', 'Price (Rs)', 'Selling Price (Rs)', 'Warehouse', 'Action'].map((h, i) => (
            <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i >= 2 && i <= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
              <td className="whitespace-nowrap px-3 py-2 font-semibold">{String(r.product)}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{String(r.batch_no)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums">{String(r.qty)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{inr(r.cost)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{inr(r.price)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{inr(r.sell_price)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-700">{String(r.warehouse)}</td>
              <td className="whitespace-nowrap px-3 py-2"><DeleteScrapProduct id={Number(r.id)} name={String(r.product)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
