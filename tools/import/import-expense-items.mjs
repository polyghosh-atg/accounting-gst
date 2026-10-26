import pg from 'pg';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const strip = (s) => (s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const num = (s) => { const v = parseFloat(String(s || '').replace(/[^0-9.\-]/g, '')); return isNaN(v) ? 0 : v; };
const c = await pool.connect();
const dir = join(root, 'data', 'raw', 'details', 'expense');
let n = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.html'))) {
  const leg = parseInt(Buffer.from(f.replace(/\.html$/, ''), 'base64').toString(), 10);
  const ex = await c.query('SELECT id FROM expenses WHERE legacy_id=$1', [leg]);
  if (!ex.rows.length) continue;
  const eid = ex.rows[0].id;
  const html = readFileSync(join(dir, f), 'utf8');
  const items = [];
  for (const t of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const inner = t[1];
    const heads = [...inner.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((x) => strip(x[1]));
    if (!heads.includes('Item Name')) continue;
    for (const r of inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...r[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => strip(x[1]));
      if (!cells.length || !cells[1]) continue;
      const o = {};
      heads.forEach((hh, i) => (o[hh] = cells[i] ?? ''));
      items.push(o);
    }
  }
  await c.query('DELETE FROM expense_items WHERE expense_id=$1', [eid]);
  for (const it of items) {
    await c.query('INSERT INTO expense_items(expense_id,item_name,taxable,igst,cgst,sgst) VALUES($1,$2,$3,$4,$5,$6)',
      [eid, it['Item Name'] || '', num(it['Taxable Amount']), num(it['IGST']), num(it['CGST']), num(it['SGST'])]);
    n++;
  }
}
console.log('expense items:', n);
c.release(); await pool.end();
