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

export async function addExpense(form: FormData) {
  if (!str(form, 'bill_date') || !str(form, 'category')) throw new Error('bill date and category required');
  await pool.query(
    `INSERT INTO expenses(bill_date,category,supplier,taxable,cgst,sgst,igst,total,paid,due,remarks,itc)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [iso(str(form, 'bill_date')), str(form, 'category'), str(form, 'supplier') || str(form, 'supplier_name'),
     num(form, 'taxable'), num(form, 'cgst'), num(form, 'sgst'), num(form, 'igst'),
     num(form, 'total'), num(form, 'paid'), num(form, 'due'), str(form, 'remarks'),
     form.get('itc') === '1' ? 'Yes' : 'No']
  );
  revalidatePath('/expenses');
}

export async function updateExpense(form: FormData) {
  const id = Number(form.get('expense_id'));
  if (!id) throw new Error('invalid expense');
  await pool.query(
    `UPDATE expenses SET bill_date=$1,category=$2,supplier=$3,taxable=$4,cgst=$5,sgst=$6,igst=$7,total=$8,paid=$9,due=$10,remarks=$11,itc=$12 WHERE id=$13`,
    [iso(str(form, 'bill_date')), str(form, 'category'), str(form, 'supplier') || str(form, 'supplier_name'),
     num(form, 'taxable'), num(form, 'cgst'), num(form, 'sgst'), num(form, 'igst'),
     num(form, 'total'), num(form, 'paid'), num(form, 'due'), str(form, 'remarks'),
     form.get('itc') === '1' ? 'Yes' : 'No', id]
  );
  revalidatePath('/expenses');
  revalidatePath(`/expenses/${id}`);
}

export async function deleteExpense(form: FormData) {
  const id = Number(form.get('expense_id'));
  if (!id) throw new Error('invalid expense');
  await pool.query('DELETE FROM expense_items WHERE expense_id=$1', [id]);
  await pool.query('DELETE FROM expenses WHERE id=$1', [id]);
  revalidatePath('/expenses');
}

// Make Payment (old: transaction-modal, module=E, type=P)
export async function makePayment(form: FormData) {
  const id = Number(form.get('expense_id'));
  const amount = num(form, 'amount');
  if (!id || amount <= 0) throw new Error('invalid payment');
  const date = iso(str(form, 'pay_date')) || new Date().toISOString().slice(0, 10);
  const mode = str(form, 'pay_mode') || 'Cash';
  const from = str(form, 'from_account') || 'CASH ACCOUNT';
  const ref = str(form, 'reference_no') || '';
  const ex = await pool.query('SELECT supplier, total, legacy_id FROM expenses WHERE id=$1', [id]);
  if (!ex.rows.length) throw new Error('expense not found');
  const supplier = ex.rows[0].supplier as string;
  await pool.query(
    `INSERT INTO transactions(module,txn_type,ref_no,voucher_date,pay_mode,cheque_no,cheque_date,amount,entry_id,expense_id)
     VALUES('Expense','Payment',$1,$2,$3,'',$4,$5,$6,$7)`,
    [ref, date, mode, '', null, amount, ex.rows[0].legacy_id, id]
  );
  await pool.query(
    `INSERT INTO cash_bank_entries(ref_no,vouch_type,voucher_date,from_acct,to_acct,amount,narration)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [ref || `EP${id}-${Date.now().toString().slice(-6)}`, mode === 'Cash' ? 'cash_payment' : 'bank_payment', date, from, supplier, amount, `Expense #${id} payment`]
  );
  await pool.query('UPDATE expenses SET paid = paid + $1, due = GREATEST(total - (paid + $1), 0) WHERE id=$2', [amount, id]);
  revalidatePath('/expenses');
  revalidatePath(`/expenses/${id}`);
}
