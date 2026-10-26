import { Suspense } from 'react';
import Link from 'next/link';
import { Pool } from 'pg';
import { PageHeader, LoadingRows } from '@/components/ui';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

const fmt = (n: number | string) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const HEADS = ['Customer Name', 'GSTIN/UIN of Recipient', 'Email', 'Phone', 'Country', 'State',
  'Invoice Amount', 'Paid Amount', 'Receivable'];

export default function Receivable() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Receivable"
        sub="All bills of customers carrying dues · balance per customer"
        actions={
          <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href="/reports">
            ← Reports
          </Link>
        }
      />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const r = await pool.query(
    `SELECT s.customer, MAX(c.gstin) gstin, MAX(c.email) email, MAX(c.phone) phone,
       MAX(c.country) country, MAX(c.state) state,
       COALESCE(SUM(s.total),0) invoiced, COALESCE(SUM(s.paid),0) paid,
       COALESCE(SUM(s.total),0)-COALESCE(SUM(s.paid),0) receivable,
       MIN(c.legacy_id) legacy_id
     FROM sales s LEFT JOIN customers c ON c.company_name=s.customer
     WHERE EXISTS (SELECT 1 FROM sales s2 WHERE s2.customer=s.customer AND s2.due > 0)
     GROUP BY s.customer ORDER BY legacy_id NULLS LAST`
  );
  const g = await pool.query('SELECT COALESCE(SUM(total),0) i, COALESCE(SUM(paid),0) p FROM sales');
  const gi = Number(g.rows[0].i), gp = Number(g.rows[0].p);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5">
        <h3 className="font-bold text-white">Receivable</h3>
        <div className="ml-auto">
          <a href="/reports/receivable/export"
            className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25">
            ⤓ Export
          </a>
        </div>
      </div>
      <div className="slim-scroll overflow-x-auto p-3">
        <table className="w-full min-w-[900px] border-collapse border border-slate-200 text-sm">
          <thead>
            <tr className="bg-slate-50">
              {HEADS.map((h) => (
                <th key={h} className="whitespace-nowrap border border-slate-200 px-3 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide text-slate-800">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {r.rows.map((x, i) => (
              <tr key={String(x.customer)} className={i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                <td className="whitespace-nowrap border border-slate-200 px-3 py-2 font-medium text-slate-900">{String(x.customer ?? '')}</td>
                <td className="whitespace-nowrap border border-slate-200 px-3 py-2 text-slate-700">{String(x.gstin ?? '') || '—'}</td>
                <td className="whitespace-nowrap border border-slate-200 px-3 py-2 text-slate-700">{String(x.email ?? '') || '—'}</td>
                <td className="whitespace-nowrap border border-slate-200 px-3 py-2 text-slate-700">{String(x.phone ?? '') || '—'}</td>
                <td className="whitespace-nowrap border border-slate-200 px-3 py-2 text-slate-700">{String(x.country ?? '') || '—'}</td>
                <td className="whitespace-nowrap border border-slate-200 px-3 py-2 text-slate-700">{String(x.state ?? '') || '—'}</td>
                <td className="whitespace-nowrap border border-slate-200 px-3 py-2 tabular-nums text-slate-700">{fmt(x.invoiced)}</td>
                <td className="whitespace-nowrap border border-slate-200 px-3 py-2 tabular-nums text-slate-700">{fmt(x.paid)}</td>
                <td className="whitespace-nowrap border border-slate-200 px-3 py-2 font-semibold tabular-nums text-slate-900">{fmt(x.receivable)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 text-base font-extrabold">
              <td colSpan={6} className="border border-slate-200 px-3 py-2">Total</td>
              <td className="whitespace-nowrap border border-slate-200 px-3 py-2 tabular-nums">{fmt(gi)}</td>
              <td className="whitespace-nowrap border border-slate-200 px-3 py-2 tabular-nums">{fmt(gp)}</td>
              <td className="whitespace-nowrap border border-slate-200 px-3 py-2 tabular-nums">{fmt(gi - gp)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
