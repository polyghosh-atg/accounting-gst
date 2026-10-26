import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { Table, Pager } from '@/components/table';
import { PageHeader, LoadingRows, Badge } from '@/components/ui';
import { RowButtons } from '@/components/settings-modals';
import { deletePurchase, updatePurchase } from './actions';
import { isoDate } from '../docs/proforma_invoice/dates';

const PER = 25;

function EditFields({ d, suppliers, warehouses }: { d: Record<string, string>; suppliers: string[]; warehouses: string[] }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">PO No</label>
          <input name="po_no" defaultValue={String(d.po_no ?? '')} placeholder="PO No" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Invoice No</label>
          <input name="inv_no" defaultValue={String(d.inv_no ?? '')} placeholder="Invoice No" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Date</label>
          <input name="purchase_date" type="date" defaultValue={isoDate(d.purchase_date) ?? ''} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
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
        <input name="supplier" required defaultValue={String(d.supplier ?? '')} list="pur-suppliers" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
      </div>
      <datalist id="pur-suppliers">{suppliers.map((s, i) => <option key={`${s}-${i}`} value={s} />)}</datalist>
    </>
  );
}

export default function Purchases({ searchParams }: { searchParams: Promise<{ page?: string; f?: string }> }) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ page?: string; f?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const f = sp.f || '';
  const fw = f === 'unpaid' ? ' AND COALESCE(paid,0)=0 AND COALESCE(due,0)>0'
    : f === 'partial' ? ' AND COALESCE(paid,0)>0 AND COALESCE(due,0)>0'
    : f === 'paid' ? ' AND COALESCE(due,0)=0' : '';
  const [[t], rows, sups, whs] = await Promise.all([
    q<{ t: string; p: string; d: string }>(`SELECT COALESCE(SUM(total),0) t, COALESCE(SUM(paid),0) p, COALESCE(SUM(due),0) d FROM purchases`),
    q(`SELECT * FROM purchases WHERE 1=1${fw} ORDER BY id DESC LIMIT $1 OFFSET $2`, [String(PER), String((page - 1) * PER)]),
    q<{ company_name: string }>('SELECT company_name FROM suppliers ORDER BY company_name'),
    q<{ name: string }>('SELECT name FROM warehouses ORDER BY name'),
  ]);
  const [{ c }] = await q<{ c: string }>(`SELECT count(*) c FROM purchases WHERE 1=1${fw}`);
  const total = Number(c);
  const suppliers = sups.map((x) => String(x.company_name)).filter(Boolean);
  const warehouses = whs.map((x) => String(x.name)).filter(Boolean);
  const stats = [
    { label: 'Total Purchases', value: inr(t.t), grad: 'from-sky-500 to-cyan-600', icon: '🛒' },
    { label: 'Total Amount Paid', value: inr(t.p), grad: 'from-emerald-500 to-teal-600', icon: '✅' },
    { label: 'Total Amount Payable', value: inr(t.d), grad: 'from-rose-500 to-pink-600', icon: '🐷' },
  ];
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:gap-3 sm:p-4">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-base text-white shadow sm:h-12 sm:w-12 sm:text-xl ${s.grad}`}>{s.icon}</div>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium text-slate-500 sm:text-sm">{s.label}</div>
              <div className="truncate text-sm font-extrabold tabular-nums text-slate-900 sm:text-xl">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <PageHeader
        title="Purchase List"
        sub="all amounts are in Rs"
        actions={
          <a href="/purchases/add" className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-sm font-bold text-white shadow hover:opacity-95">
            ❄ Add Purchase
          </a>
        }
      />
      <form method="GET" className="flex flex-wrap items-center gap-2">
        <select name="f" defaultValue={f} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm outline-none focus:border-indigo-400">
          <option value="">Show All Purchases</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial Paid</option>
          <option value="paid">Paid</option>
        </select>
        <button className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white">Filter</button>
        {f && <a href="/purchases" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <span className="ml-auto text-sm text-slate-500">{total} purchases</span>
      </form>
      <Table fit
        heads={['PO No.', 'Invoice No', 'Purchase Date', 'Warehouse', 'Supplier', 'Total Discount', 'Total Taxable Value', 'Total Tax', 'Total', 'Paid', 'Due', 'Delivery Status', 'Action']}
        align={['l', 'l', 'l', 'l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'l', 'l']}
        rows={rows.map((r) => {
          const sup = String(r.supplier || '—');
          const dueN = Number(r.due ?? 0);
          const dst = String(r.delivery_status || '');
          return [
            <a key="p" href={`/purchases/view/${r.id}`} className="font-bold text-indigo-700 hover:underline">{String(r.po_no || '—')}</a>,
            <span key="i" className="text-slate-600">{String(r.inv_no || '')}</span>,
            <span key="d" className="text-slate-500">{isoDate(r.purchase_date) ?? ''}</span>,
            <span key="w" className="text-slate-600">{String(r.warehouse || '—')}</span>,
            <a key="s" href={`/suppliers?q=${encodeURIComponent(sup)}`} className="font-medium text-slate-800 hover:text-indigo-700 hover:underline">{sup}</a>,
            inr(r.discount), inr(r.taxable), inr(r.tax),
            <b key="t" className="text-slate-900">{inr(r.total)}</b>,
            <span key="pd" className="font-semibold text-emerald-700">{inr(r.paid)}</span>,
            dueN > 0 ? <span key="d2" className="font-semibold text-rose-700">{inr(r.due)}</span> : <span key="d2" className="text-slate-400">{inr(0)}</span>,
            dst ? <Badge key="ds" tone={dst.toLowerCase().includes('deliver') ? 'green' : 'amber'}>{dst}</Badge> : <span key="ds" className="text-slate-300">—</span>,
            <span key="a" className="flex items-center gap-1">
              <a href={`/purchases/view/${r.id}`} title="View purchase" className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-200">👁 View</a>
              <RowButtons idName="doc_id" id={r.id} editTitle="Edit purchase"
                delText={`Delete purchase "${String(r.po_no || r.inv_no)}"?`}
                editAction={updatePurchase} delAction={deletePurchase}>
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
