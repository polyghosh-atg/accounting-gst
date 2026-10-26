import { Suspense } from 'react';
import Link from 'next/link';
import { Pool } from 'pg';
import { PageHeader, LoadingRows } from '@/components/ui';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

const fmt = (n: number | string) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Row = { product: string; qty: string; purchase_value: string; sale_value: string };

export default function StockValue() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Stock Value Report"
        sub="Warehouse available quantity · purchase at cost · sale at MRP"
        actions={
          <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href="/reports">
            ← Reports
          </Link>
        }
      />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const r = await pool.query(
    `SELECT w.product, SUM(w.qty) qty, SUM(w.qty*w.cost) purchase_value,
       MAX(COALESCE(pr.mrp,0)) mrp, SUM(w.qty)*MAX(COALESCE(pr.mrp,0)) sale_value
     FROM warehouse_products w LEFT JOIN products pr ON pr.name ILIKE w.product || '%'
     GROUP BY w.product ORDER BY w.product`
  );
  const rows: Row[] = r.rows.map((x) => ({
    product: String(x.product ?? ''),
    qty: String(x.qty ?? '0'),
    purchase_value: String(x.purchase_value ?? '0'),
    sale_value: Number(x.mrp) > 0 ? String(x.sale_value ?? '0') : 'Please update selling price',
  }));
  const tq = rows.reduce((a, x) => a + (parseFloat(x.qty) || 0), 0);
  const tp = rows.reduce((a, x) => a + (parseFloat(x.purchase_value) || 0), 0);
  const ts = rows.reduce((a, x) => a + (parseFloat(x.sale_value) || 0), 0);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5">
        <h3 className="font-bold text-white">Stock Value Report</h3>
        <div className="ml-auto">
          <a href="/reports/stock_value/export"
            className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25">
            ⤓ Export
          </a>
        </div>
      </div>
      <div className="slim-scroll overflow-x-auto p-3">
        <table className="w-full min-w-[640px] border-collapse border border-slate-200 text-sm">
          <thead>
            <tr className="bg-slate-50">
              {['Product Name', 'Available Total Quantity', 'Total Purchase Value', 'Total Sale Value'].map((h) => (
                <th key={h} className="border border-slate-200 px-3 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide text-slate-800">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((x, i) => (
              <tr key={x.product} className={i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{x.product}</td>
                <td className="border border-slate-200 px-3 py-2 tabular-nums text-slate-700">{fmt(x.qty)}</td>
                <td className="border border-slate-200 px-3 py-2 tabular-nums text-slate-700">{fmt(x.purchase_value)}</td>
                <td className="border border-slate-200 px-3 py-2 tabular-nums text-slate-700">{isNaN(parseFloat(x.sale_value)) ? x.sale_value : fmt(x.sale_value)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 text-base font-extrabold">
              <td className="border border-slate-200 px-3 py-2">Total</td>
              <td className="border border-slate-200 px-3 py-2 tabular-nums">{fmt(Math.round(tq * 100) / 100)}</td>
              <td className="border border-slate-200 px-3 py-2 tabular-nums">{fmt(Math.round(tp * 100) / 100)}</td>
              <td className="border border-slate-200 px-3 py-2 tabular-nums">{fmt(Math.round(ts * 100) / 100)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
