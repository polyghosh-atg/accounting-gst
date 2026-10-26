import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows, Badge } from '@/components/ui';
import { toggleLine } from '@/app/account/bank-statement/actions';
import { DownloadIcon, type Statement } from '@/components/statement-modals';
import Link from 'next/link';

export default function StatementDetail({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await q<Statement>('SELECT * FROM bank_statements WHERE id=$1', [id]);
  if (!rows.length) return <div>Not found. <Link className="text-indigo-700" href="/account/bank-statement">Back</Link></div>;
  const s = rows[0];
  const lines = await q('SELECT * FROM statement_lines WHERE statement_id=$1 ORDER BY sr', [id]);
  const tot = await q<{ w: string; d: string; n: string }>(
    'SELECT COALESCE(SUM(withdraw),0) w, COALESCE(SUM(deposit),0) d, count(*) n FROM statement_lines WHERE statement_id=$1', [id]
  ).then((r) => r[0]);
  return (
    <div className="space-y-4" id="reconcile">
      <PageHeader
        title={`View Bank Statement — ${s.account_name}`}
        sub={`${s.bank_name} · ${s.account_number}`}
        actions={<>
          <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href="/account/bank-statement">← List</Link>
          <a className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:text-emerald-700" href={`/account/bank-statement/${id}/export`}>⤓ Export Excel</a>
        </>}
      />
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Statement</div>
          <div className="mt-1"><DownloadIcon s={s} /></div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</div>
          <div className="mt-1"><Badge tone={s.reconcile_status === 'Completed' ? 'green' : 'amber'}>{s.reconcile_status}</Badge></div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Withdraw / Deposit</div>
          <div className="mt-1 text-sm font-bold tabular-nums">{inr(tot.w)} / {inr(tot.d)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lines</div>
          <div className="mt-1 text-sm font-bold tabular-nums">{tot.n}</div>
        </div>
      </div>
      <div>
        <h2 className="mb-2 font-bold text-slate-900">Statement lines — tap status to reconcile</h2>
        <div className="slim-scroll overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50/95">
              <tr>{['Sr', 'Statement', 'Transaction Date', 'Cheque No', 'Particulars', 'Withdraw', 'Deposit', 'Reconcile'].map((h, i) => (
                <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i === 5 || i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">No parsed lines — upload an .xlsx/.csv statement to fill this table.</td></tr>}
              {lines.map((l) => (
                <tr key={l.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{String(l.sr)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{s.statement}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{l.txn_date ? String(l.txn_date).slice(0, 10) : '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{String(l.cheque_no || '—')}</td>
                  <td className="max-w-56 truncate px-3 py-2 text-slate-700">{String(l.particulars)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{inr(l.withdraw)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{inr(l.deposit)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <form action={toggleLine} title="Toggle reconcile">
                      <input type="hidden" name="line_id" value={l.id} />
                      <input type="hidden" name="statement_id" value={s.id} />
                      <button><Badge tone={l.reconciled === 'Completed' ? 'green' : 'amber'}>{String(l.reconciled)}</Badge></button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
