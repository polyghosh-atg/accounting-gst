import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { getActiveFyLabel } from '@/lib/fy';
import { Card, LoadingRows, Badge } from '@/components/ui';

// Reads the active FY from DB — must block on the server, no static shell.
export const instant = false;

const QUICK = [
  { label: 'New Sale', href: '/sales', icon: '🧾' },
  { label: 'New Purchase', href: '/purchases', icon: '📦' },
  { label: 'Add Expense', href: '/expenses', icon: '💸' },
  { label: 'Reports', href: '/reports', icon: '📊' },
];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const from = (sp.from || '').trim();
  const to = (sp.to || '').trim();
  const fy = await getActiveFyLabel();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* hero — matches sidebar indigo/violet theme */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 p-5 text-white shadow-lg ring-1 ring-inset ring-white/15 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-indigo-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-violet-400/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Namaste 🙏 — here&apos;s your business today</h1>
            <p className="mt-0.5 text-sm text-indigo-200">{today} · FY {fy} · live data from vaksys.com/pro</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {QUICK.map((a) => (
              <a
                key={a.label}
                href={a.href}
                className="rounded-xl bg-white/10 px-3.5 py-2 text-sm font-bold text-white shadow ring-1 ring-inset ring-white/25 backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                {a.icon} {a.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <form method="GET" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <span className="text-sm font-bold text-slate-700">📅 Cards period:</span>
        <label className="text-xs font-bold text-slate-600">From <input name="from" type="date" defaultValue={from} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400" /></label>
        <label className="text-xs font-bold text-slate-600">To <input name="to" type="date" defaultValue={to} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-normal outline-none focus:border-indigo-400" /></label>
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Apply</button>
        {(from || to) && <a href="/" className="text-xs font-semibold text-indigo-700 hover:underline">Clear</a>}
        <span className="ml-auto text-xs text-slate-400">{from || to ? `Showing ${from || '…'} → ${to || '…'}` : 'All time'}</span>
      </form>
      <Suspense fallback={<LoadingRows n={8} />}>
        <Content from={from} to={to} />
      </Suspense>
    </div>
  );
}

type StatDef = { label: string; value: string; sub: string; grad: string; ring: string; icon: string };

function StatCard({ s }: { s: StatDef }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-lg ${s.ring}`}>
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-15 blur-xl transition group-hover:opacity-30 ${s.grad}`} />
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg text-white shadow ${s.grad}`}>
          {s.icon}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
          <div className="truncate text-lg font-extrabold tabular-nums text-slate-900">{s.value}</div>
        </div>
      </div>
      <div className="mt-1 truncate text-xs font-medium text-slate-500">{s.sub}</div>
    </div>
  );
}

async function Content({ from, to }: { from: string; to: string }) {
  // one round-trip per aggregate — fast even on large books
  const [[s], [p], [c], [e]] = await Promise.all([
    q<{ c: string; t: string; paid: string; due: string; tax: string }>(
      `SELECT count(*) c, COALESCE(SUM(total),0) t, COALESCE(SUM(paid),0) paid, COALESCE(SUM(due),0) due, COALESCE(SUM(tax),0) tax FROM sales
       WHERE ($1='' OR inv_date >= $1::date) AND ($2='' OR inv_date <= $2::date)`, [from, to]),
    q<{ c: string; t: string; paid: string; due: string; tax: string }>(
      `SELECT count(*) c, COALESCE(SUM(total),0) t, COALESCE(SUM(paid),0) paid, COALESCE(SUM(due),0) due, COALESCE(SUM(tax),0) tax FROM purchases
       WHERE ($1='' OR purchase_date >= $1::date) AND ($2='' OR purchase_date <= $2::date)`, [from, to]),
    q<{ c: string; sc: string }>('SELECT (SELECT count(*) FROM customers) c, (SELECT count(*) FROM suppliers) sc'),
    q<{ t: string }>(`SELECT COALESCE(SUM(total),0) t FROM expenses
       WHERE ($1='' OR bill_date >= $1::date) AND ($2='' OR bill_date <= $2::date)`, [from, to]),
  ]);
  const rangeSub = from || to ? `${from || '…'} → ${to || '…'}` : 'all time';
  const stats: StatDef[] = [
    { label: 'GST Invoice Amount', value: inr(s.t), sub: `${s.c} sales · ${rangeSub}`, grad: 'from-indigo-500 to-violet-600', ring: 'hover:ring-2 hover:ring-indigo-200', icon: '🧾' },
    { label: 'GST Collected', value: inr(s.tax), sub: `tax on sales · ${rangeSub}`, grad: 'from-sky-500 to-cyan-600', ring: 'hover:ring-2 hover:ring-sky-200', icon: '🏷' },
    { label: 'Total Received', value: inr(s.paid), sub: `sales receipts · ${rangeSub}`, grad: 'from-emerald-500 to-teal-600', ring: 'hover:ring-2 hover:ring-emerald-200', icon: '💵' },
    { label: 'Receivable Due', value: inr(s.due), sub: `to collect · ${rangeSub}`, grad: 'from-amber-500 to-orange-600', ring: 'hover:ring-2 hover:ring-amber-200', icon: '⏳' },
    { label: 'Purchase Amount', value: inr(p.t), sub: `${p.c} bills · ${rangeSub}`, grad: 'from-violet-500 to-purple-600', ring: 'hover:ring-2 hover:ring-violet-200', icon: '📦' },
    { label: 'GST Paid', value: inr(p.tax), sub: `tax on purchases · ${rangeSub}`, grad: 'from-blue-500 to-indigo-600', ring: 'hover:ring-2 hover:ring-blue-200', icon: '🧮' },
    { label: 'Total Paid', value: inr(p.paid), sub: `purchase payments · ${rangeSub}`, grad: 'from-teal-500 to-emerald-600', ring: 'hover:ring-2 hover:ring-teal-200', icon: '✅' },
    { label: 'Payable Due', value: inr(p.due), sub: `to pay · ${rangeSub}`, grad: 'from-rose-500 to-pink-600', ring: 'hover:ring-2 hover:ring-rose-200', icon: '🐷' },
  ];
  const recent = await q('SELECT inv_no, inv_date, customer, total, paid, due FROM sales ORDER BY id DESC LIMIT 8');
  const banks = await q('SELECT name, bank_name, closing FROM bank_accounts ORDER BY closing DESC LIMIT 8');
  const low = await q('SELECT warehouse, product, qty FROM stock_entries ORDER BY qty ASC LIMIT 8');
  const months = await q(
    `SELECT to_char(inv_date,'Mon YY') m, COALESCE(SUM(total),0) t, count(*) c FROM sales
     WHERE inv_date IS NOT NULL GROUP BY date_trunc('month',inv_date), 1 ORDER BY date_trunc('month',inv_date) DESC LIMIT 8`
  );
  const ordered = [...months].reverse();
  const maxT = Math.max(1, ...ordered.map((m) => Number(m.t ?? 0)));
  const maxBank = Math.max(1, ...banks.map((b) => Number(b.closing ?? 0)));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((x) => <StatCard key={x.label} s={x} />)}
      </div>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-bold text-slate-900">📊 Parties & expenses</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-xl bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-200">👥 {c.c} customers</span>
          <span className="rounded-xl bg-violet-50 px-3 py-1.5 font-semibold text-violet-800 ring-1 ring-inset ring-violet-200">🏭 {c.sc} suppliers</span>
          <span className="rounded-xl bg-rose-50 px-3 py-1.5 font-semibold text-rose-800 ring-1 ring-inset ring-rose-200">💸 Expenses {inr(e.t)} <span className="font-normal text-rose-500">({rangeSub})</span></span>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-bold text-slate-900">📈 Sales — last {ordered.length} months</h2>
          <span className="ml-auto text-xs font-medium text-slate-400">hover bars for totals</span>
        </div>
        {ordered.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No dated sales yet</p>
        ) : (
          <div className="flex h-40 items-end gap-1.5 sm:gap-2.5">
            {ordered.map((m, i) => {
              const v = Number(m.t ?? 0);
              const h = Math.max(4, Math.round((v / maxT) * 100));
              return (
                <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${m.m}: ${inr(v)} (${m.c} bills)`}>
                  <div className="text-[11px] font-bold tabular-nums text-slate-700">{v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}</div>
                  <div
                    style={{ height: `${h}%` }}
                    className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-indigo-600 via-violet-500 to-fuchsia-400 transition hover:brightness-110"
                  />
                  <div className="truncate text-[11px] font-semibold text-slate-500">{String(m.m)}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-bold text-slate-900">🧾 Recent sales</h2>
            <a href="/sales" className="ml-auto text-xs font-bold text-indigo-700 hover:underline">View all →</a>
          </div>
          <ul className="divide-y divide-slate-100">
            {recent.map((x, i) => {
              const due = Number(x.due ?? 0);
              const paid = Number(x.paid ?? 0);
              const pill = due <= 0 ? <Badge tone="green">Paid</Badge> : paid > 0 ? <Badge tone="amber">Partial</Badge> : <Badge tone="red">Unpaid</Badge>;
              return (
                <li key={i} className="flex items-center gap-2 py-2 text-sm">
                  <a className="font-bold text-indigo-700 hover:underline" href={`/sales/${x.inv_no}`}>{String(x.inv_no)}</a>
                  <span className="truncate text-slate-500">{String(x.customer || '—')}</span>
                  <span className="ml-auto flex items-center gap-2">
                    {pill}
                    <span className={`font-bold tabular-nums ${due <= 0 ? 'text-emerald-700' : 'text-slate-900'}`}>{inr(x.total)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-bold text-slate-900">🏦 Bank balances</h2>
            <a href="/bank" className="ml-auto text-xs font-bold text-indigo-700 hover:underline">View all →</a>
          </div>
          <ul className="space-y-2.5">
            {banks.map((x, i) => {
              const v = Number(x.closing ?? 0);
              const pct = Math.max(2, Math.round((v / maxBank) * 100));
              return (
                <li key={i} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-800">{String(x.name)} <span className="font-normal text-slate-400">· {String(x.bank_name)}</span></span>
                    <span className="ml-auto shrink-0 font-bold tabular-nums text-emerald-700">{inr(x.closing)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-bold text-slate-900">⚠️ Low stock watch</h2>
          <a href="/stock" className="ml-auto text-xs font-bold text-indigo-700 hover:underline">Stock entries →</a>
        </div>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {low.map((x, i) => {
            const qtyN = Number(x.qty ?? 0);
            const tone = qtyN <= 0 ? 'red' : qtyN <= 10 ? 'amber' : 'gray';
            return (
              <li key={i} className="flex items-center gap-2 border-b border-slate-100 py-2 text-sm last:border-0">
                <span className="truncate text-slate-600">{String(x.warehouse)} · {String(x.product)}</span>
                <span className="ml-auto"><Badge tone={tone}>Qty {String(x.qty)}</Badge></span>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
