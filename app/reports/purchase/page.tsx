import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import { isoDate } from '../../docs/proforma_invoice/dates';

// Reads report data per request — must block on the server, no static shell.
export const instant = false;

export default function PurchaseReport({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return (
    <div className="space-y-4">
      <PageHeader
        title="📦 Purchase Report"
        sub="All purchases with tax & payments"
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
  const f = { from: sp.from || '', to: sp.to || '', party: sp.party || '', q: sp.q || '' };
  const sups = await q<{ n: string }>('SELECT DISTINCT company_name AS n FROM suppliers ORDER BY 1');
  const p: string[] = [];
  let w = 'WHERE 1=1';
  if (f.from) { p.push(f.from); w += ` AND purchase_date >= $${p.length}`; }
  if (f.to) { p.push(f.to); w += ` AND purchase_date <= $${p.length}`; }
  if (f.party) { p.push(f.party); w += ` AND supplier=$${p.length}`; }
  const rows = await q(
    `SELECT id, po_no, inv_no, purchase_date, warehouse, supplier, discount, taxable, tax, total, paid, due
     FROM purchases ${w} ORDER BY purchase_date DESC, id DESC LIMIT 2000`, p);
  const list = rows.filter((r) =>
    !f.q || [r.po_no, r.inv_no, r.supplier].some((v) => String(v ?? '').toLowerCase().includes(f.q.toLowerCase())));
  const num = (v: unknown) => Number(v ?? 0) || 0;
  const tTaxable = list.reduce((a, r) => a + num(r.taxable), 0);
  const tTax = list.reduce((a, r) => a + num(r.tax), 0);
  const tTotal = list.reduce((a, r) => a + num(r.total), 0);
  const tPaid = list.reduce((a, r) => a + num(r.paid), 0);
  const stats = [
    { label: 'Bills', value: String(list.length), grad: 'from-indigo-500 to-violet-600', icon: '📦' },
    { label: 'Taxable', value: inr(tTaxable), grad: 'from-sky-500 to-cyan-600', icon: '💰' },
    { label: 'Tax', value: inr(tTax), grad: 'from-amber-500 to-orange-600', icon: '🧮' },
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
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 text-sm shadow-sm">
        <span>Paid <b className="tabular-nums text-emerald-700">{inr(tPaid)}</b></span>
        <span className="text-slate-300">|</span>
        <span>Due <b className="tabular-nums text-rose-700">{inr(tTotal - tPaid)}</b></span>
      </div>
      <form method="GET" className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <label className="text-xs font-bold text-slate-600">From <input name="from" type="date" defaultValue={f.from} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400" /></label>
        <label className="text-xs font-bold text-slate-600">To <input name="to" type="date" defaultValue={f.to} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400" /></label>
        <label className="text-xs font-bold text-slate-600">Supplier
          <select name="party" defaultValue={f.party} className="ml-1 max-w-52 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400">
            <option value="">All</option>
            {sups.map((c) => <option key={c.n} value={c.n}>{c.n}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">Search
          <input name="q" defaultValue={f.q} placeholder="PO, invoice, supplier" className="ml-1 w-44 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400" />
        </label>
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Filter</button>
        {(f.from || f.to || f.party || f.q) && <a href="/reports/purchase" className="text-xs font-semibold text-indigo-700 hover:underline">Clear</a>}
        <a href={`/reports/purchase/export${expQS ? `?${expQS}` : ''}`} className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">⤓ Export Excel</a>
      </form>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 px-4 py-2.5">
          <h3 className="font-bold text-white">📦 Purchases · {list.length} bills</h3>
        </div>
        <div className="slim-scroll overflow-x-auto p-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/95 via-slate-50/95 to-violet-50/95">
                {['PO No.', 'Invoice No', 'Purchase Date', 'Warehouse', 'Supplier', 'Discount', 'Taxable', 'Tax', 'Total', 'Paid', 'Due'].map((h, i) => (
                  <th key={h} className={`whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-800 ${i >= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((r) => (
                <tr key={r.id} className="transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                  <td className="whitespace-nowrap px-2 py-1.5"><a href={`/purchases/view/${r.id}`} className="font-bold text-indigo-700 hover:underline">{String(r.po_no || '—')}</a></td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">{String(r.inv_no || '')}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{isoDate(r.purchase_date) ?? ''}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">{String(r.warehouse || '—')}</td>
                  <td className="whitespace-nowrap px-2 py-1.5"><a href={`/suppliers?q=${encodeURIComponent(String(r.supplier ?? ''))}`} className="font-medium text-slate-800 hover:text-indigo-700 hover:underline">{String(r.supplier || '—')}</a></td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-500">{inr(r.discount)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-700">{inr(r.taxable)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-500">{inr(r.tax)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right font-extrabold tabular-nums text-slate-900">{inr(r.total)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold tabular-nums text-emerald-700">{inr(r.paid)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right font-bold tabular-nums text-rose-700">{inr(r.due)}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-400">No purchases found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
