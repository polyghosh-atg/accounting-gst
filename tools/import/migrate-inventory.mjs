import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query(`CREATE TABLE IF NOT EXISTS scrap_products(id SERIAL PRIMARY KEY, product TEXT, batch_no TEXT,
  qty NUMERIC DEFAULT 0, cost NUMERIC DEFAULT 0, price NUMERIC DEFAULT 0, sell_price NUMERIC DEFAULT 0, warehouse TEXT);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS legacy_id INT UNIQUE;
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS tax_id INT;
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS tax_type INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS legacy_id INT UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS markup NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS alert_qty NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS manage_inventory TEXT DEFAULT 'Yes';`);
const txt = readFileSync(join(root, 'data', 'csv', 'scrap_product.csv'), 'utf8').replace(/^\uFEFF/, '');
const num = (s) => { const v = parseFloat(String(s || '').replace(/[^0-9.\-]/g, '')); return isNaN(v) ? 0 : v; };
let n = 0;
for (const ln of txt.trim().split('\n').slice(1)) {
  const cols = ln.split('","').map((x) => x.replace(/^"|"$/g, ''));
  // Product Name, Batch No, Quantity, Cost (Rs), Price (Rs), Selling Price (Rs), Warehouse Name
  const ex = await c.query('SELECT id FROM scrap_products WHERE product=$1 AND batch_no=$2', [cols[0], cols[1]]);
  if (!ex.rows.length) {
    await c.query('INSERT INTO scrap_products(product,batch_no,qty,cost,price,sell_price,warehouse) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [cols[0], cols[1], num(cols[2]), num(cols[3]), num(cols[4]), num(cols[5]), cols[6]]);
    n++;
  }
}
const s = await c.query('SELECT count(*) c FROM scrap_products');
console.log('scrap_products +', n, JSON.stringify(s.rows[0]));
c.release(); await pool.end();
