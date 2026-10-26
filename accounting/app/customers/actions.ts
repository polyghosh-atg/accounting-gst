'use server';

import { Pool } from 'pg';
import { revalidatePath } from 'next/cache';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

const str = (form: FormData, k: string) => String(form.get(k) || '').trim();

export async function addCustomer(form: FormData) {
  const company = str(form, 'customer_company_name');
  if (!company) throw new Error('company name required');
  const shipSame = form.get('copy_address') === '1';
  await pool.query(
    `INSERT INTO customers(company_name,name,gstin,email,phone,country,state,city,address,pincode,
      ship_country,ship_state,ship_city,ship_address,ship_pincode)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      company, str(form, 'customer_name'), str(form, 'gstin'), str(form, 'email'), str(form, 'phone'),
      str(form, 'country'), str(form, 'state'), str(form, 'city'), str(form, 'address'), str(form, 'pincode'),
      shipSame ? str(form, 'country') : str(form, 'shipping_country'),
      shipSame ? str(form, 'state') : str(form, 'shipping_state'),
      shipSame ? str(form, 'city') : str(form, 'shipping_city'),
      shipSame ? str(form, 'address') : str(form, 'shipping_address'),
      shipSame ? str(form, 'pincode') : str(form, 'shipping_pincode'),
    ]
  );
  revalidatePath('/customers');
}

export async function updateCustomer(form: FormData) {
  const id = Number(form.get('customer_id'));
  if (!id) throw new Error('invalid customer');
  await pool.query(
    `UPDATE customers SET company_name=$1,name=$2,gstin=$3,email=$4,phone=$5,country=$6,state=$7,
      city=$8,address=$9,pincode=$10,ship_country=$11,ship_state=$12,ship_city=$13,ship_address=$14,ship_pincode=$15
     WHERE id=$16`,
    [
      str(form, 'customer_company_name'), str(form, 'customer_name'), str(form, 'gstin'), str(form, 'email'), str(form, 'phone'),
      str(form, 'country'), str(form, 'state'), str(form, 'city'), str(form, 'address'), str(form, 'pincode'),
      str(form, 'shipping_country'), str(form, 'shipping_state'), str(form, 'shipping_city'),
      str(form, 'shipping_address'), str(form, 'shipping_pincode'), id,
    ]
  );
  revalidatePath('/customers');
  revalidatePath(`/customers/${id}`);
}

export async function deleteCustomer(form: FormData) {
  const id = Number(form.get('customer_id'));
  if (!id) throw new Error('invalid customer');
  await pool.query('DELETE FROM customers WHERE id=$1', [id]);
  revalidatePath('/customers');
}
