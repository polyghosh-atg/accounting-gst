import { Suspense } from 'react';
import { PageHeader, LoadingRows, Badge } from '@/components/ui';
import { TableShell } from '@/components/settings-modals';
import { searchRates, rateStats, checkRateUpdate, RATE_SOURCE } from '@/lib/gst-rates';

// Reads live data per request — must block on the server, no static shell.
export const instant = false;

const SLABS = ['', '0', '0.25', '1.5', '3', '5', '18', '40'];

export default function GstRates({ searchParams }: { searchParams: Promise<{ q?: string; slab?: string; check?: string }> }) {
  return (
    <div className="space-y-4">
      <PageHeader title="GST Live Rates" sub="HSN-wise rates from the official schedule — read-only, your tax masters are untouched" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string; slab?: string; check?: string }> }) {
  const sp = await searchParams;
  const query = (sp.q || '').trim();
  const slab = sp.slab || '';
  const [{ rows, total, truncated }, stats, upd] = await Promise.all([
    Promise.resolve(searchRates(query, slab)),
    Promise.resolve(rateStats()),
    sp.check ? checkRateUpdate() : Promise.resolve(null),
  ]);
  return (
    <>
      <form method="GET" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <span className="mr-auto text-sm text-slate-500">
          {total.toLocaleString('en-IN')} {total === 1 ? 'match' : 'matches'}{truncated ? ` · showing first ${rows.length}` : ''} · {stats.codes.toLocaleString('en-IN')} codes
        </span>
        <input name="q" defaultValue={query} placeholder="HSN or item — e.g. 0202, meat, phone"
          className="w-52 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white sm:w-64" />
        <select name="slab" defaultValue={slab} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold outline-none focus:border-indigo-400">
          <option value="">All slabs</option>
          {SLABS.filter(Boolean).map((s) => <option key={s} value={s}>{s}% IGST</option>)}
        </select>
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Filter</button>
        {(query || slab) && <a href="/settings/gst-rates" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <a href={`/settings/gst-rates?${new URLSearchParams({ q: query, slab }).toString()}${query || slab ? '&' : ''}check=1`}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">
          🔄 Check live update
        </a>
      </form>

      {upd && (
        <div className={`rounded-2xl border px-4 py-2.5 text-sm font-medium ${upd.updateAvailable ? 'border-amber-200 bg-amber-50 text-amber-800' : upd.error ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {upd.updateAvailable
            ? <>⚠ New rate data published: <b>v{upd.latest}</b> (installed v{upd.current}, checked {upd.checkedAt}). Ask your admin to run <code className="rounded bg-amber-100 px-1 font-mono">npm i hsn-code-package@{upd.latest}</code> and redeploy — then re-check here.</>
            : upd.error
              ? <>Could not reach the update registry ({upd.error}) — showing bundled data v{upd.current}.</>
              : <>✓ Rate data is current — bundled v{upd.current}, checked {upd.checkedAt}.</>}
        </div>
      )}

      <TableShell heads={['HSN Code', 'Item Description', 'CGST', 'SGST', 'IGST', 'Effective']}>
        {rows.map((r) => (
          <tr key={r.code} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="whitespace-nowrap px-3 py-2 font-mono font-bold text-indigo-700">{r.code}</td>
            <td className="min-w-64 px-3 py-2 text-slate-700">{r.description}</td>
            <td className="whitespace-nowrap px-3 py-2 tabular-nums">{r.cgst}%</td>
            <td className="whitespace-nowrap px-3 py-2 tabular-nums">{r.sgst}%</td>
            <td className="whitespace-nowrap px-3 py-2 tabular-nums">
              <Badge tone={r.igst === 0 ? 'gray' : r.igst <= 5 ? 'green' : r.igst <= 18 ? 'blue' : 'red'}>{r.igst}%</Badge>
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-slate-500">{r.effectiveFrom}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No matches — try a shorter code or different words</td></tr>}
      </TableShell>
      <p className="text-xs text-slate-400">
        Source: {RATE_SOURCE.notification}, effective {RATE_SOURCE.effective} · bundled data v{RATE_SOURCE.packageVersion} · chapter-level classification — confirm against the official notification for billing use.
      </p>
    </>
  );
}
