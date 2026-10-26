import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query(`ALTER TABLE scrap_lines ADD COLUMN IF NOT EXISTS ordered_qty NUMERIC DEFAULT 0;
ALTER TABLE scrap_lines ADD COLUMN IF NOT EXISTS tax_label TEXT DEFAULT '';
ALTER TABLE scrap_lines ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0;
ALTER TABLE scrap_lines ADD COLUMN IF NOT EXISTS tax_amt NUMERIC DEFAULT 0;
ALTER TABLE scrap_docs ADD COLUMN IF NOT EXISTS external_note TEXT DEFAULT '';
ALTER TABLE scrap_docs ADD COLUMN IF NOT EXISTS bank_detail TEXT DEFAULT '';
ALTER TABLE scrap_docs ADD COLUMN IF NOT EXISTS terms TEXT DEFAULT '';`);
await c.query(`UPDATE scrap_lines SET ordered_qty=qty, tax_label='IGST 15%', tax_rate=15, tax_amt=750
  WHERE doc_id=(SELECT id FROM scrap_docs WHERE ref_no='SP1055')`);
console.log('ok');
c.release(); await pool.end();
