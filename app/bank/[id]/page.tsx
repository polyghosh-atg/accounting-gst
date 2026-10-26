import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, Card, LoadingRows, Badge, statusTone } from '@/components/ui';
import Link from 'next/link';

export default function BankDetail({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await q('SELECT * FROM bank_accounts WHERE id=$1', [id]);
  if (!rows.length) return <div>Not found. <Link className="text-indigo-700" href="/bank">Back</Link></div>;
  const a = rows[0];
  const stmt = await q(
    `SELECT ref_no, vouch_type, from_acct, to_acct, amount FROM cash_bank_entries
     WHERE upper(from_acct) LIKE '%' || upper($1) || '%' OR upper(to_acct) LIKE '%' || upper($1) || '%'
        OR upper($1) LIKE '%' || upper(from_acct) || '%' OR upper($1) LIKE '%' || upper(to_acct) || '%'
     ORDER BY id DESC`,
    [a.name]
  );
  return (
    <div className="space-y-4">
      <PageHeader
        title={String(a.name)}
        sub={`${String(a.bank_name)} · ${String(a.number)}`}
        actions={<Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href="/bank">← All accounts</Link>}
      />
      <Card>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {[['IFSC', String(a.ifsc ?? '')], ['Type', String(a.type ?? '')], ['Opening', inr(a.opening)], ['Status', '']].map(([k, v]) => (
            <div key={k} className="border-b border-slate-100 py-1.5">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-semibold">{k === 'Status' ? <Badge tone={statusTone(String(a.status))}>{String(a.status)}</Badge> : v}</dd>
            </div>
          ))}
        </dl>
        {a.description && <p className="mt-2 text-sm text-slate-500">{String(a.description)}</p>}
        <div className="mt-3 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 text-sm ring-1 ring-inset ring-indigo-100">
          Closing balance <b className="text-base tabular-nums">{inr(a.closing)}</b>
        </div>
      </Card>
      <div>
        <h2 className="mb-2 font-bold text-slate-900">Previous Transactions ({stmt.length})</h2>
        {/* mobile cards */}
        <div className="space-y-2 md:hidden">
          {stmt.length === 0 && <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-8 text-center text-sm text-slate-400">No transactions yet — use Deposit to add the first entry</div>}
          {stmt.map((r, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs text-slate-600">{String(r.ref_no)}</span>
                <Badge tone={String(r.vouch_type).includes('receipt') ? 'green' : String(r.vouch_type).includes('payment') ? 'rose' : 'blue'}>{String(r.vouch_type)}</Badge>
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">{String(r.from_acct)} → {String(r.to_acct)}</div>
              <div className="mt-1 text-right text-sm font-bold tabular-nums">{inr(r.amount)}</div>
            </div>
          ))}
        </div>
        {/* desktop table */}
        <div className="slim-scroll hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] md:block">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50/95">
              <tr>{['Reference No', 'Voucher Type', 'From', 'To', 'Amount'].map((h, i) => (
                <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stmt.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No transactions yet — use Deposit to add the first entry</td></tr>}
              {stmt.map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{String(r.ref_no)}</td>
                  <td className="whitespace-nowrap px-3 py-2"><Badge tone={String(r.vouch_type).includes('receipt') ? 'green' : String(r.vouch_type).includes('payment') ? 'rose' : 'blue'}>{String(r.vouch_type)}</Badge></td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{String(r.from_acct)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{String(r.to_acct)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">{inr(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
