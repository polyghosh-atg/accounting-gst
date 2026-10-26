'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { q } from '@/lib/db';
import { isoDate } from './dates';

const LIST = '/docs/proforma_invoice';
const str = (form: FormData, k: string) => String(form.get(k) || '').trim();

async function nextSaleNo(): Promise<string> {
  const r = await q<{ n: string }>(
    `SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(inv_no,'\\D','','g'),'') AS INTEGER)),0)+1 n FROM sales WHERE inv_no ~ '^S[0-9]+$'`
  );
  return `S${r[0]?.n ?? 1}`;
}

/* Convert checked proformas to sales (skips already-converted). */
export async function convertToSale(form: FormData) {
  const ids = form.getAll('pi_ids').map(Number).filter(Boolean);
  if (ids.length === 0) return;
  for (const id of ids) {
    const h = await q('SELECT * FROM doc_headers WHERE id=$1 AND doc_type=$2', [String(id), 'proforma_invoice']);
    const doc = h[0];
    if (!doc || String(doc.status) === 'Converted') continue;
    const invNo = await nextSaleNo();
    const ins = await q<{ id: string }>(
      `INSERT INTO sales(inv_no,inv_date,customer,discount,taxable,tax,total,tds,paid,due,delivery_status)
       VALUES($1,$2,$3,$4,$5,$6,$7,0,0,$7,'Pending') RETURNING id`,
      [invNo, isoDate(doc.doc_date) ?? new Date().toISOString().slice(0, 10), String(doc.party), String(doc.discount ?? 0), String(doc.taxable ?? 0), String(doc.tax ?? 0), String(doc.total ?? 0)]
    );
    const saleId = ins[0]?.id;
    if (!saleId) continue;
    const useLines = await q('SELECT * FROM doc_lines WHERE doc_type=$1 AND doc_legacy_id=$2 ORDER BY line_no', ['proforma_invoice', String(id)]);
    for (const ln of useLines) {
      await q(
        `INSERT INTO sale_lines(sale_id,item_name,hsn,qty,free_qty,price,batch_no,discount,uom,taxable,tax_amt,subtotal,igst_tax,cgst_tax,sgst_tax)
         VALUES($1,$2,$3,$4,0,$5,'',0,'',$6,0,$7,0,0,0)`,
        [String(saleId), String(ln.item_name), String(ln.hsn ?? ''), String(ln.qty ?? 0), String(ln.price ?? 0), String(ln.taxable ?? 0), String(ln.subtotal ?? 0)]
      );
    }
    await q("UPDATE doc_headers SET status='Converted' WHERE id=$1", [String(id)]);
  }
  revalidatePath(LIST);
}

export async function deleteProforma(form: FormData) {
  const id = Number(form.get('doc_id'));
  if (!id) throw new Error('invalid document');
  await q('DELETE FROM doc_lines WHERE doc_type=$1 AND doc_legacy_id=$2', ['proforma_invoice', String(id)]);
  await q('DELETE FROM doc_headers WHERE id=$1 AND doc_type=$2', [String(id), 'proforma_invoice']);
  revalidatePath(LIST);
}

export async function updateProforma(form: FormData) {
  const id = Number(form.get('doc_id'));
  if (!id) throw new Error('invalid document');
  await q('UPDATE doc_headers SET ref_no=$1, doc_date=$2, party=$3 WHERE id=$4 AND doc_type=$5', [
    str(form, 'ref_no') || 'PI-',
    str(form, 'doc_date') || null,
    str(form, 'party'),
    String(id),
    'proforma_invoice',
  ]);
  revalidatePath(LIST);
}

export async function addProforma(form: FormData) {
  const refNo = str(form, 'ref_no');
  const party = str(form, 'party');
  if (!refNo) throw new Error('reference no required');
  if (!party) throw new Error('customer required');
  const lines: { name: string; qty: number; price: number }[] = JSON.parse(String(form.get('lines_json') || '[]'));
  const valid = lines.filter((l) => l.name && Number(l.qty) > 0);
  if (valid.length === 0) throw new Error('add at least one line item');
  const discount = Number(form.get('discount') || 0);
  const taxable = valid.reduce((a, l) => a + Number(l.qty) * Number(l.price), 0);
  const total = taxable - discount;
  const hIns = await q<{ id: string }>(
    `INSERT INTO doc_headers(doc_type,ref_no,doc_date,party,taxable,discount,tax,total,status)
     VALUES('proforma_invoice',$1,$2,$3,$4,$5,0,$6,'') RETURNING id`,
    [refNo, str(form, 'doc_date') || null, party, String(taxable), String(discount), String(total)]
  );
  const newId = hIns[0]?.id;
  for (let i = 0; i < valid.length; i++) {
    const l = valid[i];
    const amt = Number(l.qty) * Number(l.price);
    await q(
      `INSERT INTO doc_lines(doc_type,doc_legacy_id,line_no,item_name,hsn,qty,price,taxable,subtotal)
       VALUES('proforma_invoice',$1,$2,$3,'',$4,$5,$6,$6)`,
      [String(newId), String(i + 1), l.name, String(l.qty), String(l.price), String(amt)]
    );
  }
  redirect(LIST);
}
