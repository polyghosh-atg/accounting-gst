'use client';

import { useState, type ReactNode } from 'react';
import { Modal, Btn, IconBtn, fieldCls } from '@/components/ui';

export function AddButton({ label, title, action, children }: {
  label: string; title: string;
  action: (form: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>{label}</Btn>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          <form action={async (f) => { await action(f); setOpen(false); }} className="space-y-2.5">
            {children}
            <Btn type="submit" className="w-full">Save</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function RowButtons({ idName, id, editTitle, delText, editAction, delAction, children, wide }: {
  idName: string; id: number | string; editTitle: string; delText: string;
  editAction: (form: FormData) => void | Promise<void>;
  delAction: (form: FormData) => void | Promise<void>;
  children: ReactNode; wide?: boolean;
}) {
  const [kind, setKind] = useState<null | 'edit' | 'delete'>(null);
  const close = () => setKind(null);
  return (
    <>
      <div className="flex justify-end gap-1.5">
        <IconBtn icon="edit" label="Edit" tone="indigo" onClick={() => setKind('edit')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setKind('delete')} />
      </div>
      {kind === 'edit' && (
        <Modal title={editTitle} onClose={close} wide={wide}>
          <form action={async (f) => { await editAction(f); close(); }} className="space-y-2.5">
            <input type="hidden" name={idName} value={String(id)} />
            {children}
            <Btn type="submit" className="w-full">Save</Btn>
          </form>
        </Modal>
      )}
      {kind === 'delete' && (
        <Modal title="Delete?" onClose={close}>
          <form action={delAction}>
            <input type="hidden" name={idName} value={String(id)} />
            <p className="mb-3 text-sm text-slate-600">{delText}</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function StatusSelect({ name, value }: { name: string; value?: string }) {
  return (
    <select name={name} defaultValue={value || 'Active'} className={fieldCls}>
      <option>Active</option>
      <option>Inactive</option>
    </select>
  );
}

export function TableShell({ heads, children }: { heads: string[]; children: ReactNode }) {
  return (
    <div className="slim-scroll overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-slate-50/95">
          <tr>{heads.map((h) => (
            <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide text-slate-800">{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function SearchBar({ query, count, noun, children }: {
  query: string; count: number; noun: string; children?: ReactNode;
}) {
  return (
    <form method="GET" className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
      <span className="mr-auto text-sm text-slate-500">{count} {noun}</span>
      <input name="q" defaultValue={query} placeholder="Search..."
        className="w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white sm:w-52" />
      <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Search</button>
      {children}
    </form>
  );
}
