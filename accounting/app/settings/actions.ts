'use server';

import { Pool } from 'pg';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';

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
const intOrNull = (form: FormData, k: string) => {
  const n = Number(form.get(k));
  return n ? n : null;
};
const dateOrNull = (v: string) => (v ? v : null);

async function logAct(page: string, action: string, description: string) {
  try {
    await pool.query(
      'INSERT INTO activity_logs(page,action,description) VALUES($1,$2,$3)',
      [page, action, description]
    );
  } catch { /* logging must never break the action */ }
}

/* ---------- company settings ---------- */
const PREFIX_TYPES = ['purchase_order', 'purchase', 'purchase_return', 'quotation', 'sale',
  'sale_return', 'proforma_invoice', 'credit_debit_note', 'bank_payment', 'cash_payment',
  'bank_receipt', 'cash_receipt', 'contra', 'scrap_issue', 'scrap_entry', 'scrap_receive',
  'employee', 'department', 'position'];

async function saveUpload(form: FormData, key: string): Promise<string | null> {
  const f = form.get(key);
  if (!(f instanceof File) || f.size === 0) return null;
  const ext = (f.name.split('.').pop() || 'png').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5) || 'png';
  const name = `${key}-${Date.now()}.${ext}`;
  const dir = 'public/uploads/settings';
  await fs.mkdir(dir, { recursive: true });
  const buf = Buffer.from(await f.arrayBuffer());
  await fs.writeFile(`${dir}/${name}`, buf);
  return `/uploads/settings/${name}`;
}

export async function saveCompany(form: FormData) {
  if (!str(form, 'company_name')) throw new Error('company name required');
  const countryId = intOrNull(form, 'country_id');
  const stateId = intOrNull(form, 'state_id');
  const cityId = intOrNull(form, 'city_id');
  const nm = async (table: string, id: number | null) => {
    if (!id) return '';
    const r = await pool.query(`SELECT name FROM ${table} WHERE id=$1`, [id]);
    return r.rows[0]?.name || '';
  };
  const logo = await saveUpload(form, 'logo');
  const favicon = await saveUpload(form, 'favicon');
  const signature = await saveUpload(form, 'signature');
  await pool.query(
    `UPDATE company_settings SET name=$1,gem_seller_id=$2,email=$3,phone=$4,
      country_id=$5,country=$6,state_id=$7,state=$8,city_id=$9,city=$10,
      addr1=$11,addr2=$12,pincode=$13,whatsapp_country_code=$14,whatsapp_no=$15,
      gst_registration_type=$16,gstin=$17,bank_detail=$18,terms_and_condition=$19,
      currency_id=$20,separator=$21,payment_duration_for_sale=$22,payment_duration_for_purchase=$23,
      instance_id=$24,access_token=$25,upi_status=$26,upi_address=$27,qr_type=$28,
      show_qr_code_in_proforma=$29
      ${logo ? ',logo=$30' : ''} ${favicon ? `,favicon=$${logo ? 31 : 30}` : ''}
      ${signature ? `,signature=$${(logo ? 1 : 0) + (favicon ? 1 : 0) + 30}` : ''}
      WHERE id=1`,
    [
      str(form, 'company_name'), str(form, 'gem_seller_id'), str(form, 'email'), str(form, 'mobile'),
      countryId, await nm('countries', countryId), stateId, await nm('states', stateId),
      cityId, await nm('cities', cityId),
      str(form, 'address_line1'), str(form, 'address_line2'), str(form, 'pincode'),
      str(form, 'whatsapp_country_code'), str(form, 'whatsapp_no'),
      str(form, 'gst_registration_type'), str(form, 'gstin'), str(form, 'bank_detail'),
      str(form, 'terms_and_condition'),
      intOrNull(form, 'currency_id'), str(form, 'seperator'),
      str(form, 'payment_duration_for_sale'), str(form, 'payment_duration_for_purchase'),
      str(form, 'instance_id'), str(form, 'access_token'), str(form, 'upi_status') || 'no',
      str(form, 'upi_address'), str(form, 'qr_type') || 'company_based',
      str(form, 'show_qr_code_in_proforma') || 'no',
      ...(logo ? [logo] : []), ...(favicon ? [favicon] : []), ...(signature ? [signature] : []),
    ]
  );
  for (const t of PREFIX_TYPES) {
    await pool.query(
      'UPDATE doc_prefixes SET prefix=$1,date_format=$2,sequence=$3 WHERE doc_type=$4',
      [str(form, `${t}_prefix`), str(form, `${t}_date_format`) || 'Y-m', str(form, `${t}_sequence`) || '1000', t]
    );
  }
  await logAct('Company Settings', 'Update', 'Company profile saved');
  revalidatePath('/settings/company');
}

