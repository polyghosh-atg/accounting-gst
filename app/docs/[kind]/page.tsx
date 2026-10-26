import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { Table } from '@/components/table';
import { PageHeader, LoadingRows, Badge, statusTone } from '@/components/ui';
const TITLES: Record<string, string> = {
  quotation: 'Quotations', proforma_invoice: 'Proforma Invoices', sales_return: 'Sales Returns',
  purchase_return: 'Purchase Returns', purchase_order: 'Purchase Orders', transfer: 'Transfers',
};
const ICONS: Record<string, string> = {
  quotation: '📝', proforma_invoice: '🧾', sales_return: '↩️',
  purchase_return: '↩️', purchase_order: '📋', transfer: '🔀',
};
export default function Docs({ params }: { params: Promise<{ kind: string }> }) {
  return (<div className="space-y-4">
    <Suspense fallback={<LoadingRows />}><Content params={params} /></Suspense></div>);
}
async function Content({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const rows = await q('SELECT ref_no, doc_date, party, taxable, discount, tax, total, status FROM doc_headers WHERE doc_type=$1 ORDER BY id DESC', [kind]);
  const lines = await q('SELECT line_no, item_name, qty, price, taxable, subtotal FROM doc_lines WHERE doc_type=$1 ORDER BY doc_legacy_id, line_no LIMIT 200', [kind]);
  const num = (v: unknown) => Number(v ?? 0) || 0;
  const tTaxable = rows.reduce((a, r) => a + num(r.taxable), 0);
  const tTax = rows.reduce((a, r) => a + num(r.tax), 0);
  const tTotal = rows.reduce((a, r) => a + num(r.total), 0);
  const stats = [
    { label: 'Documents', value: String(rows.length), grad: 'from-indigo-500 to-violet-600', icon: '📄' },
    { label: 'Taxable', value: inr(tTaxable), grad: 'from-sky-500 to-cyan-600', icon: '💰' },
    { label: 'Tax', value: inr(tTax), grad: 'from-amber-500 to-orange-600', icon: '🧮' },
    { label: 'Grand Total', value: inr(tTotal), grad: 'from-emerald-500 to-teal-600', icon: '✅' },
  ];
  return (<>
    <PageHeader title={`${ICONS[kind] ?? '📄'} ${TITLES[kind] ?? kind}`} sub={`${rows.length} documents · ${lines.length}+ lines`} />
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-md">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-base text-white shadow ${s.grad}`}>{s.icon}</div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
            <div className="truncate text-base font-extrabold tabular-nums text-slate-900">{s.value}</div>
          </div>
        </div>
      ))}
    </div>
    <Table compact heads={['Ref', 'Date', 'Party', 'Taxable', 'Discount', 'Tax', 'Total', 'Status']}
      align={['l', 'l', 'l', 'r', 'r', 'r', 'r', 'l']}
      rows={rows.map((r) => {
        const party = String(r.party || '—');
        return [
          <span key="r" className="font-bold text-indigo-700">{String(r.ref_no)}</span>,
          <span key="d" className="text-slate-400">{r.doc_date ? String(r.doc_date).slice(0, 10) : ''}</span>,
          <span key="p" className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[10px] font-bold text-white">
              {party.charAt(0).toUpperCase()}
            </span>
            <span className="font-medium text-slate-800">{party}</span>
          </span>,
          inr(r.taxable), inr(r.discount), inr(r.tax),
          <b key="t" className="text-slate-900">{inr(r.total)}</b>,
          r.status ? <Badge key="s" tone={statusTone(String(r.status))}>{String(r.status)}</Badge> : <span className="text-slate-300">—</span>,
        ];
      })} />
    <div className="flex items-center gap-2 pt-1">
      <h2 className="font-bold text-slate-900">📦 Lines</h2>
      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200">first {lines.length}</span>
    </div>
    <Table compact heads={['#', 'Item', 'Qty', 'Price', 'Taxable', 'Subtotal']} align={['r', 'l', 'r', 'r', 'r', 'r']}
      rows={lines.map((r) => [
        <span key="n" className="text-slate-400">{String(r.line_no)}</span>,
        <span key="i" className="font-semibold text-slate-800">{String(r.item_name)}</span>,
        <Badge key="q" tone="blue">× {String(r.qty)}</Badge>,
        inr(r.price), inr(r.taxable),
        <b key="s">{inr(r.subtotal)}</b>,
      ])} />
  </>);
}
