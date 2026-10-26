import { Suspense } from 'react';
import { LoadingRows, Badge } from '@/components/ui';
import { TableShell } from '@/components/settings-modals';
import { searchRates, rateStats, checkRateUpdate, RATE_SOURCE } from '@/lib/gst-rates';

// Reads live registry on demand — must block on the server, no static shell.
export const instant = false;

const SLABS = ['0', '0.25', '1.5', '3', '5', '18', '40'];
const SLAB_TONE: Record<string, string> = {
  '0': 'gray', '0.25': 'green', '1.5': 'green', '3': 'green', '5': 'green', '18': 'blue', '40': 'red',
};

export default function GstRates({ searchParams }: { searchParams: Promise<{ q?: string; slab?: string; check?: string }> }) {
  return (
    <div className="space-y-4">
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
  const qs = (s: string) => `/settings/gst-rates?${new URLSearchParams({ q: query, ...(s ? { slab: s } : {}) }).toString()}`;
  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 p-5 text-white shadow-lg ring-1 ring-inset ring-white/15 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-indigo-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-violet-400/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl ring-1 ring-inset ring-white/25">🧾</div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">GST Live Rates</h1>
            <p className="mt-0.5 text-sm text-indigo-200">{RATE_SOURCE.notification} · effective {RATE_SOURCE.effective}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <div className="rounded-xl bg-white/10 px-3.5 py-2 text-center ring-1 ring-inset ring-white/25">
              <div className="text-lg font-extrabold tabular-nums">{stats.codes.toLocaleString('en-IN')}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">HSN codes</div>
            </div>
            <div className="rounded-xl bg-white/10 px-3.5 py-2 text-center ring-1 ring-inset ring-white/25">
              <div className="text-lg font-extrabold tabular-nums">v{RATE_SOURCE.packageVersion}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">rate data</div>
            </div>
          </div>
        </div>
      </div>

      <form method="GET" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <span className="mr-auto text-sm text-slate-500">
          <b className="text-slate-900 tabular-nums">{total.toLocaleString('en-IN')}</b> {total === 1 ? 'match' : 'matches'}{truncated ? ` · showing first ${rows.length}` : ''}
        </span>
        <input name="q" defaultValue={query} placeholder="🔍 HSN or item — e.g. 0202, meat, phone"
          className="w-52 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white sm:w-64" />
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Filter</button>
        {(query || slab) && <a href="/settings/gst-rates" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <a href={`/settings/gst-rates?${new URLSearchParams({ q: query, ...(slab ? { slab } : {}) }).toString()}${query || slab ? '&' : ''}check=1`}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">
          🔄 Check live update
        </a>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Slab:</span>
        <a href={qs('')} className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset transition ${slab === '' ? 'bg-indigo-600 text-white ring-indigo-600 shadow' : 'bg-white text-slate-600 ring-slate-200 hover:ring-indigo-300'}`}>All</a>
        {SLABS.map((s) => (
          <a key={s} href={qs(s)} className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ring-1 ring-inset transition ${slab === s ? 'bg-indigo-600 text-white ring-indigo-600 shadow' : 'bg-white text-slate-600 ring-slate-200 hover:ring-indigo-300'}`}>
            {s}%
          </a>
        ))}
      </div>

      {upd && (
        <div className={`rounded-2xl border px-4 py-2.5 text-sm font-medium ${upd.updateAvailable ? 'border-amber-200 bg-amber-50 text-amber-800' : upd.error ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {upd.updateAvailable
            ? <>⚠ New rate data published: <b>v{upd.latest}</b> (bundled v{upd.current}, checked {upd.checkedAt}). Ask your admin to run <code className="rounded bg-amber-100 px-1 font-mono">npm i hsn-code-package@{upd.latest}</code> and redeploy.</>
            : upd.error
              ? <>Could not reach the update registry ({upd.error}) — showing bundled data v{upd.current}.</>
              : <>✓ Rate data is current — bundled v{upd.current}, checked {upd.checkedAt}.</>}
        </div>
      )}

      <TableShell heads={['HSN Code', 'Item Description', 'CGST', 'SGST', 'IGST', 'Effective']}>
        {rows.map((r) => (
          <tr key={r.code} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="whitespace-nowrap px-3 py-2"><span className="rounded-lg bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200">{r.code}</span></td>
            <td className="min-w-64 px-3 py-2 text-slate-700">{r.description}</td>
            <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600">{r.cgst}%</td>
            <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600">{r.sgst}%</td>
            <td className="whitespace-nowrap px-3 py-2 tabular-nums">
              <Badge tone={SLAB_TONE[String(r.igst)] ?? 'blue'}>{r.igst}%</Badge>
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-400">{r.effectiveFrom}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No matches — try a shorter code or different words</td></tr>}
      </TableShell>
      <p className="text-xs text-slate-400">
        Source: {RATE_SOURCE.notification}, effective {RATE_SOURCE.effective} · bundled v{RATE_SOURCE.packageVersion} · chapter-level classification — confirm against the official notification for billing use.
      </p>
    </>
  );
}
