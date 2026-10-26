'use server';

import { Pool } from 'pg';
import { revalidatePath } from 'next/cache';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

const num = (v: FormDataEntryValue | null) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
};

async function nextRef(kind: string, prefix: string): Promise<string> {
  const r = await pool.query(
    `INSERT INTO doc_sequences(doc_type, prefix) VALUES($1,$2)
     ON CONFLICT (doc_type) DO UPDATE SET next_seq = doc_sequences.next_seq + 1
     RETURNING next_seq`,
    [kind, prefix]
  );
  return `${prefix}${r.rows[0].next_seq}`;
}

async function accountName(id: number): Promise<string> {
  const r = await pool.query('SELECT name FROM bank_accounts WHERE id=$1', [id]);
  if (!r.rows.length) throw new Error('account not found');
  return r.rows[0].name;
}

// Deposit: Cash on Hand -> bank account (old: module=B, type=C, from_account=1)
export async function deposit(form: FormData) {
  const id = Number(form.get('account_id'));
  const amount = num(form.get('amount'));
  const ref = String(form.get('reference_no') || '') || (await nextRef('bank_receipt', 'BR'));
  if (!id || amount <= 0) throw new Error('invalid deposit');
  const name = await accountName(id);
  await pool.query(
    `INSERT INTO cash_bank_entries(ref_no, vouch_type, from_acct, to_acct, amount)
     VALUES($1,'bank_receipt','CASH ACCOUNT',$2,$3)`,
    [ref, name, amount]
  );
  await pool.query('UPDATE bank_accounts SET closing = closing + $1 WHERE id=$2', [amount, id]);
  revalidatePath('/bank');
}

// Withdraw: bank account -> Cash on Hand (old: bank_payment)
export async function withdraw(form: FormData) {
  const id = Number(form.get('account_id'));
  const amount = num(form.get('amount'));
  const ref = String(form.get('reference_no') || '') || (await nextRef('bank_payment', 'BP'));
  if (!id || amount <= 0) throw new Error('invalid withdraw');
  const name = await accountName(id);
  await pool.query(
    `INSERT INTO cash_bank_entries(ref_no, vouch_type, from_acct, to_acct, amount)
     VALUES($1,'bank_payment',$2,'CASH ACCOUNT',$3)`,
    [ref, name, amount]
  );
  await pool.query('UPDATE bank_accounts SET closing = closing - $1 WHERE id=$2', [amount, id]);
  revalidatePath('/bank');
}

// Transfer: account -> account (old: contra)
export async function transfer(form: FormData) {
  const fromId = Number(form.get('from_id'));
  const toId = Number(form.get('to_id'));
  const amount = num(form.get('amount'));
  const ref = String(form.get('reference_no') || '') || (await nextRef('contra', 'CT'));
  if (!fromId || !toId || fromId === toId || amount <= 0) throw new Error('invalid transfer');
  const from = await accountName(fromId);
  const to = await accountName(toId);
  await pool.query(
    `INSERT INTO cash_bank_entries(ref_no, vouch_type, from_acct, to_acct, amount)
     VALUES($1,'contra',$2,$3,$4)`,
    [ref, from, to, amount]
  );
  await pool.query('UPDATE bank_accounts SET closing = closing - $1 WHERE id=$2', [amount, fromId]);
  await pool.query('UPDATE bank_accounts SET closing = closing + $1 WHERE id=$2', [amount, toId]);
  revalidatePath('/bank');
}

export async function addAccount(form: FormData) {
  const name = String(form.get('account_name') || '').trim();
  if (!name) throw new Error('account name required');
  const opening = num(form.get('opening_balance'));
  await pool.query(
    `INSERT INTO bank_accounts(name, type, number, bank_name, ifsc, description, opening, closing, status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$7,'Active')`,
    [
      name,
      String(form.get('account_type') || 'Saving'),
      String(form.get('account_number') || ''),
      String(form.get('bank_name') || ''),
      String(form.get('ifsc') || ''),
      String(form.get('description') || ''),
      opening,
    ]
  );
  revalidatePath('/bank');
}

export async function updateAccount(form: FormData) {
  const id = Number(form.get('account_id'));
  if (!id) throw new Error('invalid account');
  await pool.query(
    `UPDATE bank_accounts SET name=$1, type=$2, number=$3, bank_name=$4, ifsc=$5, description=$6, status=$7 WHERE id=$8`,
    [
      String(form.get('account_name') || ''),
      String(form.get('account_type') || ''),
      String(form.get('account_number') || ''),
      String(form.get('bank_name') || ''),
      String(form.get('ifsc') || ''),
      String(form.get('description') || ''),
      String(form.get('status') || 'Active'),
      id,
    ]
  );
  revalidatePath('/bank');
  revalidatePath(`/bank/${id}`);
}

