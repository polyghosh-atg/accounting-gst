import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { LoadingRows, Btn } from '@/components/ui';
import AutoPrint from '@/components/autoprint';
import { ScrapButtons } from '@/components/scrap-modals';
import Link from 'next/link';

const KIND = { entry: 'Scrap Entry', issue: 'Scrap Issue', receive: 'Scrap Receive' } as const;

export default function ScrapDetail({ params, searchParams }: {
  params: Promise<{ kind: string; id: string }>; searchParams: Promise<{ print?: string }>;
}) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: {
  params: Promise<{ kind: string; id: string }>; searchParams: Promise<{ print?: string }>;
}) {
  const { kind, id } = await params;
  const print = (await searchParams).print === '1';
  const rows = await q('SELECT * FROM scrap_docs WHERE id=$1 AND kind=$2', [id, kind]);
  if (!rows.length) return <div>Not found.</div>;
  const d = rows[0];
  const lines = await q('SELECT product, batch_no, qty, cost, selling_price, price, warehouse, tax_label, tax_rate, tax_amt FROM scrap_lines WHERE doc_id=$1 ORDER BY id', [id]);
  const co = await q('SELECT * FROM company_settings LIMIT 1').then((r) => r[0] || {});
  const sup = d.party
    ? await q('SELECT * FROM suppliers WHERE company_name=$1 LIMIT 1', [d.party]).then((r) => r[0])
    : null;
  const qty = lines.reduce((a, l) => a + Number(l.qty || 0), 0);
  const tax = lines.reduce((a, l) => a + Number(l.qty || 0) * Number(l.cost || 0), 0);
  const taxAmt = lines.reduce((a, l) => a + Number(l.tax_amt || 0), 0);
  const amt = tax + taxAmt;
  const costSum = lines.reduce((a, l) => a + Number(l.cost || 0), 0);
  const back = kind === 'entry' ? '/account/scrap-entry' : kind === 'issue' ? '/account/scrap-issue' : '/account/scrap-receive';
  const partyLabel = kind === 'issue' ? 'Supplier' : 'Customer';
  const [wh, prods, custs, sups, taxRows] = await Promise.all([
    q<{ name: string }>('SELECT name FROM warehouses ORDER BY name'),
    q<{ name: string }>('SELECT name FROM products ORDER BY name'),
    q<{ company_name: string }>('SELECT company_name FROM customers ORDER BY company_name'),
    q<{ company_name: string }>('SELECT company_name FROM suppliers ORDER BY company_name'),
    q<{ name: string; sgst: string; cgst: string; igst: string }>('SELECT name, sgst, cgst, igst FROM taxes ORDER BY name'),
  ]);
  const taxes = taxRows.map((t) => ({ name: t.name, rate: Number(t.sgst || 0) + Number(t.cgst || 0) + Number(t.igst || 0) }));

  return (
    <div className="space-y-4">
      <AutoPrint when={print} />
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href={back}>← List</Link>
        <span className="mr-auto text-lg font-extrabold tracking-tight">View Scrap {kind}</span>
        <a href={`/account/scrap/${kind}/${id}?print=1`} className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white shadow hover:bg-orange-600">⤓ Download Scrap {kind}</a>
        <ScrapButtons
          d={{ id: Number(d.id), kind, ref_no: String(d.ref_no), entry_date: String(d.entry_date || ''), warehouse: String(d.warehouse || ''), party: String(d.party || ''), lines: lines.length, qty, amount: amt, internal_note: String(d.internal_note || ''), external_note: String(d.external_note || ''), bank_detail: String(d.bank_detail || ''), terms: String(d.terms || '') }}
          kind={kind}
          warehouses={wh.map((w) => w.name)} parties={(kind === 'issue' ? sups.map((s) => s.company_name) : custs.map((c) => c.company_name))}
          products={prods.map((p) => p.name)} taxes={taxes}
          lines={lines.map((l) => ({
            product: String(l.product), batch_no: String(l.batch_no), qty: String(l.qty), cost: String(l.cost),
            selling_price: String(l.selling_price ?? '0'), price: String(l.price),
            ordered_qty: String(l.qty), tax_label: String(l.tax_label || ''), tax_rate: String(l.tax_rate ?? '0'),
          }))}
          notes={{
            internal_note: String(d.internal_note || ''), external_note: String(d.external_note || ''),
            bank_detail: String(d.bank_detail || ''), terms: String(d.terms || ''),
          }}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(79,70,229,0.08)] sm:p-0 print:border-0 print:shadow-none">
        <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-900 px-4 py-5 text-center text-white sm:px-6 print:bg-none print:text-black">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-70">Scrap {kind === 'entry' ? 'Entry' : kind === 'issue' ? 'Issue' : 'Receive'}</div>
          <div className="mt-0.5 font-mono text-2xl font-extrabold tracking-tight">{String(d.ref_no)}</div>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-semibold">{d.entry_date ? String(d.entry_date).slice(0, 10) : ''}</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-semibold">{String(d.warehouse || '')}</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-semibold">{String(d.party || '')}</span>
          </div>
        </div>
        <div className="p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-xl font-extrabold tracking-tight text-slate-900">{String(co.name || '')}</h4>
          <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Date: {d.entry_date ? String(d.entry_date).slice(0, 10) : ''}</span>
        </div>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-100">
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{partyLabel}</div>
            <address className="not-italic leading-relaxed">
              <strong>{String(co.name || '')}</strong><br />
              {String(co.addr1 || '')}<br />{String(co.addr2 || '')}<br />
              {String(co.city || '')}, {String(co.state || '')}, {String(co.country || '')}<br />
              {String(co.pincode || '')}<br />
              Phone: {String(co.phone || '')}<br />
              Email: {String(co.email || '')}<br />
              <strong>GSTIN: {String(co.gstin || '')}</strong><br />
            </address>
          </div>
          <div className="rounded-xl bg-indigo-50/60 p-3 ring-1 ring-inset ring-indigo-100">
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-indigo-400">Bill To ( Customer )</div>
            <address className="not-italic leading-relaxed">
              <strong>{String(d.party || '')}</strong><br />
              {sup ? <>{String(sup.address || '')}<br />{String(sup.city || '')}{sup.city ? ', ' : ''}{String(sup.state || '')}{sup.state ? ', ' : ''}{String(sup.country || '')}<br /></> : null}
              {sup?.phone ? <><b>Phone</b>: {String(sup.phone)}<br /></> : null}
              {sup?.email ? <><b>Email</b>: {String(sup.email)}<br /></> : null}
              <b>GSTIN</b>: {sup ? String(sup.gstin || '') : ''}<br />
            </address>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-100">
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Invoice Details</div>
            <b>Reference no: </b>{String(d.ref_no)}<br />
            <b>RCM Applicability: </b>No
          </div>
        </div>

        <div className="slim-scroll mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-950 to-violet-900 text-white print:bg-none print:text-black">
                {['Sr', 'Items', 'Warehouse', 'Tax', 'Batch No', 'Price', 'Cost', 'Qty', 'Total qty', 'Sub Total'].map((h, i) => (
                <th key={h} className={`whitespace-nowrap px-2.5 py-2.5 text-[12px] font-bold uppercase tracking-wide ${i >= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l, i) => (
                <tr key={i} className="transition-colors odd:bg-white even:bg-indigo-50/40 hover:bg-indigo-50/70">
                  <td className="px-2.5 py-2.5"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span></td>
                  <td className="min-w-36 px-2.5 py-2.5 font-semibold">{String(l.product)}</td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 text-slate-600">{String(l.warehouse || d.warehouse)}</td>
                  <td className="whitespace-nowrap px-2.5 py-2.5">
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-inset ring-amber-200">
                      {String(l.tax_label || '').split(' ')[0] ? `${String(l.tax_label).split(' ')[0]} ${inr(l.tax_amt)} (${l.tax_rate}%)` : '—'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 font-mono text-xs">{String(l.batch_no)}</td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums">{inr(l.price)}</td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums">{inr(l.cost)}</td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums">{String(l.qty)}</td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums">{String(l.qty)}</td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-extrabold tabular-nums">{inr(Number(l.qty || 0) * Number(l.cost || 0) + Number(l.tax_amt || 0))}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td colSpan={3} className="px-2.5 py-2.5">Total</td>
                <td className="px-2.5 py-2.5 text-right tabular-nums">{inr(taxAmt)}</td>
                <td colSpan={2} className="px-2.5 py-2.5"></td>
                <td className="px-2.5 py-2.5 text-right tabular-nums">{inr(costSum)}</td>
                <td className="px-2.5 py-2.5 text-right tabular-nums">{qty}</td>
                <td className="px-2.5 py-2.5 text-right tabular-nums">{qty}</td>
                <td className="px-2.5 py-2.5 text-right tabular-nums">{inr(amt)}</td>
              </tr>
              <tr className="bg-emerald-50/60">
                <td colSpan={9} className="px-2.5 py-2.5 font-bold">Total Taxable Value</td>
                <td className="px-2.5 py-2.5 text-right font-extrabold tabular-nums text-emerald-700">{inr(tax)}</td>
              </tr>
              <tr className="bg-indigo-950 font-bold text-white print:bg-none print:text-black">
                <td colSpan={9} className="px-2.5 py-2.5">Total Amount</td>
                <td className="px-2.5 py-2.5 text-right tabular-nums">{inr(amt)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-100">
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Terms & Condition</div>
            <div className="whitespace-pre-wrap text-slate-600">{String(d.terms || '—')}</div>
          </div>
          <div className="rounded-xl border border-dashed border-slate-200 p-3 text-right text-slate-600">
            Certified that the perticulars given above are true and correct
            <br /><br />For, <b>{String(co.name || '').toUpperCase()}</b><br /><br /><br /><br />
            <span className="text-xs uppercase tracking-widest text-slate-400">Authorised Signatory</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
