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

const HEADS = ['Sr. No', 'Product Name', 'Opening Stock', 'Op Stock Value P. Rate', 'Pur', 'Pur vl',
  'Pur. Ret', 'Pur. Ret vl', 'Sale', 'Sale vl', 'Sale Ret', 'Sale Ret vl',
  'Stock In', 'Stock In vl', 'Stock Out', 'Stock Out vl', 'Cl Stock', 'Cl Stock Value P. Rate'];

type MRow = {
  wpid: number; product: string; warehouse: string; cost: number; mrp: number;
  op: number; pur: number; purVl: number; purRet: number; purRetVl: number;
  sale: number; saleVl: number; saleRet: number; saleRetVl: number;
  stIn: number; stOut: number;
};

export default function ClosingStock({ searchParams }: {
  searchParams: Promise<{ from?: string; to?: string; pid?: string }>;
}) {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Closing Stock Report"
        sub="Opening + purchase − sale + stock adjustments per product"
        actions={
          <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href="/reports">
            ← Reports
          </Link>
        }
      />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: {
  searchParams: Promise<{ from?: string; to?: string; pid?: string }>;
}) {
  const sp = await searchParams;
  const from = (sp.from || '').trim();
  let to = (sp.to || '').trim();
  if (!to) {
    const t = await pool.query('SELECT CURRENT_DATE::text d');
    to = String(t.rows[0].d).slice(0, 10);
  }
  const pid = Number(sp.pid) || 0;

  const wps = await pool.query(
    `SELECT w.id, w.warehouse, w.product, COALESCE(w.cost,0) cost, COALESCE(pr.mrp,0) mrp
     FROM warehouse_products w LEFT JOIN products pr ON pr.name ILIKE w.product || '%'
     ${pid ? 'WHERE w.id=$1' : ''} ORDER BY w.product, w.warehouse`,
    pid ? [pid] : []
  );
  const prodOpts = await pool.query(
    'SELECT id, product, warehouse FROM warehouse_products ORDER BY product, warehouse'
  );

  const idList = wps.rows.map((x) => Number(x.id));
  const rows: MRow[] = [];
  if (idList.length > 0) {
    const fromD = from === '' ? '0001-01-01' : from;
    const [pur, purRet, sale, saleRet, stk] = await Promise.all([
      pool.query(
        `SELECT w.id wpid, l.qty, l.qty*l.cost AS subtotal,
           CASE WHEN p.purchase_date < $2 THEN 'op' ELSE 'per' END AS bucket
         FROM purchase_lines l JOIN purchases p ON p.id=l.purchase_id
         JOIN warehouse_products w ON l.item_name ILIKE w.product || '%'
         WHERE w.id = ANY($1) AND p.purchase_date <= $3`, [idList, fromD, to]),
      pool.query(
        `SELECT w.id wpid, l.qty, l.subtotal,
           CASE WHEN h.doc_date < $2 THEN 'op' ELSE 'per' END AS bucket
         FROM doc_lines l JOIN doc_headers h ON h.legacy_id=l.doc_legacy_id AND h.doc_type=l.doc_type
         JOIN warehouse_products w ON l.item_name ILIKE w.product || '%'
         WHERE l.doc_type='purchase_return' AND w.id = ANY($1) AND h.doc_date <= $3`, [idList, fromD, to]),
      pool.query(
        `SELECT w.id wpid, l.qty, l.qty*l.price AS subtotal,
           CASE WHEN s.inv_date < $2 THEN 'op' ELSE 'per' END AS bucket
         FROM sale_lines l JOIN sales s ON s.id=l.sale_id
         JOIN warehouse_products w ON l.item_name ILIKE w.product || '%'
         WHERE w.id = ANY($1) AND s.inv_date <= $3`, [idList, fromD, to]),
      pool.query(
        `SELECT w.id wpid, l.qty, l.subtotal,
           CASE WHEN h.doc_date < $2 THEN 'op' ELSE 'per' END AS bucket
         FROM doc_lines l JOIN doc_headers h ON h.legacy_id=l.doc_legacy_id AND h.doc_type=l.doc_type
         JOIN warehouse_products w ON l.item_name ILIKE w.product || '%'
         WHERE l.doc_type='sales_return' AND w.id = ANY($1) AND h.doc_date <= $3`, [idList, fromD, to]),
      pool.query(
        `SELECT w.id wpid, s.qty, s.entry_type,
           CASE WHEN s.entry_date < $2 THEN 'op' ELSE 'per' END AS bucket
         FROM stock_entries s JOIN warehouse_products w ON w.product=s.product AND w.warehouse=s.warehouse
         WHERE w.id = ANY($1) AND s.entry_date <= $3`, [idList, fromD, to]),
    ]);

    const bucket = new Map<number, MRow>();
    for (const w of wps.rows) {
      bucket.set(Number(w.id), {
        wpid: Number(w.id), product: String(w.product), warehouse: String(w.warehouse),
        cost: Number(w.cost), mrp: Number(w.mrp),
        op: 0, pur: 0, purVl: 0, purRet: 0, purRetVl: 0, sale: 0, saleVl: 0,
        saleRet: 0, saleRetVl: 0, stIn: 0, stOut: 0,
      });
    }
    for (const x of pur.rows) {
      const b = bucket.get(Number(x.wpid)); if (!b) continue;
      const q = Number(x.qty) || 0, v = Number(x.subtotal) || 0;
      if (x.bucket === 'op') b.op += q; else { b.pur += q; b.purVl += v; }
    }
    for (const x of purRet.rows) {
      const b = bucket.get(Number(x.wpid)); if (!b) continue;
      const q = Number(x.qty) || 0, v = Number(x.subtotal) || 0;
      if (x.bucket === 'op') b.op -= q; else { b.purRet += q; b.purRetVl += v; }
    }
    for (const x of sale.rows) {
      const b = bucket.get(Number(x.wpid)); if (!b) continue;
      const q = Number(x.qty) || 0, v = Number(x.subtotal) || 0;
      if (x.bucket === 'op') b.op -= q; else { b.sale += q; b.saleVl += v; }
    }
    for (const x of saleRet.rows) {
      const b = bucket.get(Number(x.wpid)); if (!b) continue;
      const q = Number(x.qty) || 0, v = Number(x.subtotal) || 0;
      if (x.bucket === 'op') b.op += q; else { b.saleRet += q; b.saleRetVl += v; }
    }
    for (const x of stk.rows) {
      const b = bucket.get(Number(x.wpid)); if (!b) continue;
      const q = Number(x.qty) || 0;
      const sgn = String(x.entry_type) === 'OUT' ? -1 : 1;
      if (x.bucket === 'op') b.op += sgn * q;
      else if (sgn > 0) b.stIn += q; else b.stOut += q;
    }
    for (const b of bucket.values()) {
      if (b.op === 0 && b.pur === 0 && b.purRet === 0 && b.sale === 0 &&
        b.saleRet === 0 && b.stIn === 0 && b.stOut === 0) continue;
      rows.push(b);
    }
  }

  const cl = (b: MRow) => b.op + b.pur - b.purRet - b.sale + b.saleRet + b.stIn - b.stOut;
  const rate = (b: MRow) => (b.mrp > 0 ? b.mrp : b.cost);
  const T = { op: 0, opVl: 0, pur: 0, purVl: 0, purRet: 0, purRetVl: 0, sale: 0, saleVl: 0, saleRet: 0, saleRetVl: 0, stIn: 0, stInVl: 0, stOut: 0, stOutVl: 0, cl: 0, clVl: 0 };
  for (const b of rows) {
    const c = cl(b);
    T.op += b.op; T.opVl += b.op * b.cost; T.pur += b.pur; T.purVl += b.purVl;
    T.purRet += b.purRet; T.purRetVl += b.purRetVl; T.sale += b.sale; T.saleVl += b.saleVl;
    T.saleRet += b.saleRet; T.saleRetVl += b.saleRetVl; T.stIn += b.stIn; T.stInVl += b.stIn * rate(b);
    T.stOut += b.stOut; T.stOutVl += b.stOut * rate(b); T.cl += c; T.clVl += c * b.cost;
  }

  const expQs = `from=${from}&to=${to}${pid ? `&q=${encodeURIComponent(rows[0]?.product || '')}` : ''}`;
  return (
    <>
      <form method="GET" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-2.5 font-bold text-slate-800">Filter Report</div>
        <div className="grid gap-2.5 p-4 sm:grid-cols-3">
          <label className="text-xs font-bold text-slate-600">From Date
            <input name="from" type="date" defaultValue={from} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          </label>
          <label className="text-xs font-bold text-slate-600">To Date *
            <input name="to" type="date" required defaultValue={to} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          </label>
          <label className="text-xs font-bold text-slate-600">Product
            <select name="pid" defaultValue={pid ? String(pid) : ''} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400">
              <option value="">All</option>
              {prodOpts.rows.map((o) => (
                <option key={o.id} value={o.id}>{o.product} — {o.warehouse}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2 border-t border-slate-100 px-4 py-2.5">
          <button className="rounded-xl bg-sky-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-sky-700">Search</button>
          {(from || pid) && <a href="/reports/closing_stock" className="self-center text-xs font-semibold text-indigo-700 hover:underline">Clear</a>}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5">
          <h3 className="font-bold text-white">Closing Stock Report</h3>
          <div className="ml-auto">
            <a href={`/reports/closing_stock/export?${expQs}`}
              className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25">
              ⤓ Export
            </a>
          </div>
        </div>
        <div className="slim-scroll overflow-x-auto p-3">
          <table className="w-full min-w-[1400px] border-collapse border border-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-50">
                {HEADS.map((h) => (
                  <th key={h} className="whitespace-nowrap border border-slate-200 px-2.5 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-800">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((b, i) => {
                const c = cl(b);
                const cells: (string | number)[] = [i + 1, b.product,
                  b.op, b.op * b.cost, b.pur, b.purVl, b.purRet, b.purRetVl,
                  b.sale, b.saleVl, b.saleRet, b.saleRetVl,
                  b.stIn, b.stIn * rate(b), b.stOut, b.stOut * rate(b), c, c * b.cost];
                return (
                  <tr key={b.wpid} className={i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                    {cells.map((v, j) => (
                      <td key={j} className={`whitespace-nowrap border border-slate-200 px-2.5 py-1.5 tabular-nums text-slate-700 ${j <= 1 ? 'font-medium text-slate-900' : ''}`}>
                        {j <= 1 ? v : fmt(Number(v))}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={HEADS.length} className="px-3 py-8 text-center text-slate-400">No movements for these filters — choose a wider date range</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 text-base font-extrabold">
                  {['Total', '', fmt(T.op), fmt(T.opVl), fmt(T.pur), fmt(T.purVl), fmt(T.purRet), fmt(T.purRetVl),
                    fmt(T.sale), fmt(T.saleVl), fmt(T.saleRet), fmt(T.saleRetVl),
                    fmt(T.stIn), fmt(T.stInVl), fmt(T.stOut), fmt(T.stOutVl), fmt(T.cl), fmt(T.clVl)].map((v, j) => (
                    <td key={j} className="whitespace-nowrap border border-slate-200 px-2.5 py-2 tabular-nums">{v}</td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}
