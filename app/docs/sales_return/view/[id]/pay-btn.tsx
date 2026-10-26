'use client';

import { useState } from 'react';
import { addReturnPayment } from '../../actions';

export function PayButton({ docId, refNo }: { docId: number; refNo: string }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const cls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100';
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-xl bg-purple-600 px-3.5 py-2 text-sm font-bold text-white shadow transition hover:bg-purple-700">
        ₹ Enter Payment
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Enter Payment">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-bold tracking-tight text-slate-900">Enter Payment</h3>
                <p className="mt-0.5 text-xs text-slate-500">Receipt against {refNo}</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg bg-slate-100 px-2.5 py-1 text-lg leading-none text-slate-500 hover:bg-slate-200" aria-label="Close">×</button>
            </div>
            <form action={async (f) => { await addReturnPayment(f); setOpen(false); }} className="space-y-2.5">
              <input type="hidden" name="doc_id" value={docId} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Amount *</label>
                  <input name="amount" required inputMode="decimal" placeholder="0.00" className={cls} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Date</label>
                  <input name="pay_date" type="date" defaultValue={today} className={cls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Mode</label>
                  <select name="pay_mode" defaultValue="Cash" className={cls}>
                    {['Cash', 'Cheque', 'NEFT/RTGS/Online Transfer', 'Credit Card'].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Reference</label>
                  <input name="ref_no" placeholder="Receipt no" className={cls} />
                </div>
              </div>
              <button className="w-full rounded-xl bg-purple-600 px-3.5 py-2 text-sm font-bold text-white shadow hover:bg-purple-700">Save Payment</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-xl bg-orange-500 px-3.5 py-2 text-sm font-bold text-white shadow transition hover:bg-orange-600 print:hidden">
      🖨 Download Sales Return
    </button>
  );
}
