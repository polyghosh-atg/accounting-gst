'use server';

import { Pool } from 'pg';
import { revalidatePath } from 'next/cache';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

const str = (form: FormData, k: string) => String(form.get(k) || '').trim();

export async function addSupplier(form: FormData) {
  const company = str(form, 'company_name');
  if (!company) throw new Error('company name required');
  await pool.query(
    `INSERT INTO suppliers(company_name,reg_type,gstin,email,phone,contact_person,contact_desig,address,state,country,website)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      company, str(form, 'gst_registration_type') || 'Not Registered', str(form, 'gstin'),
      str(form, 'email'), str(form, 'phone'), str(form, 'contact_person_name'),
      str(form, 'contact_person_designation'), str(form, 'address'),
      str(form, 'state'), str(form, 'country'), str(form, 'website'),
    ]
  );
  revalidatePath('/suppliers');
}

export async function updateSupplier(form: FormData) {
  const id = Number(form.get('supplier_id'));
  if (!id) throw new Error('invalid supplier');
  await pool.query(
    `UPDATE suppliers SET company_name=$1,reg_type=$2,gstin=$3,email=$4,phone=$5,contact_person=$6,
      contact_desig=$7,address=$8,state=$9,country=$10,website=$11 WHERE id=$12`,
    [
      str(form, 'company_name'), str(form, 'gst_registration_type'), str(form, 'gstin'),
      str(form, 'email'), str(form, 'phone'), str(form, 'contact_person_name'),
      str(form, 'contact_person_designation'), str(form, 'address'),
      str(form, 'state'), str(form, 'country'), str(form, 'website'), id,
    ]
  );
  revalidatePath('/suppliers');
  revalidatePath(`/suppliers/${id}`);
}

export async function deleteSupplier(form: FormData) {
  const id = Number(form.get('supplier_id'));
  if (!id) throw new Error('invalid supplier');
  await pool.query('DELETE FROM suppliers WHERE id=$1', [id]);
  revalidatePath('/suppliers');
}
