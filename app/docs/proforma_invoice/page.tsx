import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { Table, Pager } from '@/components/table';
import { PageHeader, LoadingRows } from '@/components/ui';
import { RowButtons } from '@/components/settings-modals';
import { convertToSale, deleteProforma, updateProforma } from './actions';
import { isoDate } from './dates';

const PER = 25;

const fmtD = (v: unknown) => isoDate(v) ?? '';

function EditFields({ d, customers }: { d: Record<string, string>; customers: string[] }) {
  return (
    <>
      <label className="mb-1 block text-sm font-semibold text-slate-700">Reference No *</label>
      <input name="ref_no" required defaultValue={String(d.ref_no ?? '')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Date</label>
          <input name="doc_date" type="date" defaultValue={fmtD(d.doc_date)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Customer *</label>
          <input name="party" required defaultValue={String(d.party ?? '')} list="pi-customers" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
        </div>
      </div>
      <datalist id="pi-customers">{customers.map((c) => <option key={c} value={c} />)}</datalist>
    </>
  );
}

export default function ProformaList({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
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
  const [{ c }] = await q<{ c: string }>(`SELECT count(*) c FROM doc_headers WHERE doc_type='proforma_invoice'`);
  const total = Number(c);
  const rows = await q(
    `SELECT id, ref_no, doc_date, party, discount, taxable, tax, total, status FROM doc_headers
     WHERE doc_type='proforma_invoice' ORDER BY id DESC LIMIT $1 OFFSET $2`,
    [String(PER), String((page - 1) * PER)]
  );
  const custs = await q<{ company_name: string }>('SELECT company_name FROM customers ORDER BY company_name');
  const customers = custs.map((x) => String(x.company_name)).filter(Boolean);
  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-xl text-white shadow">🏪</div>
        <div>
          <div className="text-sm font-medium text-slate-500">Total Proforma Invoice</div>
          <div className="text-xl font-extrabold tabular-nums text-slate-900">{total}</div>
        </div>
      </div>

      <PageHeader
        title="Proforma Invoice List"
        sub="all amounts are in Rs"
        actions={
          <>
            <a href="/docs/proforma_invoice/add" className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-sm font-bold text-white shadow hover:opacity-95">
              ❄ Add Proforma Invoice
            </a>
          </>
        }
      />
      <form action={convertToSale}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button className="rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white shadow transition hover:bg-emerald-700">
            🏪 Convert to Sale Invoice
          </button>
          <span className="text-xs text-slate-400">tick rows, then convert (converted rows stay unchecked)</span>
          <span className="ml-auto text-sm text-slate-500">{total} invoices</span>
        </div>
        <Table compact
          heads={['', 'Invoice No', 'Invoice Date', 'Customer', 'Total Discount', 'Total Taxable Value', 'TDS', 'Total Tax', 'Total', 'Action']}
          align={['l', 'l', 'l', 'l', 'r', 'r', 'r', 'r', 'r', 'l']}
          rows={rows.map((r) => {
            const converted = String(r.status) === 'Converted';
            const cust = String(r.party || '—');
            return [
              <input key="c" type="checkbox" name="pi_ids" value={String(r.id)} disabled={converted} title={converted ? 'Already converted' : 'Select to convert'} className="h-4 w-4 accent-indigo-600" />,
              <a key="i" href={`/docs/proforma_invoice/view/${r.id}`} className="font-bold text-indigo-700 hover:underline">{String(r.ref_no)}</a>,
              <span key="d" className="text-slate-500">{fmtD(r.doc_date)}</span>,
              <a key="cu" href={`/customers?q=${encodeURIComponent(cust)}`} className="font-medium text-slate-800 hover:text-indigo-700 hover:underline">{cust}</a>,
              inr(r.discount), inr(r.taxable), inr(0), inr(r.tax),
              <b key="t" className="text-slate-900">{inr(r.total)}</b>,
              <span key="a" className="flex items-center gap-1">
                <a href={`/docs/proforma_invoice/view/${r.id}`} title="View Proforma Invoice" className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-200">👁 View</a>
                <RowButtons idName="doc_id" id={r.id} editTitle="Edit Proforma Invoice"
                  delText={`Delete proforma "${String(r.ref_no)}" and its lines?`}
                  editAction={updateProforma} delAction={deleteProforma}>
                  <EditFields d={r} customers={customers} />
                </RowButtons>
              </span>,
            ];
          })}
        />
      </form>
      <Pager page={page} total={total} per={PER} />
    </>
  );
}
