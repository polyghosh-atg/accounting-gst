import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import { isoDate } from '../../docs/proforma_invoice/dates';

// Reads report data per request — must block on the server, no static shell.
export const instant = false;

export default function SalesReturnReport({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return (
    <div className="space-y-4">
      <PageHeader
        title="↩️ Sales Return Report"
        sub="Reference, invoice, warehouse, tax splits & profit"
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
  const f = { from: sp.from || '', to: sp.to || '', warehouse: sp.warehouse || '', party: sp.party || '' };
  const [whs, custs] = await Promise.all([
    q<{ name: string }>(`SELECT DISTINCT warehouse AS name FROM doc_headers WHERE doc_type='sales_return' AND warehouse IS NOT NULL AND warehouse<>'' ORDER BY 1`),
    q<{ n: string }>(`SELECT DISTINCT party AS n FROM doc_headers WHERE doc_type='sales_return' AND party IS NOT NULL AND party<>'' ORDER BY 1`),
  ]);
  const p: string[] = [];
  let w = `WHERE doc_type='sales_return'`;
  if (f.from) { p.push(f.from); w += ` AND doc_date >= $${p.length}`; }
  if (f.to) { p.push(f.to); w += ` AND doc_date <= $${p.length}`; }
  if (f.warehouse) { p.push(f.warehouse); w += ` AND warehouse=$${p.length}`; }
  if (f.party) { p.push(f.party); w += ` AND party=$${p.length}`; }
  const rows = await q(
    `SELECT ref_no, invoice_no, doc_date, warehouse, party, discount, taxable, igst, cgst, sgst, tax, total
     FROM doc_headers ${w} ORDER BY doc_date NULLS LAST, id LIMIT 2000`, p);
  const num = (v: unknown) => Number(v ?? 0) || 0;
  const t = (k: string) => rows.reduce((a, r) => a + num(r[k]), 0);
  const stats = [
    { label: 'Returns', value: String(rows.length), grad: 'from-indigo-500 to-violet-600', icon: '↩️' },
    { label: 'Taxable', value: inr(t('taxable')), grad: 'from-sky-500 to-cyan-600', icon: '💰' },
    { label: 'Total Tax', value: inr(t('tax')), grad: 'from-amber-500 to-orange-600', icon: '🧮' },
    { label: 'Grand Total', value: inr(t('total')), grad: 'from-emerald-500 to-teal-600', icon: '✅' },
  ];
  const expQS = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-base text-white shadow ${s.grad}`}>{s.icon}</div>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-500">{s.label}</div>
              <div className="truncate text-base font-extrabold tabular-nums text-slate-900">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
      <form method="GET" className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <label className="text-xs font-bold text-slate-600">From Date <input name="from" type="date" defaultValue={f.from} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400" /></label>
        <label className="text-xs font-bold text-slate-600">To Date <input name="to" type="date" defaultValue={f.to} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400" /></label>
        <label className="text-xs font-bold text-slate-600">Warehouse
          <select name="warehouse" defaultValue={f.warehouse} className="ml-1 max-w-44 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400">
            <option value="">Select</option>
            {whs.map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">Customer
          <select name="party" defaultValue={f.party} className="ml-1 max-w-44 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400">
            <option value="">Select</option>
            {custs.map((x) => <option key={x.n} value={x.n}>{x.n}</option>)}
          </select>
        </label>
        <button className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-sky-700">Search</button>
        {(f.from || f.to || f.warehouse || f.party) && <a href="/reports/sales_return" className="text-xs font-semibold text-indigo-700 hover:underline">Clear</a>}
        <a href={`/reports/sales_return/export${expQS ? `?${expQS}` : ''}`} className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">⤓ Export Excel</a>
      </form>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 px-4 py-2.5">
          <h3 className="font-bold text-white">↩️ Sales Return Report · {rows.length}</h3>
        </div>
        <div className="slim-scroll overflow-x-auto p-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/95 via-slate-50/95 to-violet-50/95">
                {['Reference No', 'Invoice No', 'Sales return Date', 'Warehouse', 'Customer', 'Total Discount', 'Total Taxable Value', 'IGST', 'CGST', 'SGST', 'Total', 'Total Profit'].map((h, i) => (
                  <th key={h} className={`whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-800 ${i >= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i} className="transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                  <td className="whitespace-nowrap px-2 py-1.5 font-bold text-indigo-700">{String(r.ref_no)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">{String(r.invoice_no || '—')}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{isoDate(r.doc_date) ?? ''}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">{String(r.warehouse || '—')}</td>
                  <td className="whitespace-nowrap px-2 py-1.5"><a href={`/customers?q=${encodeURIComponent(String(r.party ?? ''))}`} className="font-medium text-slate-800 hover:text-indigo-700 hover:underline">{String(r.party || '—')}</a></td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-500">{inr(r.discount)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-700">{inr(r.taxable)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-600">{inr(r.igst)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-600">{inr(r.cgst)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-600">{inr(r.sgst)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right font-extrabold tabular-nums text-slate-900">{inr(r.total)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-300" title="Cost basis not migrated">—</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={12} className="px-3 py-8 text-center text-slate-400">No sales returns found</td></tr>}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/60 text-sm font-extrabold">
                <td colSpan={5} className="px-2 py-2">Total</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(t('discount'))}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(t('taxable'))}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(t('igst'))}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(t('cgst'))}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(t('sgst'))}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(t('total'))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
