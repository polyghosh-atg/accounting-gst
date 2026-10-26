import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { Table, Pager } from '@/components/table';
import { PageHeader, LoadingRows, Badge } from '@/components/ui';
const PER = 50;
export default function Purchases({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return (<div>
    <PageHeader title="Purchases" sub="Supplier bills with payments & delivery" />
    <Suspense fallback={<LoadingRows />}><Content searchParams={searchParams} /></Suspense></div>);
}
async function Content({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, parseInt((await searchParams).page ?? '1', 10));
  const [{ c }] = await q<{ c: string }>('SELECT count(*) c FROM purchases');
  const rows = await q('SELECT po_no, inv_no, purchase_date, supplier, discount, taxable, tax, total, paid, due FROM purchases ORDER BY id DESC LIMIT $1 OFFSET $2', [PER, (page - 1) * PER]);
  return (<>
    <Pager page={page} total={Number(c)} per={PER} />
    <Table heads={['PO No', 'Invoice', 'Date', 'Supplier', 'Discount', 'Taxable', 'Tax', 'Total', 'Paid', 'Due']}
      align={['l', 'l', 'l', 'l', 'r', 'r', 'r', 'r', 'r', 'r']}
      rows={rows.map((r) => [String(r.po_no), String(r.inv_no), r.purchase_date ? String(r.purchase_date).slice(0, 10) : '', String(r.supplier), inr(r.discount), inr(r.taxable), inr(r.tax), <b key="t">{inr(r.total)}</b>, inr(r.paid),
        Number(r.due) > 0 ? <Badge key="d" tone="amber">{inr(r.due)}</Badge> : inr(r.due)])} />
  </>);
}
