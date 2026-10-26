import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { Table, Pager } from '@/components/table';
import { PageHeader, LoadingRows } from '@/components/ui';
import { RowButtons } from '@/components/settings-modals';
import { deletePurchaseOrder, updatePurchaseOrder } from './actions';
import { isoDate } from '../proforma_invoice/dates';

const PER = 25;

function EditFields({ d, suppliers, warehouses }: { d: Record<string, string>; suppliers: string[]; warehouses: string[] }) {
  return (
    <>
      <label className="mb-1 block text-sm font-semibold text-slate-700">Reference No *</label>
      <input name="ref_no" required defaultValue={String(d.ref_no ?? '')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Date</label>
          <input name="doc_date" type="date" defaultValue={isoDate(d.doc_date) ?? ''} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Warehouse</label>
          <select name="warehouse" defaultValue={String(d.warehouse ?? '')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white">
            <option value="">—</option>
            {warehouses.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Supplier *</label>
        <input name="party" required defaultValue={String(d.party ?? '')} list="po-suppliers" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
      </div>
      <datalist id="po-suppliers">{suppliers.map((s, i) => <option key={`${s}-${i}`} value={s} />)}</datalist>
    </>
  );
}

export default function PurchaseOrderList({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, parseInt((await searchParams).page ?? '1', 10));
  const [{ c }] = await q<{ c: string }>(`SELECT count(*) c FROM doc_headers WHERE doc_type='purchase_order'`);
  const total = Number(c);
  const rows = await q(
    `SELECT id, ref_no, doc_date, warehouse, party, discount, taxable, tax, total FROM doc_headers
     WHERE doc_type='purchase_order' ORDER BY id DESC LIMIT $1 OFFSET $2`,
    [String(PER), String((page - 1) * PER)]
  );
  const sups = await q<{ company_name: string }>('SELECT company_name FROM suppliers ORDER BY company_name');
  const suppliers = sups.map((x) => String(x.company_name)).filter(Boolean);
  const whs = await q<{ name: string }>('SELECT name FROM warehouses ORDER BY name');
  const warehouses = whs.map((x) => String(x.name)).filter(Boolean);
  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-xl text-white shadow">📋</div>
        <div>
          <div className="text-sm font-medium text-slate-500">Total Purchase Order</div>
          <div className="text-xl font-extrabold tabular-nums text-slate-900">{total}</div>
        </div>
      </div>

      <PageHeader
        title="Purchase Order List"
        actions={
          <a href="/docs/purchase_order/add" className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-sm font-bold text-white shadow hover:opacity-95">
            ＋ Add Purchase Order
          </a>
        }
      />
      <Table compact
        heads={['PO No.', 'Purchase Order Date', 'Warehouse', 'Supplier', 'Total Discount', 'Total Taxable Value', 'Total Tax', 'Total', 'Action']}
        align={['l', 'l', 'l', 'l', 'r', 'r', 'r', 'r', 'l']}
        rows={rows.map((r) => {
          const sup = String(r.party || '—');
          return [
            <a key="p" href={`/docs/purchase_order/view/${r.id}`} className="font-bold text-indigo-700 hover:underline">{String(r.ref_no)}</a>,
            <span key="d" className="text-slate-500">{isoDate(r.doc_date) ?? ''}</span>,
            <span key="w" className="text-slate-600">{String(r.warehouse || '—')}</span>,
            <a key="s" href={`/suppliers?q=${encodeURIComponent(sup)}`} className="font-medium text-slate-800 hover:text-indigo-700 hover:underline">{sup}</a>,
            inr0(r.discount), inr0(r.taxable), inr0(r.tax),
            <b key="t" className="text-slate-900">{inr0(r.total)}</b>,
            <span key="a" className="flex items-center gap-1">
              <a href={`/docs/purchase_order/view/${r.id}`} title="View purchase order" className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-200">👁 View</a>
              <RowButtons idName="doc_id" id={r.id} editTitle="Edit Purchase Order"
                delText={`Delete purchase order "${String(r.ref_no)}" and its lines?`}
                editAction={updatePurchaseOrder} delAction={deletePurchaseOrder}>
                <EditFields d={r} suppliers={suppliers} warehouses={warehouses} />
              </RowButtons>
            </span>,
          ];
        })}
      />
      <Pager page={page} total={total} per={PER} />
    </>
  );
}

const inr0 = (v: unknown) => inr(Number(v ?? 0));
