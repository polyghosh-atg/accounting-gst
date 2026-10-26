'use client';

import { useState } from 'react';
import { addExpense, updateExpense, deleteExpense, makePayment } from '@/app/expenses/actions';
import { Modal, Btn, IconBtn, fieldCls, inr } from '@/components/ui';

export type Expense = {
  id: number; legacy_id: number; bill_date: string; category: string; supplier: string;
  taxable: string; cgst: string; sgst: string; igst: string; total: string;
  paid: string; due: string; remarks: string; itc: string;
};

function ExpenseForm({ action, initial, categories, suppliers, submitLabel }: {
  action: (f: FormData) => Promise<void>;
  initial?: Partial<Expense>;
  categories: string[];
  suppliers: string[];
  submitLabel: string;
}) {
  const v = (k: keyof Expense) => {
    const val = initial?.[k] as string;
    if (k === 'bill_date' && val) return String(val).slice(0, 10);
    return val || '';
  };
  return (
    <form action={action} className="space-y-2.5">
      {initial?.id ? <input type="hidden" name="expense_id" value={initial.id} /> : null}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input name="bill_date" type="date" required defaultValue={v('bill_date')} className={fieldCls} />
        <select name="category" required defaultValue={v('category')} className={fieldCls}>
          <option value="">Expense Category *</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input name="supplier" defaultValue={v('supplier')} placeholder="Name of Supplier *" list="exp-suppliers" className={`${fieldCls} sm:col-span-2`} />
        <input name="taxable" type="number" step="any" min="0" required defaultValue={v('taxable')} placeholder="Taxable Amount *" className={fieldCls} />
        <input name="total" type="number" step="any" min="0" required defaultValue={v('total')} placeholder="Total Amount *" className={fieldCls} />
        <input name="cgst" type="number" step="any" min="0" defaultValue={v('cgst')} placeholder="CGST" className={fieldCls} />
        <input name="sgst" type="number" step="any" min="0" defaultValue={v('sgst')} placeholder="SGST" className={fieldCls} />
        <input name="igst" type="number" step="any" min="0" defaultValue={v('igst')} placeholder="IGST" className={fieldCls} />
        <input name="paid" type="number" step="any" min="0" defaultValue={v('paid')} placeholder="Paid Amount" className={fieldCls} />
        <input name="due" type="number" step="any" min="0" defaultValue={v('due')} placeholder="Due Amount" className={fieldCls} />
        <input name="remarks" defaultValue={v('remarks')} placeholder="Remarks" className={`${fieldCls} sm:col-span-2`} />
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input type="checkbox" name="itc" value="1" defaultChecked={v('itc') === 'Yes'} className="h-4 w-4 accent-indigo-600" />
          Eligible for ITC
        </label>
      </div>
      <datalist id="exp-suppliers">{suppliers.map((s) => <option key={s} value={s} />)}</datalist>
      <Btn type="submit" className="w-full">{submitLabel}</Btn>
    </form>
  );
}

type Kind = null | 'add' | 'edit' | 'delete' | 'pay';

export function ExpenseButtons({ e, categories, suppliers, accounts }: {
  e: Expense; categories: string[]; suppliers: string[]; accounts: string[];
}) {
  const [kind, setKind] = useState<Kind>(null);
  const close = () => setKind(null);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <IconBtn icon="eye" label="View" tone="slate" href={`/expenses/${e.id}`} />
        <IconBtn icon="transfer" label="Make Payment" tone="purple" onClick={() => setKind('pay')} />
        <IconBtn icon="edit" label="Edit" tone="indigo" onClick={() => setKind('edit')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setKind('delete')} />
      </div>
      {kind === 'pay' && (
        <Modal title={`Make Payment — ${e.supplier}`} sub={`Due ${inr(e.due)} of ${inr(e.total)}`} onClose={close}>
          <form action={makePayment} className="space-y-2.5">
            <input type="hidden" name="expense_id" value={e.id} />
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <input name="amount" type="number" step="any" min="0.01" max={e.due} required defaultValue={e.due} placeholder="Amount *" className={fieldCls} />
              <input name="pay_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={fieldCls} />
              <select name="pay_mode" defaultValue="Cash" className={fieldCls}>
                <option>Cash</option><option>Cheque</option><option>NEFT/RTGS/Online Transfer</option><option>Credit Card</option><option>Bank</option>
              </select>
              <select name="from_account" defaultValue="CASH ACCOUNT" className={fieldCls}>
                {accounts.map((a) => <option key={a}>{a}</option>)}
              </select>
              <input name="reference_no" placeholder="Reference No (auto if blank)" className={`${fieldCls} sm:col-span-2`} />
            </div>
            <Btn type="submit" className="w-full">Submit Payment</Btn>
          </form>
        </Modal>
      )}
      {kind === 'edit' && (
        <Modal title="Edit Expense" onClose={close} wide>
          <ExpenseForm action={updateExpense} initial={e} categories={categories} suppliers={suppliers} submitLabel="Save Expense" />
        </Modal>
      )}
      {kind === 'delete' && (
        <Modal title="Delete expense?" onClose={close}>
          <form action={deleteExpense}>
            <input type="hidden" name="expense_id" value={e.id} />
            <p className="mb-3 text-sm text-slate-600">Remove expense of {inr(e.total)} ({e.category}).</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AddExpenseButton({ categories, suppliers }: { categories: string[]; suppliers: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>+ Add Expense</Btn>
      {open && (
        <Modal title="Add Expense" onClose={() => setOpen(false)} wide>
          <ExpenseForm action={addExpense} categories={categories} suppliers={suppliers} submitLabel="Add Expense" />
        </Modal>
      )}
    </>
  );
}
