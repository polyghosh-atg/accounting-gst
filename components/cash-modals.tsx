'use client';

import { useState } from 'react';
import { addEntry, updateEntry, deleteEntry, bulkAddEntries } from '@/app/account/cash-bank/actions';
import { Modal, Btn, IconBtn, fieldCls, inr } from '@/components/ui';

export type Entry = {
  id: number; ref_no: string; vouch_type: string; voucher_date: string;
  from_acct: string; to_acct: string; amount: string; narration: string;
};

const VTYPES = ['bank_payment', 'bank_receipt', 'cash_payment', 'cash_receipt', 'contra'];

function EntryForm({ action, initial, ledgers, submitLabel }: {
  action: (f: FormData) => Promise<void>;
  initial?: Partial<Entry>;
  ledgers: string[];
  submitLabel: string;
}) {
  const v = (k: keyof Entry) => {
    const val = initial?.[k] as string;
    if (k === 'voucher_date' && val) return String(val).slice(0, 10);
    return val || '';
  };
  return (
    <form action={action} className="space-y-2.5">
      {initial?.id ? <input type="hidden" name="entry_id" value={initial.id} /> : null}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input name="reference_no" defaultValue={v('ref_no')} placeholder="Reference No (auto if blank)" className={fieldCls} />
        <select name="voucher_type" required defaultValue={v('vouch_type') || 'bank_payment'} className={fieldCls}>
          {VTYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input name="voucher_date" type="date" defaultValue={v('voucher_date')} className={fieldCls} />
        <input name="amount" type="number" step="0.01" min="0.01" required defaultValue={v('amount')} placeholder="Amount *" className={fieldCls} />
        <input name="from_account" required defaultValue={v('from_acct')} placeholder="From Account *" list="ledgers" className={fieldCls} />
        <input name="to_account" required defaultValue={v('to_acct')} placeholder="To Account *" list="ledgers" className={fieldCls} />
        <input name="narration" defaultValue={v('narration')} placeholder="Narration" className={`${fieldCls} sm:col-span-2`} />
      </div>
      <datalist id="ledgers">
        {ledgers.map((l) => <option key={l} value={l} />)}
      </datalist>
      <Btn type="submit" className="w-full">{submitLabel}</Btn>
    </form>
  );
}

type Kind = null | 'add' | 'edit' | 'delete';

export function EntryButtons({ e, ledgers }: { e: Entry; ledgers: string[] }) {
  const [kind, setKind] = useState<Kind>(null);
  const close = () => setKind(null);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <IconBtn icon="edit" label="Edit" tone="indigo" onClick={() => setKind('edit')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setKind('delete')} />
      </div>
      {kind === 'edit' && (
        <Modal title={`Edit ${e.ref_no}`} onClose={close} wide>
          <EntryForm action={updateEntry} initial={e} ledgers={ledgers} submitLabel="Save Entry" />
        </Modal>
      )}
      {kind === 'delete' && (
        <Modal title={`Delete ${e.ref_no}?`} onClose={close}>
          <form action={deleteEntry}>
            <input type="hidden" name="entry_id" value={e.id} />
            <p className="mb-3 text-sm text-slate-600">Remove this voucher entry ({inr(e.amount)}).</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AddEntryButton({ ledgers }: { ledgers: string[] }) {
  const [open, setOpen] = useState(false);
  const [bulk, setBulk] = useState(false);
  return (
    <>
      <div className="flex gap-2">
        <Btn onClick={() => setOpen(true)}>+ Add Entry</Btn>
        <Btn tone="soft" onClick={() => setBulk(true)}>Bulk Entry</Btn>
      </div>
      {open && (
        <Modal title="Cash Bank Entry" sub="Voucher with from/to ledgers" onClose={() => setOpen(false)} wide>
          <EntryForm action={addEntry} ledgers={ledgers} submitLabel="Add Entry" />
        </Modal>
      )}
      {bulk && (
        <Modal title="Bulk Entry" sub="Stage vouchers with Add, then Submit" onClose={() => setBulk(false)} xl>
          <BulkForm ledgers={ledgers} />
        </Modal>
      )}
    </>
  );
}

type BulkRow = { voucher_type: string; reference_no: string; voucher_date: string; from_account: string; to_account: string; amount: string; narration: string };

const emptyRow = (): BulkRow => ({
  voucher_type: '', reference_no: '',
  voucher_date: new Date().toISOString().slice(0, 10),
  from_account: '', to_account: '', amount: '', narration: '',
});

function BulkForm({ ledgers }: { ledgers: string[] }) {
  const [draft, setDraft] = useState<BulkRow>(emptyRow());
  const [staged, setStaged] = useState<BulkRow[]>([]);
  const [err, setErr] = useState('');
  const setD = (k: keyof BulkRow, v: string) => setDraft({ ...draft, [k]: v });

  const addRow = () => {
    if (!draft.voucher_type) return setErr('Select a Voucher Type.');
    if (!draft.from_account.trim()) return setErr('Select a From Account.');
    if (!draft.to_account.trim()) return setErr('Select a To Account.');
    if (!(parseFloat(draft.amount) > 0)) return setErr('Enter an Amount.');
    setErr('');
    setStaged([...staged, draft]);
    setDraft({ ...emptyRow(), voucher_type: draft.voucher_type });
  };

  const total = staged.reduce((a, r) => a + (parseFloat(r.amount) || 0), 0);
  return (
    <form action={bulkAddEntries} onSubmit={(e) => {
      if (!staged.length) { e.preventDefault(); setErr('Add at least one row to the table below.'); }
    }}>
      <input type="hidden" name="rows" value={JSON.stringify(staged)} />
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>
              <th className="px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-700" style={{ width: '15%' }}>Voucher Type</th>
              <th className="px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-700" style={{ width: '15%' }}>Voucher Date</th>
              <th className="px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-700" style={{ width: '15%' }}>From Account</th>
              <th className="px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-700" style={{ width: '15%' }}>To Account</th>
              <th className="px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-700" style={{ width: '15%' }}>Amount</th>
              <th className="px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-700" style={{ width: '20%' }}>Narration</th>
              <th className="px-2 py-2" style={{ width: '5%' }}></th>
            </tr>
            <tr className="border-t border-slate-200 bg-white">
              <td className="px-1.5 py-1.5">
                <select value={draft.voucher_type} onChange={(e) => setD('voucher_type', e.target.value)} className={fieldCls}>
                  <option value="">Select</option>
                  {VTYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </td>
              <td className="px-1.5 py-1.5"><input value={draft.voucher_date} onChange={(e) => setD('voucher_date', e.target.value)} type="date" className={fieldCls} /></td>
              <td className="px-1.5 py-1.5">
                <select value={draft.from_account} onChange={(e) => setD('from_account', e.target.value)} className={fieldCls}>
                  <option value="">Select</option>
                  {ledgers.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </td>
              <td className="px-1.5 py-1.5">
                <select value={draft.to_account} onChange={(e) => setD('to_account', e.target.value)} className={fieldCls}>
                  <option value="">Select</option>
                  {ledgers.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </td>
              <td className="px-1.5 py-1.5"><input value={draft.amount} onChange={(e) => setD('amount', e.target.value)} placeholder="Amount" type="number" step="any" min="0" className={fieldCls} /></td>
              <td className="px-1.5 py-1.5"><input value={draft.narration} onChange={(e) => setD('narration', e.target.value)} placeholder="Narration" className={fieldCls} /></td>
              <td className="px-1.5 py-1.5">
                <button type="button" onClick={addRow} className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-sm font-bold text-white shadow hover:opacity-95">Add</button>
              </td>
            </tr>
          </thead>
          <tbody id="cash_bank_entry_table_body" className="divide-y divide-slate-100">
            {staged.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-400">Fill the row above and press Add — staged vouchers appear here.</td></tr>
            )}
            {staged.map((r, i) => (
              <tr key={i} className="odd:bg-white even:bg-slate-50/50">
                <td className="px-2 py-1.5 text-xs">{r.voucher_type}</td>
                <td className="px-2 py-1.5 text-xs">{r.voucher_date}</td>
                <td className="px-2 py-1.5 text-xs">{r.from_account}</td>
                <td className="px-2 py-1.5 text-xs">{r.to_account}</td>
                <td className="px-2 py-1.5 text-right text-xs font-bold tabular-nums">{r.amount}</td>
                <td className="max-w-32 truncate px-2 py-1.5 text-xs text-slate-500">{r.narration}</td>
                <td className="px-2 py-1.5">
                  <button type="button" onClick={() => setStaged(staged.filter((_, j) => j !== i))} className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700" aria-label={`Remove row ${i + 1}`}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id="ledgers">{ledgers.map((l) => <option key={l} value={l} />)}</datalist>
      {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{err}</p>}
      <div className="flex items-center justify-between pt-1">
        <span className="text-sm text-slate-600">{staged.length} staged · Total <b className="tabular-nums">{inr(total)}</b></span>
        <Btn type="submit">Submit</Btn>
      </div>
    </form>
  );
}
