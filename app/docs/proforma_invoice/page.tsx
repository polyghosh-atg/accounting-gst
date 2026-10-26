import { Suspense } from 'react';
import { q } from '@/lib/db';
import { Pager } from '@/components/table';
import { PageHeader, LoadingRows } from '@/components/ui';
import { ConvertForm, type PiRow } from './convert-ui';
import { isoDate } from './dates';

const PER = 25;

export default function ProformaList({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, parseInt((await searchParams).page ?? '1', 10));
  const [{ c }] = await q<{ c: string }>(`SELECT count(*) c FROM doc_headers WHERE doc_type='proforma_invoice'`);
  const total = Number(c);
  const rows = await q(
    `SELECT id, ref_no, doc_date, party, discount, taxable, tax, total, status FROM doc_headers
     WHERE doc_type='proforma_invoice' ORDER BY id DESC LIMIT $1 OFFSET $2`,
    [String(PER), String((page - 1) * PER)]
  );
  const custs = await q<{ company_name: string }>('SELECT company_name FROM customers ORDER BY company_name');
  const customers = custs.map((x) => String(x.company_name)).filter(Boolean);
  const items: PiRow[] = rows.map((r) => ({
    id: String(r.id),
    ref_no: String(r.ref_no),
    doc_date: isoDate(r.doc_date) ?? '',
    party: String(r.party ?? ''),
    discount: String(r.discount ?? 0),
    taxable: String(r.taxable ?? 0),
    tax: String(r.tax ?? 0),
    total: String(r.total ?? 0),
    converted: String(r.status) === 'Converted',
  }));
  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-xl text-white shadow">🏪</div>
        <div>
          <div className="text-sm font-medium text-slate-500">Total Proforma Invoice</div>
          <div className="text-xl font-extrabold tabular-nums text-slate-900">{total}</div>
        </div>
      </div>

      <PageHeader
        title="Proforma Invoice List"
        actions={
          <a href="/docs/proforma_invoice/add" className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-sm font-bold text-white shadow hover:opacity-95">
            ❄ Add Proforma Invoice
          </a>
        }
      />
      <ConvertForm rows={items} customers={customers} />
      <Pager page={page} total={total} per={PER} />
    </>
  );
}
