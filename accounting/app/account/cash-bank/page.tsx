import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows, vBadge } from '@/components/ui';
import { AddEntryButton, EntryButtons, type Entry } from '@/components/cash-modals';

export default function CashBank({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  return (
    <div>
      <PageHeader title="Cash Bank Entry" sub="Receipts, payments & contra vouchers" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const sp = await searchParams;
  const query = (sp.q || '').trim();
  const type = (sp.type || '').trim();
  const like = `%${query}%`;
  const conds: string[] = [];
  const params: string[] = [];
  if (query) {
    params.push(like);
    conds.push(`(ref_no ILIKE $${params.length} OR from_acct ILIKE $${params.length} OR to_acct ILIKE $${params.length})`);
  }
  if (type) {
    params.push(type);
    conds.push(`vouch_type = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = await q<Entry>(`SELECT * FROM cash_bank_entries ${where} ORDER BY id DESC LIMIT 300`, params);
  const types = await q<{ vouch_type: string }>('SELECT DISTINCT vouch_type FROM cash_bank_entries ORDER BY 1');
  const [banks, custs, sups] = await Promise.all([
    q<{ name: string }>('SELECT name FROM bank_accounts ORDER BY name'),
    q<{ company_name: string }>('SELECT company_name FROM customers ORDER BY company_name'),
    q<{ company_name: string }>('SELECT company_name FROM suppliers ORDER BY company_name'),
  ]);
  const ledgers = [...new Set(['CASH ACCOUNT', ...banks.map((b) => b.name), ...custs.map((c) => c.company_name), ...sups.map((s) => s.company_name)])];

  return (
    <>
      <form method="GET" className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <div className="mr-auto flex items-center gap-2">
          <AddEntryButton ledgers={ledgers} />
        </div>
        <div className="flex overflow-hidden rounded-xl border border-slate-200" role="tablist" aria-label="Voucher filter">
          <a href="/account/cash-bank" className={`px-3 py-1.5 text-xs font-semibold ${!type ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>All</a>
          {types.map((t) => (
            <a key={t.vouch_type} href={`/account/cash-bank?type=${t.vouch_type}`} className={`px-3 py-1.5 text-xs font-semibold ${type === t.vouch_type ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>{t.vouch_type}</a>
          ))}
        </div>
        <input name="q" defaultValue={query} placeholder="Search ref, ledger..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white sm:w-48" />
        {type && <input type="hidden" name="type" value={type} />}
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Search</button>
      </form>

      <div className="space-y-2.5 md:hidden">
        {rows.length === 0 && <div className="rounded-2xl border bg-white px-3 py-8 text-center text-sm text-slate-400">No entries found</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-xs font-bold">{r.ref_no}</span>
              {vBadge(r.vouch_type)}
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">{r.from_acct} → {r.to_acct}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">{r.voucher_date ? String(r.voucher_date).slice(0, 10) : ''}</span>
              <span className="font-extrabold tabular-nums">{inr(r.amount)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="truncate text-xs italic text-slate-400">{r.narration}</span>
              <EntryButtons e={r} ledgers={ledgers} />
            </div>
          </div>
        ))}
      </div>

      <div className="slim-scroll hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] md:block">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>{['Reference No', 'Voucher Type', 'Date', 'From Account', 'To Account', 'Amount', 'Narration', 'Action'].map((h, i) => (
              <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">No entries found</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-bold">{r.ref_no}</td>
                <td className="whitespace-nowrap px-3 py-2">{vBadge(r.vouch_type)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.voucher_date ? String(r.voucher_date).slice(0, 10) : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.from_acct}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.to_acct}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums">{inr(r.amount)}</td>
                <td className="max-w-40 truncate px-3 py-2 text-xs italic text-slate-400">{r.narration}</td>
                <td className="whitespace-nowrap px-3 py-2"><EntryButtons e={r} ledgers={ledgers} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">{rows.length} entries (latest 300)</p>
    </>
  );
}
