'use client';

import { useState } from 'react';
import { addPdc, updatePdc, deletePdc, depositPdc } from '@/app/account/pdc/actions';
import { Modal, Btn, IconBtn, Badge, fieldCls, inr, pdcStatus } from '@/components/ui';

export type Pdc = {
  id: number; ledger: string; cheque_no: string; cheque_date: string;
  deposit_date: string; amount: string; deposit_to: string; status: string;
};

function PdcForm({ action, kind, initial, ledgers, banks, submitLabel }: {
  action: (f: FormData) => Promise<void>;
  kind: string;
  initial?: Partial<Pdc>;
  ledgers: string[];
  banks: string[];
  submitLabel: string;
}) {
  const v = (k: keyof Pdc) => {
    const val = initial?.[k] as string;
    if ((k === 'cheque_date' || k === 'deposit_date') && val) return String(val).slice(0, 10);
    return val || '';
  };
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="kind" value={kind} />
      {initial?.id ? <input type="hidden" name="pdc_id" value={initial.id} /> : null}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input name="ledger" required defaultValue={v('ledger')} placeholder="Ledger *" list="pdc-ledgers" className={fieldCls} />
        <input name="cheque_no" required defaultValue={v('cheque_no')} placeholder="PDC Cheque No *" className={fieldCls} />
        <input name="cheque_date" type="date" defaultValue={v('cheque_date')} className={fieldCls} />
        <input name="deposit_date" type="date" defaultValue={v('deposit_date')} className={fieldCls} />
        <input name="amount" type="number" step="0.01" min="0.01" required defaultValue={v('amount')} placeholder="PDC Amount *" className={fieldCls} />
        <input name="deposit_to" defaultValue={v('deposit_to')} placeholder="PDC Deposit To" list="pdc-banks" className={fieldCls} />
        {initial?.id ? (
          <select name="status" defaultValue={v('status') || 'Pending'} className={fieldCls}>
            <option>Pending</option><option>Deposited</option><option>Cleared</option><option>Bounced</option>
          </select>
        ) : null}
      </div>
      <datalist id="pdc-ledgers">{ledgers.map((l) => <option key={l} value={l} />)}</datalist>
      <datalist id="pdc-banks">{banks.map((b) => <option key={b} value={b} />)}</datalist>
      <Btn type="submit" className="w-full">{submitLabel}</Btn>
    </form>
  );
}

type Kind = null | 'add' | 'edit' | 'delete' | 'deposit' | 'view';

export function PdcButtons({ p, kind, ledgers, banks }: { p: Pdc; kind: string; ledgers: string[]; banks: string[] }) {
  const [modal, setModal] = useState<Kind>(null);
  const close = () => setModal(null);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <IconBtn icon="eye" label="View" tone="slate" onClick={() => setModal('view')} />
        <IconBtn icon="transfer" label="PDC Deposit" tone="amber" onClick={() => setModal('deposit')} />
        <IconBtn icon="edit" label="Edit" tone="indigo" onClick={() => setModal('edit')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setModal('delete')} />
      </div>
      {modal === 'view' && (
        <Modal title="PDC Details" onClose={close}>
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 ring-1 ring-inset ring-amber-100">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold text-slate-800">{p.cheque_no}</span>
              {pdcStatus(p.status)}
            </div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{inr(p.amount)}</div>
            <div className="mt-1 text-xs text-slate-500">{p.ledger} → {p.deposit_to || '—'}</div>
          </div>
          <dl className="mt-2">
            {[
              ['Ledger', p.ledger], ['PDC Cheque No', p.cheque_no],
              ['PDC Cheque Date', p.cheque_date ? String(p.cheque_date).slice(0, 10) : '—'],
              ['PDC Deposit To', p.deposit_to || '—'],
              ['PDC Deposit Date', p.deposit_date ? String(p.deposit_date).slice(0, 10) : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-2 text-sm">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      {modal === 'deposit' && (
        <Modal title="PDC Deposit" sub={`${p.ledger} · ${p.cheque_no}`} onClose={close}>
          <div className="mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 ring-1 ring-inset ring-amber-100">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Cheque {p.cheque_no}</div>
                <div className="text-2xl font-extrabold tabular-nums text-slate-900">{inr(p.amount)}</div>
              </div>
              <div className="text-right text-xs leading-relaxed text-slate-600">
                <div>{p.ledger}</div>
                <div className="text-slate-400">↓</div>
                <div>{p.deposit_to || '—'}</div>
              </div>
            </div>
            <div className="mt-2 flex gap-3 text-[11px] text-slate-500">
              <span>Cheque date: <b>{p.cheque_date ? String(p.cheque_date).slice(0, 10) : '—'}</b></span>
              <span>Due: <b>{p.deposit_date ? String(p.deposit_date).slice(0, 10) : '—'}</b></span>
            </div>
          </div>
          <form action={depositPdc} className="space-y-2.5">
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="pdc_id" value={p.id} />
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Actual Deposit Date *</label>
              <input name="actual_deposit_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={fieldCls} />
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Pay Slip No</label>
                <input name="pay_slip_no" placeholder="e.g. PS-1024" className={fieldCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Deposited By</label>
                <input name="deposited_by" placeholder="Person / bank" className={fieldCls} />
              </div>
            </div>
            <Btn type="submit" className="w-full">Deposit {inr(p.amount)}</Btn>
          </form>
        </Modal>
      )}
      {modal === 'edit' && (
        <Modal title={`Edit ${p.cheque_no}`} onClose={close} wide>
          <PdcForm action={updatePdc} kind={kind} initial={p} ledgers={ledgers} banks={banks} submitLabel="Save" />
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal title={`Delete ${p.cheque_no}?`} onClose={close}>
          <form action={deletePdc}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="pdc_id" value={p.id} />
            <p className="mb-3 text-sm text-slate-600">Remove cheque <b className="font-mono">{p.cheque_no}</b> ({inr(p.amount)}).</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AddPdcButton({ kind, ledgers, banks, label }: { kind: string; ledgers: string[]; banks: string[]; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>+ {label}</Btn>
      {open && (
        <Modal title={label} onClose={() => setOpen(false)} wide>
          <PdcForm action={addPdc} kind={kind} ledgers={ledgers} banks={banks} submitLabel={label} />
        </Modal>
      )}
    </>
  );
}
