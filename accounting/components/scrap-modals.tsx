'use client';

import { useState } from 'react';
import { addScrap, updateScrap, deleteScrap } from '@/app/account/scrap/actions';
import { Modal, Btn, IconBtn, fieldCls, inr } from '@/components/ui';

export type ScrapDoc = {
  id: number; kind: string; ref_no: string; entry_date: string;
  warehouse: string; party: string; lines: number; qty: number; amount: number; internal_note: string;
  external_note: string; bank_detail: string; terms: string;
};

export type ScrapLine = {
  product: string; batch_no: string; qty: string; cost: string; selling_price: string; price: string;
  ordered_qty: string; tax_label: string; tax_rate: string;
};

export type TaxOpt = { name: string; rate: number };

const emptyLine = (): ScrapLine => ({
  product: '', batch_no: '', qty: '1', cost: '0', selling_price: '0', price: '0',
  ordered_qty: '1', tax_label: '', tax_rate: '0',
});

const lineTaxable = (l: ScrapLine) => (parseFloat(l.qty) || 0) * (parseFloat(l.cost) || 0);
const lineTax = (l: ScrapLine) => lineTaxable(l) * (parseFloat(l.tax_rate) || 0) / 100;

function LinesEditor({ lines, setLines, products, taxes }: {
  lines: ScrapLine[]; setLines: (l: ScrapLine[]) => void; products: string[]; taxes: TaxOpt[];
}) {
  const set = (i: number, k: keyof ScrapLine, v: string) => {
    let next = lines.map((l, j) => (j === i ? { ...l, [k]: v } : l));
    if (k === 'tax_label') {
      const t = taxes.find((x) => x.name === v);
      next = next.map((l, j) => (j === i ? { ...l, tax_rate: String(t ? t.rate : 0) } : l));
    }
    setLines(next);
  };
  return (
    <div className="space-y-2">
      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Items</div>
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-50 p-2.5 sm:grid-cols-4">
          <div className="col-span-2 flex items-start gap-1.5 sm:col-span-4">
            <input value={l.product} onChange={(e) => set(i, 'product', e.target.value)} placeholder="Product Name *" list="scrap-products" className={`${fieldCls} flex-1`} required />
            <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="rounded-lg bg-rose-50 px-2.5 py-2 text-xs font-bold text-rose-700" aria-label="Remove row">×</button>
          </div>
          <input value={l.qty} onChange={(e) => set(i, 'qty', e.target.value)} placeholder="Qty *" type="number" step="any" min="0" className={fieldCls} required />
          <input value={l.ordered_qty} onChange={(e) => set(i, 'ordered_qty', e.target.value)} placeholder="Ordered qty" type="number" step="any" min="0" className={fieldCls} />
          <input value={l.batch_no} onChange={(e) => set(i, 'batch_no', e.target.value)} placeholder="Batch No" className={fieldCls} />
          <select value={l.tax_label} onChange={(e) => set(i, 'tax_label', e.target.value)} className={fieldCls} title="Tax">
            <option value="">Tax: None</option>
            {taxes.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.rate}%)</option>)}
          </select>
          <input value={l.price} onChange={(e) => set(i, 'price', e.target.value)} placeholder="Price" type="number" step="any" min="0" className={fieldCls} />
          <input value={l.cost} onChange={(e) => set(i, 'cost', e.target.value)} placeholder="Cost" type="number" step="any" min="0" className={fieldCls} />
          <input value={l.selling_price} onChange={(e) => set(i, 'selling_price', e.target.value)} placeholder="Selling Price" type="number" step="any" min="0" className={fieldCls} />
          <div className="col-span-2 grid grid-cols-2 gap-1.5 sm:col-span-1 sm:grid-cols-1">
            <span className="rounded-lg bg-white px-2 py-1.5 text-right text-[11px] font-bold tabular-nums text-slate-600 ring-1 ring-inset ring-slate-200" title="Taxable Value">Taxable {inr(lineTaxable(l))}</span>
            <span className="rounded-lg bg-emerald-50 px-2 py-1.5 text-right text-[11px] font-bold tabular-nums text-emerald-700 ring-1 ring-inset ring-emerald-100" title="Total">Total {inr(lineTaxable(l) + lineTax(l))}</span>
          </div>
        </div>
      ))}
      <datalist id="scrap-products">{products.map((p) => <option key={p} value={p} />)}</datalist>
      <button type="button" onClick={() => setLines([...lines, emptyLine()])} className="w-full rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
        + Add product row
      </button>
    </div>
  );
}

