'use server';

import { Pool } from 'pg';
import { revalidatePath } from 'next/cache';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

const str = (form: FormData, k: string) => String(form.get(k) || '').trim();
const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
};
const iso = (s: string) => {
  const m = s.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m2 ? s.slice(0, 10) : null;
};
const PREFIX: Record<string, string> = { entry: 'SE', issue: 'SI', receive: 'SR' };
const path = (kind: string) => `/account/scrap-${kind}`;

type Line = { product: string; batch_no: string; qty: number; cost: number; selling_price: number; price: number; ordered_qty: number; tax_label: string; tax_rate: number };

async function nextRef(kind: string) {
  const r = await pool.query(
    `INSERT INTO doc_sequences(doc_type, prefix) VALUES($1,$2)
     ON CONFLICT (doc_type) DO UPDATE SET next_seq = doc_sequences.next_seq + 1 RETURNING next_seq`,
    [`scrap_${kind}`, PREFIX[kind] || 'SC']
  );
  return `${PREFIX[kind] || 'SC'}${r.rows[0].next_seq}`;
}

export async function addScrap(form: FormData) {
  const kind = str(form, 'kind');
  const lines = JSON.parse(String(form.get('lines') || '[]')) as Line[];
  if (!lines.length) throw new Error('add at least one product row');
  const ref = str(form, 'reference_no') || (await nextRef(kind));
  const d = await pool.query(
    `INSERT INTO scrap_docs(kind,ref_no,entry_date,warehouse,party) VALUES($1,$2,$3,$4,$5) RETURNING id`,
    [kind, ref, iso(str(form, 'entry_date')), str(form, 'warehouse'), str(form, 'party')]
  );
  for (const L of lines) {
    const taxable = num(L.qty) * num(L.cost);
    const taxAmt = taxable * num(L.tax_rate) / 100;
    await pool.query(
      `INSERT INTO scrap_lines(doc_id,product,batch_no,qty,cost,selling_price,price,ordered_qty,tax_label,tax_rate,tax_amt) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [d.rows[0].id, L.product || '', L.batch_no || '', num(L.qty), num(L.cost), num(L.selling_price), num(L.price), num(L.ordered_qty) || num(L.qty), L.tax_label || '', num(L.tax_rate), taxAmt]
    );
  }
  await pool.query('UPDATE scrap_docs SET internal_note=$1, external_note=$2, bank_detail=$3, terms=$4 WHERE id=$5',
    [str(form, 'internal_note'), str(form, 'external_note'), str(form, 'bank_detail'), str(form, 'terms'), d.rows[0].id]);
  revalidatePath(path(kind));
}

export async function updateScrap(form: FormData) {
  const kind = str(form, 'kind');
  const id = Number(form.get('doc_id'));
  const lines = JSON.parse(String(form.get('lines') || '[]')) as Line[];
  if (!id || !lines.length) throw new Error('invalid scrap doc');
  await pool.query('UPDATE scrap_docs SET ref_no=$1, entry_date=$2, warehouse=$3, party=$4, internal_note=$5, external_note=$6, bank_detail=$7, terms=$8 WHERE id=$9',
    [str(form, 'reference_no'), iso(str(form, 'entry_date')), str(form, 'warehouse'), str(form, 'party'), str(form, 'internal_note'), str(form, 'external_note'), str(form, 'bank_detail'), str(form, 'terms'), id]);
  await pool.query('DELETE FROM scrap_lines WHERE doc_id=$1', [id]);
  for (const L of lines) {
    const taxable = num(L.qty) * num(L.cost);
    const taxAmt = taxable * num(L.tax_rate) / 100;
    await pool.query(
      `INSERT INTO scrap_lines(doc_id,product,batch_no,qty,cost,selling_price,price,ordered_qty,tax_label,tax_rate,tax_amt) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, L.product || '', L.batch_no || '', num(L.qty), num(L.cost), num(L.selling_price), num(L.price), num(L.ordered_qty) || num(L.qty), L.tax_label || '', num(L.tax_rate), taxAmt]
    );
  }
  revalidatePath(path(kind));
  revalidatePath(`${path(kind)}/${id}`);
}

export async function deleteScrap(form: FormData) {
  const kind = str(form, 'kind');
  const id = Number(form.get('doc_id'));
  if (!id) throw new Error('invalid scrap doc');
  await pool.query('DELETE FROM scrap_lines WHERE doc_id=$1', [id]);
  await pool.query('DELETE FROM scrap_docs WHERE id=$1', [id]);
  revalidatePath(path(kind));
}
