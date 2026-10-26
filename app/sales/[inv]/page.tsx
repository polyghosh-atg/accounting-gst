import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { Table } from '@/components/table';
import { PageHeader, Card, LoadingRows, Badge } from '@/components/ui';
import Link from 'next/link';

export default function SaleDetail({ params }: { params: Promise<{ inv: string }> }) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ inv: string }> }) {
  const { inv } = await params;
  const rows = await q('SELECT * FROM sales WHERE inv_no=$1', [decodeURIComponent(inv)]);
  if (!rows.length) return <div>Not found: {inv}</div>;
  const s = rows[0];
  const lines = await q('SELECT item_name, hsn, qty, free_qty, price, batch_no, discount, uom, taxable, tax_amt, subtotal FROM sale_lines WHERE sale_id=$1 ORDER BY id', [s.id]);
  const fields: [string, string][] = [
    ['Date', s.inv_date ? String(s.inv_date).slice(0, 10) : '—'],
    ['Customer', String(s.customer ?? '—')],
    ['Discount', inr(s.discount)],
    ['Taxable value', inr(s.taxable)],
    ['Tax', inr(s.tax)],
    ['TDS', inr(s.tds)],
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        title={`Tax Invoice ${String(s.inv_no)}`}
        sub={`${lines.length} line items`}
        actions={<>
          <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href="/sales">← Sales</Link>
          {Number(s.due) > 0 ? <Badge tone="amber">Due {inr(s.due)}</Badge> : <Badge tone="green">Paid</Badge>}
        </>}
      />
      <Card>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {fields.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-1.5 sm:block">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-slate-200 pt-3 text-sm">
          <span>Total <b className="tabular-nums">{inr(s.total)}</b></span>
          <span className="text-slate-500">Paid {inr(s.paid)}</span>
          <span className="font-semibold">Due {inr(s.due)}</span>
        </div>
      </Card>
      <div>
        <h2 className="mb-2 font-bold text-slate-900">Items ({lines.length})</h2>
        <Table
          heads={['Item', 'HSN', 'Qty', 'Free', 'Price', 'Batch', 'Disc', 'UOM', 'Taxable', 'Tax', 'Subtotal']}
          align={['l', 'l', 'r', 'r', 'r', 'l', 'r', 'l', 'r', 'r', 'r']}
          rows={lines.map((L) => [String(L.item_name) || '—', String(L.hsn), String(L.qty), String(L.free_qty), inr(L.price), String(L.batch_no), inr(L.discount), String(L.uom), inr(L.taxable), inr(L.tax_amt), <b key="s">{inr(L.subtotal)}</b>])} />
      </div>
    </div>
  );
}