/* ---------- email configuration ---------- */
export async function saveEmailConfig(form: FormData) {
  if (!str(form, 'host')) throw new Error('host required');
  await pool.query(
    `UPDATE email_configs SET protocol=$1,encryption=$2,host=$3,port=$4,email=$5,
      username=$6,password=$7,from_name=$8 WHERE id=1`,
    [
      str(form, 'protocol') || 'smtp', str(form, 'encryption') || 'tls',
      str(form, 'host'), str(form, 'port'), str(form, 'email'),
      str(form, 'username'), str(form, 'password'), str(form, 'from_name'),
    ]
  );
  await logAct('Email Configuration', 'Update', 'SMTP settings saved');
  revalidatePath('/settings/email');
}

/* ---------- taxes ---------- */
export async function addTax(form: FormData) {
  if (!str(form, 'name')) throw new Error('tax name required');
  await pool.query('INSERT INTO taxes(name,sgst,cgst,igst,status) VALUES($1,$2,$3,$4,$5)',
    [str(form, 'name'), num(form, 'sgst'), num(form, 'cgst'), num(form, 'igst'), str(form, 'status') || 'Active']);
  await logAct('Tax', 'Add', `Tax "${str(form, 'name')}" added`);
  revalidatePath('/settings/taxes');
}
export async function updateTax(form: FormData) {
  const id = Number(form.get('tax_id'));
  if (!id) throw new Error('invalid tax');
  await pool.query('UPDATE taxes SET name=$1,sgst=$2,cgst=$3,igst=$4,status=$5 WHERE id=$6',
    [str(form, 'name'), num(form, 'sgst'), num(form, 'cgst'), num(form, 'igst'), str(form, 'status') || 'Active', id]);
  await logAct('Tax', 'Update', `Tax #${id} updated`);
  revalidatePath('/settings/taxes');
}
export async function deleteTax(form: FormData) {
  const id = Number(form.get('tax_id'));
  if (!id) throw new Error('invalid tax');
  await pool.query('DELETE FROM taxes WHERE id=$1', [id]);
  await logAct('Tax', 'Delete', `Tax #${id} deleted`);
  revalidatePath('/settings/taxes');
}

/* ---------- currencies ---------- */
export async function addCurrency(form: FormData) {
  if (!str(form, 'name')) throw new Error('currency name required');
  await pool.query('INSERT INTO currencies(name,symbol) VALUES($1,$2)', [str(form, 'name'), str(form, 'symbol')]);
  await logAct('Currency', 'Add', `Currency "${str(form, 'name')}" added`);
  revalidatePath('/settings/currencies');
}
export async function updateCurrency(form: FormData) {
  const id = Number(form.get('currency_id'));
  if (!id) throw new Error('invalid currency');
  await pool.query('UPDATE currencies SET name=$1,symbol=$2 WHERE id=$3', [str(form, 'name'), str(form, 'symbol'), id]);
  await logAct('Currency', 'Update', `Currency #${id} updated`);
  revalidatePath('/settings/currencies');
}
export async function deleteCurrency(form: FormData) {
  const id = Number(form.get('currency_id'));
  if (!id) throw new Error('invalid currency');
  await pool.query('DELETE FROM currencies WHERE id=$1', [id]);
  await logAct('Currency', 'Delete', `Currency #${id} deleted`);
  revalidatePath('/settings/currencies');
}

