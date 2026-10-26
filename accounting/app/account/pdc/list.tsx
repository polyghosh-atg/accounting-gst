import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import { AddPdcButton, PdcButtons, type Pdc } from '@/components/pdc-modals';
import { pdcStatus } from '@/components/ui';

async function ledgersAndBanks() {
  const [banks, custs, sups] = await Promise.all([
    q<{ name: string }>('SELECT name FROM bank_accounts ORDER BY name'),
    q<{ company_name: string }>('SELECT company_name FROM customers ORDER BY company_name'),
    q<{ company_name: string }>('SELECT company_name FROM suppliers ORDER BY company_name'),
  ]);
  return {
    banks: banks.map((b) => b.name),
    ledgers: [...banks.map((b) => b.name), ...custs.map((c) => c.company_name), ...sups.map((s) => s.company_name)],
  };
}

export function PdcList({ kind, title, sub, searchParams }: {
  kind: 'receive' | 'payment'; title: string; sub: string; searchParams?: Promise<{ q?: string }>;
}) {
  return (
    <div>
      <PageHeader title={title} sub={sub} />
      <Suspense fallback={<LoadingRows />}>
        <Content kind={kind} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ kind, searchParams }: { kind: 'receive' | 'payment'; searchParams?: Promise<{ q?: string }> }) {
  const query = searchParams ? ((await searchParams).q || '').trim() : '';
  const like = `%${query}%`;
  const table = kind === 'payment' ? 'pdc_payments' : 'pdc_receives';
  const rows = await q<Pdc>(
    query
      ? `SELECT * FROM ${table} WHERE ledger ILIKE $1 OR cheque_no ILIKE $1 OR deposit_to ILIKE $1 ORDER BY id DESC`
      : `SELECT * FROM ${table} ORDER BY id DESC`,
    query ? [like] : []
  );
  const { banks, ledgers } = await ledgersAndBanks();
  const label = kind === 'payment' ? 'Add PDC Payment' : 'Add PDC Receive';
  return (
    <>
      <form method="GET" className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <span className="mr-auto text-sm text-slate-500">Showing 1 to {rows.length} of {rows.length} entries</span>
        <label className="text-xs font-semibold text-slate-500">Search:</label>
        <input
          name="q" defaultValue={query} placeholder=""
          className="w-44 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 sm:w-52"
        />
        <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Go</button>
        {query && <a href={kind === 'payment' ? '/account/pdc-payment' : '/account/pdc-receive'} className="text-xs font-semibold text-indigo-700 hover:underline">Clear</a>}
        <span className="ml-auto"><AddPdcButton kind={kind} ledgers={ledgers} banks={banks} label={label} /></span>
      </form>
      <div className="space-y-2.5 md:hidden">
        {rows.length === 0 && <div className="rounded-2xl border bg-white px-3 py-8 text-center text-sm text-slate-400">No cheques</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-bold text-slate-900">{r.ledger}</span>
              {pdcStatus(r.status)}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-slate-500">Cheque {r.cheque_no} · {r.cheque_date ? String(r.cheque_date).slice(0, 10) : ''}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-slate-400">→ {r.deposit_to}</span>
              <span className="font-extrabold tabular-nums">{inr(r.amount)}</span>
            </div>
            <div className="mt-2 border-t border-slate-100 pt-2"><PdcButtons p={r} kind={kind} ledgers={ledgers} banks={banks} /></div>
          </div>
        ))}
      </div>
      <div className="slim-scroll hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] md:block">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>{['Ledger', 'PDC Cheque No', 'Cheque Date', 'PDC Amount', 'Deposit To', 'Deposit Date', 'Status', 'Action'].map((h, i) => (
              <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">No cheques</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                <td className="whitespace-nowrap px-3 py-2 font-semibold">{r.ledger}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.cheque_no}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.cheque_date ? String(r.cheque_date).slice(0, 10) : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums">{inr(r.amount)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.deposit_to}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.deposit_date ? String(r.deposit_date).slice(0, 10) : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2">{pdcStatus(r.status)}</td>
                <td className="whitespace-nowrap px-3 py-2"><PdcButtons p={r} kind={kind} ledgers={ledgers} banks={banks} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
