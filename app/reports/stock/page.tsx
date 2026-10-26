import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows, Badge } from '@/components/ui';
import { isoDate } from '../../docs/proforma_invoice/dates';

// Reads report data per request — must block on the server, no static shell.
export const instant = false;

export default function StockReport({ searchParams }: { searchParams: Promise<{ q?: string; warehouse?: string }> }) {
  return (
    <div className="space-y-4">
      <PageHeader
        title="📦 Stock Report"
        sub="Warehouse-wise stock entries"
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

async function Content({ searchParams }: { searchParams: Promise<{ q?: string; warehouse?: string }> }) {
  const sp = await searchParams;
  const query = ((sp.q || '').trim().toLowerCase());
  const wh = (sp.warehouse || '').trim();
  const [whs, all] = await Promise.all([
    q<{ warehouse: string }>('SELECT DISTINCT warehouse FROM stock_entries ORDER BY 1'),
    q(`SELECT * FROM stock_entries ${wh ? 'WHERE warehouse=$1' : ''} ORDER BY warehouse, product LIMIT 2000`, wh ? [wh] : []),
  ]);
  const warehouses = whs.map((x) => String(x.warehouse)).filter(Boolean);
  const list = query ? all.filter((r) => String(r.product ?? '').toLowerCase().includes(query)) : all;
  const num = (v: unknown) => Number(v ?? 0) || 0;
  const tQty = list.reduce((a, r) => a + num(r.qty), 0);
  const tVal = list.reduce((a, r) => a + num(r.qty) * num(r.cost), 0);
  const stats = [
    { label: 'Entries', value: String(list.length), grad: 'from-indigo-500 to-violet-600', icon: '📦' },
    { label: 'Total Qty', value: tQty.toLocaleString('en-IN'), grad: 'from-sky-500 to-cyan-600', icon: '🔢' },
    { label: 'Stock Value (cost)', value: inr(tVal), grad: 'from-emerald-500 to-teal-600', icon: '💰' },
  ];
  const expQS = new URLSearchParams(Object.entries({ q: query, warehouse: wh }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl text-white shadow ${s.grad}`}>{s.icon}</div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-slate-500">{s.label}</div>
              <div className="truncate text-xl font-extrabold tabular-nums text-slate-900">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
      <form method="GET" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <select name="warehouse" defaultValue={wh} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold outline-none focus:border-indigo-400">
          <option value="">All warehouses</option>
          {warehouses.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
        <input name="q" defaultValue={query} placeholder="Search product…"
          className="w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white sm:w-52" />
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Filter</button>
        {(query || wh) && <a href="/reports/stock" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <span className="ml-auto text-sm text-slate-500">{list.length} entries</span>
        <a href={`/reports/stock/export${expQS ? `?${expQS}` : ''}`} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">⤓ Export Excel</a>
      </form>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 px-4 py-2.5">
          <h3 className="font-bold text-white">📦 Stock entries · {list.length}</h3>
        </div>
        <div className="slim-scroll overflow-x-auto p-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/95 via-slate-50/95 to-violet-50/95">
                {['Warehouse', 'Product', 'Qty', 'Unit', 'Cost', 'Sell Price', 'Type', 'Date'].map((h, i) => (
                  <th key={h} className={`whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-800 ${i >= 2 && i <= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((r, i) => (
                <tr key={i} className="transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                  <td className="whitespace-nowrap px-2 py-1.5"><span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-200">{String(r.warehouse || '—')}</span></td>
                  <td className="px-2 py-1.5 font-semibold text-slate-800">{String(r.product || '—')}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right"><Badge tone={num(r.qty) <= 0 ? 'red' : num(r.qty) <= 10 ? 'amber' : 'green'}>{String(r.qty)}</Badge></td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{String(r.unit || '—')}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-700">{inr(r.cost)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-700">{inr(r.sell_price ?? r.selling_price)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5"><Badge tone={String(r.entry_type).toUpperCase() === 'IN' ? 'blue' : 'amber'}>{String(r.entry_type || '—')}</Badge></td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{isoDate(r.entry_date) ?? ''}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">No stock entries found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
