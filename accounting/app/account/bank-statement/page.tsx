import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, Badge } from '@/components/ui';
import { AddStatementButton, StatementButtons, DownloadIcon, type Statement, type StmtLine, type Txn } from '@/components/statement-modals';

export default function BankStatement({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader
        title="Bank Statement"
        sub="Statements with reconcile status"
        actions={<a href="/account/bank-statement/export" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">⤓ Export Excel</a>}
      />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const like = `%${query}%`;
  const rows = await q<Statement>(
    query
      ? `SELECT * FROM bank_statements WHERE account_name ILIKE $1 OR statement ILIKE $1 OR bank_name ILIKE $1 OR account_number ILIKE $1 ORDER BY id DESC`
      : `SELECT * FROM bank_statements ORDER BY id DESC`,
    query ? [like] : []
  );
  const accounts = await q<{ name: string; number: string; ifsc: string }>('SELECT name, number, ifsc FROM bank_accounts ORDER BY name');
  const allLines = await q<StmtLine & { statement_id: number }>('SELECT statement_id, id, sr, txn_date, cheque_no, particulars, withdraw, deposit, reconciled FROM statement_lines ORDER BY statement_id, sr LIMIT 2000');
  const txns = await q<Txn>('SELECT id, module, txn_type, ref_no, voucher_date, pay_mode, cheque_no, cheque_date, amount FROM transactions ORDER BY voucher_date DESC, id DESC LIMIT 1000');
  const linesByStmt = new Map<number, StmtLine[]>();
  for (const l of allLines) {
    if (!linesByStmt.has(l.statement_id)) linesByStmt.set(l.statement_id, []);
    linesByStmt.get(l.statement_id)!.push(l);
  }
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <span className="mr-auto text-sm text-slate-500">Showing 1 to {rows.length} of {rows.length} entries</span>
        <form method="GET" className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Search:</label>
          <input
            name="q" defaultValue={query} placeholder=""
            className="w-44 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 sm:w-52"
          />
          <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Go</button>
          {query && <a href="/account/bank-statement" className="text-xs font-semibold text-indigo-700 hover:underline">Clear</a>}
        </form>
        <AddStatementButton accounts={accounts} />
      </div>
      <div className="space-y-2.5 md:hidden">
        {rows.length === 0 && <div className="rounded-2xl border bg-white px-3 py-8 text-center text-sm text-slate-400">No statements</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-bold text-slate-900">{r.account_name}</span>
              <Badge tone={r.reconcile_status === 'Completed' ? 'green' : 'amber'}>{r.reconcile_status}</Badge>
            </div>
            <div className="mt-1"><DownloadIcon s={r} /></div>
            <div className="mt-1 text-xs text-slate-400">{r.bank_name}</div>
            <div className="mt-2 border-t border-slate-100 pt-2"><StatementButtons s={r} lines={linesByStmt.get(r.id) || []} txns={txns} /></div>
          </div>
        ))}
      </div>
      <div className="slim-scroll hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] md:block">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>{['Account Name', 'Number', 'Type', 'Bank Name', 'Statement', 'Reconcile Status', 'Action'].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide text-slate-800">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No statements</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                <td className="whitespace-nowrap px-3 py-2 font-semibold">{r.account_name}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600">{r.account_number}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.account_type}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.bank_name}</td>
                <td className="whitespace-nowrap px-3 py-2"><DownloadIcon s={r} /></td>
                <td className="whitespace-nowrap px-3 py-2">
                  <Badge tone={r.reconcile_status === 'Completed' ? 'green' : 'amber'}>{r.reconcile_status}</Badge>
                </td>
                <td className="whitespace-nowrap px-3 py-2"><StatementButtons s={r} lines={linesByStmt.get(r.id) || []} txns={txns} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
