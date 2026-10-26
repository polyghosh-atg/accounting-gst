import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import { AddExpenseButton, ExpenseButtons, type Expense } from '@/components/expense-modals';

async function lookups() {
  const [cats, sups, accs] = await Promise.all([
    q<{ name: string }>('SELECT name FROM expense_categories UNION SELECT DISTINCT category AS name FROM expenses ORDER BY 1'),
    q<{ company_name: string }>('SELECT company_name FROM suppliers ORDER BY company_name'),
    q<{ name: string }>(`SELECT name FROM bank_accounts UNION SELECT 'CASH ACCOUNT' ORDER BY 1`),
  ]);
  return {
    categories: cats.map((c) => c.name).filter(Boolean),
    suppliers: sups.map((s) => s.company_name),
    accounts: accs.map((a) => a.name),
  };
}

export default function Expenses({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader title="Expenses" sub="All amounts are in Rs" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const like = `%${query}%`;
  const rows = await q<Expense>(
    query
      ? `SELECT * FROM expenses WHERE category ILIKE $1 OR supplier ILIKE $1 OR remarks ILIKE $1 ORDER BY bill_date DESC, id DESC`
      : `SELECT * FROM expenses ORDER BY bill_date DESC, id DESC`,
    query ? [like] : []
  );
  const tot = await q<{ t: string; d: string }>('SELECT COALESCE(SUM(total),0) t, COALESCE(SUM(due),0) d FROM expenses').then((r) => r[0]);
  const { categories, suppliers, accounts } = await lookups();
  return (
    <>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow">₹</div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Expense</div>
            <div className="text-lg font-extrabold tabular-nums">Rs {inr(tot.t).replace('Rs ', '')}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow">₹</div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Payable amount</div>
            <div className="text-lg font-extrabold tabular-nums">Rs {inr(tot.d).replace('Rs ', '')}</div>
          </div>
        </div>
      </div>

      <form method="GET" className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <span className="mr-auto text-sm text-slate-500">Showing 1 to {rows.length} of {rows.length} entries</span>
        <label className="text-xs font-semibold text-slate-500">Search:</label>
        <input
          name="q" defaultValue={query} placeholder=""
          className="w-44 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white sm:w-52"
        />
        <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Go</button>
        {query && <a href="/expenses" className="text-xs font-semibold text-indigo-700 hover:underline">Clear</a>}
        <AddExpenseButton categories={categories} suppliers={suppliers} />
      </form>

      <div className="space-y-2.5 md:hidden">
        {rows.length === 0 && <div className="rounded-2xl border bg-white px-3 py-8 text-center text-sm text-slate-400">No expenses found</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900">{r.category}</span>
              <span className="text-[11px] text-slate-400">{r.bill_date ? String(r.bill_date).slice(0, 10) : ''}</span>
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">{r.supplier}{r.remarks ? ` · ${r.remarks}` : ''}</div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span><span className="text-emerald-700">Paid {inr(r.paid)}</span> · <span className="text-rose-700">Due {inr(r.due)}</span></span>
              <span className="font-extrabold tabular-nums">{inr(r.total)}</span>
            </div>
            <div className="mt-2 border-t border-slate-100 pt-2"><ExpenseButtons e={r} categories={categories} suppliers={suppliers} accounts={accounts} /></div>
          </div>
        ))}
      </div>

      <div className="slim-scroll hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] md:block">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>{['Bill Date', 'Expense Category', 'Name of Supplier', 'Expense Documents', 'Remarks', 'Total Amount', 'Paid Amount', 'Due Amount', 'Action'].map((h, i) => (
              <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i >= 5 && i <= 7 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">No expenses found</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.bill_date ? String(r.bill_date).slice(0, 10) : ''}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium">{r.category}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.supplier}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-300">—</td>
                <td className="max-w-32 truncate px-3 py-2 text-slate-500">{r.remarks}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{inr(r.total)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-emerald-700">{inr(r.paid)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-rose-700">{inr(r.due)}</td>
                <td className="whitespace-nowrap px-3 py-2"><ExpenseButtons e={r} categories={categories} suppliers={suppliers} accounts={accounts} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