export type ScrapInit = {
  id?: number; ref_no?: string; entry_date?: string; warehouse?: string; party?: string;
  lines?: ScrapLine[]; internal_note?: string; external_note?: string; bank_detail?: string; terms?: string;
};

function ScrapForm({ action, kind, initial, warehouses, parties, products, taxes, submitLabel, onClose }: {
  action: (f: FormData) => Promise<void>;
  kind: string;
  initial?: ScrapInit;
  warehouses: string[];
  parties: string[];
  products: string[];
  taxes: TaxOpt[];
  submitLabel: string;
  onClose?: () => void;
}) {
  const [lines, setLines] = useState<ScrapLine[]>(
    initial?.lines?.length ? initial.lines.map((l) => ({
      product: l.product || '', batch_no: l.batch_no || '', qty: String(l.qty ?? '1'),
      cost: String(l.cost ?? '0'), selling_price: String(l.selling_price ?? '0'), price: String(l.price ?? '0'),
      ordered_qty: String((l as ScrapLine).ordered_qty ?? l.qty ?? '1'),
      tax_label: (l as ScrapLine).tax_label || '', tax_rate: String((l as ScrapLine).tax_rate ?? '0'),
    })) : [emptyLine()]
  );
  const [noteTab, setNoteTab] = useState<'external_note' | 'internal_note' | 'bank_detail' | 'terms'>(
    kind === 'issue' ? 'external_note' : 'internal_note'
  );
  const totalTaxable = lines.reduce((a, l) => a + lineTaxable(l), 0);
  const totalTax = lines.reduce((a, l) => a + lineTax(l), 0);
  const isEdit = !!initial?.id;
  return (
    <form action={action} className="space-y-2.5" onSubmit={(e) => {
      if (!lines.some((l) => l.product.trim())) { e.preventDefault(); alert('Add at least one product with a name.'); }
    }}>
      <input type="hidden" name="kind" value={kind} />
      {initial?.id ? <input type="hidden" name="doc_id" value={initial.id} /> : null}
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Reference no</label>
          <input name="reference_no" defaultValue={initial?.ref_no || ''} placeholder={isEdit ? '' : 'Auto if blank'} readOnly={isEdit} className={`${fieldCls} ${isEdit ? 'bg-slate-100' : ''}`} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Scrap {kind} Date</label>
          <input name="entry_date" type="date" defaultValue={initial?.entry_date ? String(initial.entry_date).slice(0, 10) : ''} className={fieldCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">{kind === 'issue' ? 'Supplier' : kind === 'receive' ? 'Customer' : 'Warehouse'}</label>
          {kind === 'entry' ? (
            <select name="warehouse" required defaultValue={initial?.warehouse || ''} className={fieldCls}>
              <option value="">Select *</option>
              {warehouses.map((w) => <option key={w}>{w}</option>)}
            </select>
          ) : (
            <select name="party" required defaultValue={initial?.party || ''} className={fieldCls}>
              <option value="">Select *</option>
              {parties.map((p) => <option key={p}>{p}</option>)}
            </select>
          )}
        </div>
      </div>
      {kind !== 'entry' && (
        <input type="hidden" name="warehouse" value={initial?.warehouse || warehouses[0] || ''} />
      )}
      {kind === 'entry' && (
        <input name="party" defaultValue={initial?.party || ''} placeholder="Party (optional)" list="scrap-parties" className={fieldCls} />
      )}
      <datalist id="scrap-parties">{parties.map((p) => <option key={p} value={p} />)}</datalist>
      <LinesEditor lines={lines} setLines={setLines} products={products} taxes={taxes} />
      <div className="overflow-hidden rounded-xl border border-amber-200 bg-[#FFFDD0]">
        <div className="grid grid-cols-3 divide-x divide-amber-200 text-center text-sm font-bold">
          <div className="px-2 py-2">Taxable: <span className="tabular-nums text-emerald-700">{inr(totalTaxable)}</span></div>
          <div className="px-2 py-2">Tax: <span className="tabular-nums text-emerald-700">{inr(totalTax)}</span></div>
          <div className="px-2 py-2">Total: <span className="tabular-nums">{inr(totalTaxable + totalTax)}</span></div>
        </div>
      </div>
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {(['external_note', 'internal_note', 'bank_detail', 'terms'] as const).map((t) => (
          <button
            key={t} type="button" onClick={() => setNoteTab(t)}
            className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-bold transition ${noteTab === t ? 'bg-white text-indigo-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'external_note' ? 'Note to customer' : t === 'internal_note' ? 'Internal Note' : t === 'bank_detail' ? 'Bank Detail' : 'Terms & Condition'}
          </button>
        ))}
      </div>
      {noteTab === 'external_note' && <textarea name="external_note" rows={2} defaultValue={initial?.external_note || ''} placeholder="Note to customer" className={fieldCls} />}
      {noteTab === 'internal_note' && <textarea name="internal_note" rows={2} defaultValue={initial?.internal_note || ''} placeholder="Internal Note" className={fieldCls} />}
      {noteTab === 'bank_detail' && <textarea name="bank_detail" rows={2} defaultValue={initial?.bank_detail || ''} placeholder="Bank Detail" className={fieldCls} />}
      {noteTab === 'terms' && <textarea name="terms" rows={2} defaultValue={initial?.terms || ''} placeholder="Terms & Condition" className={fieldCls} />}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow transition hover:opacity-95">{submitLabel}</button>
      </div>
    </form>
  );
}

type Kind = null | 'add' | 'edit' | 'delete';

export function ScrapButtons({ d, kind, warehouses, parties, products, taxes, lines, notes }: {
  d: ScrapDoc; kind: string; warehouses: string[]; parties: string[]; products: string[]; taxes: TaxOpt[];
  lines?: ScrapLine[]; notes?: { internal_note: string; external_note: string; bank_detail: string; terms: string };
}) {
  const [modal, setModal] = useState<Kind>(null);
  const close = () => setModal(null);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <IconBtn icon="eye" label="View" tone="slate" href={`/account/scrap/${kind}/${d.id}`} />
        <IconBtn icon="download" label="Download PDF" tone="green" href={`/account/scrap/${kind}/${d.id}?print=1`} />
        <IconBtn icon="edit" label="Edit" tone="indigo" onClick={() => setModal('edit')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setModal('delete')} />
      </div>
      {modal === 'edit' && (
        <Modal title={`Edit Scrap ${kind} — ${d.ref_no}`} onClose={close} xl>
          <ScrapForm action={updateScrap} kind={kind} onClose={close} initial={{ id: d.id, ref_no: d.ref_no, entry_date: d.entry_date, warehouse: d.warehouse, party: d.party, lines, ...notes }}
            warehouses={warehouses} parties={parties} products={products} taxes={taxes} submitLabel={`Save Scrap ${kind}`} />
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal title={`Delete ${d.ref_no}?`} onClose={close}>
          <form action={deleteScrap}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="doc_id" value={d.id} />
            <p className="mb-3 text-sm text-slate-600">Remove this scrap {kind} with its product lines.</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AddScrapButton({ kind, label, warehouses, parties, products, taxes }: {
  kind: string; label: string; warehouses: string[]; parties: string[]; products: string[]; taxes: TaxOpt[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>+ {label}</Btn>
      {open && (
        <Modal title={label} onClose={() => setOpen(false)} xl>
          <ScrapForm action={addScrap} kind={kind} onClose={() => setOpen(false)} warehouses={warehouses} parties={parties} products={products} taxes={taxes} submitLabel={label} />
        </Modal>
      )}
    </>
  );
}
