import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import BankActions, { type Account } from '@/components/bank-modals';
import { PageHeader, LoadingRows, Badge } from '@/components/ui';

export default function Bank() {
  return (
    <div>
      <PageHeader title="Bank Accounts" sub="Deposit, withdraw & transfer with live balances" />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const acc = await q<Account>('SELECT * FROM bank_accounts ORDER BY id');
  const entries = await q('SELECT ref_no, vouch_type, from_acct, to_acct, amount FROM cash_bank_entries ORDER BY id DESC LIMIT 100');
  const total = await q<{ t: string }>('SELECT COALESCE(SUM(closing),0) t FROM bank_accounts');
  return (
    <div className="space-y-4">
      <BankActions accounts={acc} total={inr(total[0]?.t)} />
      <div>
        <h2 className="mb-2 font-bold text-slate-900">Cash/Bank entries (latest 100)</h2>
        {/* mobile cards */}
        <div className="space-y-2 md:hidden">
          {entries.map((r, i) => (
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
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50/95">
              <tr>{['Reference No', 'Voucher Type', 'From Account', 'To Account', 'Amount'].map((h, i) => (
                <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((r, i) => (
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
