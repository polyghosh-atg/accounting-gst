import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, Card, LoadingRows, Badge } from '@/components/ui';
import { ExpenseButtons, type Expense } from '@/components/expense-modals';
import Link from 'next/link';

export default function ExpenseDetail({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await q<Expense>('SELECT * FROM expenses WHERE id=$1', [id]);
  if (!rows.length) return <div>Not found. <Link className="text-indigo-700" href="/expenses">Back</Link></div>;
  const e = rows[0];
  const items = await q('SELECT item_name, taxable, igst, cgst, sgst FROM expense_items WHERE expense_id=$1 ORDER BY id', [id]);
  const txns = await q(
    `SELECT voucher_date, pay_mode, amount FROM transactions
     WHERE (entry_id IS NOT DISTINCT FROM $1 OR expense_id = $2) ORDER BY voucher_date, id`,
    [e.legacy_id, id]
  );
  const cats = await q<{ name: string }>('SELECT name FROM expense_categories UNION SELECT DISTINCT category AS name FROM expenses ORDER BY 1');
  const sups = await q<{ company_name: string }>('SELECT company_name FROM suppliers ORDER BY company_name');
  const accs = await q<{ name: string }>(`SELECT name FROM bank_accounts UNION SELECT 'CASH ACCOUNT' ORDER BY 1`);
  const fields: [string, string][] = [
    ['Bill Date', e.bill_date ? String(e.bill_date).slice(0, 10) : '—'],
    ['Expense Category', e.category], ['Name of Supplier', e.supplier],
    ['Taxable Amount', inr(e.taxable)], ['CGST', inr(e.cgst)], ['SGST', inr(e.sgst)],
    ['IGST', inr(e.igst)], ['Total Amount', inr(e.total)], ['Remarks', e.remarks || '—'],
    ['Eligible for ITC', e.itc || 'No'], ['Expense Documents', '—'],
  ];
  const paidPct = Number(e.total) > 0 ? Math.min(100, Math.round(Number(e.paid) / Number(e.total) * 100)) : 0;
  return (
    <div className="space-y-4">
      <PageHeader
        title={`View Expense — ${e.category}`}
        sub={`${e.supplier} · ${e.bill_date ? String(e.bill_date).slice(0, 10) : ''}`}
        actions={<>
          <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href="/expenses">← Expenses</Link>
          <ExpenseButtons e={e} categories={cats.map((c) => c.name)} suppliers={sups.map((s) => s.company_name)} accounts={accs.map((a) => a.name)} />
        </>}
      />
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-900 p-4 text-white shadow-lg sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300">Total Amount</div>
            <div className="text-3xl font-extrabold tabular-nums">{inr(e.total)}</div>
            <div className="mt-1 text-xs text-indigo-200">{e.bill_date ? String(e.bill_date).slice(0, 10) : ''} · {e.supplier}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">Paid {paidPct}%</div>
            <div className="mt-1 text-sm font-bold tabular-nums">{inr(e.paid)} <span className="font-normal text-indigo-200">/ due {inr(e.due)}</span></div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300" style={{ width: `${paidPct}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">{e.category}</span>
          {e.itc === 'Yes'
            ? <span className="rounded-full bg-emerald-400/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-100">ITC eligible</span>
            : <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-200">No ITC</span>}
          {Number(e.due) > 0
            ? <span className="rounded-full bg-amber-400/25 px-2.5 py-0.5 text-[11px] font-semibold text-amber-100">Due {inr(e.due)}</span>
            : <span className="rounded-full bg-emerald-400/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-100">Settled</span>}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-400">Bill details</div>
          <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {fields.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-2 text-sm">
                <dt className="shrink-0 text-slate-500">{k}</dt>
                <dd className="truncate text-right font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">Tax split</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {([
              ['CGST', e.cgst, 'bg-sky-50 ring-sky-100'],
              ['SGST', e.sgst, 'bg-teal-50 ring-teal-100'],
              ['IGST', e.igst, 'bg-violet-50 ring-violet-100'],
            ] as const).map(([k, v, cls]) => (
              <div key={k} className={`rounded-xl px-2 py-2.5 ring-1 ring-inset ${cls}`}>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{k}</div>
                <div className="text-sm font-extrabold tabular-nums text-slate-800">{inr(v)}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-inset ring-slate-100">
            <span className="text-slate-500">Taxable Amount</span>
            <span className="float-right font-extrabold tabular-nums">{inr(e.taxable)}</span>
          </div>
          {e.remarks && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs italic text-amber-800 ring-1 ring-inset ring-amber-100">“{e.remarks}”</p>}
        </Card>
      </div>
      <div>
        <h2 className="mb-2 flex items-center gap-2 font-bold text-slate-900">
          Items <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">{items.length}</span>
        </h2>
        <div className="slim-scroll overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-950 to-violet-900 text-white">
              {['Sr. No', 'Item Name', 'Taxable Amount', 'IGST', 'CGST', 'SGST'].map((h, i) => (
                <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[12px] font-bold uppercase tracking-wide ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No item rows</td></tr>}
              {items.map((it, i) => {
                const t = Number(it.taxable || 0);
                const rate = (v: string) => (t > 0 ? `(${(Number(v || 0) * 100 / t).toFixed(2)} %)` : '(0.00 %)');
                return (
                  <tr key={i} className="transition-colors odd:bg-white even:bg-indigo-50/40 hover:bg-indigo-50/70">
                    <td className="px-3 py-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span></td>
                    <td className="px-3 py-2 font-semibold">{String(it.item_name)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{inr(it.taxable)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{inr(it.igst)} <span className="text-[11px] text-slate-400">{rate(String(it.igst))}</span></td>
                    <td className="px-3 py-2 text-right tabular-nums">{inr(it.cgst)} <span className="text-[11px] text-slate-400">{rate(String(it.cgst))}</span></td>
                    <td className="px-3 py-2 text-right tabular-nums">{inr(it.sgst)} <span className="text-[11px] text-slate-400">{rate(String(it.sgst))}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h2 className="mb-2 flex items-center gap-2 font-bold text-slate-900">
          Transaction <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{txns.length}</span>
        </h2>
        <div className="slim-scroll overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50/95">
              <tr>{['Sr. No', 'Expense Category', 'From Account', 'To Account', 'Transaction Date', 'Amount (Rs)'].map((h, i) => (
                <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {txns.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No payments recorded yet — use Make Payment.</td></tr>}
              {txns.map((t, i) => (
                <tr key={i} className="odd:bg-white even:bg-slate-50/50">
                  <td className="px-3 py-2 tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2">{e.category}</td>
                  <td className="whitespace-nowrap px-3 py-2">{String(t.pay_mode || 'Cash')}</td>
                  <td className="whitespace-nowrap px-3 py-2">{e.supplier}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{t.voucher_date ? String(t.voucher_date).slice(0, 10) : ''}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{inr(t.amount)}</td>
                </tr>
              ))}
            </tbody>
            {txns.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={5} className="px-3 py-2"></td>
                  <td className="px-3 py-2 text-right tabular-nums">Rs {inr(txns.reduce((a, t) => a + Number(t.amount || 0), 0)).replace('Rs ', '')}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
