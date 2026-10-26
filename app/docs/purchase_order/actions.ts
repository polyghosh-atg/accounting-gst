'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { q } from '@/lib/db';

const LIST = '/docs/purchase_order';
const str = (form: FormData, k: string) => String(form.get(k) || '').trim();

export async function deletePurchaseOrder(form: FormData) {
  const id = Number(form.get('doc_id'));
  if (!id) throw new Error('invalid document');
  await q('DELETE FROM doc_lines WHERE doc_type=$1 AND doc_legacy_id=$2', ['purchase_order', String(id)]);
  await q('DELETE FROM doc_headers WHERE id=$1 AND doc_type=$2', [String(id), 'purchase_order']);
  revalidatePath(LIST);
}

export async function updatePurchaseOrder(form: FormData) {
  const id = Number(form.get('doc_id'));
  if (!id) throw new Error('invalid document');
  await q('UPDATE doc_headers SET ref_no=$1, doc_date=$2, warehouse=$3, party=$4 WHERE id=$5 AND doc_type=$6', [
    str(form, 'ref_no') || 'PO-',
    str(form, 'doc_date') || null,
    str(form, 'warehouse') || null,
    str(form, 'party'),
    String(id),
    'purchase_order',
  ]);
  revalidatePath(LIST);
}

export async function addPurchaseOrder(form: FormData) {
  const refNo = str(form, 'ref_no');
  const party = str(form, 'party');
  if (!refNo) throw new Error('reference no required');
  if (!party) throw new Error('supplier required');
  const lines: { name: string; qty: number; price: number }[] = JSON.parse(String(form.get('lines_json') || '[]'));
  const valid = lines.filter((l) => l.name && Number(l.qty) > 0);
  if (valid.length === 0) throw new Error('add at least one line item');
  const discount = Number(form.get('discount') || 0);
  const taxable = valid.reduce((a, l) => a + Number(l.qty) * Number(l.price), 0);
  const total = taxable - discount;
  const hIns = await q<{ id: string }>(
    `INSERT INTO doc_headers(doc_type,ref_no,doc_date,warehouse,party,taxable,discount,tax,total,status)
     VALUES('purchase_order',$1,$2,$3,$4,$5,$6,0,$7,'') RETURNING id`,
    [refNo, str(form, 'doc_date') || null, str(form, 'warehouse') || null, party, String(taxable), String(discount), String(total)]
  );
  const newId = hIns[0]?.id;
  for (let i = 0; i < valid.length; i++) {
    const l = valid[i];
    const amt = Number(l.qty) * Number(l.price);
    await q(
      `INSERT INTO doc_lines(doc_type,doc_legacy_id,line_no,item_name,hsn,qty,price,taxable,subtotal)
       VALUES('purchase_order',$1,$2,$3,'',$4,$5,$6,$6)`,
      [String(newId), String(i + 1), l.name, String(l.qty), String(l.price), String(amt)]
    );
  }
  redirect(LIST);
}