/* ---------- expense categories ---------- */
export async function addExpenseCategory(form: FormData) {
  if (!str(form, 'name')) throw new Error('category name required');
  await pool.query('INSERT INTO expense_categories(name,description,type) VALUES($1,$2,$3)',
    [str(form, 'name'), str(form, 'description') || null, str(form, 'type') || null]);
  await logAct('Expense Category', 'Add', `Category "${str(form, 'name')}" added`);
  revalidatePath('/settings/expense-categories');
}
export async function updateExpenseCategory(form: FormData) {
  const id = Number(form.get('category_id'));
  if (!id) throw new Error('invalid category');
  await pool.query('UPDATE expense_categories SET name=$1,description=$2,type=$3 WHERE id=$4',
    [str(form, 'name'), str(form, 'description') || null, str(form, 'type') || null, id]);
  await logAct('Expense Category', 'Update', `Category #${id} updated`);
  revalidatePath('/settings/expense-categories');
}
export async function deleteExpenseCategory(form: FormData) {
  const id = Number(form.get('category_id'));
  if (!id) throw new Error('invalid category');
  await pool.query('DELETE FROM expense_categories WHERE id=$1', [id]);
  await logAct('Expense Category', 'Delete', `Category #${id} deleted`);
  revalidatePath('/settings/expense-categories');
}

/* ---------- discounts ---------- */
export async function addDiscount(form: FormData) {
  if (!str(form, 'name')) throw new Error('discount name required');
  await pool.query(
    'INSERT INTO discounts(name,type,value,valid_from,valid_to,description,status) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [str(form, 'name'), str(form, 'type') || 'Percentage', num(form, 'value'),
     dateOrNull(str(form, 'valid_from')), dateOrNull(str(form, 'valid_to')),
     str(form, 'description') || null, str(form, 'status') || 'Active']);
  await logAct('Discount', 'Add', `Discount "${str(form, 'name')}" added`);
  revalidatePath('/settings/discounts');
}
export async function updateDiscount(form: FormData) {
  const id = Number(form.get('discount_id'));
  if (!id) throw new Error('invalid discount');
  await pool.query(
    'UPDATE discounts SET name=$1,type=$2,value=$3,valid_from=$4,valid_to=$5,description=$6,status=$7 WHERE id=$8',
    [str(form, 'name'), str(form, 'type') || 'Percentage', num(form, 'value'),
     dateOrNull(str(form, 'valid_from')), dateOrNull(str(form, 'valid_to')),
     str(form, 'description') || null, str(form, 'status') || 'Active', id]);
  await logAct('Discount', 'Update', `Discount #${id} updated`);
  revalidatePath('/settings/discounts');
}
export async function deleteDiscount(form: FormData) {
  const id = Number(form.get('discount_id'));
  if (!id) throw new Error('invalid discount');
  await pool.query('DELETE FROM discounts WHERE id=$1', [id]);
  await logAct('Discount', 'Delete', `Discount #${id} deleted`);
  revalidatePath('/settings/discounts');
}

/* ---------- items ---------- */
export async function addItem(form: FormData) {
  if (!str(form, 'item_name')) throw new Error('item name required');
  await pool.query('INSERT INTO items(item_name,item_description,tax_id) VALUES($1,$2,$3)',
    [str(form, 'item_name'), str(form, 'item_description') || null, intOrNull(form, 'tax_id')]);
  await logAct('Item', 'Add', `Item "${str(form, 'item_name')}" added`);
  revalidatePath('/settings/items');
}
export async function updateItem(form: FormData) {
  const id = Number(form.get('item_id'));
  if (!id) throw new Error('invalid item');
  await pool.query('UPDATE items SET item_name=$1,item_description=$2,tax_id=$3 WHERE id=$4',
    [str(form, 'item_name'), str(form, 'item_description') || null, intOrNull(form, 'tax_id'), id]);
  await logAct('Item', 'Update', `Item #${id} updated`);
  revalidatePath('/settings/items');
}
export async function deleteItem(form: FormData) {
  const id = Number(form.get('item_id'));
  if (!id) throw new Error('invalid item');
  await pool.query('DELETE FROM items WHERE id=$1', [id]);
  await logAct('Item', 'Delete', `Item #${id} deleted`);
  revalidatePath('/settings/items');
}

