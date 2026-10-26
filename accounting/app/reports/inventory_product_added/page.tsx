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

const HEADS = ['Sr. No', 'Product Name', 'Batch No', 'Purchase Qty', 'Purchase value'];

type PRow = { id: number; name: string };

export default function InventoryProductAdded({ searchParams }: {
  searchParams: Promise<{ from?: string; to?: string; pid?: string; expiry?: string }>;
}) {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Inventory Product Added"
        sub="Products brought into inventory through purchases"
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
  searchParams: Promise<{ from?: string; to?: string; pid?: string; expiry?: string }>;
}) {
  const sp = await searchParams;
  const from = (sp.from || '').trim();
  let to = (sp.to || '').trim();
  if (!to) {
    const t = await pool.query('SELECT CURRENT_DATE::text d');
    to = String(t.rows[0].d).slice(0, 10);
  }
  const pid = Number(sp.pid) || 0;
  const expiry = (sp.expiry || '').trim();
  const fromD = from === '' ? '0001-01-01' : from;

  const prods = await pool.query('SELECT id, name FROM products ORDER BY name');
  const rows = await pool.query(
    `SELECT pr.id, pr.name,
       (SELECT batch_no FROM warehouse_products w
         WHERE pr.name ILIKE w.product || '%' AND COALESCE(w.batch_no,'') <> ''
         ORDER BY w.id LIMIT 1) AS batch,
       COALESCE((SELECT SUM(l.qty) FROM purchase_lines l JOIN purchases p ON p.id=l.purchase_id
         WHERE l.item_name ILIKE pr.name || '%' AND p.purchase_date >= $1 AND p.purchase_date <= $2),0) AS qty,
       COALESCE((SELECT SUM(l.subtotal) FROM purchase_lines l JOIN purchases p ON p.id=l.purchase_id
         WHERE l.item_name ILIKE pr.name || '%' AND p.purchase_date >= $1 AND p.purchase_date <= $2),0) AS val
     FROM products pr
     ${pid ? 'WHERE pr.id=$3' : ''}
     ORDER BY pr.name`,
    pid ? [fromD, to, pid] : [fromD, to]
  );

  let list = rows.rows;
  if (expiry !== '') {
    const e = expiry.toLowerCase();
    list = list.filter((x) => String(x.batch || '').toLowerCase().includes(e));
  }
  // only products actually added through purchase in range
  list = list.filter((x) => Number(x.qty) !== 0);

  const expQs = `from=${from}&to=${to}${pid ? `&pid=${pid}` : ''}${expiry ? `&expiry=${encodeURIComponent(expiry)}` : ''}`;
  return (
    <>
      <form method="GET" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-2.5 font-bold text-slate-800">Filter Report</div>
        <div className="grid gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">Expiry Date
            <input name="expiry" defaultValue={expiry} placeholder="Batch / expiry contains…"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          </label>
          <label className="text-xs font-bold text-slate-600">From Date
            <input name="from" type="date" defaultValue={from}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          </label>
          <label className="text-xs font-bold text-slate-600">To Date *
            <input name="to" type="date" required defaultValue={to}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          </label>
          <label className="text-xs font-bold text-slate-600">Product
            <select name="pid" defaultValue={pid ? String(pid) : ''}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400">
              <option value="">All</option>
              {prods.rows.map((o: PRow) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
        </div>
        <div className="flex gap-2 border-t border-slate-100 px-4 py-2.5">
          <button className="rounded-xl bg-sky-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-sky-700">Search</button>
          {(from || pid || expiry) && <a href="/reports/inventory_product_added" className="self-center text-xs font-semibold text-indigo-700 hover:underline">Clear</a>}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5">
          <h3 className="font-bold text-white">Inventory Product Added</h3>
          <div className="ml-auto">
            <a href={`/reports/inventory_product_added/export?${expQs}`}
              className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25">
              ⤓ Export
            </a>
          </div>
        </div>
        <div className="slim-scroll overflow-x-auto p-3">
          <table className="w-full min-w-[640px] border-collapse border border-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-50">
                {HEADS.map((h) => (
                  <th key={h} className="border border-slate-200 px-3 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide text-slate-800">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((x, i) => (
                <tr key={x.id} className={i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="border border-slate-200 px-3 py-2 tabular-nums text-slate-700">{i + 1}</td>
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{x.name}</td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">{x.batch || '—'}</td>
                  <td className="border border-slate-200 px-3 py-2 tabular-nums text-slate-700">{fmt(x.qty)}</td>
                  <td className="border border-slate-200 px-3 py-2 tabular-nums text-slate-700">{fmt(x.val)}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={HEADS.length} className="px-3 py-8 text-center text-slate-400">No products added through purchase in this range</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
