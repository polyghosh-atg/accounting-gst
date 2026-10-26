import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';

// Reads report data per request — must block on the server, no static shell.
export const instant = false;

export default function HsnPurchase({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div className="space-y-4">
      <PageHeader
        title="🏷 HSN Purchase Report"
        sub="HSN-wise inward summary"
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
    `SELECT COALESCE(NULLIF(pr.hsn,''),'—') hsn, SUM(pl.qty) qty, SUM(pl.taxable) taxable, SUM(pl.subtotal) total
     FROM purchase_lines pl LEFT JOIN products pr ON pr.name=pl.item_name
     GROUP BY 1 ORDER BY total DESC`);
  const list = query ? rows.filter((r) => String(r.hsn ?? '').toLowerCase().includes(query)) : rows;
  const num = (v: unknown) => Number(v ?? 0) || 0;
  const tQty = list.reduce((a, r) => a + num(r.qty), 0);
  const tTaxable = list.reduce((a, r) => a + num(r.taxable), 0);
  const tTotal = list.reduce((a, r) => a + num(r.total), 0);
  const maxT = Math.max(1, ...list.map((r) => num(r.total)));
  const stats = [
    { label: 'HSN Codes', value: String(list.length), grad: 'from-indigo-500 to-violet-600', icon: '🏷' },
    { label: 'Total Qty', value: tQty.toLocaleString('en-IN'), grad: 'from-sky-500 to-cyan-600', icon: '📦' },
    { label: 'Taxable Value', value: inr(tTaxable), grad: 'from-amber-500 to-orange-600', icon: '💰' },
    { label: 'Grand Total', value: inr(tTotal), grad: 'from-emerald-500 to-teal-600', icon: '✅' },
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
        <input name="q" defaultValue={query} placeholder="Search HSN code…"
          className="w-52 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white sm:w-64" />
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Search</button>
        {query && <a href="/reports/hsn_purchase" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <span className="ml-auto text-sm text-slate-500">{list.length} codes</span>
        <a href={`/reports/hsn_purchase/export${expQS}`} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">⤓ Export Excel</a>
      </form>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 px-4 py-2.5">
          <h3 className="font-bold text-white">🏷 HSN-wise inward · {list.length} codes</h3>
        </div>
        <div className="slim-scroll overflow-x-auto p-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/95 via-slate-50/95 to-violet-50/95">
                {['HSN', 'Share', 'Qty', 'Taxable', 'Total'].map((h, i) => (
                  <th key={h} className={`whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-800 ${i < 2 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((r) => {
                const v = num(r.total);
                const pct = Math.max(2, Math.round((v / maxT) * 100));
                return (
                  <tr key={String(r.hsn)} className="transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                    <td className="whitespace-nowrap px-2 py-1.5"><span className="rounded-lg bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200">{String(r.hsn)}</span></td>
                    <td className="min-w-28 px-2 py-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-400" />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-700">{num(r.qty).toLocaleString('en-IN')}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-700">{inr(r.taxable)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right font-extrabold tabular-nums text-slate-900">{inr(r.total)}</td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No HSN rows found</td></tr>}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/60 text-sm font-extrabold">
                <td className="px-2 py-2">Total</td>
                <td></td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{tQty.toLocaleString('en-IN')}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(tTaxable)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(tTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
