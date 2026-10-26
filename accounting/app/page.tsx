import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, Stat, Card, LoadingRows } from '@/components/ui';

export default function Dashboard() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader title="Dashboard" sub="FY 2026-2027 · cloned live data from vaksys.com/pro" />
      <Suspense fallback={<LoadingRows n={8} />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const [[s], [p], [c], [r]] = await Promise.all([
    q<{ c: string; t: string }>('SELECT count(*) c, COALESCE(SUM(total),0) t FROM sales'),
    q<{ c: string; t: string }>('SELECT count(*) c, COALESCE(SUM(total),0) t FROM purchases'),
    q<{ c: string }>('SELECT count(*) c FROM customers'),
    q<{ t: string }>('SELECT COALESCE(SUM(due),0) t FROM sales'),
  ]);
  const recent = await q('SELECT inv_no, inv_date, customer, total, paid, due FROM sales ORDER BY id DESC LIMIT 8');
  const banks = await q('SELECT name, bank_name, closing FROM bank_accounts ORDER BY closing DESC LIMIT 8');
  const low = await q('SELECT warehouse, product, qty FROM stock_entries ORDER BY qty ASC LIMIT 8');

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon="sales" label="Sales" value={inr(s.t)} sub={`${s.c} invoices`} tone="indigo" />
        <Stat icon="purchases" label="Purchases" value={inr(p.t)} sub={`${p.c} bills`} tone="emerald" />
        <Stat icon="users" label="Customers" value={c.c} sub="receivable below" tone="amber" />
        <Stat icon="report" label="Receivable" value={inr(r.t)} sub="total due" tone="rose" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold text-slate-900">Recent sales</h2>
          <ul className="divide-y divide-slate-100">
            {recent.map((x, i) => (
              <li key={i} className="flex items-center gap-2 py-2 text-sm">
                <a className="font-semibold text-indigo-700 hover:underline" href={`/sales/${x.inv_no}`}>{String(x.inv_no)}</a>
                <span className="truncate text-slate-500">{String(x.customer || '—')}</span>
                <span className="ml-auto font-semibold tabular-nums">{inr(x.total)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold text-slate-900">Bank balances</h2>
          <ul className="divide-y divide-slate-100">
            {banks.map((x, i) => (
              <li key={i} className="flex items-center gap-2 py-2 text-sm">
                <span className="truncate font-medium">{String(x.name)} <span className="text-slate-400">· {String(x.bank_name)}</span></span>
                <span className="ml-auto font-semibold tabular-nums">{inr(x.closing)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card>
        <h2 className="mb-2 font-bold text-slate-900">Lowest stock entries</h2>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {low.map((x, i) => (
            <li key={i} className="flex items-center gap-2 border-b border-slate-100 py-2 text-sm last:border-0">
              <span className="truncate text-slate-600">{String(x.warehouse)} · {String(x.product)}</span>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700">Qty {String(x.qty)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
