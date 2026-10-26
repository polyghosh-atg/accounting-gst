import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows, Badge } from '@/components/ui';
import { isoDate } from '../../docs/proforma_invoice/dates';

// Reads report data per request — must block on the server, no static shell.
export const instant = false;

function ReturnPage({ kind, title, icon, partyLabel, partyHref }: {
  kind: 'sales_return' | 'purchase_return'; title: string; icon: string; partyLabel: string; partyHref: (p: string) => string;
}) {
  return (
    <div className="space-y-4">
      <PageHeader
        title={`${icon} ${title}`}
        sub={`${partyLabel} returns with tax`}
        actions={
          <a href="/reports" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700">← All reports</a>
        }
      />
      <Suspense fallback={<LoadingRows />}>
        <Content kind={kind} partyLabel={partyLabel} partyHref={partyHref} icon={icon} />
      </Suspense>
    </div>
  );
}

async function Content({ kind, partyLabel, partyHref, icon }: { kind: string; partyLabel: string; partyHref: (p: string) => string; icon: string }) {
  const rows = await q(
    `SELECT ref_no, doc_date, party, discount, taxable, tax, total FROM doc_headers
     WHERE doc_type=$1 ORDER BY doc_date DESC LIMIT 2000`, [kind]);
  const num = (v: unknown) => Number(v ?? 0) || 0;
  const tTaxable = rows.reduce((a, r) => a + num(r.taxable), 0);
  const tTax = rows.reduce((a, r) => a + num(r.tax), 0);
  const tTotal = rows.reduce((a, r) => a + num(r.total), 0);
  const slug = kind === 'sales_return' ? 'sales_return' : 'purchase_return';
  const stats = [
    { label: kind === 'sales_return' ? 'Returns' : 'Returns', value: String(rows.length), grad: 'from-indigo-500 to-violet-600', icon: '↩️' },
    { label: 'Taxable', value: inr(tTaxable), grad: 'from-sky-500 to-cyan-600', icon: '💰' },
    { label: 'Tax', value: inr(tTax), grad: 'from-amber-500 to-orange-600', icon: '🧮' },
    { label: 'Grand Total', value: inr(tTotal), grad: 'from-rose-500 to-pink-600', icon: '✅' },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-base text-white shadow ${s.grad}`}>{s.icon}</div>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-500">{s.label}</div>
              <div className="truncate text-base font-extrabold tabular-nums text-slate-900">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 px-4 py-2.5">
          <h3 className="font-bold text-white">{icon} {rows.length} documents</h3>
          <a href={`/reports/${slug}/export`} className="ml-auto rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25">⤓ Export Excel</a>
        </div>
        <div className="slim-scroll overflow-x-auto p-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/95 via-slate-50/95 to-violet-50/95">
                {['Reference No', 'Return Date', partyLabel, 'Discount', 'Taxable', 'Tax', 'Total'].map((h, i) => (
                  <th key={h} className={`whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-800 ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i} className="transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                  <td className="whitespace-nowrap px-2 py-1.5 font-bold text-indigo-700">{String(r.ref_no)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{isoDate(r.doc_date) ?? ''}</td>
                  <td className="whitespace-nowrap px-2 py-1.5"><a href={partyHref(String(r.party ?? ''))} className="font-medium text-slate-800 hover:text-indigo-700 hover:underline">{String(r.party || '—')}</a></td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-500">{inr(r.discount)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-700">{inr(r.taxable)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-slate-500">{inr(r.tax)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right font-extrabold tabular-nums text-slate-900">{inr(r.total)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No returns found</td></tr>}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/60 text-sm font-extrabold">
                <td colSpan={3} className="px-2 py-2">Total <Badge tone="gray">{rows.length}</Badge></td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(rows.reduce((a, r) => a + num(r.discount), 0))}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(tTaxable)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(tTax)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{inr(tTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}

export function SalesReturn() {
  return ReturnPage({ kind: 'sales_return', title: 'Sales Return Report', icon: '↩️', partyLabel: 'Customer', partyHref: (p) => `/customers?q=${encodeURIComponent(p)}` });
}

export function PurchaseReturn() {
  return ReturnPage({ kind: 'purchase_return', title: 'Purchase Return Report', icon: '↩️', partyLabel: 'Supplier', partyHref: (p) => `/suppliers?q=${encodeURIComponent(p)}` });
}
