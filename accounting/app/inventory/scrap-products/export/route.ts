import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const r = await pool.query('SELECT product, batch_no, qty, cost, price, sell_price, warehouse FROM scrap_products ORDER BY warehouse, product');
  const head = ['Product Name', 'Batch No', 'Quantity', 'Cost (Rs)', 'Price (Rs)', 'Selling Price (Rs)', 'Warehouse Name'];
  const body = r.rows.map((x) => [x.product, x.batch_no, x.qty, x.cost, x.price, x.sell_price, x.warehouse].map(csvCell).join(','));
  return new Response(['\uFEFF' + head.join(','), ...body].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="scrap_products.csv"',
    },
  });
}
