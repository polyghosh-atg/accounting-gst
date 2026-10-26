import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query(`ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS file_path TEXT;
CREATE TABLE IF NOT EXISTS statement_lines(id SERIAL PRIMARY KEY, statement_id INT REFERENCES bank_statements(id) ON DELETE CASCADE,
  sr INT DEFAULT 0, txn_date DATE, cheque_no TEXT, particulars TEXT,
  withdraw NUMERIC DEFAULT 0, deposit NUMERIC DEFAULT 0, reconciled TEXT DEFAULT 'Pending');
UPDATE bank_statements SET reconcile_status='Pending' WHERE reconcile_status='Unreconciled';
UPDATE bank_statements SET reconcile_status='Completed' WHERE reconcile_status='Reconciled';`);
console.log('ok');
c.release(); await pool.end();