/* ---------- email templates ---------- */
export async function addEmailTemplate(form: FormData) {
  if (!str(form, 'template_name')) throw new Error('template name required');
  await pool.query(
    `INSERT INTO email_templates(template_name,from_name,from_email,subject,module,mail_header,mail_body,mail_footer)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [str(form, 'template_name'), str(form, 'from_name'), str(form, 'from_email'),
     str(form, 'subject'), str(form, 'module'), str(form, 'mail_header'),
     str(form, 'mail_body'), str(form, 'mail_footer')]);
  await logAct('Email Template', 'Add', `Template "${str(form, 'template_name')}" added`);
  revalidatePath('/settings/email-templates');
}
export async function updateEmailTemplate(form: FormData) {
  const id = Number(form.get('template_id'));
  if (!id) throw new Error('invalid template');
  await pool.query(
    `UPDATE email_templates SET template_name=$1,from_name=$2,from_email=$3,subject=$4,module=$5,
      mail_header=$6,mail_body=$7,mail_footer=$8 WHERE id=$9`,
    [str(form, 'template_name'), str(form, 'from_name'), str(form, 'from_email'),
     str(form, 'subject'), str(form, 'module'), str(form, 'mail_header'),
     str(form, 'mail_body'), str(form, 'mail_footer'), id]);
  await logAct('Email Template', 'Update', `Template #${id} updated`);
  revalidatePath('/settings/email-templates');
}
export async function deleteEmailTemplate(form: FormData) {
  const id = Number(form.get('template_id'));
  if (!id) throw new Error('invalid template');
  await pool.query('DELETE FROM email_templates WHERE id=$1', [id]);
  await logAct('Email Template', 'Delete', `Template #${id} deleted`);
  revalidatePath('/settings/email-templates');
}

/* ---------- whatsapp templates ---------- */
export async function addWhatsappTemplate(form: FormData) {
  if (!str(form, 'wm_type')) throw new Error('type required');
  await pool.query('INSERT INTO whatsapp_templates(wm_type,wm_message) VALUES($1,$2)',
    [str(form, 'wm_type'), str(form, 'wm_message')]);
  await logAct('Whatsapp Template', 'Add', `Template "${str(form, 'wm_type')}" added`);
  revalidatePath('/settings/whatsapp-templates');
}
export async function updateWhatsappTemplate(form: FormData) {
  const id = Number(form.get('template_id'));
  if (!id) throw new Error('invalid template');
  await pool.query('UPDATE whatsapp_templates SET wm_type=$1,wm_message=$2 WHERE id=$3',
    [str(form, 'wm_type'), str(form, 'wm_message'), id]);
  await logAct('Whatsapp Template', 'Update', `Template #${id} updated`);
  revalidatePath('/settings/whatsapp-templates');
}
export async function deleteWhatsappTemplate(form: FormData) {
  const id = Number(form.get('template_id'));
  if (!id) throw new Error('invalid template');
  await pool.query('DELETE FROM whatsapp_templates WHERE id=$1', [id]);
  await logAct('Whatsapp Template', 'Delete', `Template #${id} deleted`);
  revalidatePath('/settings/whatsapp-templates');
}

/* ---------- custom fields ---------- */
export async function addCustomField(form: FormData) {
  if (!str(form, 'field_label')) throw new Error('field label required');
  const label = str(form, 'field_label');
  await pool.query(
    'INSERT INTO custom_fields(module,field_label,field_name,field_type,required,status) VALUES($1,$2,$3,$4,$5,$6)',
    [str(form, 'module') || 'sale', label,
     str(form, 'field_name') || label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
     str(form, 'field_type') || 'text', str(form, 'required') || 'No', str(form, 'status') || 'Active']);
  await logAct('Custom Field', 'Add', `Field "${label}" added`);
  revalidatePath('/settings/custom');
}
export async function updateCustomField(form: FormData) {
  const id = Number(form.get('field_id'));
  if (!id) throw new Error('invalid field');
  await pool.query(
    'UPDATE custom_fields SET module=$1,field_label=$2,field_name=$3,field_type=$4,required=$5,status=$6 WHERE id=$7',
    [str(form, 'module') || 'sale', str(form, 'field_label'), str(form, 'field_name'),
     str(form, 'field_type') || 'text', str(form, 'required') || 'No', str(form, 'status') || 'Active', id]);
  await logAct('Custom Field', 'Update', `Field #${id} updated`);
  revalidatePath('/settings/custom');
}
export async function deleteCustomField(form: FormData) {
  const id = Number(form.get('field_id'));
  if (!id) throw new Error('invalid field');
  await pool.query('DELETE FROM custom_fields WHERE id=$1', [id]);
  await logAct('Custom Field', 'Delete', `Field #${id} deleted`);
  revalidatePath('/settings/custom');
}

/* ---------- history logs ---------- */
export async function clearLogs() {
  await pool.query('DELETE FROM activity_logs');
  await logAct('History Logs', 'Clear', 'All history logs cleared');
  revalidatePath('/settings/logs');
}