// Increase / Decrease capital (old: increase_reduce_modal, transaction_type AI/AR,
// reference INCREASE CAPITAL / REDUCE CAPITAL). Adjusts closing balance directly.
export async function adjustCapital(form: FormData) {
  const id = Number(form.get('account_id'));
  const amount = num(form.get('amount'));
  const mode = String(form.get('mode') || 'increase');
  const ref = String(form.get('reference_no') || '') || (mode === 'increase' ? 'INCREASE CAPITAL' : 'REDUCE CAPITAL');
  if (!id || amount <= 0) throw new Error('invalid amount');
  const name = await accountName(id);
  if (mode === 'increase') {
    await pool.query(
      `INSERT INTO cash_bank_entries(ref_no, vouch_type, from_acct, to_acct, amount)
       VALUES($1,'capital_increase','CAPITAL',$2,$3)`,
      [ref, name, amount]
    );
    await pool.query('UPDATE bank_accounts SET closing = closing + $1 WHERE id=$2', [amount, id]);
  } else {
    await pool.query(
      `INSERT INTO cash_bank_entries(ref_no, vouch_type, from_acct, to_acct, amount)
       VALUES($1,'capital_decrease',$2,'CAPITAL',$3)`,
      [ref, name, amount]
    );
    await pool.query('UPDATE bank_accounts SET closing = closing - $1 WHERE id=$2', [amount, id]);
  }
  revalidatePath('/bank');
}

export async function toggleStatus(form: FormData) {
  const id = Number(form.get('account_id'));
  if (!id) throw new Error('invalid account');
  await pool.query(
    `UPDATE bank_accounts SET status = CASE WHEN status='Active' THEN 'Inactive' ELSE 'Active' END WHERE id=$1`,
    [id]
  );
  revalidatePath('/bank');
}

function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = '', q = false;
  const t = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// Bulk import (old: import_bank_account_modal). Sample columns:
// AccountName,AccountNumber,AccountType,BankName,IFSC,Description,Status,OpeningBalance
export async function importAccounts(_prev: string, form: FormData): Promise<string> {
  const file = form.get('csvfile') as File | null;
  if (!file || file.size === 0) return 'Please choose a CSV file.';
  const text = await file.text();
  const rows = splitCsv(text);
  if (rows.length < 2) return 'CSV is empty.';
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = head.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const cName = idx(['accountname', 'account name']);
  if (cName < 0) return 'Missing AccountName column. Expected: AccountName,AccountNumber,AccountType,BankName,IFSC,Description,Status,OpeningBalance';
  const cNum = idx(['accountnumber', 'account number']);
  const cType = idx(['accounttype', 'account type']);
  const cBank = idx(['bankname', 'bank name']);
  const cIfsc = idx(['ifsc']);
  const cDesc = idx(['description']);
  const cStatus = idx(['status']);
  const cOpen = idx(['openingbalance', 'opening balance']);
  const wantUpdate = form.get('update_bank_account') === '1';
  const wantCreate = form.get('create_bank_account') !== '0';
  let created = 0, updated = 0, skipped = 0;
  const typeName = (v: string) => (v.trim() === '1' ? 'Current' : v.trim() === '2' ? 'Credit' : 'Saving');
  for (const r of rows.slice(1)) {
    const name = (r[cName] || '').trim();
    if (!name) { skipped++; continue; }
    const number = cNum >= 0 ? (r[cNum] || '').trim() : '';
    const type = cType >= 0 ? typeName(r[cType] || '') : 'Saving';
    const bank = cBank >= 0 ? (r[cBank] || '').trim() : '';
    const ifsc = cIfsc >= 0 ? (r[cIfsc] || '').trim() : '';
    const desc = cDesc >= 0 ? (r[cDesc] || '').trim() : '';
    const status = (cStatus >= 0 ? r[cStatus] || '' : '').trim() || 'Active';
    const opening = parseFloat(String(cOpen >= 0 ? r[cOpen] || '0' : '0').replace(/[^0-9.\-]/g, '')) || 0;
    const found = await pool.query('SELECT id FROM bank_accounts WHERE name=$1 AND COALESCE(number,\'\')=$2', [name, number]);
    if (found.rows.length) {
      if (wantUpdate) {
        await pool.query(
          `UPDATE bank_accounts SET type=$1, bank_name=$2, ifsc=$3, description=$4, status=$5 WHERE id=$6`,
          [type, bank, ifsc, desc, /inactive/i.test(status) ? 'Inactive' : 'Active', found.rows[0].id]
        );
        updated++;
      } else skipped++;
    } else if (wantCreate) {
      await pool.query(
        `INSERT INTO bank_accounts(name, type, number, bank_name, ifsc, description, opening, closing, status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$7,$8)`,
        [name, type, number, bank, ifsc, desc, opening, /inactive/i.test(status) ? 'Inactive' : 'Active']
      );
      created++;
    } else skipped++;
  }
  revalidatePath('/bank');
  return `Import done: ${created} created, ${updated} updated, ${skipped} skipped.`;
}
