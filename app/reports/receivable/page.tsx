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
  const stats = [
    { label: 'Total Invoiced', value: fmt(gi), grad: 'from-indigo-500 to-violet-600', icon: '🧾' },
    { label: 'Total Paid', value: fmt(gp), grad: 'from-emerald-500 to-teal-600', icon: '✅' },
    { label: 'Receivable Due', value: fmt(gi - gp), grad: 'from-rose-500 to-pink-600', icon: '⏳' },
  ];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl text-white shadow ${s.grad}`}>{s.icon}</div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-slate-500">{s.label}</div>
              <div className="truncate text-xl font-extrabold tabular-nums text-slate-900">Rs {s.value}</div>
            </div>
          </div>
        ))}
      </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 px-4 py-2.5">
        <h3 className="font-bold text-white">⏳ Receivable · {r.rows.length} customers</h3>
        <div className="ml-auto">
          <a href="/reports/receivable/export"
            className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25">
            ⤓ Export
          </a>
        </div>
      </div>
      <div className="slim-scroll overflow-x-auto p-3">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-indigo-50/95 via-slate-50/95 to-violet-50/95">
              {HEADS.map((h) => (
                <th key={h} className="whitespace-nowrap px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-800">{h}</th>
              ))}
              <th className="whitespace-nowrap px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-800">Paid %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {r.rows.map((x, i) => {
              const inv = Number(x.invoiced ?? 0);
              const pd = Number(x.paid ?? 0);
              const pct = inv > 0 ? Math.min(100, Math.round((pd / inv) * 100)) : 0;
              const cust = String(x.customer ?? '');
              return (
              <tr key={cust || i} className="transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                <td className="whitespace-nowrap px-2 py-1.5">
                  <a href={`/customers?q=${encodeURIComponent(cust)}`} className="flex items-center gap-1.5 font-bold text-slate-900 hover:text-indigo-700 hover:underline">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-[10px] font-bold text-white">
                      {cust.charAt(0).toUpperCase()}
                    </span>
                    {cust}
                  </a>
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 font-mono text-slate-600">{String(x.gstin ?? '') || '—'}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{String(x.email ?? '') || '—'}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{String(x.phone ?? '') || '—'}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{String(x.country ?? '') || '—'}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{String(x.state ?? '') || '—'}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-slate-700">{fmt(x.invoiced)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 font-semibold tabular-nums text-emerald-700">{fmt(x.paid)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 font-extrabold tabular-nums text-rose-700">{fmt(x.receivable)}</td>
                <td className="min-w-24 px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" />
                    </div>
                    <span className="text-[11px] font-bold tabular-nums text-slate-500">{pct}%</span>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
          <tfoot>
            <tr className="bg-indigo-50/60 text-sm font-extrabold">
              <td colSpan={6} className="px-2 py-2">Total</td>
              <td className="whitespace-nowrap px-2 py-2 tabular-nums">{fmt(gi)}</td>
              <td className="whitespace-nowrap px-2 py-2 tabular-nums text-emerald-700">{fmt(gp)}</td>
              <td className="whitespace-nowrap px-2 py-2 tabular-nums text-rose-700">{fmt(gi - gp)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    </>
  );
}
