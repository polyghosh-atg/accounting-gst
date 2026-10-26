'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { q } from '@/lib/db';

const LIST = '/purchases';
const str = (form: FormData, k: string) => String(form.get(k) || '').trim();

export async function deletePurchase(form: FormData) {
  const id = Number(form.get('doc_id'));
  if (!id) throw new Error('invalid purchase');
  await q('DELETE FROM purchase_lines WHERE purchase_id=$1', [String(id)]);
  await q('DELETE FROM purchases WHERE id=$1', [String(id)]);
  revalidatePath(LIST);
}

export async function updatePurchase(form: FormData) {
  const id = Number(form.get('doc_id'));
  if (!id) throw new Error('invalid purchase');
  await q('UPDATE purchases SET po_no=$1, inv_no=$2, purchase_date=$3, warehouse=$4, supplier=$5 WHERE id=$6', [
    str(form, 'po_no'), str(form, 'inv_no') || null, str(form, 'purchase_date') || null,
    str(form, 'warehouse') || null, str(form, 'supplier'), String(id),
  ]);
  revalidatePath(LIST);
}

export async function addPurchase(form: FormData) {
  const supplier = str(form, 'supplier');
  if (!supplier) throw new Error('supplier required');
  const lines: { name: string; qty: number; price: number }[] = JSON.parse(String(form.get('lines_json') || '[]'));
  const valid = lines.filter((l) => l.name && Number(l.qty) > 0);
  if (valid.length === 0) throw new Error('add at least one line item');
  const discount = Number(form.get('discount') || 0);
  const taxable = valid.reduce((a, l) => a + Number(l.qty) * Number(l.price), 0);
  const total = taxable - discount;
  const hIns = await q<{ id: string }>(
    `INSERT INTO purchases(po_no,inv_no,purchase_date,warehouse,supplier,discount,taxable,tax,total,paid,due,delivery_status)
     VALUES($1,$2,$3,$4,$5,$6,$7,0,$8,0,$8,'') RETURNING id`,
    [str(form, 'po_no') || null, str(form, 'inv_no') || null, str(form, 'purchase_date') || null,
     str(form, 'warehouse') || null, supplier, String(discount), String(taxable), String(total)]
  );
  const newId = hIns[0]?.id;
  for (const l of valid) {
    const amt = Number(l.qty) * Number(l.price);
    await q(
      `INSERT INTO purchase_lines(purchase_id,item_name,qty,cost,taxable,subtotal) VALUES($1,$2,$3,$4,$5,$5)`,
      [String(newId), l.name, String(l.qty), String(l.price), String(amt)]
    );
  }
  redirect(LIST);
}
