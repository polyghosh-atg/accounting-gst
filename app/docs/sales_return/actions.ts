'use server';

import { revalidatePath } from 'next/cache';
import { q } from '@/lib/db';

const str = (form: FormData, k: string) => String(form.get(k) || '').trim();

/** Record a receipt against a sales return (shows up in Paid Amount). */
export async function addReturnPayment(form: FormData) {
  const id = Number(form.get('doc_id'));
  const amount = Number(form.get('amount') || 0);
  if (!id || !(amount > 0)) throw new Error('enter a valid amount');
  const h = await q('SELECT legacy_id, ref_no FROM doc_headers WHERE id=$1 AND doc_type=$2', [String(id), 'sales_return']);
  const leg = h[0]?.legacy_id ?? id;
  await q(
    `INSERT INTO transactions(module,txn_type,ref_no,voucher_date,pay_mode,amount,entry_id)
     VALUES('Sales Return','Receipt',$1,$2,$3,$4,$5)`,
    [str(form, 'ref_no') || `SRP-${String(h[0]?.ref_no || id)}`, str(form, 'pay_date') || null, str(form, 'pay_mode') || 'Cash', String(amount), String(leg)]
  );
  revalidatePath(`/docs/sales_return/view/${id}`);
}
