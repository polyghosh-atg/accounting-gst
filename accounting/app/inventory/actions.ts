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

export async function addWarehouse(form: FormData) {
  if (!str(form, 'name')) throw new Error('name required');
  await pool.query('INSERT INTO warehouses(name,code,description) VALUES($1,$2,$3)',
    [str(form, 'name'), str(form, 'code'), str(form, 'description')]);
  revalidatePath('/inventory/warehouses');
}

export async function updateWarehouse(form: FormData) {
  const id = Number(form.get('warehouse_id'));
  if (!id) throw new Error('invalid warehouse');
  await pool.query('UPDATE warehouses SET name=$1,code=$2,description=$3 WHERE id=$4',
    [str(form, 'name'), str(form, 'code'), str(form, 'description'), id]);
  revalidatePath('/inventory/warehouses');
}

export async function deleteWarehouse(form: FormData) {
  const id = Number(form.get('warehouse_id'));
  if (!id) throw new Error('invalid warehouse');
  await pool.query('DELETE FROM warehouses WHERE id=$1', [id]);
  revalidatePath('/inventory/warehouses');
}

export async function addCategory(form: FormData) {
  if (!str(form, 'name')) throw new Error('name required');
  await pool.query('INSERT INTO product_categories(name,description,tax_id,tax_type) VALUES($1,$2,$3,$4)',
    [str(form, 'name'), str(form, 'description'), Number(form.get('tax_id')) || null, str(form, 'tax_type') === '1' ? 1 : 0]);
  revalidatePath('/inventory/categories');
}

export async function updateCategory(form: FormData) {
  const id = Number(form.get('category_id'));
  if (!id) throw new Error('invalid category');
  await pool.query('UPDATE product_categories SET name=$1,description=$2,tax_id=$3,tax_type=$4 WHERE id=$5',
    [str(form, 'name'), str(form, 'description'), Number(form.get('tax_id')) || null, str(form, 'tax_type') === '1' ? 1 : 0, id]);
  revalidatePath('/inventory/categories');
}

export async function deleteCategory(form: FormData) {
  const id = Number(form.get('category_id'));
  if (!id) throw new Error('invalid category');
  await pool.query('DELETE FROM product_categories WHERE id=$1', [id]);
  revalidatePath('/inventory/categories');
}

export async function deleteScrapProduct(form: FormData) {
  const id = Number(form.get('scrap_product_id'));
  if (!id) throw new Error('invalid record');
  await pool.query('DELETE FROM scrap_products WHERE id=$1', [id]);
  revalidatePath('/inventory/scrap-products');
}

export async function addStock(form: FormData) {
  if (!str(form, 'warehouse') || !str(form, 'product') || !(num(form, 'qty') > 0)) throw new Error('warehouse, product and qty required');
  await pool.query(
    `INSERT INTO stock_entries(warehouse,product,qty,unit,cost,sell_price,entry_type,entry_date)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [str(form, 'warehouse'), str(form, 'product'), num(form, 'qty'), str(form, 'unit'),
     num(form, 'cost'), num(form, 'sell_price'), str(form, 'entry_type') || 'IN', str(form, 'entry_date') || new Date().toISOString().slice(0, 10)]
  );
  revalidatePath('/stock');
}

export async function updateStock(form: FormData) {
  const id = Number(form.get('stock_id'));
  if (!id) throw new Error('invalid entry');
  await pool.query(
    `UPDATE stock_entries SET warehouse=$1,product=$2,qty=$3,unit=$4,cost=$5,sell_price=$6,entry_type=$7,entry_date=$8 WHERE id=$9`,
    [str(form, 'warehouse'), str(form, 'product'), num(form, 'qty'), str(form, 'unit'),
     num(form, 'cost'), num(form, 'sell_price'), str(form, 'entry_type') || 'IN', str(form, 'entry_date') || null, id]
  );
  revalidatePath('/stock');
}

export async function deleteStock(form: FormData) {
  const id = Number(form.get('stock_id'));
  if (!id) throw new Error('invalid entry');
  await pool.query('DELETE FROM stock_entries WHERE id=$1', [id]);
  revalidatePath('/stock');
}
