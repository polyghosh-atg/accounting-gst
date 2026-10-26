import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';

// Reads report data per request — must block on the server, no static shell.
export const instant = false;

export default function Payable() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Payable"
        sub="Supplier-wise invoice, paid & payable"
        actions={
          <a href="/reports" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700">← Reports</a>
        }
      />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const rows = await q(
    `SELECT p.supplier, max(s.gstin) gstin, MAX(s.email) email, MAX(s.phone) phone,
       COALESCE(SUM(p.total),0) invoiced, COALESCE(SUM(p.paid),0) paid,
       COALESCE(SUM(p.due),0) payable, count(*) bills
     FROM purchases p LEFT JOIN suppliers s ON s.company_name=p.supplier
     WHERE EXISTS (SELECT 1 FROM purchases p2 WHERE p2.supplier=p.supplier AND p2.due > 0)
     GROUP BY p.supplier ORDER BY payable DESC`);
  const num = (v: unknown) => Number(v ?? 0) || 0;
  const tInv = rows.reduce((a, r) => a + num(r.invoiced), 0);
  const tPaid = rows.reduce((a, r) => a + num(r.paid), 0);
  const tDue = rows.reduce((a, r) => a + num(r.payable), 0);
  const stats = [
    { label: 'Total Billed', value: inr(tInv), grad: 'from-violet-500 to-purple-600', icon: '📦' },
    { label: 'Total Paid', value: inr(tPaid), grad: 'from-emerald-500 to-teal-600', icon: '✅' },
    { label: 'Payable Due', value: inr(tDue), grad: 'from-rose-500 to-pink-600', icon: '🐷' },
  ];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl text-white shadow ${s.grad}`}>{s.icon}</div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-slate-500">{s.label}</div>
              <div className="truncate text-xl font-extrabold tabular-nums text-slate-900">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 px-4 py-2.5">
          <h3 className="font-bold text-white">🐷 Payable · {rows.length} suppliers</h3>
          <div className="ml-auto">
            <a href="/reports/payable/export"
              className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25">
              ⤓ Export
            </a>
          </div>
        </div>
        <div className="slim-scroll overflow-x-auto p-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/95 via-slate-50/95 to-violet-50/95">
                {['Supplier', 'GSTIN', 'Email', 'Phone', 'Bills', 'Invoiced', 'Paid', 'Payable', 'Paid %'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-800">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((x, i) => {
                const inv = num(x.invoiced);
                const pd = num(x.paid);
                const pct = inv > 0 ? Math.min(100, Math.round((pd / inv) * 100)) : 0;
                const sup = String(x.supplier ?? '');
                return (
                  <tr key={sup || i} className="transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                    <td className="whitespace-nowrap px-2 py-1.5">
                      <a href={`/suppliers?q=${encodeURIComponent(sup)}`} className="flex items-center gap-1.5 font-bold text-slate-900 hover:text-indigo-700 hover:underline">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-[10px] font-bold text-white">
                          {sup.charAt(0).toUpperCase()}
                        </span>
                        {sup}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-slate-600">{String(x.gstin ?? '') || '—'}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{String(x.email ?? '') || '—'}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{String(x.phone ?? '') || '—'}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-slate-600">{String(x.bills)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-slate-700">{inr(x.invoiced)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-semibold tabular-nums text-emerald-700">{inr(x.paid)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-extrabold tabular-nums text-rose-700">{inr(x.payable)}</td>
                    <td className="min-w-24 px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" />
                        </div>
                        <span className="text-[11px] font-bold tabular-nums text-slate-500">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">No payables — all suppliers settled</td></tr>}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/60 text-sm font-extrabold">
                <td colSpan={5} className="px-2 py-2">Total</td>
                <td className="whitespace-nowrap px-2 py-2 tabular-nums">{inr(tInv)}</td>
                <td className="whitespace-nowrap px-2 py-2 tabular-nums text-emerald-700">{inr(tPaid)}</td>
                <td className="whitespace-nowrap px-2 py-2 tabular-nums text-rose-700">{inr(tDue)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
