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

const PREFIX: Record<string, [string, string]> = {
  bank_payment: ['bank_payment', 'BP'],
  bank_receipt: ['bank_receipt', 'BR'],
  cash_payment: ['cash_payment', 'CP'],
  cash_receipt: ['cash_receipt', 'CR'],
  contra: ['contra', 'CT'],
};

async function nextRef(kind: string, prefix: string) {
  const r = await pool.query(
    `INSERT INTO doc_sequences(doc_type, prefix) VALUES($1,$2)
     ON CONFLICT (doc_type) DO UPDATE SET next_seq = doc_sequences.next_seq + 1 RETURNING next_seq`,
    [kind, prefix]
  );
  return `${prefix}${r.rows[0].next_seq}`;
}

export async function addEntry(form: FormData) {
  const vt = str(form, 'voucher_type');
  const [kind, prefix] = PREFIX[vt] || ['contra', 'CT'];
  const ref = str(form, 'reference_no') || (await nextRef(kind, prefix));
  const amount = num(form, 'amount');
  if (!str(form, 'from_account') || !str(form, 'to_account') || amount <= 0) throw new Error('from, to and amount required');
  await pool.query(
    `INSERT INTO cash_bank_entries(ref_no,vouch_type,voucher_date,from_acct,to_acct,amount,narration)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [ref, vt, iso(str(form, 'voucher_date')), str(form, 'from_account'), str(form, 'to_account'), amount, str(form, 'narration')]
  );
  revalidatePath('/account/cash-bank');
}

export async function updateEntry(form: FormData) {
  const id = Number(form.get('entry_id'));
  if (!id) throw new Error('invalid entry');
  await pool.query(
    `UPDATE cash_bank_entries SET ref_no=$1,vouch_type=$2,voucher_date=$3,from_acct=$4,to_acct=$5,amount=$6,narration=$7 WHERE id=$8`,
    [str(form, 'reference_no'), str(form, 'voucher_type'), iso(str(form, 'voucher_date')), str(form, 'from_account'), str(form, 'to_account'), num(form, 'amount'), str(form, 'narration'), id]
  );
  revalidatePath('/account/cash-bank');
}

export async function deleteEntry(form: FormData) {
  const id = Number(form.get('entry_id'));
  if (!id) throw new Error('invalid entry');
  await pool.query('DELETE FROM cash_bank_entries WHERE id=$1', [id]);
  revalidatePath('/account/cash-bank');
}

type BulkRow = { voucher_type: string; reference_no: string; voucher_date: string; from_account: string; to_account: string; amount: number; narration: string };

export async function bulkAddEntries(form: FormData) {
  const rows = JSON.parse(String(form.get('rows') || '[]')) as BulkRow[];
  const clean = rows.filter((r) => r.from_account?.trim() && r.to_account?.trim() && Number(r.amount) > 0);
  if (!clean.length) throw new Error('add at least one complete row');
  for (const r of clean) {
    const [kind, prefix] = PREFIX[r.voucher_type] || ['contra', 'CT'];
    const ref = (r.reference_no || '').trim() || (await nextRef(kind, prefix));
    await pool.query(
      `INSERT INTO cash_bank_entries(ref_no,vouch_type,voucher_date,from_acct,to_acct,amount,narration)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [ref, r.voucher_type, iso(r.voucher_date || ''), r.from_account.trim(), r.to_account.trim(), Number(r.amount), (r.narration || '').trim()]
    );
  }
  revalidatePath('/account/cash-bank');
}
