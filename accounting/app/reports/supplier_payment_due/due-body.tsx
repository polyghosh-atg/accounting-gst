'use client';

import { useRouter } from 'next/navigation';

export type DueRow = {
  supplier: string; invoiced: number; paid: number; pending: number; suppId: number | null;
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
            key={r.supplier}
            onClick={() => r.suppId && router.push(`/suppliers/${r.suppId}`)}
            title={r.suppId ? 'Click here to view supplier details' : undefined}
            className={`${i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} ${r.suppId ? 'cursor-pointer hover:bg-indigo-50/70' : ''}`}
          >
            <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{r.supplier}</td>
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
