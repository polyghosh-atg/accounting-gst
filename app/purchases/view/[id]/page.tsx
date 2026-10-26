import { q, inr } from '@/lib/db';
import { PageHeader, Badge } from '@/components/ui';
import { Table } from '@/components/table';
import { isoDate } from '../../../docs/proforma_invoice/dates';

// Reads the purchase from DB — must block on the server, no static shell.
export const instant = false;

export default async function PurchaseView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await q(`SELECT * FROM purchases WHERE id=$1`, [id]);
  const d = h[0];
  if (!d) return <div>Not found. <a className="text-indigo-700 hover:underline" href="/purchases">Back to list</a></div>;
  const lines = await q('SELECT * FROM purchase_lines WHERE purchase_id=$1 ORDER BY id', [String(id)]);
  const dstr = isoDate(d.purchase_date) ?? '—';
  const dueN = Number(d.due ?? 0);
  return (
    <div className="space-y-4">
      <PageHeader
        title={`🛒 ${String(d.po_no || d.inv_no || `#${id}`)}`}
        sub={`${dstr} · ${String(d.supplier || '')}${d.warehouse ? ` · ${String(d.warehouse)}` : ''}`}
        actions={
          <a href="/purchases" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700">← Back to list</a>
        }
      />
      <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-sm shadow-sm sm:grid-cols-5">
        {[['PO No', String(d.po_no || '—')], ['Invoice No', String(d.inv_no || '—')], ['Date', dstr], ['Warehouse', String(d.warehouse || '—')], ['Supplier', String(d.supplier || '—')]].map(([k, v]) => (
          <div key={k}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k}</div>
            <div className="font-bold text-slate-900">{v}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Paid <b className="tabular-nums text-emerald-700">{inr(d.paid)}</b></span>
        <span className="text-sm text-slate-500">Due {dueN > 0 ? <b className="tabular-nums text-rose-700">{inr(d.due)}</b> : <Badge tone="green">Paid</Badge>}</span>
        {String(d.delivery_status || '') && <Badge tone="blue">{String(d.delivery_status)}</Badge>}
      </div>
      <Table compact heads={['#', 'Item', 'Qty', 'Cost', 'Taxable', 'Subtotal']} align={['r', 'l', 'r', 'r', 'r', 'r']}
        rows={lines.map((l, i) => [
          <span key="n" className="text-slate-400">{String(i + 1)}</span>,
          <span key="i" className="font-semibold text-slate-800">{String(l.item_name)}</span>,
          <Badge key="q" tone="blue">× {String(l.qty)}</Badge>,
          inr(l.cost), inr(l.taxable), <b key="s">{inr(l.subtotal)}</b>,
        ])} />
      <div className="ml-auto w-full max-w-xs space-y-1.5 rounded-2xl border border-slate-200/80 bg-white p-4 text-sm shadow-sm">
        <div className="flex justify-between text-slate-600"><span>Discount</span><span className="tabular-nums">{inr(d.discount)}</span></div>
        <div className="flex justify-between text-slate-600"><span>Taxable</span><b className="tabular-nums">{inr(d.taxable)}</b></div>
        <div className="flex justify-between text-slate-600"><span>Tax</span><span className="tabular-nums">{inr(d.tax)}</span></div>
        <div className="flex justify-between border-t border-slate-100 pt-1.5 text-base font-extrabold text-slate-900"><span>Total</span><span className="tabular-nums">{inr(d.total)}</span></div>
      </div>
    </div>
  );
}
