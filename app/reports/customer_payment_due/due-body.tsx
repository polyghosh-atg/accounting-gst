'use client';

import { useRouter } from 'next/navigation';

export type DueRow = {
  customer: string; invoiced: number; paid: number; pending: number; custId: number | null;
};

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DueBody({ rows }: { rows: DueRow[] }) {
  const router = useRouter();
  const t = (k: 'invoiced' | 'paid' | 'pending') => rows.reduce((a, x) => a + x[k], 0);
  return (
    <>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r, i) => (
          <tr
            key={r.customer}
            onClick={() => r.custId && router.push(`/customers/${r.custId}`)}
            title={r.custId ? 'Click here to view customer details' : undefined}
            className={`${i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} ${r.custId ? 'cursor-pointer hover:bg-indigo-50/70' : ''}`}
          >
            <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{r.customer}</td>
            <td className="border border-slate-200 px-3 py-2 text-slate-700">{fmt(r.invoiced)}</td>
            <td className="border border-slate-200 px-3 py-2 text-slate-700">{fmt(r.paid)}</td>
            <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-900">{fmt(r.pending)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="bg-slate-50 text-base font-extrabold">
          <th className="border border-slate-200 px-3 py-2 text-left">Total</th>
          <th className="border border-slate-200 px-3 py-2 text-left tabular-nums">{fmt(t('invoiced'))}</th>
          <th className="border border-slate-200 px-3 py-2 text-left tabular-nums">{fmt(t('paid'))}</th>
          <th className="border border-slate-200 px-3 py-2 text-left tabular-nums">{fmt(t('pending'))}</th>
        </tr>
      </tfoot>
    </>
  );
}
