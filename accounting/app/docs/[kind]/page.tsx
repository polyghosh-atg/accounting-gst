import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { Table } from '@/components/table';
import { PageHeader, LoadingRows, Badge, statusTone } from '@/components/ui';
const TITLES: Record<string, string> = {
  quotation: 'Quotations', proforma_invoice: 'Proforma Invoices', sales_return: 'Sales Returns',
  purchase_return: 'Purchase Returns', purchase_order: 'Purchase Orders', transfer: 'Transfers',
};
export default function Docs({ params }: { params: Promise<{ kind: string }> }) {
  return (<div className="space-y-4">
    <Suspense fallback={<LoadingRows />}><Content params={params} /></Suspense></div>);
}
async function Content({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const rows = await q('SELECT ref_no, doc_date, party, taxable, discount, tax, total, status FROM doc_headers WHERE doc_type=$1 ORDER BY id DESC', [kind]);
  const lines = await q('SELECT line_no, item_name, qty, price, taxable, subtotal FROM doc_lines WHERE doc_type=$1 ORDER BY doc_legacy_id, line_no LIMIT 200', [kind]);
  return (<>
    <PageHeader title={TITLES[kind] ?? kind} sub={`${rows.length} documents · ${lines.length}+ lines`} />
    <Table heads={['Ref', 'Date', 'Party', 'Taxable', 'Discount', 'Tax', 'Total', 'Status']}
      align={['l', 'l', 'l', 'r', 'r', 'r', 'r', 'l']}
      rows={rows.map((r) => [<b key="r">{String(r.ref_no)}</b>, r.doc_date ? String(r.doc_date).slice(0, 10) : '', String(r.party), inr(r.taxable), inr(r.discount), inr(r.tax), <b key="t">{inr(r.total)}</b>,
        r.status ? <Badge key="s" tone={statusTone(String(r.status))}>{String(r.status)}</Badge> : <span className="text-slate-300">—</span>])} />
    <h2 className="pt-1 font-bold text-slate-900">Lines (first 200)</h2>
    <Table heads={['#', 'Item', 'Qty', 'Price', 'Taxable', 'Subtotal']} align={['r', 'l', 'r', 'r', 'r', 'r']}
      rows={lines.map((r) => [String(r.line_no), String(r.item_name), String(r.qty), inr(r.price), inr(r.taxable), inr(r.subtotal)])} />
  </>);
}
