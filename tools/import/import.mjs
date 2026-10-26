// Full import: normalized CSVs + parsed detail pages -> PostgreSQL. Idempotent.
// Usage: DATABASE_URL=postgres://postgres:postgres@localhost:5433/accounting node import.mjs
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const csvDir = join(root, 'data', 'csv');
const parsedDir = join(root, 'data', 'parsed');
const rawDir = join(root, 'data', 'raw');
const DB = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/accounting';
const pool = new pg.Pool({ connectionString: DB });

const num = (s) => {
  if (s == null || s === '') return 0;
  const v = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  return isNaN(v) ? 0 : v;
};
const iso = (s) => {
  if (!s) return null;
  let m = String(s).match(/(\d{2})-(\d{2})-(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return s.slice(0, 10);
  return null;
};
function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const load = (name) => {
  const p = join(csvDir, `${name}.csv`);
  if (!existsSync(p)) return [];
  return parseCsv(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
};
const loadParsed = (name) => {
  const p = join(parsedDir, `${name}.json`);
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
};
const loadRaw = (name) => {
  const p = join(rawDir, `${name}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
};
const dupeCheck = (q) => q.rows.length > 0;

const UOMS = [['BAG','BAGS'],['BAL','BALE'],['BDL','BUNDLES'],['BKL','BUCKLES'],['BOU','BILLION OF UNITS'],['BOX','BOX'],['BTL','BOTTLES'],['BUN','BUNCHES'],['CAN','CANS'],['CBM','CUBIC METERS'],['CCM','CUBIC CENTIMETERS'],['CMS','CENTIMETERS'],['CTN','CARTONS'],['DOZ','DOZENS'],['DRM','DRUMS'],['GGK','GREAT GROSS'],['GMS','GRAMMES'],['GRS','GROSS'],['GYD','GROSS YARDS'],['KGS','KILOGRAMS'],['KLR','KILOLITRE'],['KME','KILOMETRE'],['MLT','MILILITRE'],['MTR','METERS'],['MTS','METRIC TON'],['NOS','NUMBERS'],['PAC','PACKS'],['PCS','PIECES'],['PRS','PAIRS'],['QTL','QUINTAL'],['ROL','ROLLS'],['SET','SETS'],['SQF','SQUARE FEET'],['SQM','SQUARE METERS'],['SQY','SQUARE YARDS'],['TBS','TABLETS'],['TGM','TEN GROSS'],['THD','THOUSANDS'],['TON','TONNES'],['TUB','TUBES'],['UGS','US GALLONS'],['UNT','UNITS'],['YDS','YARDS'],['OTH','OTHERS']];
const DOCTYPES = ['sale','purchase','purchase_order','quotation','sales_return','purchase_return','proforma_invoice','credit_debit_note','bank_payment','cash_payment','bank_receipt','cash_receipt','contra','scrap_issue','scrap_entry','scrap_receive','employee','department','position'];

const client = await pool.connect();
try {
  // full-refresh import: truncate first (data is reproducible from data/csv + data/parsed)
  await client.query(`TRUNCATE currencies, taxes, warehouses, product_categories, products, customers, suppliers,
    bank_accounts, sales, sale_lines, purchases, purchase_lines, doc_headers, doc_lines, employees, departments,
    positions, cash_bank_entries, expenses, hr_events, stock_entries, misc, app_users RESTART IDENTITY CASCADE`);
  // --- schema evolution guards (first import created narrower tables) ---
  await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp NUMERIC DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS legacy_id INT UNIQUE;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS pincode TEXT; ALTER TABLE customers ADD COLUMN IF NOT EXISTS ship_country TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS ship_state TEXT; ALTER TABLE customers ADD COLUMN IF NOT EXISTS ship_city TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS ship_address TEXT; ALTER TABLE customers ADD COLUMN IF NOT EXISTS ship_pincode TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS legacy_id INT UNIQUE;
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS reg_type TEXT; ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_desig TEXT;
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state TEXT; ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country TEXT;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS tds NUMERIC DEFAULT 0; ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_status TEXT;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS legacy_id INT UNIQUE;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS delivery_status TEXT; ALTER TABLE purchases ADD COLUMN IF NOT EXISTS legacy_id INT UNIQUE;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS legacy_id INT UNIQUE;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS cgst NUMERIC DEFAULT 0; ALTER TABLE expenses ADD COLUMN IF NOT EXISTS sgst NUMERIC DEFAULT 0;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS igst NUMERIC DEFAULT 0; ALTER TABLE expenses ADD COLUMN IF NOT EXISTS remarks TEXT;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS itc TEXT; ALTER TABLE expenses ADD COLUMN IF NOT EXISTS legacy_id INT UNIQUE;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS inv_date DATE; ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer TEXT;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0; ALTER TABLE sales ADD COLUMN IF NOT EXISTS taxable NUMERIC DEFAULT 0;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0; ALTER TABLE sales ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS paid NUMERIC DEFAULT 0; ALTER TABLE sales ADD COLUMN IF NOT EXISTS due NUMERIC DEFAULT 0;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS po_no TEXT; ALTER TABLE purchases ADD COLUMN IF NOT EXISTS inv_no TEXT;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS purchase_date DATE; ALTER TABLE purchases ADD COLUMN IF NOT EXISTS supplier TEXT;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0; ALTER TABLE purchases ADD COLUMN IF NOT EXISTS taxable NUMERIC DEFAULT 0;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0; ALTER TABLE purchases ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS paid NUMERIC DEFAULT 0; ALTER TABLE purchases ADD COLUMN IF NOT EXISTS due NUMERIC DEFAULT 0;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS warehouse TEXT;
    ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS closing NUMERIC DEFAULT 0; ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS status TEXT;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS code TEXT; ALTER TABLE employees ADD COLUMN IF NOT EXISTS department TEXT;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS position TEXT; ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date DATE;
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email TEXT; ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person TEXT; ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS name TEXT; ALTER TABLE customers ADD COLUMN IF NOT EXISTS gstin TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT; ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS country TEXT; ALTER TABLE customers ADD COLUMN IF NOT EXISTS state TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT; ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn TEXT; ALTER TABLE products ADD COLUMN IF NOT EXISTS uom TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0; ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT;
    ALTER TABLE sale_lines ADD COLUMN IF NOT EXISTS igst_tax NUMERIC DEFAULT 0;
    ALTER TABLE sale_lines ADD COLUMN IF NOT EXISTS cgst_tax NUMERIC DEFAULT 0;
    ALTER TABLE sale_lines ADD COLUMN IF NOT EXISTS sgst_tax NUMERIC DEFAULT 0;
  `);
  await client.query(`CREATE TABLE IF NOT EXISTS currencies(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, name TEXT, symbol TEXT);
    CREATE TABLE IF NOT EXISTS taxes(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, name TEXT, sgst NUMERIC DEFAULT 0, cgst NUMERIC DEFAULT 0, igst NUMERIC DEFAULT 0, status TEXT DEFAULT 'Active');
    CREATE TABLE IF NOT EXISTS warehouses(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, name TEXT, code TEXT, description TEXT);
    CREATE TABLE IF NOT EXISTS product_categories(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, name TEXT, description TEXT);
    CREATE TABLE IF NOT EXISTS uoms(id SERIAL PRIMARY KEY, code TEXT UNIQUE, name TEXT);
    CREATE TABLE IF NOT EXISTS products(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, name TEXT, hsn TEXT, uom TEXT, cost NUMERIC DEFAULT 0, selling_price NUMERIC DEFAULT 0, mrp NUMERIC DEFAULT 0, status TEXT);
    CREATE TABLE IF NOT EXISTS customers(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, company_name TEXT, name TEXT, gstin TEXT, email TEXT, phone TEXT, country TEXT, state TEXT, address TEXT, city TEXT, pincode TEXT, ship_country TEXT, ship_state TEXT, ship_city TEXT, ship_address TEXT, ship_pincode TEXT);
    CREATE TABLE IF NOT EXISTS suppliers(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, company_name TEXT, reg_type TEXT, gstin TEXT, email TEXT, phone TEXT, contact_person TEXT, contact_desig TEXT, address TEXT, state TEXT, country TEXT);
    CREATE TABLE IF NOT EXISTS bank_accounts(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, name TEXT, number TEXT, bank_name TEXT, ifsc TEXT, opening NUMERIC DEFAULT 0, closing NUMERIC DEFAULT 0, status TEXT);
    CREATE TABLE IF NOT EXISTS sales(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, inv_no TEXT UNIQUE, inv_date DATE, customer TEXT, discount NUMERIC DEFAULT 0, taxable NUMERIC DEFAULT 0, tax NUMERIC DEFAULT 0, tds NUMERIC DEFAULT 0, total NUMERIC DEFAULT 0, paid NUMERIC DEFAULT 0, due NUMERIC DEFAULT 0, delivery_status TEXT);
    CREATE TABLE IF NOT EXISTS sale_lines(id SERIAL PRIMARY KEY, sale_id INT REFERENCES sales(id) ON DELETE CASCADE, item_name TEXT, hsn TEXT, qty NUMERIC DEFAULT 0, free_qty NUMERIC DEFAULT 0, price NUMERIC DEFAULT 0, batch_no TEXT, discount NUMERIC DEFAULT 0, uom TEXT, taxable NUMERIC DEFAULT 0, tax_amt NUMERIC DEFAULT 0, subtotal NUMERIC DEFAULT 0, igst_tax NUMERIC DEFAULT 0, cgst_tax NUMERIC DEFAULT 0, sgst_tax NUMERIC DEFAULT 0);
    CREATE TABLE IF NOT EXISTS purchases(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, po_no TEXT, inv_no TEXT, purchase_date DATE, supplier TEXT, discount NUMERIC DEFAULT 0, taxable NUMERIC DEFAULT 0, tax NUMERIC DEFAULT 0, total NUMERIC DEFAULT 0, paid NUMERIC DEFAULT 0, due NUMERIC DEFAULT 0, delivery_status TEXT);
    CREATE TABLE IF NOT EXISTS purchase_lines(id SERIAL PRIMARY KEY, purchase_id INT REFERENCES purchases(id) ON DELETE CASCADE, item_name TEXT, qty NUMERIC DEFAULT 0, cost NUMERIC DEFAULT 0, taxable NUMERIC DEFAULT 0, subtotal NUMERIC DEFAULT 0);
    CREATE TABLE IF NOT EXISTS doc_headers(id SERIAL PRIMARY KEY, doc_type TEXT, legacy_id INT, ref_no TEXT, doc_date DATE, party TEXT, taxable NUMERIC DEFAULT 0, discount NUMERIC DEFAULT 0, tax NUMERIC DEFAULT 0, total NUMERIC DEFAULT 0, status TEXT, UNIQUE(doc_type, legacy_id));
    CREATE TABLE IF NOT EXISTS doc_lines(id SERIAL PRIMARY KEY, doc_type TEXT, doc_legacy_id INT, line_no INT, item_name TEXT, hsn TEXT, qty NUMERIC DEFAULT 0, price NUMERIC DEFAULT 0, taxable NUMERIC DEFAULT 0, subtotal NUMERIC DEFAULT 0);
    CREATE TABLE IF NOT EXISTS employees(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, first_name TEXT, last_name TEXT, code TEXT, email TEXT, department TEXT, position TEXT, hire_date DATE, salary NUMERIC DEFAULT 0);
    CREATE TABLE IF NOT EXISTS departments(id SERIAL PRIMARY KEY, name TEXT UNIQUE, code TEXT);
    CREATE TABLE IF NOT EXISTS positions(id SERIAL PRIMARY KEY, title TEXT UNIQUE, code TEXT);
    CREATE TABLE IF NOT EXISTS cash_bank_entries(id SERIAL PRIMARY KEY, ref_no TEXT UNIQUE, vouch_type TEXT, from_acct TEXT, to_acct TEXT, amount NUMERIC DEFAULT 0);
    CREATE TABLE IF NOT EXISTS expenses(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, bill_date DATE, category TEXT, supplier TEXT, taxable NUMERIC DEFAULT 0, cgst NUMERIC DEFAULT 0, sgst NUMERIC DEFAULT 0, igst NUMERIC DEFAULT 0, total NUMERIC DEFAULT 0, remarks TEXT, itc TEXT);
    CREATE TABLE IF NOT EXISTS hr_events(id SERIAL PRIMARY KEY, kind TEXT, employee TEXT, event_date DATE, status TEXT, amount NUMERIC DEFAULT 0, extra TEXT);
    CREATE TABLE IF NOT EXISTS stock_entries(id SERIAL PRIMARY KEY, warehouse TEXT, product TEXT, qty NUMERIC DEFAULT 0, unit TEXT, cost NUMERIC DEFAULT 0, sell_price NUMERIC DEFAULT 0, entry_type TEXT, entry_date DATE);
    CREATE TABLE IF NOT EXISTS misc(id SERIAL PRIMARY KEY, kind TEXT, c1 TEXT, c2 TEXT, c3 TEXT, c4 TEXT, c5 TEXT, c6 TEXT);
    CREATE TABLE IF NOT EXISTS app_users(id SERIAL PRIMARY KEY, first_name TEXT, last_name TEXT, username TEXT UNIQUE, role TEXT, email TEXT, phone TEXT, status TEXT);
    CREATE TABLE IF NOT EXISTS doc_sequences(doc_type TEXT PRIMARY KEY, prefix TEXT DEFAULT '', date_format TEXT DEFAULT 'Y-m-d', next_seq INT DEFAULT 1);
  `);
  let n = 0;
  const up = async (sql, params) => { await client.query(sql, params); n++; };

  for (const [code, name] of UOMS)
    await up(`INSERT INTO uoms(code,name) VALUES($1,$2) ON CONFLICT (code) DO NOTHING`, [code, name]);
  for (const d of DOCTYPES)
    await up(`INSERT INTO doc_sequences(doc_type) VALUES($1) ON CONFLICT (doc_type) DO NOTHING`, [d]);

  for (const r of load('currency'))
    await up(`INSERT INTO currencies(name,symbol) VALUES($1,$2) ON CONFLICT DO NOTHING`, [r['Currency Name'], r['Symbol']]);
  for (const r of load('tax'))
    await up(`INSERT INTO taxes(name,sgst,cgst,igst,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [r['Tax name'], num(r['Sgst']), num(r['Cgst']), num(r['Igst']), r['Status'] || 'Active']);
  for (const r of load('warehouse'))
    await up(`INSERT INTO warehouses(name,code,description) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [r['Name'], r['Code'], r['Description']]);
  for (const r of load('product_category'))
    await up(`INSERT INTO product_categories(name,description) VALUES($1,$2) ON CONFLICT DO NOTHING`, [r['Name'], r['Description']]);
  for (const r of load('product_core'))
    await up(`INSERT INTO products(name,hsn,uom,cost,selling_price,mrp,status) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [r['Name'], r['HSN'], r['UOM'], num(r['Cost']), num(r['Price']), num(r['SellingPrice']), r['Status'] || 'Active']);

  // customers: enrich with parsed detail pages (full billing/shipping)
  const cdet = new Map(loadParsed('customer').map((d) => [d.legacyId, d.fields]));
  const craw = loadRaw('customer')?.data ?? [];
  const cids = [];
  for (const row of craw) {
    const m = String(row[row.length - 1]).match(/customer\/view\/([A-Za-z0-9+/=]+)/);
    cids.push(m ? parseInt(Buffer.from(m[1], 'base64').toString(), 10) : null);
  }
  for (let i = 0; i < craw.length; i++) {
    const r = {}; // map from csv by position instead
    void r;
    const f = cdet.get(cids[i]) || {};
    const csv = load('customer')[i] || {};
    await up(`INSERT INTO customers(company_name,name,gstin,email,phone,country,state,address,city,pincode,ship_country,ship_state,ship_city,ship_address,ship_pincode,legacy_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (legacy_id) DO UPDATE SET company_name=EXCLUDED.company_name`,
      [f['Customer Name'] || csv['Customer Name'], f['Customer Name'] || csv['Customer Name'], f['GSTIN/UIN of Recipient'] || csv['GSTIN/UIN of Recipient'],
       f['Email'] || csv['Email'], f['Phone'] || csv['Phone'], f['Country'] || csv['Country'], f['State'] || csv['State'],
       f['Address'] || csv['Address'], f['City'] || csv['City'], f['Pincode'] || '', f['Shipping Country'] || '', f['Shipping State'] || '',
       f['Shipping City'] || '', f['Shipping Address'] || '', f['Shipping Pincode'] || '', cids[i]]);
  }

  for (const r of load('supplier'))
    await up(`INSERT INTO suppliers(company_name,reg_type,gstin,email,phone,contact_person,contact_desig,address,state,country)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
      [r['Company Name'], r['Registration Type'], r['GSTIN'], r['Email'], r['Phone'], r['Contact Person Name'], r['Contact Person Designation'], r['Address'], r['State'], r['Country']]);
  for (const r of load('bank_account'))
    await up(`INSERT INTO bank_accounts(name,number,bank_name,ifsc,opening,closing,status) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [r['Account Name'], r['Account Number/Credit Card No'], r['Bank Name'], r['IFSC'], num(r['Opening Balance']), num(r['Closing Balance']), r['Status']]);
  for (const r of load('department'))
    await up(`INSERT INTO departments(name,code) VALUES($1,$2) ON CONFLICT (name) DO NOTHING`, [r['Department Name'] || r['c1'], r['Department Code'] || '']);
  for (const r of load('position'))
    await up(`INSERT INTO positions(title,code) VALUES($1,$2) ON CONFLICT (title) DO NOTHING`, [r['Position Title'] || r['c1'], r['Position Code'] || '']);
  for (const r of load('employee'))
    await up(`INSERT INTO employees(first_name,last_name,code,email,department,position,hire_date,salary) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [r['First Name'], r['Last Name'], r['Employee Code'], r['Email'], r['Department'], r['Position'], iso(r['Hire Date']), num(r['Salary'])]);

  // sales + lines
  const saleIds = new Map();
  const dupes = await client.query(`SELECT inv_no FROM sales GROUP BY inv_no HAVING count(*) > 1 LIMIT 5`);
  if (dupeCheck(dupes)) {
    await client.query(`UPDATE sales a SET inv_no = inv_no || '#dup' || a.id FROM (SELECT id, row_number() OVER (PARTITION BY inv_no ORDER BY id) rn FROM sales) b WHERE a.id=b.id AND b.rn>1`);
  }
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS sales_inv_no_uidx ON sales(inv_no)`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS expenses_legacy_uidx ON expenses(legacy_id)`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS customers_legacy_uidx ON customers(legacy_id)`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS cash_bank_ref_uidx ON cash_bank_entries(ref_no)`);
  for (const r of load('sale')) {
    const q = await client.query(`INSERT INTO sales(inv_no,inv_date,customer,discount,taxable,tax,tds,total,paid,due,delivery_status)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (inv_no) DO UPDATE SET total=EXCLUDED.total RETURNING id`,
      [r['Invoice No'], iso(r['Invoice Date']), r['Customer'], num(r['Total Discount']), num(r['Total Taxable Value']),
       num(r['Total Tax']), num(r['TDS']), num(r['Total']), num(r['Paid']), num(r['Due']), r['Delivery Status']]);
    if (q.rows[0]) saleIds.set(r['Invoice No'], q.rows[0].id);
    n++;
  }
  // link legacy ids via detail parse (match by invNo from header)
  const saleDet = loadParsed('sale');
  const invToLegacy = new Map(saleDet.map((d) => [d.header['Invoice No'], d.legacyId]));
  for (const [inv, leg] of invToLegacy) {
    if (inv) { await client.query(`UPDATE sales SET legacy_id=$1 WHERE inv_no=$2`, [leg, inv]); n++; }
  }
  for (const d of saleDet) {
    const sid = [...saleIds.entries()].find(([inv]) => inv === d.header['Invoice No'])?.[1];
    if (!sid) continue;
    await client.query(`DELETE FROM sale_lines WHERE sale_id=$1`, [sid]);
    for (const L of d.lines) {
      const tax = L._tax || {};
      const amt = (tax.igst?.amt || 0) + (tax.cgst?.amt || 0) + (tax.sgst?.amt || 0);
      await client.query(`INSERT INTO sale_lines(sale_id,item_name,hsn,qty,free_qty,price,batch_no,discount,uom,taxable,tax_amt,subtotal,igst_tax,cgst_tax,sgst_tax)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [sid, L['Items'] || '', L['HSN'] || '', num(L['Qty']), num(L['Free qty']), num(L['Selling Price (Rs)']), L['Batch No'] || '',
         num(L['Discount (Rs)']), L['UOM'] || '', num(L['Total Taxable Value (Rs)']), amt, num(L['Sub Total (Rs)']),
         tax.igst?.amt || 0, tax.cgst?.amt || 0, tax.sgst?.amt || 0]);
      n++;
    }
  }

  // legacy ids for purchases from ajax view-links (row order == csv order)
  const praw = loadRaw('purchase')?.data ?? [];
  const pLegacy = praw.map((row) => {
    const m = String(row[row.length - 1]).match(/purchase\/view\/([A-Za-z0-9+/=]+)/);
    try { return m ? parseInt(Buffer.from(m[1], 'base64').toString(), 10) : null; } catch { return null; }
  });
  for (const r of load('purchase')) {
    const q = await client.query(`INSERT INTO purchases(po_no,inv_no,purchase_date,warehouse,supplier,discount,taxable,tax,total,paid,due,delivery_status)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING RETURNING id`,
      [r['PO No.'], r['Invoice No'], iso(r['Purchase Date']), r['Warehouse'], r['Supplier'], num(r['Total Discount']), num(r['Total Taxable Value']), num(r['Total Tax']), num(r['Total']), num(r['Paid']), num(r['Due']), r['Delivery Status']]);
    n++;
    void q;
  }
  const pdbows = (await client.query(`SELECT id, po_no, purchase_date, supplier, total FROM purchases`)).rows;
  const csvRows = load('purchase');
  for (let i = 0; i < csvRows.length && i < pLegacy.length; i++) {
    const hit = pdbows.find((p) =>
      String(p.po_no) === String(csvRows[i]['PO No.']) &&
      Number(p.total) === num(csvRows[i]['Total']) &&
      String(p.supplier) === String(csvRows[i]['Supplier']));
    if (hit && pLegacy[i]) { await client.query(`UPDATE purchases SET legacy_id=$1 WHERE id=$2`, [pLegacy[i], hit.id]); n++; }
  }

  // other docs -> doc_headers + doc_lines
  const docMap = [
    ['quotation', 'Reference No', 'Quotation Date', 'Customer', 'Total Taxable Value (Rs)', 'Total Discount (Rs)', 'Total Tax (Rs)', 'Total (Rs)', 'Status'],
    ['proforma_invoice', 'Invoice No', 'Invoice Date', 'Customer', 'Total Taxable Value', 'Total Discount', 'Total Tax', 'Total', null],
    ['purchase_order', 'PO No.', 'Purchase Order Date', 'Supplier', 'Total Taxable Value', 'Total Discount', 'Total Tax', 'Total', null],
    ['sales_return', 'Reference No', 'Sales return Date', 'Customer', 'Total Taxable Value', 'Total Discount', 'Total Tax', 'Total', 'Delivery Status'],
    ['purchase_return', 'PO No.', 'Purchase Return Date', 'Supplier', 'Total Taxable Value', 'Total Discount', 'Total Tax', 'Total', 'Delivery Status'],
    ['transfer', 'Transfer Date', null, null, null, null, null, 'Total (Rs)', null],
  ];
  for (const [mod, ref, dt, party, tax2, disc, tax, tot, stat] of docMap) {
    for (const r of load(mod)) {
      const keys = Object.keys(r);
      const g = (k) => (k && r[k] !== undefined ? r[k] : '');
      await up(`INSERT INTO doc_headers(doc_type,ref_no,doc_date,party,taxable,discount,tax,total,status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
        [mod, g(ref) || g(keys[0]), iso(g(dt) || g(keys[1])), party ? g(party) : (g('From Warehouse') ? `${g('From Warehouse')} -> ${g('To Warehouse')}` : ''),
         num(g(tax2)), num(g(disc)), num(g(tax)), num(g(tot) || g(keys[keys.length - 2])), stat ? g(stat) : '']);
    }
  }
  // detail lines for quotation/proforma/purchase/returns/transfer
  for (const mod of ['quotation', 'proforma_invoice', 'purchase', 'sales_return', 'purchase_return', 'transfer']) {
    for (const d of loadParsed(mod)) {
      let li = 0;
      for (const L of d.lines || []) {
        li++;
        const vals = Object.values(L).filter((v) => typeof v === 'string');
        await up(`INSERT INTO doc_lines(doc_type,doc_legacy_id,line_no,item_name,hsn,qty,price,taxable,subtotal)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [mod, d.legacyId, li, L['Items'] || L['Description'] || L['Product'] || vals[1] || '', L['HSN'] || '',
           num(L['Qty'] || L['Quantity']), num(L['Selling Price (Rs)'] || L['Cost'] || L['Price']), num(L['Total Taxable Value (Rs)'] || L['Taxable']), num(L['Sub Total (Rs)'] || L['Total'])]);
      }
    }
  }
  // purchase_lines from parsed purchase details
  const purchIds = new Map((await client.query(`SELECT id, inv_no, legacy_id FROM purchases`)).rows.flatMap((r) => r.legacy_id ? [[`leg:${r.legacy_id}`, r.id]] : (r.inv_no ? [[r.inv_no, r.id]] : [])));
  for (const d of loadParsed('purchase')) {
    const pid = purchIds.get(d.header['Invoice No'] || d.header['Purchase #'] || d.header['Reference No']) ?? purchIds.get(`leg:${d.legacyId}`);
    if (!pid) continue;
    await client.query(`DELETE FROM purchase_lines WHERE purchase_id=$1`, [pid]);
    for (const L of d.lines || []) {
      await client.query(`INSERT INTO purchase_lines(purchase_id,item_name,qty,cost,taxable,subtotal) VALUES($1,$2,$3,$4,$5,$6)`,
        [pid, L['Items'] || L['Description'] || '', num(L['Qty']), num(L['Cost'] || L['Price']), num(L['Total Taxable Value (Rs)']), num(L['Sub Total (Rs)'])]);
      n++;
    }
  }

  // expenses exact from parsed views
  for (const d of loadParsed('expense')) {
    const f = d.fields;
    if (!f['Bill Date']) continue;
    await up(`INSERT INTO expenses(bill_date,category,supplier,taxable,cgst,sgst,igst,total,remarks,itc,legacy_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (legacy_id) DO UPDATE SET total=EXCLUDED.total`,
      [iso(f['Bill Date']), f['Expense Category'], f['Name of Supplier'], num(f['Taxable Amount']), num(f['CGST']), num(f['SGST']), num(f['IGST']), num(f['Total Amount']), f['Remarks'], f['Eligible for ITC'], d.legacyId]);
  }

  for (const r of load('cash_bank_entry'))
    await up(`INSERT INTO cash_bank_entries(ref_no,vouch_type,from_acct,to_acct,amount) VALUES($1,$2,$3,$4,$5) ON CONFLICT (ref_no) DO NOTHING`,
      [r['Reference No'], r['Voucher Type'], r['From Account'], r['To Account'], num(r['Amount'])]);
  for (const r of load('bank_statement'))
    await up(`INSERT INTO misc(kind,c1,c2,c3,c4,c5,c6) VALUES('bank_statement',$1,$2,$3,$4,$5,$6)`,
      [r['Account Name'], r['Account Number/Credit Card No'], r['Account Type'], r['Bank Name'], r['Statement'], r['Reconcile Status']]);
  for (const r of load('stock'))
    await up(`INSERT INTO stock_entries(warehouse,product,qty,unit,cost,sell_price,entry_type,entry_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [r['Warehouse Name'], r['Product Name'], num(r['Quantity']), r['Unit'], num(r['Cost (Rs)']), num(r['Selling Price (Rs)']), r['Entry Type'], iso(r['Date'])]);
  for (const r of load('expense_category'))
    await up(`INSERT INTO misc(kind,c1,c2,c3) VALUES('expense_category',$1,$2,$3)`, [r['Expense Category Name'], r['Description'], r['Type']]);
  for (const r of load('item'))
    await up(`INSERT INTO misc(kind,c1,c2) VALUES('item',$1,$2)`, [r['Name'], r['Description']]);
  for (const r of load('discount'))
    await up(`INSERT INTO misc(kind,c1,c2,c3,c4,c5) VALUES('discount',$1,$2,$3,$4,$5)`, [r['Name'], r['Type'], r['Value'], r['Valid from'], r['Valid to']]);
  for (const r of load('pdc_receive'))
    await up(`INSERT INTO misc(kind,c1,c2,c3,c4,c5,c6) VALUES('pdc_receive',$1,$2,$3,$4,$5,$6)`,
      [r['Ledger'], r['PDC Cheque No'], r['PDC Cheque Date'], r['PDC Amount'], r['PDC Deposit To'], r['PDC Deposit Date']]);
  for (const r of load('pdc_payment'))
    await up(`INSERT INTO misc(kind,c1,c2,c3,c4,c5,c6) VALUES('pdc_payment',$1,$2,$3,$4,$5,$6)`,
      [r['Ledger'], r['PDC Cheque No'], r['PDC Cheque Date'], r['PDC Amount'], r['PDC Deposit To'], r['PDC Deposit Date']]);
  for (const r of load('scrap_product'))
    await up(`INSERT INTO misc(kind,c1,c2,c3,c4,c5,c6) VALUES('scrap_product',$1,$2,$3,$4,$5,$6)`,
      [r['Product Name'], r['Batch No'], r['Quantity'], r['Cost (Rs)'], r['Price (Rs)'], r['Selling Price (Rs)']]);
  for (const [csv, kind] of [['attendance', 'attendance'], ['leave', 'leave'], ['holiday', 'holiday'], ['weekend', 'weekend'], ['deduction', 'deduction'], ['bonus', 'bonus'], ['tax_deduction', 'tax_deduction'], ['advance_salary', 'advance_salary'], ['payroll', 'payroll']]) {
    for (const r of load(csv)) {
      const v = Object.values(r).filter((x) => x !== undefined);
      await up(`INSERT INTO hr_events(kind,employee,event_date,status,amount,extra) VALUES($1,$2,$3,$4,$5,$6)`,
        [kind, v[0] || '', iso(v[1]) || null, v[2] || v[3] || '', num(v.find((x) => /[0-9,]+\.\d{2,3}/.test(x || '')) || 0), v.slice(0, 6).join(' | ').slice(0, 500)]);
    }
  }
  // app users from raw html-table dump
  if (existsSync(join(rawDir, 'users.json'))) {
    const users = JSON.parse(readFileSync(join(rawDir, 'users.json'), 'utf8').replace(/^\uFEFF/, ''));
    for (const u of users)
      await up(`INSERT INTO app_users(first_name,last_name,username,role,email,phone,status) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (username) DO NOTHING`,
        [u['First Name'], u['Last Name'], u['Username'], u['User Role'], u['Email'], u['Phone'], u['Status']]);
  }

  console.log(`IMPORT DONE ops=${n}`);
  for (const t of ['currencies', 'taxes', 'warehouses', 'product_categories', 'uoms', 'products', 'customers', 'suppliers', 'bank_accounts', 'sales', 'sale_lines', 'purchases', 'purchase_lines', 'doc_headers', 'doc_lines', 'employees', 'departments', 'positions', 'cash_bank_entries', 'expenses', 'stock_entries', 'hr_events', 'misc', 'app_users', 'doc_sequences']) {
    const c = await client.query(`SELECT count(*) FROM ${t}`);
    console.log(`${t}: ${c.rows[0].count}`);
  }
  const s = await client.query(`SELECT count(*) c, COALESCE(SUM(total),0) t FROM sales`);
  console.log(`sales total Rs ${s.rows[0].t} (old report: ~104350504)`);
  const p = await client.query(`SELECT count(*) c, COALESCE(SUM(total),0) t FROM purchases`);
  console.log(`purchases total Rs ${p.rows[0].t} (old report: ~1005861829... note indian-format parse)`);
} finally {
  client.release();
  await pool.end();
}
