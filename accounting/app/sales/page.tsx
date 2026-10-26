import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { Table, Pager } from '@/components/table';
import { PageHeader, LoadingRows, Badge, statusTone } from '@/components/ui';
import Link from 'next/link';

const PER = 50;

export default function Sales({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return (
    <div>
      <PageHeader title="Sales" sub="Tax invoices with payments & delivery status" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, parseInt((await searchParams).page ?? '1', 10));
  const [{ c }] = await q<{ c: string }>('SELECT count(*) c FROM sales');
  const rows = await q('SELECT inv_no, inv_date, customer, discount, taxable, tax, total, paid, due, delivery_status FROM sales ORDER BY id DESC LIMIT $1 OFFSET $2', [PER, (page - 1) * PER]);
  return (
    <>
      <Pager page={page} total={Number(c)} per={PER} />
      <Table
        heads={['Invoice', 'Date', 'Customer', 'Discount', 'Taxable', 'Tax', 'Total', 'Paid', 'Due', 'Delivery']}
        align={['l', 'l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'l']}
        rows={rows.map((r) => [
          <Link key="i" className="font-semibold text-indigo-700 hover:underline" href={`/sales/${r.inv_no}`}>{String(r.inv_no)}</Link>,
          r.inv_date ? String(r.inv_date).slice(0, 10) : '', String(r.customer ?? ''), inr(r.discount), inr(r.taxable), inr(r.tax),
          <b key="t">{inr(r.total)}</b>, inr(r.paid),
          Number(r.due) > 0 ? <Badge key="d" tone="amber">{inr(r.due)}</Badge> : inr(r.due),
          r.delivery_status ? <Badge key="s" tone={statusTone(String(r.delivery_status))}>{String(r.delivery_status)}</Badge> : <span className="text-slate-300">—</span>])} />
    </>
  );
}
