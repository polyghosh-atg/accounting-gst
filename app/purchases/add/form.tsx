'use client';

import { useState } from 'react';
import { addPurchase } from '../actions';

type Line = { name: string; qty: string; price: string };

export function AddForm({ suppliers, warehouses, products }: { suppliers: string[]; warehouses: string[]; products: string[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [lines, setLines] = useState<Line[]>([{ name: '', qty: '1', price: '' }]);
  const [discount, setDiscount] = useState('0');

  const set = (i: number, k: keyof Line, v: string) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const addRow = () => setLines((ls) => [...ls, { name: '', qty: '1', price: '' }]);
  const delRow = (i: number) => setLines((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));

  const taxable = lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
  const total = taxable - (Number(discount) || 0);
  const inr = (n: number) => 'Rs ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const cls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100';

  return (
    <form action={addPurchase} className="space-y-4">
      <input type="hidden" name="lines_json" value={JSON.stringify(lines.map((l) => ({ name: l.name.trim(), qty: Number(l.qty) || 0, price: Number(l.price) || 0 })))} />
      <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:grid-cols-6">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">PO No</label>
          <input name="po_no" placeholder="PO…" className={cls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Invoice No</label>
          <input name="inv_no" placeholder="Invoice…" className={cls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Purchase Date</label>
          <input name="doc_date" type="date" defaultValue={today} className={cls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Warehouse</label>
          <select name="warehouse" defaultValue="" className={cls}>
            <option value="">—</option>
            {warehouses.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-slate-700">Supplier *</label>
          <input name="supplier" required list="pur-suppliers" placeholder="Supplier name" className={cls} />
          <datalist id="pur-suppliers">{suppliers.map((s, i) => <option key={`${s}-${i}`} value={s} />)}</datalist>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead className="bg-gradient-to-r from-indigo-50/95 via-slate-50/95 to-violet-50/95">
            <tr>
              {['Item', 'Qty', 'Cost', 'Amount', ''].map((h) => (
                <th key={h} className="whitespace-nowrap px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-800">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l, i) => {
              const amt = (Number(l.qty) || 0) * (Number(l.price) || 0);
              return (
                <tr key={i} className="odd:bg-white even:bg-slate-50/50">
                  <td className="px-2.5 py-1.5">
                    <input value={l.name} onChange={(e) => set(i, 'name', e.target.value)} list="pur-products" placeholder="Item name" className={cls} />
                  </td>
                  <td className="px-2.5 py-1.5"><input value={l.qty} onChange={(e) => set(i, 'qty', e.target.value)} inputMode="decimal" className={`${cls} w-20 text-right tabular-nums`} /></td>
                  <td className="px-2.5 py-1.5"><input value={l.price} onChange={(e) => set(i, 'price', e.target.value)} inputMode="decimal" placeholder="0.00" className={`${cls} w-28 text-right tabular-nums`} /></td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right font-bold tabular-nums text-slate-900">{inr(amt)}</td>
                  <td className="px-2.5 py-1.5">
                    <button type="button" onClick={() => delRow(i)} title="Remove row" className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <datalist id="pur-products">{products.map((p, i) => <option key={`${p}-${i}`} value={p} />)}</datalist>
      </div>
      <button type="button" onClick={addRow} className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-3.5 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50">+ Add row</button>

      <div className="ml-auto w-full max-w-xs space-y-1.5 rounded-2xl border border-slate-200/80 bg-white p-4 text-sm shadow-sm">
        <div className="flex justify-between text-slate-600"><span>Taxable</span><b className="tabular-nums">{inr(taxable)}</b></div>
        <div className="flex items-center justify-between gap-2 text-slate-600">
          <span>Discount</span>
          <input name="discount" value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-indigo-400" />
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-1.5 text-base font-extrabold text-slate-900"><span>Total</span><span className="tabular-nums">{inr(total)}</span></div>
        <button className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-sm font-bold text-white shadow hover:opacity-95">Save Purchase</button>
      </div>
    </form>
  );
}
