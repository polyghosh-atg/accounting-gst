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

export async function addProduct(form: FormData) {
  if (!str(form, 'name')) throw new Error('product name required');
  await pool.query(
    `INSERT INTO products(name,description,category_id,hsn,markup,alert_qty,uom,manage_inventory,cost,selling_price,mrp,status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [str(form, 'name'), str(form, 'description'), Number(form.get('category_id')) || null, str(form, 'hsn'),
     num(form, 'markup'), num(form, 'alert_qty'), str(form, 'uom') || 'PCS',
     form.get('manage_inventory') === '0' ? 'No' : 'Yes',
     num(form, 'cost'), num(form, 'selling_price'), num(form, 'mrp'), str(form, 'status') || 'Active']
  );
  revalidatePath('/products');
}

export async function updateProduct(form: FormData) {
  const id = Number(form.get('product_id'));
  if (!id) throw new Error('invalid product');
  await pool.query(
    `UPDATE products SET name=$1,description=$2,category_id=$3,hsn=$4,markup=$5,alert_qty=$6,
      uom=$7,manage_inventory=$8,cost=$9,selling_price=$10,mrp=$11,status=$12 WHERE id=$13`,
    [str(form, 'name'), str(form, 'description'), Number(form.get('category_id')) || null, str(form, 'hsn'),
     num(form, 'markup'), num(form, 'alert_qty'), str(form, 'uom') || 'PCS',
     form.get('manage_inventory') === '0' ? 'No' : 'Yes',
     num(form, 'cost'), num(form, 'selling_price'), num(form, 'mrp'), str(form, 'status') || 'Active', id]
  );
  revalidatePath('/products');
}

export async function deleteProduct(form: FormData) {
  const id = Number(form.get('product_id'));
  if (!id) throw new Error('invalid product');
  await pool.query('DELETE FROM products WHERE id=$1', [id]);
  revalidatePath('/products');
}
