import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, Card, LoadingRows, Badge } from '@/components/ui';
import { CustomerButtons, type Customer } from '@/components/customer-modals';
import Link from 'next/link';

const TABS = [
  { key: 'sale', label: 'Sale List' },
  { key: 'quotation', label: 'Quotation List' },
  { key: 'return', label: 'Sales Return' },
  { key: 'proforma', label: 'Proforma Invoice' },
] as const;

export default function CustomerDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function Block({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-400">{title}</div>
      <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-1.5 text-sm">
            <dt className="shrink-0 text-slate-500">{k}</dt>
            <dd className="truncate text-right font-medium">{v || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DocTable({ heads, rows, align }: { heads: string[]; rows: React.ReactNode[][]; align?: ('l' | 'r')[] }) {
  return (
    <div className="slim-scroll overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-slate-50/95">
          <tr>{heads.map((h, i) => (
            <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${align?.[i] === 'r' ? 'text-right' : 'text-left'}`}>{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && <tr><td colSpan={heads.length} className="px-3 py-8 text-center text-slate-400">No records</td></tr>}
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
              {r.map((c, j) => (
                <td key={j} className={`whitespace-nowrap px-3 py-2 text-slate-700 ${align?.[j] === 'r' ? 'text-right tabular-nums' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Content({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const tab = (await searchParams).tab || 'sale';
  const rows = await q<Customer>('SELECT * FROM customers WHERE id=$1', [id]);
  if (!rows.length) return <div>Not found. <Link className="text-indigo-700" href="/customers">Back</Link></div>;
  const c = rows[0];
  const name = c.company_name;

  const sales = await q(
    `SELECT s.inv_no, s.inv_date, s.discount, s.taxable, s.tds, s.total, s.paid, s.due,
       COALESCE(L.i,0) igst, COALESCE(L.g,0) cgst, COALESCE(L.t,0) sgst
     FROM sales s LEFT JOIN (
       SELECT sale_id, SUM(igst_tax) i, SUM(cgst_tax) g, SUM(sgst_tax) t FROM sale_lines GROUP BY sale_id
     ) L ON L.sale_id = s.id
     WHERE s.customer=$1 ORDER BY s.id DESC`, [name]);

  const docs = await q(
    `SELECT doc_type, ref_no, doc_date, discount, taxable, tax, total, status FROM doc_headers
     WHERE party=$1 AND doc_type IN ('quotation','sales_return','proforma_invoice') ORDER BY id DESC`, [name]);
  const quot = docs.filter((d) => d.doc_type === 'quotation');
  const rets = docs.filter((d) => d.doc_type === 'sales_return');
  const prof = docs.filter((d) => d.doc_type === 'proforma_invoice');

  const s = await q<{ n: string; t: string; p: string; d: string }>(
    `SELECT count(*) n, COALESCE(SUM(total),0) t, COALESCE(SUM(paid),0) p, COALESCE(SUM(due),0) d FROM sales WHERE customer=$1`, [name]
  ).then((r) => r[0]);

  const R = ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r'] as ('l' | 'r')[];
  return (
    <div className="space-y-4">
      <PageHeader
        title={`View Customer — ${name}`}
        sub={`${c.city ? c.city + ', ' : ''}${c.state || ''} ${c.country || ''}`}
        actions={<>
          <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href="/customers">← Customers</Link>
          <CustomerButtons c={c} />
        </>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Block title="Personal Details" rows={[
            ['Customer Name', c.name], ['GSTIN/UIN of Recipient', c.gstin], ['Email', c.email], ['Phone', c.phone],
          ]} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Block title="Billing Details" rows={[
              ['Country', c.country], ['State', c.state], ['City', c.city], ['Pincode', c.pincode], ['Address', c.address],
            ]} />
            <Block title="Shipping Details" rows={[
              ['Country', c.ship_country], ['State', c.ship_state], ['City', c.ship_city], ['Pincode', c.ship_pincode], ['Address', c.ship_address],
            ]} />
          </div>
        </Card>
        <Card>
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Receivable</div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums">{inr(s.d)}</div>
          <div className="text-xs text-slate-500">{s.n} invoices · invoiced {inr(s.t)} · paid {inr(s.p)}</div>
        </Card>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/customers/${id}?tab=${t.key}`}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition ${tab === t.key ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'sale' && (
        <DocTable
          heads={['Invoice No', 'Invoice Date', 'Discount (Rs)', 'Taxable (Rs)', 'TDS (Rs)', 'IGST', 'CGST', 'SGST', 'Total (Rs)']}
          align={R}
          rows={sales.map((r) => [
            <a key="i" className="font-semibold text-indigo-700 hover:underline" href={`/sales/${r.inv_no}`}>{String(r.inv_no)}</a>,
            r.inv_date ? String(r.inv_date).slice(0, 10) : '', inr(r.discount), inr(r.taxable), inr(r.tds),
            inr(r.igst), inr(r.cgst), inr(r.sgst), <b key="t">{inr(r.total)}</b>,
          ])}
        />
      )}
      {tab === 'quotation' && (
        <DocTable
          heads={['Reference No', 'Quotation Date', 'Discount (Rs)', 'Taxable (Rs)', 'Tax (Rs)', 'Total (Rs)', 'Status']}
          align={['l', 'l', 'r', 'r', 'r', 'r', 'l']}
          rows={quot.map((r) => [String(r.ref_no), r.doc_date ? String(r.doc_date).slice(0, 10) : '', inr(r.discount), inr(r.taxable), inr(r.tax), <b key="t">{inr(r.total)}</b>, String(r.status || '—')])}
        />
      )}
      {tab === 'return' && (
        <DocTable
          heads={['Reference No', 'Return Date', 'Discount (Rs)', 'Taxable (Rs)', 'Tax (Rs)', 'Total (Rs)', 'Status']}
          align={['l', 'l', 'r', 'r', 'r', 'r', 'l']}
          rows={rets.map((r) => [String(r.ref_no), r.doc_date ? String(r.doc_date).slice(0, 10) : '', inr(r.discount), inr(r.taxable), inr(r.tax), <b key="t">{inr(r.total)}</b>, String(r.status || '—')])}
        />
      )}
      {tab === 'proforma' && (
        <DocTable
          heads={['Invoice No', 'Invoice Date', 'Discount (Rs)', 'Taxable (Rs)', 'Tax (Rs)', 'Total (Rs)']}
          align={['l', 'l', 'r', 'r', 'r', 'r']}
          rows={prof.map((r) => [String(r.ref_no), r.doc_date ? String(r.doc_date).slice(0, 10) : '', inr(r.discount), inr(r.taxable), inr(r.tax), <b key="t">{inr(r.total)}</b>])}
        />
      )}
      {tab === 'sale' && sales.length > 0 && (
        <p className="text-xs text-slate-500">{sales.length} invoices · due {inr(s.d)} {Number(s.d) > 0 ? <Badge tone="amber">receivable</Badge> : <Badge tone="green">settled</Badge>}</p>
      )}
    </div>
  );
}
