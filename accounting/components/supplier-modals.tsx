'use client';

import { useState } from 'react';
import { addSupplier, updateSupplier, deleteSupplier } from '@/app/suppliers/actions';
import { Modal, Btn, Pill, fieldCls, IconBtn } from '@/components/ui';

export type Supplier = {
  id: number; company_name: string; reg_type: string; gstin: string; email: string; phone: string;
  contact_person: string; contact_desig: string; address: string; state: string; country: string; website: string; city: string;
};

function SupplierForm({ action, initial, submitLabel }: {
  action: (f: FormData) => Promise<void>;
  initial?: Partial<Supplier>;
  submitLabel: string;
}) {
  const v = (k: keyof Supplier) => (initial?.[k] as string) || '';
  return (
    <form action={action} className="space-y-2.5">
      {initial?.id ? <input type="hidden" name="supplier_id" value={initial.id} /> : null}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input name="company_name" required defaultValue={v('company_name')} placeholder="Company Name *" className={fieldCls} />
        <select name="gst_registration_type" defaultValue={v('reg_type') || 'Not Registered'} className={fieldCls}>
          <option>Not Registered</option><option>Registered</option><option>Composition</option><option>SEZ</option>
        </select>
        <input name="gstin" defaultValue={v('gstin')} placeholder="GSTIN *" className={fieldCls} />
        <input name="contact_person_name" defaultValue={v('contact_person')} placeholder="Contact Person Name *" className={fieldCls} />
        <input name="contact_person_designation" defaultValue={v('contact_desig')} placeholder="Contact Person Designation" className={fieldCls} />
        <input name="email" type="email" defaultValue={v('email')} placeholder="Email" className={fieldCls} />
        <input name="phone" defaultValue={v('phone')} placeholder="Phone *" className={fieldCls} />
        <input name="country" defaultValue={v('country')} placeholder="Country *" className={fieldCls} />
        <input name="state" defaultValue={v('state')} placeholder="State *" className={fieldCls} />
        <input name="address" defaultValue={v('address')} placeholder="Address *" className={`${fieldCls} sm:col-span-2`} />
        <input name="website" defaultValue={v('website')} placeholder="Website" className={`${fieldCls} sm:col-span-2`} />
      </div>
      <Btn type="submit" className="w-full">{submitLabel}</Btn>
    </form>
  );
}

type Kind = null | 'add' | 'edit' | 'delete';

export function SupplierButtons({ s }: { s: Supplier }) {
  const [kind, setKind] = useState<Kind>(null);
  const close = () => setKind(null);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <IconBtn icon="eye" label="View" tone="slate" href={`/suppliers/${s.id}`} />
        <IconBtn icon="edit" label="Edit" tone="indigo" onClick={() => setKind('edit')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setKind('delete')} />
      </div>
      {kind === 'edit' && (
        <Modal title={`Edit ${s.company_name}`} onClose={close} wide>
          <SupplierForm action={updateSupplier} initial={s} submitLabel="Save Supplier" />
        </Modal>
      )}
      {kind === 'delete' && (
        <Modal title={`Delete ${s.company_name}?`} onClose={close}>
          <form action={deleteSupplier}>
            <input type="hidden" name="supplier_id" value={s.id} />
            <p className="mb-3 text-sm text-slate-600">This removes the supplier record. Linked purchases keep the supplier name as plain text.</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AddSupplierButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>+ Add Supplier</Btn>
      {open && (
        <Modal title="Add Supplier" sub="Company & contact details" onClose={() => setOpen(false)} wide>
          <SupplierForm action={addSupplier} submitLabel="Add Supplier" />
        </Modal>
      )}
    </>
  );
}
