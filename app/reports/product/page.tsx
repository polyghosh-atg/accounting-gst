import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows, Badge, statusTone } from '@/components/ui';

// Reads report data per request — must block on the server, no static shell.
export const instant = false;

export default function ProductReport({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div className="space-y-4">
      <PageHeader
        title="📋 Product Detail Report"
        sub="Full product master with stock"
        actions={
          <a href="/reports" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700">← All reports</a>
        }
      />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim().toLowerCase();
  const rows = await q(
    `SELECT p.name, c.name category_name, p.hsn, p.uom, p.cost, p.selling_price, p.status,
       COALESCE((SELECT SUM(CASE WHEN entry_type='IN' THEN qty ELSE -qty END) FROM stock_entries s WHERE s.product=p.name),0) stock
     FROM products p LEFT JOIN product_categories c ON c.id=p.category_id ORDER BY p.name`);
  const list = query
    ? rows.filter((r) => [r.name, r.hsn, r.category_name].some((v) => String(v ?? '').toLowerCase().includes(query)))
    : rows;
  const num = (v: unknown) => Number(v ?? 0) || 0;
  const inStock = list.filter((r) => num(r.stock) > 0).length;
  const lowStock = list.filter((r) => num(r.stock) <= 0).length;
  const tVal = list.reduce((a, r) => a + num(r.stock) * num(r.cost), 0);
  const stats = [
    { label: 'Products', value: String(list.length), grad: 'from-indigo-500 to-violet-600', icon: '📋' },
    { label: 'In Stock', value: String(inStock), grad: 'from-emerald-500 to-teal-600', icon: '✅' },
    { label: 'Out / Low', value: String(lowStock), grad: 'from-rose-500 to-pink-600', icon: '⚠️' },
    { label: 'Stock Value', value: inr(tVal), grad: 'from-amber-500 to-orange-600', icon: '💰' },
  ];
  const expQS = query ? `?q=${encodeURIComponent(query)}` : '';
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-base text-white shadow ${s.grad}`}>{s.icon}</div>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
              <div className="truncate text-base font-extrabold tabular-nums text-slate-900">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
      <form method="GET" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <input name="q" defaultValue={query} placeholder="Search name, HSN, category…"
          className="w-52 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white sm:w-64" />
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Search</button>
        {query && <a href="/reports/product" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <span className="ml-auto text-sm text-slate-500">{list.length} products</span>
        <a href={`/reports/product/export${expQS}`} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">⤓ Export Excel</a>
      </form>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 px-4 py-2.5">
          <h3 className="font-bold text-white">📋 Products · {list.length}</h3>
        </div>
        <div className="slim-scroll overflow-x-auto p-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/95 via-slate-50/95 to-violet-50/95">
                {['Product Name', 'Category', 'HSN', 'UOM', 'Cost', 'Selling Price', 'Stock', 'Status'].map((h, i) => (
                  <th key={h} className={`whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-800 ${i >= 4 && i <= 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((r) => {
                const st = num(r.stock);
                return (
                  <tr key={String(r.name)} className="transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                    <td className="px-2 py-1.5 font-bold text-slate-900">{String(r.name)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5"><span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">{String(r.category_name || '—')}</span></td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-indigo-700">{String(r.hsn || '—')}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{String(r.uom || '—')}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-700">{inr(r.cost)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-700">{inr(r.selling_price)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right"><Badge tone={st <= 0 ? 'red' : st <= 10 ? 'amber' : 'green'}>{String(r.stock)}</Badge></td>
                    <td className="whitespace-nowrap px-2 py-1.5"><Badge tone={statusTone(String(r.status))}>{String(r.status || '—')}</Badge></td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">No products found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
