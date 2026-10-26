import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import { isoDate } from '../../docs/proforma_invoice/dates';

// Reads report data per request — must block on the server, no static shell.
export const instant = false;

export default function ExpenseReport({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return (
    <div className="space-y-4">
      <PageHeader
        title="💸 Expense Report"
        sub="Expenses with GST split"
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

async function Content({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const f = { from: sp.from || '', to: sp.to || '', q: sp.q || '' };
  const p: string[] = [];
  let w = 'WHERE 1=1';
  if (f.from) { p.push(f.from); w += ` AND bill_date >= $${p.length}`; }
  if (f.to) { p.push(f.to); w += ` AND bill_date <= $${p.length}`; }
  const rows = await q(
    `SELECT bill_date, category, supplier, taxable, cgst, sgst, igst, total FROM expenses ${w} ORDER BY bill_date DESC LIMIT 2000`, p);
  const list = rows.filter((r) =>
    !f.q || [r.category, r.supplier].some((v) => String(v ?? '').toLowerCase().includes(f.q.toLowerCase())));
  const num = (v: unknown) => Number(v ?? 0) || 0;
  const tTaxable = list.reduce((a, r) => a + num(r.taxable), 0);
  const tTax = list.reduce((a, r) => a + num(r.cgst) + num(r.sgst) + num(r.igst), 0);
  const tTotal = list.reduce((a, r) => a + num(r.total), 0);
  const cats = [...new Set(list.map((r) => String(r.category || '—')))];
  const stats = [
    { label: 'Bills', value: String(list.length), grad: 'from-rose-500 to-pink-600', icon: '🧾' },
    { label: 'Taxable', value: inr(tTaxable), grad: 'from-sky-500 to-cyan-600', icon: '💰' },
    { label: 'Total Tax', value: inr(tTax), grad: 'from-amber-500 to-orange-600', icon: '🧮' },
    { label: 'Grand Total', value: inr(tTotal), grad: 'from-emerald-500 to-teal-600', icon: '✅' },
  ];
  const expQS = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
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
      <form method="GET" className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <label className="text-xs font-bold text-slate-600">From <input name="from" type="date" defaultValue={f.from} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400" /></label>
        <label className="text-xs font-bold text-slate-600">To <input name="to" type="date" defaultValue={f.to} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400" /></label>
        <label className="text-xs font-bold text-slate-600">Search
          <input name="q" defaultValue={f.q} placeholder="category, supplier" className="ml-1 w-44 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400" />
        </label>
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Filter</button>
        {(f.from || f.to || f.q) && <a href="/reports/expense" className="text-xs font-semibold text-indigo-700 hover:underline">Clear</a>}
        <a href={`/reports/expense/export${expQS ? `?${expQS}` : ''}`} className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">⤓ Export Excel</a>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <span key={c} className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-200">{c}</span>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 px-4 py-2.5">
          <h3 className="font-bold text-white">💸 Expenses · {list.length} bills</h3>
        </div>
        <div className="slim-scroll overflow-x-auto p-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/95 via-slate-50/95 to-violet-50/95">
                {['Bill Date', 'Category', 'Supplier', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'].map((h, i) => (
                  <th key={h} className={`whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-800 ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((r, i) => (
                <tr key={i} className="transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{isoDate(r.bill_date) ?? ''}</td>
                  <td className="whitespace-nowrap px-2 py-1.5"><span className="rounded-lg bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-200">{String(r.category || '—')}</span></td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-medium text-slate-800">{String(r.supplier || '—')}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-700">{inr(r.taxable)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-500">{inr(r.cgst)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-500">{inr(r.sgst)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-500">{inr(r.igst)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right font-extrabold tabular-nums text-slate-900">{inr(r.total)}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">No expenses found</td></tr>}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/60 text-sm font-extrabold">
                <td colSpan={3} className="px-2 py-2">Total</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(tTaxable)}</td>
                <td colSpan={3} className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-slate-600">tax {inr(tTax)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(tTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
