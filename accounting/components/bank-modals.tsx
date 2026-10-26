'use client';

import { useState, useActionState } from 'react';
import { deposit, withdraw, transfer, addAccount, updateAccount, adjustCapital, toggleStatus, importAccounts } from '@/app/bank/actions';
import { Badge, statusTone, Modal, Btn, Pill, fieldCls, inr, Icon } from './ui';

export type Account = {
  id: number; name: string; type: string; number: string;
  bank_name: string; ifsc: string; description: string;
  opening: string; closing: string; status: string;
};

function MoneyForm({ action, accounts, presetId, submitLabel }: {
  action: (f: FormData) => Promise<void>;
  accounts: Account[];
  presetId?: number;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-2.5">
      {presetId ? <input type="hidden" name="account_id" value={presetId} /> : (
        <select name="account_id" className={fieldCls} required defaultValue="">
          <option value="">Select account *</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.bank_name})</option>)}
        </select>
      )}
      <input name="amount" type="number" step="0.01" min="0.01" required placeholder="Amount *" className={fieldCls} />
      <input name="reference_no" placeholder="Reference No (auto if blank)" className={fieldCls} />
      <Btn type="submit" className="w-full">{submitLabel}</Btn>
    </form>
  );
}

function ImportForm() {
  const [msg, act, pending] = useActionState(importAccounts, '');
  return (
    <form action={act} className="space-y-2.5">
      <input type="file" name="csvfile" accept=".csv" required
        className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="update_bank_account" value="1" defaultChecked className="h-4 w-4 accent-indigo-600" />
        Update existing bank account
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="create_bank_account" value="1" defaultChecked className="h-4 w-4 accent-indigo-600" />
        Create new bank account even if it exists
      </label>
      <p className="text-xs text-slate-500">Columns: AccountName, AccountNumber, AccountType, BankName, IFSC, Description, Status, OpeningBalance</p>
      <Btn type="submit" className="w-full">{pending ? 'Importing...' : 'Submit'}</Btn>
      {msg && <p className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800">{msg}</p>}
    </form>
  );
}

type ModalKind = null | 'deposit' | 'withdraw' | 'transfer' | 'add' | 'edit' | 'increase' | 'decrease' | 'import';

export default function BankActions({ accounts, total }: { accounts: Account[]; total: string }) {
  const [modal, setModal] = useState<ModalKind>(null);
  const [picked, setPicked] = useState<Account | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [menu, setMenu] = useState<number | null>(null);

  const open = (m: NonNullable<ModalKind>, a?: Account) => {
    setPicked(a ?? null);
    setModal(m);
    setMenu(null);
  };
  const close = () => setModal(null);

  const counts = {
    all: accounts.length,
    Active: accounts.filter((a) => a.status === 'Active').length,
    Inactive: accounts.filter((a) => a.status !== 'Active').length,
  };

  const visible = accounts.filter((a) => {
    if (status !== 'all' && (status === 'Active' ? a.status !== 'Active' : a.status === 'Active')) return false;
    const s = query.trim().toLowerCase();
    if (!s) return true;
    return [a.name, a.number, a.bank_name, a.ifsc, a.description, a.status].some((v) => (v || '').toLowerCase().includes(s));
  });

  const statusBtn = (a: Account) => (
    <form action={toggleStatus} title="Click to activate/deactivate">
      <input type="hidden" name="account_id" value={a.id} />
      <button><Badge tone={statusTone(a.status)}>{a.status}</Badge></button>
    </form>
  );

  const actionMenu = (a: Account) => (
    <div className="relative">
      <button
        onClick={() => setMenu(menu === a.id ? null : a.id)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
        aria-haspopup="menu" aria-expanded={menu === a.id}
      >
        Actions ▾
      </button>
      {menu === a.id && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
          <div className="absolute right-0 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {[
              ['eye', 'View', undefined, () => { window.location.href = `/bank/${a.id}`; }],
              ['transfer', 'Transfer', 'teal', () => open('transfer', a)],
              ['plus', 'Deposit', 'purple', () => open('deposit', a)],
              ['expense', 'Withdraw', 'orange', () => open('withdraw', a)],
              ['report', '↑ Increase', 'blue', () => open('increase', a)],
              ['report', '↓ Decrease', 'pink', () => open('decrease', a)],
              ['edit', 'Edit', 'indigo', () => open('edit', a)],
            ].map(([icon, label, , fn]) => (
              <button
                key={label as string}
                onClick={fn as () => void}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-800"
              >
                <Icon name={icon as string} className="h-3.5 w-3.5 opacity-60" />
                {label as string}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <div className="mr-auto flex items-center gap-2 px-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Balance</span>
          <span className="text-base font-extrabold tabular-nums text-slate-900">{total}</span>
        </div>
        <div className="flex overflow-hidden rounded-xl border border-slate-200" role="tablist" aria-label="Status filter">
          {(['all', 'Active', 'Inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-xs font-semibold transition ${status === s ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {s === 'all' ? `All (${counts.all})` : `${s} (${s === 'Active' ? counts.Active : counts.Inactive})`}
            </button>
          ))}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, bank, IFSC..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 sm:w-48" />
        <Btn tone="soft" onClick={() => open('import')}>⤓ Import</Btn>
        <Btn onClick={() => open('add')}>+ Add Account</Btn>
        <Btn tone="soft" onClick={() => open('deposit')}>Deposit</Btn>
        <Btn tone="soft" onClick={() => open('withdraw')}>Withdraw</Btn>
        <Btn tone="soft" onClick={() => open('transfer')}>Transfer</Btn>
      </div>
      {(query || status !== 'all') && (
        <p className="mb-2 text-xs text-slate-500">Showing {visible.length} of {accounts.length} accounts
          <button className="ml-2 font-semibold text-indigo-700 hover:underline" onClick={() => { setQuery(''); setStatus('all'); }}>Clear</button>
        </p>
      )}

      {/* mobile: stacked cards */}
      <div className="space-y-2.5 md:hidden">
        {visible.length === 0 && <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-8 text-center text-sm text-slate-400">No accounts match “{query}”</div>}
        {visible.map((a) => (
          <div key={a.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <a href={`/bank/${a.id}`} className="truncate font-bold text-slate-900">{a.name}</a>
              {statusBtn(a)}
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">{a.bank_name} · <span className="font-mono">{a.number}</span> · <span className="font-mono">{a.ifsc}</span></div>
            {a.description ? <div className="mt-0.5 truncate text-xs text-slate-400">{a.description}</div> : null}
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
              <span className="text-slate-500">Op. <span className="tabular-nums">{inr(a.opening)}</span></span>
              <span className="font-extrabold tabular-nums">Cl. {inr(a.closing)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <a href={`/bank/${a.id}`} className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white">View</a>
              {actionMenu(a)}
            </div>
          </div>
        ))}
      </div>

      {/* desktop: table */}
      <div className="slim-scroll hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] md:block">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>{['Account Name', 'Number', 'Bank', 'IFSC', 'Description', 'Opening', 'Closing', 'Status', 'Action'].map((h, i) => (
              <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i === 5 || i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">No accounts match “{query}”</td></tr>}
            {visible.map((a) => (
              <tr key={a.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">{a.name}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600">{a.number}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{a.bank_name}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600">{a.ifsc}</td>
                <td className="max-w-40 truncate px-3 py-2 text-slate-500">{a.description || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">{inr(a.opening)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums">{inr(a.closing)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <form action={toggleStatus} title="Click to activate/deactivate">
                    <input type="hidden" name="account_id" value={a.id} />
                    <button><Badge tone={statusTone(a.status)}>{a.status}</Badge></button>
                  </form>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{actionMenu(a)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'deposit' && (
        <Modal title="Deposit money" sub={picked ? `Cash on Hand → ${picked.name}` : 'Cash on Hand → account'} onClose={close}>
          <MoneyForm action={deposit} accounts={accounts} presetId={picked?.id} submitLabel="Deposit Money" />
        </Modal>
      )}
      {modal === 'withdraw' && (
        <Modal title="Withdraw money" sub={picked ? `${picked.name} → Cash on Hand` : 'Account → Cash on Hand'} onClose={close}>
          <MoneyForm action={withdraw} accounts={accounts} presetId={picked?.id} submitLabel="Withdraw Money" />
        </Modal>
      )}
      {(modal === 'increase' || modal === 'decrease') && (
        <Modal
          title={modal === 'increase' ? 'Increase Capital Amount' : 'Reduce Capital Amount'}
          sub={picked ? `${picked.name} · Current Balance (CB: ${picked.closing})` : undefined}
          onClose={close}
        >
          <form action={adjustCapital} className="space-y-2.5">
            {picked ? <input type="hidden" name="account_id" value={picked.id} /> : (
              <select name="account_id" className={fieldCls} required defaultValue="">
                <option value="">Select account *</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.bank_name})</option>)}
              </select>
            )}
            <input type="hidden" name="mode" value={modal} />
            <input name="amount" type="number" step="0.01" min="0.01" required placeholder="Amount *" className={fieldCls} />
            <input name="reference_no" defaultValue={modal === 'increase' ? 'INCREASE CAPITAL' : 'REDUCE CAPITAL'} className={fieldCls} />
            <Btn type="submit" className="w-full">{modal === 'increase' ? 'Increase' : 'Decrease'}</Btn>
          </form>
        </Modal>
      )}
      {modal === 'transfer' && (
        <Modal title="Transfer money" sub="Between bank accounts" onClose={close}>
          <form action={transfer} className="space-y-2.5">
            <select name="from_id" className={fieldCls} required defaultValue={picked?.id ?? ''}>
              <option value="">Transfer From *</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.bank_name})</option>)}
            </select>
            <select name="to_id" className={fieldCls} required defaultValue="">
              <option value="">Transfer To *</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.bank_name})</option>)}
            </select>
            <input name="amount" type="number" step="0.01" min="0.01" required placeholder="Amount *" className={fieldCls} />
            <input name="reference_no" placeholder="Reference No (auto if blank)" className={fieldCls} />
            <Btn type="submit" className="w-full">Transfer Money</Btn>
          </form>
        </Modal>
      )}
      {modal === 'add' && (
        <Modal title="Add Bank Account / Credit Card" onClose={close}>
          <form action={addAccount} className="space-y-2.5">
            <input name="account_name" required placeholder="Account Name *" className={fieldCls} />
            <select name="account_type" className={fieldCls} defaultValue="Saving">
              <option>Saving</option><option>Current</option><option>Credit</option>
            </select>
            <input name="account_number" required placeholder="Account Number/Credit Card No *" className={fieldCls} />
            <input name="bank_name" required placeholder="Bank Name *" className={fieldCls} />
            <input name="ifsc" required placeholder="IFSC *" className={fieldCls} />
            <input name="description" placeholder="Description" className={fieldCls} />
            <input name="opening_balance" type="number" step="0.01" required placeholder="Opening Balance *" className={fieldCls} />
            <Btn type="submit" className="w-full">Add Account</Btn>
          </form>
        </Modal>
      )}
      {modal === 'edit' && picked && (
        <Modal title={`Edit ${picked.name}`} onClose={close}>
          <form action={updateAccount} className="space-y-2.5">
            <input type="hidden" name="account_id" value={picked.id} />
            <input name="account_name" required defaultValue={picked.name} className={fieldCls} />
            <select name="account_type" className={fieldCls} defaultValue={picked.type || 'Saving'}>
              <option>Saving</option><option>Current</option><option>Credit</option>
            </select>
            <input name="account_number" defaultValue={picked.number} className={fieldCls} />
            <input name="bank_name" defaultValue={picked.bank_name} className={fieldCls} />
            <input name="ifsc" defaultValue={picked.ifsc} className={fieldCls} />
            <input name="description" defaultValue={picked.description} className={fieldCls} />
            <select name="status" className={fieldCls} defaultValue={picked.status}>
              <option>Active</option><option>Inactive</option>
            </select>
            <Btn type="submit" className="w-full">Save</Btn>
          </form>
        </Modal>
      )}
      {modal === 'import' && (
        <Modal title="Import Bank Account" sub="Bulk import from CSV file" onClose={close}>
          <ImportForm />
        </Modal>
      )}
    </>
  );
}
