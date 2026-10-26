import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import { AddScrapButton, ScrapButtons, type ScrapDoc, type ScrapLine } from '@/components/scrap-modals';

const META: Record<string, { title: string; sub: string; label: string; party: string }> = {
  entry: { title: 'Scrap Entry', sub: 'Scrap received into stock', label: 'Add Scrap Entry', party: '' },
  issue: { title: 'Scrap Issue', sub: 'Scrap issued to suppliers', label: 'Add Scrap Issue', party: 'supplier' },
  receive: { title: 'Scrap Receive', sub: 'Scrap received from customers', label: 'Add Scrap Receive', party: 'customer' },
};

export function ScrapList({ kind, searchParams }: {
  kind: 'entry' | 'issue' | 'receive'; searchParams?: Promise<{ supplier?: string; customer?: string; warehouse?: string }>;
}) {
  const m = META[kind];
  return (
    <div>
      <PageHeader title={m.title} sub={m.sub} />
      <Suspense fallback={<LoadingRows />}>
        <Content kind={kind} label={m.label} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ kind, label, searchParams }: {
  kind: 'entry' | 'issue' | 'receive'; label: string; searchParams?: Promise<{ supplier?: string; customer?: string; warehouse?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const fSupplier = (sp.supplier || '').trim();
  const fCustomer = (sp.customer || '').trim();
  const fWarehouse = (sp.warehouse || '').trim();
  const conds = ['d.kind=$1'];
  const params: string[] = [kind];
  if (kind === 'issue' && fSupplier) { params.push(fSupplier); conds.push(`d.party=$${params.length}`); }
  if (kind === 'receive' && fCustomer) { params.push(fCustomer); conds.push(`d.party=$${params.length}`); }
  if (kind === 'entry' && fWarehouse) { params.push(fWarehouse); conds.push(`d.warehouse=$${params.length}`); }
  const docs = await q<ScrapDoc>(
    `SELECT d.id, d.kind, d.ref_no, d.entry_date, d.warehouse, d.party, d.internal_note,
       d.external_note, d.bank_detail, d.terms,
       (SELECT count(*) FROM scrap_lines l WHERE l.doc_id=d.id) lines,
       COALESCE((SELECT SUM(qty) FROM scrap_lines l WHERE l.doc_id=d.id),0) qty,
       COALESCE((SELECT SUM(qty*cost+COALESCE(tax_amt,0)) FROM scrap_lines l WHERE l.doc_id=d.id),0) amount
     FROM scrap_docs d WHERE ${conds.join(' AND ')} ORDER BY d.id DESC`, params);
  const [wh, prods, custs, sups] = await Promise.all([
    q<{ name: string }>('SELECT name FROM warehouses ORDER BY name'),
    q<{ name: string }>('SELECT name FROM products ORDER BY name'),
    q<{ company_name: string }>('SELECT company_name FROM customers ORDER BY company_name'),
    q<{ company_name: string }>('SELECT company_name FROM suppliers ORDER BY company_name'),
  ]);
  const warehouses = wh.map((w) => w.name);
  const products = prods.map((p) => p.name);
  const parties = kind === 'issue' ? sups.map((s) => s.company_name) : custs.map((c) => c.company_name);
  const allLines = await q<{ doc_id: number; product: string; batch_no: string; qty: string; cost: string; selling_price: string; price: string; ordered_qty: string; tax_label: string; tax_rate: string }>(
    'SELECT doc_id, product, batch_no, qty, cost, selling_price, price, ordered_qty, tax_label, tax_rate FROM scrap_lines WHERE doc_id IN (SELECT id FROM scrap_docs WHERE kind=$1)', [kind]);
  const linesByDoc = new Map<number, ScrapLine[]>();
  for (const l of allLines) {
    if (!linesByDoc.has(l.doc_id)) linesByDoc.set(l.doc_id, []);
    linesByDoc.get(l.doc_id)!.push({
      product: l.product, batch_no: l.batch_no, qty: String(l.qty), cost: String(l.cost),
      selling_price: String(l.selling_price ?? '0'), price: String(l.price),
      ordered_qty: String(l.ordered_qty ?? l.qty), tax_label: l.tax_label || '', tax_rate: String(l.tax_rate ?? '0'),
    });
  }
  const supList = await q<{ id: number; company_name: string }>('SELECT id, company_name FROM suppliers');
  const supIds = new Map(supList.map((s) => [s.company_name, s.id]));
  const taxRows = await q<{ name: string; sgst: string; cgst: string; igst: string }>('SELECT name, sgst, cgst, igst FROM taxes ORDER BY name');
  const taxes = taxRows.map((t) => ({ name: t.name, rate: Number(t.sgst || 0) + Number(t.cgst || 0) + Number(t.igst || 0) }));

  const filterName = kind === 'issue' ? 'supplier' : kind === 'receive' ? 'customer' : 'warehouse';
  const filterLabel = kind === 'issue' ? 'Supplier' : kind === 'receive' ? 'Customer' : 'Warehouse';
  const filterOpts = kind === 'issue' ? sups.map((s) => s.company_name) : kind === 'receive' ? custs.map((c) => c.company_name) : warehouses;
  const filterVal = kind === 'issue' ? fSupplier : kind === 'receive' ? fCustomer : fWarehouse;

  return (
    <>
      <div className="mb-3 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <form method="GET" className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold text-slate-600">{filterLabel}</label>
          <select name={filterName} defaultValue={filterVal} className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400">
            <option value="">All</option>
            {filterOpts.map((o) => <option key={o}>{o}</option>)}
          </select>
          <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Filter</button>
          {(fSupplier || fCustomer || fWarehouse) && (
            <a href={kind === 'entry' ? '/account/scrap-entry' : kind === 'issue' ? '/account/scrap-issue' : '/account/scrap-receive'} className="text-xs font-semibold text-indigo-700 hover:underline">Clear</a>
          )}
          <span className="ml-auto text-xs text-slate-500">Showing 1 to {docs.length} of {docs.length} entries</span>
          <AddScrapButton kind={kind} label={label} warehouses={warehouses} parties={parties} products={products} taxes={taxes} />
        </form>
      </div>
      <div className="space-y-2.5 md:hidden">
        {docs.length === 0 && <div className="rounded-2xl border bg-white px-3 py-8 text-center text-sm text-slate-400">No records</div>}
        {docs.map((d) => (
          <div key={d.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <a href={`/account/scrap/${kind}/${d.id}`} className="truncate font-mono text-xs font-bold">{d.ref_no}</a>
              <span className="text-[11px] text-slate-400">{d.entry_date ? String(d.entry_date).slice(0, 10) : ''}</span>
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">{d.warehouse} · {d.party} · {d.lines} products</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-slate-400">Qty {d.qty}</span>
              <span className="font-extrabold tabular-nums">{inr(d.amount)}</span>
            </div>
            <div className="mt-2 border-t border-slate-100 pt-2">
              <ScrapButtons d={d} kind={kind} warehouses={warehouses} parties={parties} products={products} taxes={taxes} lines={linesByDoc.get(d.id) || []} notes={{ internal_note: d.internal_note || '', external_note: d.external_note || '', bank_detail: d.bank_detail || '', terms: d.terms || '' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="slim-scroll hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>{['Reference No', 'Total Amount (Inc Tax)', 'Total Product', 'Total Qty', kind === 'issue' ? 'Supplier' : kind === 'receive' ? 'Customer' : 'Party', 'Date', 'Action'].map((h, i) => (
              <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i === 1 || i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {docs.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No records</td></tr>}
            {docs.map((d) => (
              <tr key={d.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-bold">{d.ref_no}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums">{inr(d.amount)}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{d.lines}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{d.qty}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                  {kind === 'issue' && supIds.get(d.party) ? (
                    <a className="text-indigo-700 hover:underline" href={`/suppliers/${supIds.get(d.party)}`}>{d.party}</a>
                  ) : d.party}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{d.entry_date ? String(d.entry_date).slice(0, 10) : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <ScrapButtons d={d} kind={kind} warehouses={warehouses} parties={parties} products={products} taxes={taxes} lines={linesByDoc.get(d.id) || []} notes={{ internal_note: d.internal_note || '', external_note: d.external_note || '', bank_detail: d.bank_detail || '', terms: d.terms || '' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
