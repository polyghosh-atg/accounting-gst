import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { getActiveFyLabel } from '@/lib/fy';
import { Card, LoadingRows, Badge } from '@/components/ui';

// Reads the active FY from DB — must block on the server, no static shell.
export const instant = false;

const QUICK = [
  { label: 'New Sale', href: '/sales', grad: 'from-indigo-500 to-violet-600', icon: '🧾' },
  { label: 'New Purchase', href: '/purchases', grad: 'from-emerald-500 to-teal-600', icon: '📦' },
  { label: 'Add Expense', href: '/expenses', grad: 'from-amber-500 to-orange-600', icon: '💸' },
  { label: 'Reports', href: '/reports', grad: 'from-sky-500 to-cyan-600', icon: '📊' },
];

export default async function Dashboard() {
  const fy = await getActiveFyLabel();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-600 p-5 text-white shadow-lg sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-fuchsia-300/25 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Namaste 🙏 — here&apos;s your business today</h1>
            <p className="mt-0.5 text-sm text-indigo-100">{today} · FY {fy} · live data from vaksys.com/pro</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {QUICK.map((a) => (
              <a
                key={a.label}
                href={a.href}
                className={`rounded-xl bg-gradient-to-br px-3.5 py-2 text-sm font-bold text-white shadow-md ring-1 ring-inset ring-white/30 transition hover:brightness-110 active:scale-95 ${a.grad}`}
              >
                {a.icon} {a.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <Suspense fallback={<LoadingRows n={8} />}>
        <Content />
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

async function Content() {
  const [[s], [p], [c], [r], [e]] = await Promise.all([
    q<{ c: string; t: string }>('SELECT count(*) c, COALESCE(SUM(total),0) t FROM sales'),
    q<{ c: string; t: string }>('SELECT count(*) c, COALESCE(SUM(total),0) t FROM purchases'),
    q<{ c: string }>('SELECT count(*) c FROM customers'),
    q<{ t: string }>('SELECT COALESCE(SUM(due),0) t FROM sales'),
    q<{ t: string }>("SELECT COALESCE(SUM(total),0) t FROM expenses WHERE bill_date::date > current_date - interval '30 days'"),
  ]);
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

  const stats: StatDef[] = [
    { label: 'Sales', value: inr(s.t), sub: `${s.c} invoices`, grad: 'from-indigo-500 to-violet-600', ring: 'hover:ring-2 hover:ring-indigo-200', icon: '🧾' },
    { label: 'Purchases', value: inr(p.t), sub: `${p.c} bills`, grad: 'from-emerald-500 to-teal-600', ring: 'hover:ring-2 hover:ring-emerald-200', icon: '📦' },
    { label: 'Customers', value: String(c.c), sub: 'receivable below', grad: 'from-amber-500 to-orange-600', ring: 'hover:ring-2 hover:ring-amber-200', icon: '👥' },
    { label: 'Receivable', value: inr(r.t), sub: 'total due · 30-day expenses ' + inr(e.t), grad: 'from-rose-500 to-pink-600', ring: 'hover:ring-2 hover:ring-rose-200', icon: '⏳' },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((x) => <StatCard key={x.label} s={x} />)}
      </div>

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
