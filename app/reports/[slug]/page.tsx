import { Suspense } from 'react';
import { reportDefs, toCSV, type Filters } from '@/lib/reports';
import { PageHeader, LoadingRows } from '@/components/ui';
import { inr } from '@/lib/db';
import Link from 'next/link';

export default function ReportPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const defs = await reportDefs();
  const def = defs.find((d) => d.slug === slug);
  if (!def) return <div>Unknown report. <Link className="text-indigo-700" href="/reports">All reports</Link></div>;

  const f: Filters = {
    from: sp.from || '', to: sp.to || '', party: sp.party || '',
    warehouse: sp.warehouse || '', q: sp.q || '',
  };
  const rows = await def.fetch(f);
  const totals: Record<string, number> = {};
  for (const k of def.totals || []) {
    totals[k] = rows.reduce((a, r) => a + (parseFloat(String(r[k] ?? '0').replace(/[^0-9.\-]/g, '')) || 0), 0);
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={def.title}
        sub={def.desc}
        actions={<>
          <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href="/reports">← Reports</Link>
          <a className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
            href={`/reports/${slug}/export${(() => {
              const s = Object.entries(sp).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
              return s ? `?${s}` : '';
            })()}`}>⤓ Export Excel</a>
        </>}
      />
      <form method="GET" className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        {def.dateFilter && (
          <>
            <label className="text-xs font-bold text-slate-600">From <input name="from" type="date" defaultValue={f.from} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-400" /></label>
            <label className="text-xs font-bold text-slate-600">To <input name="to" type="date" defaultValue={f.to} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-400" /></label>
          </>
        )}
        {def.partyFilter && (
          <label className="text-xs font-bold text-slate-600">{def.partyFilter.label}
            <select name="party" defaultValue={f.party} className="ml-1 max-w-52 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-400">
              <option value="">All</option>
              {def.partyFilter.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
        )}
        {def.warehouseFilter && (
          <label className="text-xs font-bold text-slate-600">Warehouse
            <input name="warehouse" defaultValue={f.warehouse} placeholder="All" list="rep-wh" className="ml-1 w-36 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-400" />
          </label>
        )}
        <label className="text-xs font-bold text-slate-600">Search:
          <input name="q" defaultValue={f.q} placeholder="" className="ml-1 w-36 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-400" />
        </label>
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Filter</button>
        {(f.from || f.to || f.party || f.warehouse || f.q) && (
          <a href={`/reports/${slug}`} className="text-xs font-semibold text-indigo-700 hover:underline">Clear</a>
        )}
        <span className="ml-auto text-xs text-slate-500">Showing {rows.length} rows</span>
      </form>

      <div className="slim-scroll overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>{def.cols.map((c) => (
              <th key={c.key} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${c.align === 'r' ? 'text-right' : 'text-left'}`}>{c.label}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={def.cols.length} className="px-3 py-8 text-center text-slate-400">No records for these filters</td></tr>}
            {rows.slice(0, 1000).map((r, i) => (
              <tr key={i} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                {def.cols.map((c) => (
                  <td key={c.key} className={`whitespace-nowrap px-3 py-2 text-slate-700 ${c.align === 'r' ? 'text-right tabular-nums' : ''}`}>
                    {c.money ? inr(r[c.key]) : String(r[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {(def.totals || []).length > 0 && rows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold">
                {def.cols.map((c, i) => (
                  <td key={c.key} className={`whitespace-nowrap px-3 py-2 ${c.align === 'r' ? 'text-right tabular-nums' : ''}`}>
                    {i === 0 ? 'Total' : def.totals!.includes(c.key) ? inr(totals[c.key]) : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {rows.length > 1000 && <p className="text-xs text-slate-500">Showing first 1000 of {rows.length} rows — refine filters or export for full data.</p>}
    </div>
  );
}
