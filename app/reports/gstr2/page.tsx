import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { Table } from '@/components/table';
import { PageHeader, LoadingRows, Badge } from '@/components/ui';
import { isoDate } from '../../docs/proforma_invoice/dates';

// Reads report data per request — must block on the server, no static shell.
export const instant = false;

export default function Gstr2({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return (
    <div className="space-y-4">
      <PageHeader title="🧾 GSTR2 Report" sub="Inward supplies for GST filing" actions={
        <a href="/reports" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700">← All reports</a>
      } />
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
  if (f.from) { p.push(f.from); w += ` AND p.purchase_date >= $${p.length}`; }
  if (f.to) { p.push(f.to); w += ` AND p.purchase_date <= $${p.length}`; }
  if (f.party) { p.push(f.party); w += ` AND p.supplier=$${p.length}`; }
  const rows = await q(
    `SELECT p.id, p.inv_no, p.purchase_date, p.supplier, max(s.gstin) gstin, p.taxable AS taxable, p.tax AS tax, p.total AS total
     FROM purchases p LEFT JOIN suppliers s ON s.company_name=p.supplier ${w}
     GROUP BY p.id ORDER BY p.purchase_date DESC LIMIT 2000`, p);
  const list = rows.filter((r) =>
    !f.q || [r.inv_no, r.supplier, r.gstin].some((v) => String(v ?? '').toLowerCase().includes(f.q.toLowerCase())));
  const num = (v: unknown) => Number(v ?? 0) || 0;
  const tTaxable = list.reduce((a, r) => a + num(r.taxable), 0);
  const tTax = list.reduce((a, r) => a + num(r.tax), 0);
  const tTotal = list.reduce((a, r) => a + num(r.total), 0);
  const stats = [
    { label: 'Bills', value: String(list.length), grad: 'from-indigo-500 to-violet-600', icon: '🧾' },
    { label: 'Taxable Value', value: inr(tTaxable), grad: 'from-sky-500 to-cyan-600', icon: '💰' },
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
        <label className="text-xs font-bold text-slate-600">Supplier
          <select name="party" defaultValue={f.party} className="ml-1 max-w-52 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400">
            <option value="">All</option>
            {sups.map((c) => <option key={c.n} value={c.n}>{c.n}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">Search
          <input name="q" defaultValue={f.q} placeholder="invoice, supplier, GSTIN" className="ml-1 w-44 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400" />
        </label>
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Filter</button>
        {(f.from || f.to || f.party || f.q) && <a href="/reports/gstr2" className="text-xs font-semibold text-indigo-700 hover:underline">Clear</a>}
        <a href={`/reports/gstr2/export${expQS ? `?${expQS}` : ''}`} className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">⤓ Export Excel</a>
      </form>
      <Table fit
        heads={['Invoice No', 'Purchase Date', 'Supplier', 'GSTIN', 'Taxable', 'Tax', 'Total']}
        align={['l', 'l', 'l', 'l', 'r', 'r', 'r']}
        rows={list.map((r) => [
          <a key="i" href={`/purchases/view/${r.id}`} className="font-bold text-indigo-700 hover:underline">{String(r.inv_no || '—')}</a>,
          <span key="d" className="text-slate-500">{isoDate(r.purchase_date) ?? ''}</span>,
          <a key="s" href={`/suppliers?q=${encodeURIComponent(String(r.supplier ?? ''))}`} className="font-medium text-slate-800 hover:text-indigo-700 hover:underline">{String(r.supplier || '—')}</a>,
          <span key="g" className="font-mono text-slate-600">{String(r.gstin || '—')}</span>,
          <span key="t" className="tabular-nums">{inr(r.taxable)}</span>,
          <span key="tx" className="tabular-nums text-slate-600">{inr(r.tax)}</span>,
          <b key="tt" className="tabular-nums text-slate-900">{inr(r.total)}</b>,
        ])} />
      <p className="text-xs text-slate-400">Showing {list.length} rows</p>
    </>
  );
}
