'use server';

import { Pool } from 'pg';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

const str = (form: FormData, k: string) => String(form.get(k) || '').trim();
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'bank-statements');

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
};
const iso = (v: unknown): string | null => {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    return null;
  }
  const s = String(v);
  let m = s.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return s.slice(0, 10);
  return null;
};

async function refreshStatus(id: number) {
  const r = await pool.query(
    `SELECT count(*) total, count(*) FILTER (WHERE reconciled='Completed') done FROM statement_lines WHERE statement_id=$1`, [id]);
  const { total, done } = r.rows[0];
  await pool.query('UPDATE bank_statements SET reconcile_status=$1 WHERE id=$2',
    [Number(total) > 0 && Number(total) === Number(done) ? 'Completed' : 'Pending', id]);
}

export async function addStatement(form: FormData) {
  const raw = str(form, 'bank_account');
  if (!raw) throw new Error('bank account required');
  const [name, number] = raw.split('||');
  const acc = await pool.query('SELECT bank_name FROM bank_accounts WHERE name=$1 LIMIT 1', [name]);
  const file = form.get('statement_file') as File | null;
  const ref = str(form, 'statement');
  let filename = ref;
  let filePath: string | null = null;
  let rows: Record<string, unknown>[] = [];
  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    filename = file.name;
    await mkdir(UPLOAD_DIR, { recursive: true });
    const safe = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await writeFile(join(UPLOAD_DIR, safe), buf);
    filePath = `/uploads/bank-statements/${safe}`;
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  }
  if (!filename) throw new Error('statement file or reference required');
  const ins = await pool.query(
    `INSERT INTO bank_statements(account_name,account_number,account_type,bank_name,statement,file_path,reconcile_status)
     VALUES($1,$2,$3,$4,$5,$6,'Pending') RETURNING id`,
    [name, number || '', 'Saving', acc.rows[0]?.bank_name || '', filename, filePath]
  );
  const sid = ins.rows[0].id;
  let sr = 0;
  const key = (o: Record<string, unknown>, names: string[]) => {
    const keys = Object.keys(o);
    for (const n of names) {
      const hit = keys.find((k) => k.toLowerCase().replace(/[^a-z]/g, '') === n);
      if (hit) return o[hit];
    }
    return '';
  };
  for (const o of rows) {
    sr++;
    await pool.query(
      `INSERT INTO statement_lines(statement_id,sr,txn_date,cheque_no,particulars,withdraw,deposit)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [sid, sr, iso(key(o, ['transactiondate', 'date', 'txndate'])),
       String(key(o, ['chequeno', 'cheque', 'chqno']) || ''),
       String(key(o, ['particulars', 'description', 'narration', 'details']) || ''),
       num(key(o, ['withdraw', 'withdrawal', 'debit'])), num(key(o, ['deposit', 'credit']))]
    );
  }
  await refreshStatus(sid);
  revalidatePath('/account/bank-statement');
}

export async function toggleLine(form: FormData) {
  const id = Number(form.get('line_id'));
  const sid = Number(form.get('statement_id'));
  if (!id || !sid) throw new Error('invalid line');
  await pool.query(
    `UPDATE statement_lines SET reconciled = CASE WHEN reconciled='Completed' THEN 'Pending' ELSE 'Completed' END WHERE id=$1`, [id]);
  await refreshStatus(sid);
  revalidatePath(`/account/bank-statement/${sid}`);
}

const isoDate = (s: string) => {
  const m = s.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m2 ? s.slice(0, 10) : null;
};

// Match statement lines against payment transactions (old: reconcile_entry)
export async function reconcileLines(form: FormData) {
  const sid = Number(form.get('statement_id'));
  if (!sid) throw new Error('invalid statement');
  const today = new Date().toISOString().slice(0, 10);
  const lineIds = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^(?:match|remarks|date)_(\d+)$/);
    if (m) lineIds.add(Number(m[1]));
  }
  for (const lid of lineIds) {
    const refs = String(form.get(`match_${lid}`) || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!refs.length) continue;
    const isoDate = (s: string) => {
      const m = s.match(/(\d{2})-(\d{2})-(\d{4})/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      const m2 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
      return m2 ? s.slice(0, 10) : today;
    };
    await pool.query(
      `UPDATE statement_lines SET reconciled='Completed', reconcile_date=$1, matched_refs=$2, remarks=$3
       WHERE id=$4 AND statement_id=$5`,
      [isoDate(String(form.get(`date_${lid}`) || '')), refs.join(', '), String(form.get(`remarks_${lid}`) || ''), lid, sid]
    );
  }
  await refreshStatus(sid);
  revalidatePath('/account/bank-statement');
  revalidatePath(`/account/bank-statement/${sid}`);
}

export async function deleteStatement(form: FormData) {
  const id = Number(form.get('statement_id'));
  if (!id) throw new Error('invalid statement');
  const f = await pool.query('SELECT file_path FROM bank_statements WHERE id=$1', [id]);
  await pool.query('DELETE FROM statement_lines WHERE statement_id=$1', [id]);
  await pool.query('DELETE FROM bank_statements WHERE id=$1', [id]);
  const fp = f.rows[0]?.file_path as string | null;
  if (fp) {
    try { await unlink(join(process.cwd(), 'public', fp.replace(/^\//, ''))); } catch { /* gone */ }
  }
  revalidatePath('/account/bank-statement');
}
