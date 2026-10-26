'use client';

import { useState } from 'react';
import { addStatement, deleteStatement, reconcileLines } from '@/app/account/bank-statement/actions';
import { Modal, Btn, IconBtn, fieldCls, Badge, inr } from '@/components/ui';

export type Statement = {
  id: number; account_name: string; account_number: string; account_type: string;
  bank_name: string; statement: string; file_path: string; reconcile_status: string;
};

export type StmtLine = {
  id: number; sr: number; txn_date: string; cheque_no: string; particulars: string;
  withdraw: string; deposit: string; reconciled: string;
};

export type Voucher = { ref_no: string; vouch_type: string; voucher_date: string; from_acct: string; to_acct: string; amount: string };

export type Txn = {
  id: number; module: string; txn_type: string; ref_no: string; voucher_date: string;
  pay_mode: string; cheque_no: string; cheque_date: string; amount: string;
};

function ReconcileModal({ s, lines, txns, onClose }: {
  s: Statement; lines: StmtLine[]; txns: Txn[]; onClose: () => void;
}) {
  const [picking, setPicking] = useState<number | null>(null);
  const [checked, setChecked] = useState<Record<number, number[]>>({});
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const toggleCheck = (lineId: number, txnId: number) => {
    const cur = checked[lineId] || [];
    setChecked({ ...checked, [lineId]: cur.includes(txnId) ? cur.filter((x) => x !== txnId) : [...cur, txnId] });
  };

  const filtered = () => {
    const q = search.trim().toLowerCase();
    if (!q) return txns;
    return txns.filter((t) =>
      [t.module, t.txn_type, t.ref_no, t.pay_mode, t.cheque_no, t.amount].some((v) => String(v || '').toLowerCase().includes(q)));
  };
  const list = filtered();

  return (
    <Modal title="Reconcile Bank Statement" onClose={onClose} xl>
      <form action={reconcileLines}>
        <input type="hidden" name="statement_id" value={s.id} />
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50/95">
              <tr>{['Bank Account', 'Account Number', 'Cheque No', 'Particulars', 'Withdraw', 'Deposit', 'Status', 'Action'].map((h, i) => (
                <th key={h} className={`whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-700 ${i === 4 || i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-400">No parsed lines — upload an .xlsx statement to reconcile.</td></tr>
              )}
              {lines.map((l) => (
                <>
                  <tr key={l.id} className="odd:bg-white even:bg-slate-50/50">
                    <td className="whitespace-nowrap px-2 py-1.5">{s.account_name}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-xs">{s.account_number}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-xs">{l.cheque_no || '—'}</td>
                    <td className="max-w-40 truncate px-2 py-1.5">{l.particulars}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{inr(l.withdraw)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{inr(l.deposit)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5">
                      <Badge tone={l.reconciled === 'Completed' ? 'green' : 'amber'}>{l.reconciled}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5">
                      {picking === l.id ? (
                        <div className="flex gap-1">
                          <button type="submit" className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700">Save</button>
                          <button type="button" onClick={() => setPicking(null)} className="rounded-lg bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-200">Cancel</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setPicking(l.id)} className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-bold text-white hover:bg-indigo-700">
                          ⇄ Reconcile
                        </button>
                      )}
                    </td>
                  </tr>
                  {picking === l.id && (
                    <tr key={`${l.id}-pick`}>
                      <td colSpan={8} className="bg-indigo-50/50 px-2 py-2">
                        <div className="mb-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                          <input
                            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions..."
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
                          />
                          <input name={`remarks_${l.id}`} placeholder="Remarks:" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                          <input name={`date_${l.id}`} type="date" defaultValue={today} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                        </div>
                        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full min-w-[680px] text-xs">
                            <thead className="sticky top-0 bg-slate-100">
                              <tr>{['#', 'Module', 'Transaction Type', 'Reference No', 'Voucher Date', 'Payment Mode', 'Cheque No', 'Cheque Date', 'Amount'].map((h, i) => (
                                <th key={h} className={`whitespace-nowrap px-2 py-1.5 text-[11px] font-bold uppercase text-slate-600 ${i === 8 ? 'text-right' : 'text-left'}`}>{h}</th>
                              ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {list.map((t) => (
                                <tr key={t.id} className="hover:bg-indigo-50/50">
                                  <td className="px-2 py-1">
                                    <input
                                      type="checkbox" checked={(checked[l.id] || []).includes(t.id)}
                                      onChange={() => toggleCheck(l.id, t.id)} className="h-4 w-4 accent-indigo-600"
                                    />
                                  </td>
                                  <td className="whitespace-nowrap px-2 py-1">{t.module}</td>
                                  <td className="whitespace-nowrap px-2 py-1">{t.txn_type}</td>
                                  <td className="whitespace-nowrap px-2 py-1 font-mono">{t.ref_no}</td>
                                  <td className="whitespace-nowrap px-2 py-1">{t.voucher_date ? String(t.voucher_date).slice(0, 10) : ''}</td>
                                  <td className="whitespace-nowrap px-2 py-1">{t.pay_mode}</td>
                                  <td className="whitespace-nowrap px-2 py-1 font-mono">{t.cheque_no}</td>
                                  <td className="whitespace-nowrap px-2 py-1">{t.cheque_date ? String(t.cheque_date).slice(0, 10) : ''}</td>
                                  <td className="whitespace-nowrap px-2 py-1 text-right font-bold tabular-nums">{inr(t.amount)}</td>
                                </tr>
                              ))}
                              {list.length === 0 && (
                                <tr><td colSpan={9} className="px-2 py-6 text-center text-slate-400">No transactions match.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <input type="hidden" name={`match_${l.id}`} value={(checked[l.id] || []).join(', ')} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">Close</button>
        </div>
      </form>
    </Modal>
  );
}

export function StatementButtons({ s, lines, txns }: {
  s: Statement; lines: StmtLine[]; txns: Txn[];
}) {
  const [modal, setModal] = useState<null | 'delete' | 'reconcile'>(null);
  const close = () => setModal(null);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <IconBtn icon="eye" label="View" tone="slate" href={`/account/bank-statement/${s.id}`} />
        <IconBtn icon="transfer" label="Reconcile" tone="blue" onClick={() => setModal('reconcile')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setModal('delete')} />
      </div>
      {modal === 'reconcile' && (
        <ReconcileModal s={s} lines={lines} txns={txns} onClose={close} />
      )}
      {modal === 'delete' && (
        <Modal title="Delete statement?" onClose={close}>
          <form action={deleteStatement}>
            <input type="hidden" name="statement_id" value={s.id} />
            <p className="mb-3 text-sm text-slate-600">Remove statement <b className="font-mono">{s.statement}</b> for {s.account_name} with its parsed lines.</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AddStatementButton({ accounts }: { accounts: { name: string; number: string; ifsc: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>+ Add Statement</Btn>
      {open && (
        <Modal title="Add Bank Statement" onClose={() => setOpen(false)}>
          <form action={addStatement} className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-600">Bank Account</label>
            <select name="bank_account" required defaultValue="" className={fieldCls}>
              <option value="">Select</option>
              {accounts.map((a) => <option key={a.name} value={`${a.name}||${a.number}`}>{a.name} - {a.number} - {a.ifsc}</option>)}
            </select>
            <label className="block text-xs font-bold text-slate-600">Statement *</label>
            <input type="file" name="statement_file" accept=".xlsx" required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
            <input type="hidden" name="statement" value="" />
            <div className="rounded-xl bg-amber-100/70 p-3 text-sm text-slate-700">
              Download sample file
              <a href="/sample-files/sample_bank_statement.xlsx" download className="float-right rounded-lg bg-cyan-600 px-3 py-1 text-xs font-bold text-white hover:bg-cyan-700">Click here to Download</a>
            </div>
            <Btn type="submit" className="w-full">Submit</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function DownloadIcon({ s }: { s: Statement }) {
  if (!s.file_path) return <span className="font-mono text-xs">{s.statement}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-xs">{s.statement}</span>
      <a href={s.file_path} download title={`Download ${s.statement}`} aria-label={`Download ${s.statement}`}
        className="inline-flex items-center justify-center rounded-lg bg-emerald-50 p-1.5 text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
      </a>
    </span>
  );
}
