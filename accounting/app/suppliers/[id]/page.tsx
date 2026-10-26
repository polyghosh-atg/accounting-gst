import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, Card, LoadingRows, Badge } from '@/components/ui';
import { SupplierButtons, type Supplier } from '@/components/supplier-modals';
import Link from 'next/link';

const TABS = [
  { key: 'purchase', label: 'Purchase List' },
  { key: 'order', label: 'Purchase Order List' },
  { key: 'return', label: 'Purchase Return List' },
  { key: 'expense', label: 'Expense List' },
] as const;

export default function SupplierDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-2 text-sm">
          <dt className="w-36 shrink-0 text-slate-500">{k}</dt>
          <dd className="truncate text-right font-medium">{v || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function DocTable({ heads, rows, align, foot }: {
  heads: string[]; rows: React.ReactNode[][]; align?: ('l' | 'r')[]; foot?: string[];
}) {
  return (
    <div className="slim-scroll overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-slate-50/95">
          <tr>{heads.map((h, i) => (
            <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${align?.[i] === 'r' ? 'text-right' : 'text-left'}`}>{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && <tr><td colSpan={heads.length} className="px-3 py-8 text-center text-slate-400">No Record(s) are available.</td></tr>}
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
              {r.map((c, j) => (
                <td key={j} className={`whitespace-nowrap px-3 py-2 text-slate-700 ${align?.[j] === 'r' ? 'text-right tabular-nums' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr className="bg-slate-50 font-bold tabular-nums">
              {foot.map((f, i) => <td key={i} className="whitespace-nowrap px-3 py-2 text-right">{f}</td>)}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

const sum = (rows: Record<string, string>[], k: string) =>
  inr(rows.reduce((a, r) => a + Number(r[k] || 0), 0));

async function Content({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const tab = (await searchParams).tab || 'purchase';
  const rows = await q<Supplier>('SELECT * FROM suppliers WHERE id=$1', [id]);
  if (!rows.length) return <div>Not found. <Link className="text-indigo-700" href="/suppliers">Back</Link></div>;
  const s = rows[0];
  const name = s.company_name;

  const purch = await q(
    'SELECT po_no, inv_no, purchase_date, warehouse, discount, taxable, tax, total, paid, due FROM purchases WHERE supplier=$1 ORDER BY id DESC', [name]);
  const docs = await q(
    `SELECT doc_type, ref_no, doc_date, discount, taxable, tax, total, status FROM doc_headers
     WHERE party=$1 AND doc_type IN ('purchase_order','purchase_return') ORDER BY id DESC`, [name]);
  const orders = docs.filter((d) => d.doc_type === 'purchase_order');
  const rets = docs.filter((d) => d.doc_type === 'purchase_return');
  const exp = await q(
    'SELECT bill_date, category, supplier, taxable, cgst, sgst, igst, total, paid, due, remarks FROM expenses WHERE supplier=$1 ORDER BY bill_date DESC', [name]);

  const pay = await q<{ n: string; t: string; p: string; d: string }>(
    `SELECT count(*) n, COALESCE(SUM(total),0) t, COALESCE(SUM(paid),0) p, COALESCE(SUM(due),0) d FROM purchases WHERE supplier=$1`, [name]
  ).then((r) => r[0]);

  const R = ['l', 'l', 'l', 'l', 'r', 'r', 'r', 'r'] as ('l' | 'r')[];
  return (
    <div className="space-y-4">
      <PageHeader
        title={`View Supplier — ${name}`}
        sub={`${s.city ? '' : ''}${s.state || ''} ${s.country || ''}`}
        actions={<>
          <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href="/suppliers">← Suppliers</Link>
          <SupplierButtons s={s} />
        </>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Facts rows={[
            ['Company Name', name], ['Registration Type', s.reg_type], ['GSTIN', s.gstin],
            ['Email', s.email], ['Phone', s.phone], ['Address', s.address],
            ['Country', s.country], ['State', s.state], ['City', s.city || ''],
            ['Website', s.website || ''],
          ]} />
        </Card>
        <Card>
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Payable</div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums">{inr(pay.d)}</div>
          <div className="text-xs text-slate-500">{pay.n} purchases · billed {inr(pay.t)} · paid {inr(pay.p)}</div>
        </Card>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/suppliers/${id}?tab=${t.key}`}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition ${tab === t.key ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'purchase' && (
        <DocTable
          heads={['PO No.', 'Invoice No', 'Purchase Date', 'Warehouse', 'Discount (Rs)', 'Taxable (Rs)', 'Tax (Rs)', 'Total (Rs)', 'Paid', 'Due']}
          align={['l', 'l', 'l', 'l', 'r', 'r', 'r', 'r', 'r', 'r']}
          rows={purch.map((r) => [String(r.po_no), String(r.inv_no), r.purchase_date ? String(r.purchase_date).slice(0, 10) : '', String(r.warehouse || ''),
            inr(r.discount), inr(r.taxable), inr(r.tax), <b key="t">{inr(r.total)}</b>, inr(r.paid),
            Number(r.due) > 0 ? <Badge key="d" tone="amber">{inr(r.due)}</Badge> : inr(r.due)])}
          foot={['', '', '', '', sum(purch, 'discount'), sum(purch, 'taxable'), sum(purch, 'tax'), sum(purch, 'total'), sum(purch, 'paid'), sum(purch, 'due')]}
        />
      )}
      {tab === 'order' && (
        <DocTable
          heads={['PO No.', 'Order Date', 'Discount (Rs)', 'Taxable (Rs)', 'Tax (Rs)', 'Total (Rs)']}
          align={['l', 'l', 'r', 'r', 'r', 'r']}
          rows={orders.map((r) => [String(r.ref_no), r.doc_date ? String(r.doc_date).slice(0, 10) : '', inr(r.discount), inr(r.taxable), inr(r.tax), <b key="t">{inr(r.total)}</b>])}
          foot={['', '', sum(orders, 'discount'), sum(orders, 'taxable'), sum(orders, 'tax'), sum(orders, 'total')]}
        />
      )}
      {tab === 'return' && (
        <DocTable
          heads={['PO No.', 'Return Date', 'Discount (Rs)', 'Taxable (Rs)', 'Tax (Rs)', 'Total (Rs)']}
          align={['l', 'l', 'r', 'r', 'r', 'r']}
          rows={rets.map((r) => [String(r.ref_no), r.doc_date ? String(r.doc_date).slice(0, 10) : '', inr(r.discount), inr(r.taxable), inr(r.tax), <b key="t">{inr(r.total)}</b>])}
          foot={['', '', sum(rets, 'discount'), sum(rets, 'taxable'), sum(rets, 'tax'), sum(rets, 'total')]}
        />
      )}
      {tab === 'expense' && (
        <DocTable
          heads={['Bill Date', 'Category', 'Taxable (Rs)', 'Total (Rs)', 'Paid (Rs)', 'Due (Rs)', 'Remarks']}
          align={['l', 'l', 'r', 'r', 'r', 'r', 'l']}
          rows={exp.map((r) => [r.bill_date ? String(r.bill_date).slice(0, 10) : '', String(r.category), inr(r.taxable), <b key="t">{inr(r.total)}</b>, inr(r.paid), inr(r.due), String(r.remarks || '')])}
          foot={['', '', sum(exp, 'taxable'), sum(exp, 'total'), sum(exp, 'paid'), sum(exp, 'due'), '']}
        />
      )}
    </div>
  );
}
