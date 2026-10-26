import { q, inr } from '@/lib/db';
import { amountInWords } from '@/lib/numwords';
import { isoDate } from '../../../proforma_invoice/dates';
import { PayButton, PrintButton } from './pay-btn';

// Reads the return from DB — must block on the server, no static shell.
export const instant = false;

const num = (v: unknown) => Number(v ?? 0) || 0;

export default async function SalesReturnView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await q(`SELECT * FROM doc_headers WHERE id=$1 AND doc_type='sales_return'`, [id]);
  const d = h[0];
  if (!d) return <div>Not found. <a className="text-indigo-700 hover:underline" href="/reports/sales_return">Back to report</a></div>;
  const lines = await q('SELECT * FROM doc_lines WHERE doc_type=$1 AND doc_legacy_id=$2 ORDER BY line_no', ['sales_return', String(d.legacy_id ?? id)]);
  const [co] = await q('SELECT * FROM company_settings ORDER BY id LIMIT 1');
  const company = (co ?? {}) as Record<string, unknown>;
  const [cu] = await q('SELECT * FROM customers WHERE company_name=$1 LIMIT 1', [String(d.party ?? '')]);
  const customer = (cu ?? {}) as Record<string, unknown>;
  const payRows = await q(
    `SELECT COALESCE(SUM(amount),0) t FROM transactions WHERE module='Sales Return' AND txn_type='Receipt' AND entry_id=$1`,
    [String(d.legacy_id ?? id)]);
  const paid = num(payRows[0]?.t);
  const total = num(d.total);
  const balance = total - paid;
  const rounded = Math.round(total * 100) / 100 - total;
  const dstr = isoDate(d.doc_date) ?? '';
  const tTaxable = lines.reduce((a, l) => a + num(l.taxable), 0) || num(d.taxable);
  const tI = num(d.igst), tC = num(d.cgst), tS = num(d.sgst);
  const lineTax = (taxable: number) => {
    if (!tTaxable) return { igst: 0, cgst: 0, sgst: 0 };
    const share = taxable / tTaxable;
    return { igst: tI * share, cgst: tC * share, sgst: tS * share };
  };
  const addr = (o: Record<string, unknown>, extra?: string) => (
    <address className="text-sm not-italic leading-relaxed text-slate-700">
      <strong className="text-slate-900">{String(o.name || o.company_name || '')}</strong><br />
      {String(o.addr1 || o.address || '')}<br />
      {String(o.addr2 || '') ? <>{String(o.addr2)}<br /></> : null}
      {[o.city, o.state, o.country].filter(Boolean).join(', ')}{String(o.pincode ? `, ${o.pincode}` : '')}<br />
      {String(o.phone || o.mobile || '') && <>Phone: {String(o.phone || o.mobile)}<br /></>}
      {String(o.email || '') && <>Email: {String(o.email)}<br /></>}
      {String(o.gstin || '') && <><strong>GSTIN: {String(o.gstin)}</strong><br /></>}
      {extra}
    </address>
  );
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm print:hidden">
        <h3 className="mb-2 text-sm font-extrabold tracking-wide text-slate-800">Shortcuts</h3>
        <div className="flex flex-wrap gap-2">
          <PayButton docId={Number(id)} refNo={String(d.ref_no)} />
          <PrintButton />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-2.5">
          <h2 className="text-sm font-extrabold tracking-wide text-slate-800">View Sales return</h2>
        </div>
        <div className="relative p-4 sm:p-6">
          <div className={`absolute right-6 top-4 rotate-3 rounded border-2 px-3 py-0.5 text-sm font-extrabold uppercase tracking-widest ${balance <= 0 && total > 0 ? 'border-emerald-500 text-emerald-600' : 'border-rose-500 text-rose-600'}`}>
            {balance <= 0 && total > 0 ? 'Paid' : 'Unpaid'}
          </div>
          <p className="text-center text-sm font-bold text-slate-800">Credit Note/Sales Return UNDER GST ACT<br />Credit Note for Recipient</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-extrabold text-slate-900">🌐 {String(company.name || 'Office ERP')}</h4>
            <span className="ml-auto text-sm text-slate-500">Date: <b className="text-slate-800">{dstr}</b></span>
          </div>
          <div className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Supplier</div>
              {addr(company as Record<string, unknown>)}
            </div>
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Name &amp; Address of the Customer</div>
              {addr({ ...(customer as object), company_name: d.party })}
            </div>
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Sales return Details</div>
              <p className="text-sm text-slate-700"><b>Sales return #</b>{String(d.ref_no)}{d.invoice_no ? <span className="text-slate-500"> · inv {String(d.invoice_no)}</span> : null}</p>
            </div>
          </div>
          <div className="slim-scroll mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-xs">
              <thead>
                <tr className="border-y-2 border-slate-800">
                  {['Sr.', 'Items', 'HSN', 'Qty', 'Price (Rs)', 'Batch No', 'Discount (Rs)', 'UOM', 'Total Taxable Value (Rs)', 'Tax (Rs)', 'Sub Total (Rs)'].map((c) => (
                    <th key={c} className="whitespace-nowrap px-2 py-2 text-left font-bold text-slate-900">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lines.map((l, i) => {
                  const tx = num(l.taxable);
                  const t = lineTax(tx);
                  const rate = tx > 0 ? ((t.igst + t.cgst + t.sgst) / tx) * 100 : 0;
                  const lbl = t.igst > 0.004 ? 'IGST' : t.cgst > 0.004 ? 'CGST' : t.sgst > 0.004 ? 'SGST' : 'Tax';
                  const amt = Math.max(t.igst, t.cgst, t.sgst, num(l.subtotal) - tx);
                  const unit = num(l.price) > 0 ? num(l.price) : (num(l.qty) > 0 ? tx / num(l.qty) : 0);
                  return (
                    <tr key={i}>
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5 font-semibold">{String(l.item_name)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 font-mono">{String(l.hsn || '')}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{String(l.qty)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{inr(unit)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">—</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{inr(0)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">—</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{inr(l.taxable)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{lbl} : {inr(amt)}{rate > 0 ? ` (${rate.toFixed(2)}%)` : ''}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right font-bold tabular-nums">{inr(l.subtotal)}</td>
                    </tr>
                  );
                })}
                {lines.length === 0 && <tr><td colSpan={11} className="px-3 py-6 text-center text-slate-400">No line items captured for this return</td></tr>}
              </tbody>
              <tfoot className="text-sm font-extrabold">
                <tr className="border-t-2 border-slate-800">
                  <td colSpan={3} className="px-2 py-1.5">Total Amount Due</td>
                  <td className="px-2 py-1.5 tabular-nums">{lines.reduce((a, l) => a + num(l.qty), 0)}</td>
                  <td className="px-2 py-1.5"></td><td className="px-2 py-1.5"></td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{inr(0)}</td>
                  <td></td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{inr(tTaxable)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{inr(tI + tC + tS)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{inr(total)}</td>
                </tr>
                <tr><td colSpan={10} className="px-2 py-1.5">Rounded Off</td><td className="px-2 py-1.5 text-right tabular-nums">{inr(rounded)}</td></tr>
                <tr><td colSpan={10} className="px-2 py-1.5">Paid Amount</td><td className="px-2 py-1.5 text-right tabular-nums">{paid > 0 ? inr(paid) : ''}</td></tr>
                <tr><td colSpan={10} className="px-2 py-1.5">Balance Payable</td><td className="px-2 py-1.5 text-right tabular-nums">{inr(balance)}</td></tr>
                <tr><td colSpan={5} className="px-2 py-1.5">Amount in Words</td><td colSpan={6} className="px-2 py-1.5 text-right font-bold capitalize">{amountInWords(total)}</td></tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3 print:grid-cols-3">
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Terms &amp; Condition</div>
              <ol className="list-decimal pl-5 text-xs leading-relaxed text-slate-600">
                <li>Subject to Ahmedabad Jurisdiction</li>
                <li>Our responsibility ceases as soon as the goods leave our premises.</li>
                <li>Goods once sold will not be taken back.</li>
                <li>Delivery ex-premises.</li>
              </ol>
            </div>
            <div></div>
            <div className="text-sm text-slate-700">
              Certified that the particulars given above are true and correct
              <div className="mt-8">For, <b className="uppercase">{String(company.name || '')}</b><br /><br /><br />Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
