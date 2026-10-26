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
const iso = (v: unknown) => (v ? String(v).slice(0, 10) : '');

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await pool.query('SELECT account_name, statement FROM bank_statements WHERE id=$1', [id]);
  const r = await pool.query(
    'SELECT sr, txn_date, cheque_no, particulars, withdraw, deposit, reconciled FROM statement_lines WHERE statement_id=$1 ORDER BY sr', [id]);
  const head = ['Sr', 'Statement', 'Transaction Date', 'Cheque No', 'Particulars', 'Withdraw', 'Deposit', 'Reconcile Status'];
  const body = r.rows.map((x) => [x.sr, s.rows[0]?.statement || '', iso(x.txn_date), x.cheque_no, x.particulars, x.withdraw, x.deposit, x.reconciled].map(csvCell).join(','));
  const name = `bank_statement_${s.rows[0]?.account_name || id}_lines.csv`.replace(/[^\w.-]+/g, '_');
  return new Response(['\uFEFF' + head.join(','), ...body].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  });
}
