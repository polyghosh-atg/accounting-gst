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
  const r = await pool.query('SELECT account_name, account_number, account_type, bank_name, statement, reconcile_status FROM bank_statements ORDER BY id');
  const head = ['Account Name', 'Account Number', 'Account Type', 'Bank Name', 'Statement', 'Reconcile Status'];
  const body = r.rows.map((x) => [x.account_name, x.account_number, x.account_type, x.bank_name, x.statement, x.reconcile_status].map(csvCell).join(','));
  return new Response(['\uFEFF' + head.join(','), ...body].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bank_statements.csv"',
    },
  });
}
