import pg from 'pg';
const p = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });

const stmts = [
`ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS whatsapp_no text,
  ADD COLUMN IF NOT EXISTS gem_seller_id text,
  ADD COLUMN IF NOT EXISTS gst_registration_type text DEFAULT 'Regular',
  ADD COLUMN IF NOT EXISTS bank_detail text,
  ADD COLUMN IF NOT EXISTS fy_from text,
  ADD COLUMN IF NOT EXISTS fy_to text,
  ADD COLUMN IF NOT EXISTS terms_and_condition text,
  ADD COLUMN IF NOT EXISTS currency_id integer,
  ADD COLUMN IF NOT EXISTS separator text,
  ADD COLUMN IF NOT EXISTS po_prefix text,
  ADD COLUMN IF NOT EXISTS purchase_prefix text,
  ADD COLUMN IF NOT EXISTS purchase_return_prefix text,
  ADD COLUMN IF NOT EXISTS sales_prefix text`,
`CREATE TABLE IF NOT EXISTS discounts (
  id serial PRIMARY KEY, name text NOT NULL, type text DEFAULT 'Percentage',
  value numeric DEFAULT 0, valid_from date, valid_to date,
  description text, status text DEFAULT 'Active')`,
`CREATE TABLE IF NOT EXISTS items (
  id serial PRIMARY KEY, item_name text NOT NULL,
  item_description text, tax_id integer REFERENCES taxes(id) ON DELETE SET NULL)`,
`CREATE TABLE IF NOT EXISTS email_templates (
  id serial PRIMARY KEY, template_name text NOT NULL,
  from_name text, from_email text, subject text, module text,
  mail_header text, mail_body text, mail_footer text,
  created_at timestamp DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id serial PRIMARY KEY, wm_type text NOT NULL, wm_message text)`,
`CREATE TABLE IF NOT EXISTS custom_fields (
  id serial PRIMARY KEY, module text NOT NULL,
  field_label text NOT NULL, field_name text,
  field_type text DEFAULT 'text', required text DEFAULT 'No',
  status text DEFAULT 'Active')`,
`CREATE TABLE IF NOT EXISTS email_configs (
  id integer PRIMARY KEY DEFAULT 1, protocol text DEFAULT 'smtp',
  encryption text DEFAULT 'tls', host text, port text,
  email text, username text, password text, from_name text)`,
`INSERT INTO email_configs(id) VALUES(1) ON CONFLICT(id) DO NOTHING`,
`CREATE TABLE IF NOT EXISTS activity_logs (
  id serial PRIMARY KEY, user_name text DEFAULT 'Admin',
  page text, action text, description text, ip text DEFAULT 'local',
  created_at timestamp DEFAULT now())`,
];

for (const s of stmts) {
  await p.query(s);
  console.log('OK: ' + s.slice(0, 60).replace(/\n/g, ' '));
}

const seed = async (check, sql, params) => {
  const c = await p.query(check);
  if (Number(c.rows[0].n) === 0) {
    await p.query(sql, params || []);
    console.log('SEEDED: ' + check.slice(0, 70));
  } else console.log('SKIP (has data): ' + check.slice(0, 70));
};

await seed('SELECT count(*) n FROM email_templates',
`INSERT INTO email_templates(template_name,from_name,from_email,subject,module,mail_header,mail_body,mail_footer) VALUES
 ('Sale Invoice','Office ERP','mk9332994@gmail.com','Your Invoice {invoice_no} from Office ERP','sale','Dear {customer},','Thank you for your purchase. Invoice {invoice_no} dated {date} for {amount} is attached.','Regards, Office ERP'),
 ('Payment Reminder','Office ERP','mk9332994@gmail.com','Payment Reminder: Invoice {invoice_no}','sale','Dear {customer},','This is a reminder that invoice {invoice_no} for {amount} is pending. Kindly pay at the earliest.','Regards, Office ERP'),
 ('Purchase Order','Office ERP','mk9332994@gmail.com','Purchase Order {po_no}','purchase','Dear {supplier},','Please find purchase order {po_no} dated {date} for {amount}.','Regards, Office ERP')`);

await seed('SELECT count(*) n FROM whatsapp_templates',
`INSERT INTO whatsapp_templates(wm_type,wm_message) VALUES
 ('Order Confirmation','Hello {name}, your order {ref_no} for {amount} is confirmed. - Office ERP'),
 ('Payment Reminder','Hello {name}, invoice {ref_no} for {amount} is due. Please pay soon. - Office ERP')`);

await seed('SELECT count(*) n FROM custom_fields',
`INSERT INTO custom_fields(module,field_label,field_name,field_type,required,status) VALUES
 ('sale','E-Way Bill No','e_way_bill_no','text','No','Active'),
 ('sale','Vehicle No','vehicle_no','text','No','Active'),
 ('purchase','LR No','lr_no','text','No','Active'),
 ('expense','Approved By','approved_by','text','No','Active')`);

await p.end();
console.log('settings migration done');
