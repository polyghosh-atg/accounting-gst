import { Suspense } from 'react';
import Link from 'next/link';
import { Pool } from 'pg';
import { PageHeader, LoadingRows } from '@/components/ui';
import DueBody, { type DueRow } from './due-body';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CustomerPaymentDue() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Customer Payment Due Report"
        sub="Pending bills only · click a row for customer details"
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
    `SELECT s.customer, COALESCE(SUM(s.total),0) invoiced, COALESCE(SUM(s.paid),0) paid,
       COALESCE(SUM(s.total),0)-COALESCE(SUM(s.paid),0) pending,
       MIN(c.id) AS cust_id, MIN(c.legacy_id) AS legacy_id
     FROM sales s LEFT JOIN customers c ON c.company_name = s.customer
     WHERE s.due > 0
     GROUP BY s.customer
     ORDER BY legacy_id NULLS LAST`
  );
  const rows: DueRow[] = r.rows.map((x) => ({
    customer: String(x.customer ?? ''),
    invoiced: Number(x.invoiced),
    paid: Number(x.paid),
    pending: Number(x.pending),
    custId: x.cust_id ? Number(x.cust_id) : null,
  }));
  const t = (k: 'invoiced' | 'paid' | 'pending') => rows.reduce((a, x) => a + x[k], 0);
  const boxes = [
    { label: 'Total Invoice Amount', value: fmt(t('invoiced')) },
    { label: 'Total Paid Amount', value: fmt(t('paid')) },
    { label: 'Total Pending Amount', value: fmt(t('pending')) },
  ];
  return (
    <>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {boxes.map((b) => (
          <div key={b.label} className="rounded-2xl bg-slate-500 px-4 py-3 text-white shadow-sm">
            <div className="text-sm font-medium text-slate-100">{b.label}</div>
            <div className="mt-0.5 text-xl font-extrabold tabular-nums">{b.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5">
          <h3 className="font-bold text-white">Customer Payment Due Report</h3>
          <div className="ml-auto">
            <a href="/reports/customer_payment_due/export"
              className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25">
              ⤓ Export
            </a>
          </div>
        </div>
        <div className="slim-scroll overflow-x-auto p-3">
          <table className="w-full min-w-[640px] border-collapse border border-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-50">
                {['Customer Name', 'Invoice Amount', 'Paid Amount', 'Pending Amount'].map((h) => (
                  <th key={h} className="border border-slate-200 px-3 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide text-slate-800">{h}</th>
                ))}
              </tr>
            </thead>
            <DueBody rows={rows} />
          </table>
        </div>
      </div>
    </>
  );
}
