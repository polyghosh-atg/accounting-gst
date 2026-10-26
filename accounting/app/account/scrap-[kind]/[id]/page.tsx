import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import Link from 'next/link';

const KIND = { entry: 'Scrap Entry', issue: 'Scrap Issue', receive: 'Scrap Receive' } as const;

export default function ScrapDetail({ params }: { params: Promise<{ kind: string; id: string }> }) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const p = await params;
  const kind = p.kind.replace('scrap-', '');
  const rows = await q('SELECT * FROM scrap_docs WHERE id=$1 AND kind=$2', [p.id, kind]);
  if (!rows.length) return <div>Not found.</div>;
  const d = rows[0];
  const lines = await q('SELECT product, batch_no, qty, cost, price FROM scrap_lines WHERE doc_id=$1 ORDER BY id', [p.id]);
  const qty = lines.reduce((a, l) => a + Number(l.qty || 0), 0);
  const amt = lines.reduce((a, l) => a + Number(l.qty || 0) * Number(l.price || 0), 0);
  return (
    <div className="space-y-4">
      <PageHeader
        title={`${KIND[kind as keyof typeof KIND] || 'Scrap'} — ${String(d.ref_no)}`}
        sub={`${d.entry_date ? String(d.entry_date).slice(0, 10) : ''} · ${String(d.warehouse || '')} · ${String(d.party || '')}`}
        actions={<Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href={`/account/scrap-${kind}`}>← List</Link>}
      />
      <div className="slim-scroll overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>{['Product', 'Batch No', 'Quantity', 'Cost (Rs)', 'Price (Rs)', 'Total'].map((h, i) => (
              <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l, i) => (
              <tr key={i} className="odd:bg-white even:bg-slate-50/50">
                <td className="px-3 py-2 font-medium">{String(l.product)}</td>
                <td className="px-3 py-2 font-mono text-xs">{String(l.batch_no)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{String(l.qty)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{inr(l.cost)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{inr(l.price)}</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums">{inr(Number(l.qty || 0) * Number(l.price || 0))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold">
              <td className="px-3 py-2" colSpan={2}>Total ({lines.length} products)</td>
              <td className="px-3 py-2 text-right tabular-nums">{qty}</td>
              <td className="px-3 py-2" colSpan={2}></td>
              <td className="px-3 py-2 text-right tabular-nums">{inr(amt)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
