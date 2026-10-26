import { Suspense } from 'react';
import { PageHeader, LoadingRows } from '@/components/ui';
import { ledgerOptions, ledgerReport, inrFmt } from '@/lib/ledger';
import { PrintButton } from './print-btn';

// Reads ledger data per request — must block on the server, no static shell.
export const instant = false;

export default function LedgerPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; ledger_id?: string }> }) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; ledger_id?: string }> }) {
  const sp = await searchParams;
  const from = (sp.from || '').trim();
  const to = (sp.to || '').trim() || new Date().toISOString().slice(0, 10);
  const ledgerId = (sp.ledger_id || '').trim();
  const options = await ledgerOptions();
  const groups = [...new Set(options.map((o) => o.group))];
  const rep = ledgerId ? await ledgerReport(ledgerId, from, to) : null;

  const expQS = new URLSearchParams({ ...(from ? { from } : {}), to, ...(ledgerId ? { q: ledgerId } : {}) }).toString();
  return (
    <>
      <form method="GET" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-extrabold tracking-wide text-slate-800">
          🧮 Filter Report
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">From Date</label>
            <input name="from" type="date" defaultValue={from} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">To Date</label>
            <input name="to" type="date" defaultValue={to} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-700">Ledger</label>
            <select name="ledger_id" required defaultValue={ledgerId} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white">
              <option value="">Select</option>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {options.filter((o) => o.group === g).map((o) => (
                    <option key={o.value} value={o.value}>{o.value}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        <div className="border-t border-slate-100 px-4 py-2.5">
          <button className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-sky-700">Search</button>
        </div>
      </form>

      {rep && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
            <h2 className="text-sm font-extrabold tracking-wide text-slate-800">Ledger Report</h2>
            <div className="ml-auto flex gap-2">
              <PrintButton />
              <a href={`/reports/ledger/export?${expQS}`}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 print:hidden">
                ⤓ Export Excel
              </a>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <table className="w-full border-collapse text-sm">
              <tbody>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2 font-extrabold text-slate-900">{ledgerId.split(' - ')[0]}</td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-500">Opening Bal.</td>
                  <td className="border border-slate-200 px-3 py-2 font-bold tabular-nums">{inrFmt(rep.opening)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-500">Closing Bal.</td>
                  <td className="border border-slate-200 px-3 py-2 font-bold tabular-nums">{inrFmt(rep.closing)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-500">From Date</td>
                  <td className="border border-slate-200 px-3 py-2 font-bold">{from || '—'}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-500">To Date</td>
                  <td className="border border-slate-200 px-3 py-2 font-bold">{to}</td>
                </tr>
              </tbody>
            </table>
            <table className="w-full border-collapse text-sm">
              <tbody>
                <tr className="bg-slate-700 text-base font-extrabold text-white">
                  <td className="border border-slate-300 px-3 py-2">Date</td>
                  <td className="border border-slate-300 px-3 py-2">Particulars</td>
                  <td className="border border-slate-300 px-3 py-2 text-right">Dr Amount</td>
                  <td className="border border-slate-300 px-3 py-2 text-right">Cr Amount</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-1.5"></td>
                  <td className="border border-slate-200 px-3 py-1.5 underline">OPENING BALANCE</td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">{inrFmt(rep.opening)}</td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">{inrFmt(0)}</td>
                </tr>
                {rep.entries.map((e, i) => (
                  <tr key={i} className="odd:bg-white even:bg-slate-50/50">
                    <td className="whitespace-nowrap border border-slate-200 px-3 py-1.5">{e.date}</td>
                    <td className="border border-slate-200 px-3 py-1.5">
                      {e.particulars}{e.ref && e.href ? <> [<a href={e.href} target="_blank" className="font-bold text-indigo-700 hover:underline">{e.ref}</a>]</> : e.ref ? ` [${e.ref}]` : ''}
                    </td>
                    <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">{inrFmt(e.dr)}</td>
                    <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">{inrFmt(e.cr)}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="border border-slate-200 px-3 py-1.5"></td>
                  <td className="border border-slate-200 px-3 py-1.5">Total</td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">{inrFmt(rep.drTotal)}</td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">{inrFmt(rep.crTotal)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-1.5"></td>
                  <td className="border border-slate-200 px-3 py-1.5 underline">CLOSING BALANCE</td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">{inrFmt(0)}</td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">{inrFmt(rep.closing)}</td>
                </tr>
                <tr className="bg-slate-100 text-base font-extrabold">
                  <td className="border border-slate-200 px-3 py-1.5"></td>
                  <td className="border border-slate-200 px-3 py-1.5"></td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">{inrFmt(rep.opening + rep.drTotal)}</td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">{inrFmt(rep.closing + rep.crTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!rep && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-400">
          Select a ledger and dates, then press Search to view the ledger report.
        </div>
      )}
    </>
  );
}
