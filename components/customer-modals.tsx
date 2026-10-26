'use client';

import { useState } from 'react';
import { addCustomer, updateCustomer, deleteCustomer } from '@/app/customers/actions';
import { Modal, Btn, Pill, Badge, fieldCls, IconBtn } from '@/components/ui';

export type Customer = {
  id: number; company_name: string; name: string; gstin: string; email: string; phone: string;
  country: string; state: string; city: string; address: string; pincode: string;
  ship_country: string; ship_state: string; ship_city: string; ship_address: string; ship_pincode: string;
};

function CustomerForm({ action, initial, submitLabel }: {
  action: (f: FormData) => Promise<void>;
  initial?: Partial<Customer>;
  submitLabel: string;
}) {
  const [same, setSame] = useState(true);
  const v = (k: keyof Customer) => (initial?.[k] as string) || '';
  return (
    <form action={action} className="space-y-2.5">
      {initial?.id ? <input type="hidden" name="customer_id" value={initial.id} /> : null}
      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Personal Details</div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input name="customer_company_name" required defaultValue={v('company_name')} placeholder="Company Name *" className={fieldCls} />
        <input name="customer_name" required defaultValue={v('name')} placeholder="Customer Name *" className={fieldCls} />
        <input name="gstin" defaultValue={v('gstin')} placeholder="GSTIN/UIN of Recipient" className={fieldCls} />
        <input name="email" type="email" defaultValue={v('email')} placeholder="Email" className={fieldCls} />
        <input name="phone" defaultValue={v('phone')} placeholder="Phone" className={fieldCls} />
      </div>
      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Billing Details</div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input name="country" defaultValue={v('country')} placeholder="Country *" className={fieldCls} />
        <input name="state" defaultValue={v('state')} placeholder="State *" className={fieldCls} />
        <input name="city" defaultValue={v('city')} placeholder="City" className={fieldCls} />
        <input name="pincode" defaultValue={v('pincode')} placeholder="Pincode" className={fieldCls} />
        <input name="address" defaultValue={v('address')} placeholder="Address" className={`${fieldCls} sm:col-span-2`} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" name="copy_address" value="1" checked={same} onChange={(e) => setSame(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
        Shipping Details (same as billing details)
      </label>
      {!same && (
        <>
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Shipping Details</div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <input name="shipping_country" defaultValue={v('ship_country')} placeholder="Shipping Country *" className={fieldCls} />
            <input name="shipping_state" defaultValue={v('ship_state')} placeholder="Shipping State *" className={fieldCls} />
            <input name="shipping_city" defaultValue={v('ship_city')} placeholder="Shipping City" className={fieldCls} />
            <input name="shipping_pincode" defaultValue={v('ship_pincode')} placeholder="Shipping Pincode" className={fieldCls} />
            <input name="shipping_address" defaultValue={v('ship_address')} placeholder="Shipping Address" className={`${fieldCls} sm:col-span-2`} />
          </div>
        </>
      )}
      <Btn type="submit" className="w-full">{submitLabel}</Btn>
    </form>
  );
}

type Kind = null | 'add' | 'edit' | 'delete';

export function CustomerButtons({ c, compact }: { c: Customer; compact?: boolean }) {
  const [kind, setKind] = useState<Kind>(null);
  const close = () => setKind(null);
  return (
    <>
      <div className={compact ? 'flex items-center justify-between gap-2' : 'flex flex-wrap gap-1.5'}>
        {!compact && (
          <IconBtn key="v" icon="eye" label="View" tone="slate" href={`/customers/${c.id}`} />
        )}
        <IconBtn icon="edit" label="Edit" tone="indigo" onClick={() => setKind('edit')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setKind('delete')} />
      </div>
      {kind === 'edit' && (
        <Modal title={`Edit ${c.company_name}`} onClose={close} wide>
          <CustomerForm action={updateCustomer} initial={c} submitLabel="Save Customer" />
        </Modal>
      )}
      {kind === 'delete' && (
        <Modal title={`Delete ${c.company_name}?`} onClose={close}>
          <form action={deleteCustomer}>
            <input type="hidden" name="customer_id" value={c.id} />
            <p className="mb-3 text-sm text-slate-600">This removes the customer record. Linked sales keep the customer name as plain text.</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AddCustomerButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>+ Add Customer</Btn>
      {open && (
        <Modal title="Add Customer" sub="Personal, billing & shipping details" onClose={() => setOpen(false)} wide>
          <CustomerForm action={addCustomer} submitLabel="Add Customer" />
        </Modal>
      )}
    </>
  );
}

export function StatusPill({ v }: { v: string }) {
  return <Badge tone={v ? 'green' : 'gray'}>{v || '—'}</Badge>;
}
