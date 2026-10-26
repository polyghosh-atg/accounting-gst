'use server';

import { Pool } from 'pg';
import { revalidatePath } from 'next/cache';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

const str = (form: FormData, k: string) => String(form.get(k) || '').trim();
const num = (form: FormData, k: string) => {
  const n = parseFloat(str(form, k).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
};
const iso = (s: string) => {
  const m = s.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m2 ? s.slice(0, 10) : null;
};
const table = (kind: string) => (kind === 'payment' ? 'pdc_payments' : 'pdc_receives');
const path = (kind: string) => (kind === 'payment' ? '/account/pdc-payment' : '/account/pdc-receive');

export async function addPdc(form: FormData) {
  const kind = str(form, 'kind');
  const amount = num(form, 'amount');
  if (!str(form, 'ledger') || !str(form, 'cheque_no') || amount <= 0) throw new Error('ledger, cheque no and amount required');
  await pool.query(
    `INSERT INTO ${table(kind)}(ledger,cheque_no,cheque_date,deposit_date,amount,deposit_to,status)
     VALUES($1,$2,$3,$4,$5,$6,'Pending')`,
    [str(form, 'ledger'), str(form, 'cheque_no'), iso(str(form, 'cheque_date')), iso(str(form, 'deposit_date')), amount, str(form, 'deposit_to')]
  );
  revalidatePath(path(kind));
}

export async function updatePdc(form: FormData) {
  const kind = str(form, 'kind');
  const id = Number(form.get('pdc_id'));
  if (!id) throw new Error('invalid record');
  await pool.query(
    `UPDATE ${table(kind)} SET ledger=$1,cheque_no=$2,cheque_date=$3,deposit_date=$4,amount=$5,deposit_to=$6,status=$7 WHERE id=$8`,
    [str(form, 'ledger'), str(form, 'cheque_no'), iso(str(form, 'cheque_date')), iso(str(form, 'deposit_date')), num(form, 'amount'), str(form, 'deposit_to'), str(form, 'status') || 'Pending', id]
  );
  revalidatePath(path(kind));
}

export async function deletePdc(form: FormData) {
  const kind = str(form, 'kind');
  const id = Number(form.get('pdc_id'));
  if (!id) throw new Error('invalid record');
  await pool.query(`DELETE FROM ${table(kind)} WHERE id=$1`, [id]);
  revalidatePath(path(kind));
}

// Deposit a PDC cheque (old: add_deposit modal -> Actual Deposit Date, Pay Slip No, Deposited By).
// Marks Deposited and books the matching voucher entry.
export async function depositPdc(form: FormData) {
  const kind = str(form, 'kind');
  const id = Number(form.get('pdc_id'));
  if (!id) throw new Error('invalid record');
  const r = await pool.query(`SELECT * FROM ${table(kind)} WHERE id=$1`, [id]);
  if (!r.rows.length) throw new Error('record not found');
  const p = r.rows[0];
  const date = iso(str(form, 'actual_deposit_date')) || new Date().toISOString().slice(0, 10);
  const slip = str(form, 'pay_slip_no');
  const by = str(form, 'deposited_by');
  const narration = [`PDC ${p.cheque_no}`, slip ? `slip ${slip}` : '', by ? `by ${by}` : ''].filter(Boolean).join(' · ');
  if (kind === 'payment') {
    await pool.query(
      `INSERT INTO cash_bank_entries(ref_no,vouch_type,voucher_date,from_acct,to_acct,amount,narration)
       VALUES($1,'bank_payment',$2,$3,$4,$5,$6)`,
      [`PDC-${p.cheque_no}`, date, p.deposit_to || 'CASH ACCOUNT', p.ledger, p.amount, narration]
    );
  } else {
    await pool.query(
      `INSERT INTO cash_bank_entries(ref_no,vouch_type,voucher_date,from_acct,to_acct,amount,narration)
       VALUES($1,'bank_receipt',$2,$3,$4,$5,$6)`,
      [`PDC-${p.cheque_no}`, date, p.ledger, p.deposit_to || 'CASH ACCOUNT', p.amount, narration]
    );
  }
  await pool.query(`UPDATE ${table(kind)} SET status='Deposited', deposit_date=$1 WHERE id=$2`, [date, id]);
  revalidatePath(path(kind));
}
