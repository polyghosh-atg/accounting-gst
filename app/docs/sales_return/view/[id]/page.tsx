import { q, inr } from '@/lib/db';
import { PageHeader, Badge } from '@/components/ui';
import { Table } from '@/components/table';
import { isoDate } from '../../../proforma_invoice/dates';

// Reads the return from DB — must block on the server, no static shell.
export const instant = false;

export default async function SalesReturnView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await q(`SELECT * FROM doc_headers WHERE id=$1 AND doc_type='sales_return'`, [id]);
  const d = h[0];
  if (!d) return <div>Not found. <a className="text-indigo-700 hover:underline" href="/reports/sales_return">Back to report</a></div>;
  const lines = await q('SELECT * FROM doc_lines WHERE doc_type=$1 AND doc_legacy_id=$2 ORDER BY line_no', ['sales_return', String(d.legacy_id ?? id)]);
  const dstr = isoDate(d.doc_date) ?? '—';
  return (
    <div className="space-y-4">
      <PageHeader
        title={`↩️ ${String(d.ref_no)}`}
        sub={`${dstr} · ${String(d.party || '')}${d.warehouse ? ` · ${String(d.warehouse)}` : ''}${d.invoice_no ? ` · inv ${String(d.invoice_no)}` : ''}`}
        actions={
          <a href="/reports/sales_return" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700">← Back to report</a>
        }
      />
      <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-sm shadow-sm sm:grid-cols-4">
        {[['Reference', String(d.ref_no)], ['Invoice No', String(d.invoice_no || '—')], ['Date', dstr], ['Warehouse', String(d.warehouse || '—')], ['Customer', String(d.party || '—')], ['Status', 'Returned']].map(([k, v]) => (
          <div key={k}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k}</div>
            <div className="font-bold text-slate-900">{v}</div>
          </div>
        ))}
      </div>
      <Table compact heads={['#', 'Item', 'HSN', 'Qty', 'Price', 'Taxable', 'Subtotal']} align={['r', 'l', 'l', 'r', 'r', 'r', 'r']}
        rows={lines.map((l) => [
          <span key="n" className="text-slate-400">{String(l.line_no)}</span>,
          <span key="i" className="font-semibold text-slate-800">{String(l.item_name)}</span>,
          <span key="h" className="font-mono text-slate-600">{String(l.hsn ?? '')}</span>,
          <Badge key="q" tone="blue">× {String(l.qty)}</Badge>,
          inr(l.price), inr(l.taxable), <b key="s">{inr(l.subtotal)}</b>,
        ])} />
      <div className="ml-auto w-full max-w-xs space-y-1.5 rounded-2xl border border-slate-200/80 bg-white p-4 text-sm shadow-sm">
        <div className="flex justify-between text-slate-600"><span>Discount</span><span className="tabular-nums">{inr(d.discount)}</span></div>
        <div className="flex justify-between text-slate-600"><span>Taxable</span><b className="tabular-nums">{inr(d.taxable)}</b></div>
        <div className="flex justify-between text-slate-600"><span>IGST</span><span className="tabular-nums">{inr(d.igst)}</span></div>
        <div className="flex justify-between text-slate-600"><span>CGST</span><span className="tabular-nums">{inr(d.cgst)}</span></div>
        <div className="flex justify-between text-slate-600"><span>SGST</span><span className="tabular-nums">{inr(d.sgst)}</span></div>
        <div className="flex justify-between border-t border-slate-100 pt-1.5 text-base font-extrabold text-slate-900"><span>Total</span><span className="tabular-nums">{inr(d.total)}</span></div>
      </div>
    </div>
  );
}
