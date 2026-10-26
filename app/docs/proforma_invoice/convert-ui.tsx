'use client';

import { useActionState, useRef, useState } from 'react';
import { Table } from '@/components/table';
import { Badge } from '@/components/ui';
import { inr } from '@/components/ui';
import { RowButtons } from '@/components/settings-modals';
import { convertToSale, deleteProforma, updateProforma } from './actions';

export type PiRow = {
  id: string; ref_no: string; doc_date: string; party: string;
  discount: string; taxable: string; tax: string; total: string; converted: boolean;
};

function EditFields({ d, customers }: { d: PiRow; customers: string[] }) {
  return (
    <>
      <label className="mb-1 block text-sm font-semibold text-slate-700">Reference No *</label>
      <input name="ref_no" required defaultValue={d.ref_no} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Date</label>
          <input name="doc_date" type="date" defaultValue={d.doc_date} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Customer *</label>
          <input name="party" required defaultValue={d.party} list="pi-customers" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
        </div>
      </div>
      <datalist id="pi-customers">{customers.map((c, i) => <option key={`${c}-${i}`} value={c} />)}</datalist>
    </>
  );
}

export function ConvertForm({ rows, customers }: { rows: PiRow[]; customers: string[] }) {
  const [state, submit, pending] = useActionState(convertToSale, { message: '', count: 0 });
  const [confirming, setConfirming] = useState<PiRow[] | null>(null);
  const [warn, setWarn] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const openConfirm = () => {
    setWarn('');
    const checked = formRef.current?.querySelectorAll<HTMLInputElement>('input[name="pi_ids"]:checked') ?? [];
    if (checked.length === 0) {
      setWarn('Please select at least one proforma invoice');
      return;
    }
    const ids = new Set(Array.from(checked).map((c) => c.value));
    setConfirming(rows.filter((r) => ids.has(r.id) && !r.converted));
  };

  return (
    <form ref={formRef} action={submit}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openConfirm}
          className="rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white shadow transition hover:bg-emerald-700"
        >
          🏪 Convert to Sale Invoice
        </button>
        <span className="text-xs text-slate-400">tick rows, then convert (converted rows stay unchecked)</span>
        {state.message && (
          <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${state.count > 0 ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'}`}>
            {state.message}
          </span>
        )}
        {warn && <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200">{warn}</span>}
      </div>
      <Table compact
        heads={['', 'Invoice No', 'Invoice Date', 'Customer', 'Total Discount', 'Total Taxable Value', 'TDS', 'Total Tax', 'Total', 'Action']}
        align={['l', 'l', 'l', 'l', 'r', 'r', 'r', 'r', 'r', 'l']}
        rows={rows.map((r) => [
          <input key="c" type="checkbox" name="pi_ids" value={r.id} disabled={r.converted} title={r.converted ? 'Already converted' : 'Select to convert'} className="h-4 w-4 accent-emerald-600" />,
          <a key="i" href={`/docs/proforma_invoice/view/${r.id}`} className="font-bold text-indigo-700 hover:underline">{r.ref_no}</a>,
          <span key="d" className="text-slate-500">{r.doc_date}</span>,
          <a key="cu" href={`/customers?q=${encodeURIComponent(r.party || '')}`} className="font-medium text-slate-800 hover:text-indigo-700 hover:underline">{r.party || '—'}</a>,
          inr(r.discount), inr(r.taxable), inr(0), inr(r.tax),
          <b key="t" className="text-slate-900">{inr(r.total)}</b>,
          <span key="a" className="flex items-center gap-1">
            <a href={`/docs/proforma_invoice/view/${r.id}`} title="View Proforma Invoice" className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-200">👁 View</a>
            <RowButtons idName="doc_id" id={r.id} editTitle="Edit Proforma Invoice"
              delText={`Delete proforma "${r.ref_no}" and its lines?`}
              editAction={updateProforma} delAction={deleteProforma}>
              <EditFields d={r} customers={customers} />
            </RowButtons>
          </span>,
        ])}
      />

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Convert to sale">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold tracking-tight text-slate-900">🏪 Convert to Sale Invoice</h3>
            <p className="mt-0.5 text-xs text-slate-500">{confirming.length} invoice(s) will become sales. Converted rows stay unchecked afterwards.</p>
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-2 text-sm">
              {confirming.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-1 py-0.5">
                  <span className="font-bold text-indigo-700">{c.ref_no}</span>
                  <span className="truncate text-slate-500">{c.party}</span>
                  <b className="ml-auto tabular-nums">{inr(c.total)}</b>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirming(null)} className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={pending} onClick={() => { setConfirming(null); formRef.current?.requestSubmit(); }} className="flex-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-60">
                {pending ? 'Converting…' : `Confirm Convert (${confirming.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
