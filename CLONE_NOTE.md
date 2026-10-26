# Zivaan Pro (vaksys.com/pro) — Clone Note for Next.js + PostgreSQL

> STATUS (2026-10-25): data migration DONE and verified. Next.js app shell DONE (`accounting/`).
> PG `accounting` DB @ localhost:5433 holds all visible data; sales/purchase totals match old reports to the paisa.
> `npm run build` passes (16 routes, Partial Prerender). Prod server: http://localhost:3100 (started via `npm run start -- -p 3100`).
> Verified: dashboard totals + bank balances match old dashboard; /sales/S1134 invoice detail matches old view page; /reports receivable/payable/HSN render.
> NEXT (not yet built): login/auth (no password hashes were extractable), create/edit forms + payments/delivery modals (POST endpoints mapped in §1/`_scrape`), PDF/email/WhatsApp/EWaybill actions, GSTR JSON export, P&L/Balance Sheet reports.

## 0. Runbook (reproduce everything)

```powershell
# 1. services
Start-Service com.docker.service          # then: docker start acct-pg (or docker-compose up -d)
# 2. refresh list data
powershell -NoProfile -ExecutionPolicy Bypass -File tools/dump-lists.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File tools/fetch-partials.ps1   # capped modules (no-op if server caps)
powershell -NoProfile -ExecutionPolicy Bypass -File tools/sweep-partials.ps1   # search-sweep (no-op if server caps)
powershell -NoProfile -ExecutionPolicy Bypass -File tools/normalize-csv.ps1
# 3. detail pages (700 view pages, ~10 min, skips existing)
powershell -NoProfile -ExecutionPolicy Bypass -File tools/dump-details.ps1
# 4. parse + import
cd tools/import; npm install
node parse-details.mjs
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5433/accounting"; node import.mjs
# 5. app
cd ../../accounting; npm install; npm run dev   # http://localhost:3000
```
`docker-compose.yml` (root) recreates PG. `tools/import/import.mjs` is full-refresh (TRUNCATE-first).
Sample import CSV templates from old app: `data/sample_csv/`.
Known gaps: 7 `ajax_list` endpoints are server-capped (currency shows 6/26, transfer 2/14, cash_bank_entry 5/48, bank_statement 2/5, pdc 1/6+1/5, email_template 0/3) — `recordsTotal` counts soft-deleted rows; visible rows fully captured (currency dropdown in settings also lists only 6). 1 of 458 sales has no detail page. `log_data` (History Logs, 23 MB) not imported.

Source: `https://vaksys.com/pro` (PHP CodeIgniter + AdminLTE + jQuery DataTables, server-side).
Login verified: `zivaansolutions@gmail.com / admin123` → 302 `Refresh: .../auth/dashboard`, title `Zivaan Solutions | Dashboard`.
Scrape evidence in `_scrape/` (`routes.json`, `addforms.json`, `sale_add.html`, `sale_view.html`, `settings.html`, `customer.html`) and `tools/*.ps1`.

## 1. How the old app works (must replicate)

- **Auth:** `POST /auth/login` fields `identity, password, csrf_zivaan_pro, login`. Session = `PHPSESSID` cookie + `csrf_zivaan_pro` cookie. Every POST needs CSRF token. In Next.js replace with NextAuth (credentials) + `csrfToken()` equivalent.
- **List pages:** all lists are DataTables `serverSide:true`, `POST /{module}/ajax_list` with `draw,start,length,search[value],order,csrf`. Response `{draw, recordsTotal, recordsFiltered, data: string[][]}` where cells contain raw HTML (badges, btn-groups). IDs in view/edit links are **base64 ints**: `MjA0` = `204`. Keep integer PKs in PG, expose base64 only if you want URL compat.
- **Add/Edit:** mostly Bootstrap modals loaded via `GET /{module}/add` → JSON `{code:1, xxx_modal_body: "<form...>"}`. Form submit is AJAX POST to same endpoint. Big docs (`sale/add`, `purchase/add`, `quotation/add`, `proforma_invoice/add`, `purchase_order/add`, `transfer/add`) are full pages, line items built in JS into a hidden field (`sale_items`, `purchase_items`, `quotation_items`, ...) as **pipe-joined JSON**: `JSON.stringify(row1)|JSON.stringify(row2)|...`.
- **Payments:** modal `Enter Payment` → `POST /transaction/add` with `transaction_type=R(receipt)/P(payment), entry_id, module=S(sale)/P(purchase)/E(expense)/SR/PR, from_account, to_account` + amount rows loaded via AJAX into `.add_transaction`. Previous transactions listed in same modal.
- **Delivery:** modal → hidden `delivery_items` + `sale_id|purchase_id|...`.
- **Numbering:** `settings` page has per-doc table `Prefix | Date Format | Sequence` for: Purchase Order, Purchase, Purchase Return, Quotation, Sales, Sales Return, Proforma Invoice, Credit Debit Note, Bank Payment, Cash Payment, Bank Receipt, Cash Receipt, Contra, Scrap Issue/Entry/Receive, Employee, Department, Position (e.g. `S1132`, `BP1044`, `BR1045`). Rebuild as `doc_sequences` table.
- **Tax math (from `sale_add.html:7177-7378`, same for purchase):**
  - `tax_type=0` exclusive: `taxable = qty*price - discount; cgst=taxable*cgst%/100` (same state) or `igst=taxable*igst%/100` (other state); `subtotal=taxable+taxes`.
  - `tax_type=1` inclusive: `subtotal=qty*price-discount; tax_amount=subtotal*rate/(100+rate)`; split /2 for CGST/SGST or full IGST; `taxable=subtotal-tax_amount`.
  - State logic: same `company_country_id` + same `company_state_id`→CGST+SGST; same country diff state→IGST; diff country→no tax. Discount `discount_type=0` flat else %.
  - Grand: sum taxable/discount/cgst/sgst/igst/subtotal; `total_taxable = sum - tds`.
- **PDFs / comms:** `/{module}/pdf/{base64id}`, `email_invoice`, `send_email`, `whatsapp_pdf`, e-Waybill modal (`lori_no, lori_date, carrier, vehicle_no, ewaybill_*` fields on sale form) + `Download Ewaybill Json`. Reports mostly POST filter `from_date,to_date,warehouse_id,customer_id,supplier_id,product_id[],action_type` → server HTML table + CSV export.

## 2. Section inventory (route → list columns → add fields → rows found)

Live row counts from `tools/dump-lists.ps1` → `data/raw/*.json` (DataTables `recordsTotal`).

**PEOPLE**
- `customer` (37): Customer Name | GSTIN/UIN | Email | Phone | Country | State | Address | City. Add: `customer_company_name*, customer_name*, buyer_name, buyer_designation, department, gstin, email, phone, margin, payment_duration, whatsapp_cc+no, country*, state*, city, address, pincode + shipping_* copy_address`.
- `supplier` (10): Company | RegType | GSTIN | Email | Phone | Contact Person+Designation | Address | Website | State | Country. Add: same minus shipping, `gst_registration_type*, gstin*, payment_duration`.
- `auth/users` (16, HTML table, no ajax): First | Last | Username | Role | Email | Phone | Status.
- `auth/user_roles` (19, HTML table): Name | Description. Permissions matrix ~300 checkboxes (`permission[]` + `role_id`) covering every module action (Add/Edit/List/Delete/View/Email/PDF/Manage Payment/Delivery, All-records variants). `GET /auth/get_permission`, `POST /auth/save_permission/`.
- `employee` (3) + HR: First | Last | Code | Email | Dept | Position | HireDate | Salary. Add modal: `first_name*, last_name*, email, dob, department_id*, position_id*, bank_name, account_number, branch, ifsc_code, salary*, hire_date, termination_date`.

**ACCOUNT**
- `bank_account` (15): Account Name | Number/CC No | Bank | IFSC | Desc | Opening | Closing | Status. Add: `account_name*, account_type(Saving/Current/Credit)*, account_number*, bank_name*, ifsc*, description, opening_balance*`. Ops: deposit/transfer/withdraw/increase/reduce via `transaction/add`.
- `cash_bank_entry` (48 total, 5 fetchable per page — DataTables caps `length`, loop with small pages): Checkbox | RefNo | VoucherType | From | To | Amount. Add: `voucher_type*, voucher_date, reference_no*, from_account_id, to_account_id, amount*, narration`. `bulk_entry` same.
- `bank_statement` (5 total, 2/page): Account | Number | Type | Bank | Statement | ReconcileStatus. Upload + `reconcile/`, `update_reconcile/`.
- `pdc_receive` (6 total, 1/page): Ledger | ChequeNo | ChequeDate | Amount | DepositTo | DepositDate. Add: `ledger_id, sale_id[], pdc_cheque_no, pdc_cheque_date, pdc_deposit_date, pdc_amount, pdc_deposit_to`. Same mirror `pdc_payment` (5) with `purchase_id[]`.
- `expense` (5): BillDate | Category | Supplier | Taxable | CGST | SGST | IGST | Docs | Remarks | Total | Paid | Due. Add: `date*, expense_category_id*, supplier_id(+state), supplier_name, amount*, cgst, sgst, igst, total_amount*, remarks, itc, expense_share, expense_share_state_id[], expense_items(JSON)+attached_files`.
- `expense_category` (1): Name | Desc | Type(`account_group_id`). `credit_debit_note` (0 rows, table exists): Date | RefNo | NoteType | Ledger | Desc | Taxable | TaxType | IGST(+amt) | CGST(+amt) | SGST(+amt) | Amount. Uses `get_ledger_accounts/, get_sale_items, get_purchase_items, get_sale_purchase_records/`.

**INVENTORY**
- `warehouse` (12): Name | Code | Desc | Qty. Add: `name*, code*, description*`.
- `product_category` (2): Name | Desc | Tax. Add: `name*, description*, tax_id*, tax_type(inclusive?)`.
- `product_core` = Add Product (5 products): Image | Name | UOM | ManageInv | HSN | Cost | SellingPrice | Price | Status. Add: `name*, description*, product_category_id*, hsn*, markup*, alert_quantity*, uom_id* (45 UOMs BAGS..OTHERS), status*`. AJAX: `copy/, bulk_edit, upload_image, import_product`.
- `product` = stock-by-warehouse view (same 5): Warehouse | Product | HSN | Qty | Batch | UOM | AlertQty | Cost | TotalCost | Price | TotalPrice | Status. `warehouse_wise_product_quantity`, `stock/add`.
- `stock` (67): Warehouse | Product | Qty | Unit | Cost | SellingPrice | EntryType | Date. `stock/add` modal, `warehouse_products_by_warehouse_id/`.
- `item` (1): Name | Desc | Tax. `tax` (3: `tax 9/9/18`, `GST5% 2.5/2.5/5`, `GST 0/0/10`): Taxname | SGST | CGST | IGST | Status. `discount` (0): Name|Type|Value|ValidFrom|ValidTo|Desc|Status. `currency` (26 total, 6/page): Name | Symbol. `promotion` (0): Customer|Product|Promotion|%|Config, add `customer_id[], product_id[], promotion_type, percentage, quantity, free_quantity, configuration`. `custom_field`: `field_id[], field_status[<id>]` radio per module. `scrap_product` (17): Product|Batch|Qty|Cost|Price|SellPrice|Warehouse. `scrap_entry` (0), `scrap_issue` (1), `scrap_receive` (0): RefNo | TotalAmt(IncTax) | TotalProduct | TotalQty | Date (+Supplier/Customer).

**TRANSACTION** (all share line-item + payment + delivery pattern)
- `sale/add` + `sale` list (458, S1012–S1457): RefNo|InvoiceNo|Date|Warehouse|Customer|Discount|Taxable|Tax|Total|Paid|Due|DeliveryStatus. Form: `reference_no, invoice_date, due_date, warehouse_id, customer_id(+state/country hidden), shipping_*, lori_no/date, carrier, vehicle_no, ewaybill_no/dispatch_from/mode/subtype/doctype/transporter_gstin+name+distance+doc_no+date+vehicle_no+type, proforma_invoice_id[], upload_document[], search_product, total_discount/taxable/tax/tds/total(hidden+visible), available_credit, external/internal_note, bank_detail, terms, rcm, sale_items(JSON|)`. View (`sale/view/MjA0`): Tax Invoice Under GST, Bill-To/Ship-To, RCM, items HSN/Qty/FreeQty/Price/Batch/Mfg/Exp/Discount/UOM/Taxable/Tax/Subtotal, TotalDue/RoundOff/TDS/Paid/Balance, Amount-in-words, actions Download Invoice/Delivery Challan/Delivery Details/Enter Payment/Ewaybill/Edit.
- `purchase` (61): PO No|InvoiceNo|Date|Warehouse|Supplier|Discount|Taxable|Tax|Total|Paid|Due|Delivery. Add mirrors sale with `invoice_no, purchase_date, supplier_id, purchase_items`.
- `purchase_order` (2): PONo|Date|Warehouse|Supplier|Discount|Taxable|Tax|Total.
- `sales_return` (9) / `purchase_return` (9): same cols + ReturnDate.
- `quotation` (20): RefNo|Date|Customer|Taxable|Discount|Tax|Total|Status. Add `reference_no, quotation_date, warehouse_id, customer_id, search_product, quotation_items`.
- `proforma_invoice` (81): InvoiceNo|Date|Customer|Discount|Taxable|TDS|Tax|Total. Convertible to sale (`convert_from_proforma_invoice_list`, `get_proforma_invoice_items`).
- `transfer` (14 total, 2/page): Date|FromWH|ToWH|Total. Add `transfer_date, from_warehouse_id, to_warehouse_id(+state/country), transfer_items, tds`.

**HR MODULE** (`employee` menu): `department` (3: DeptCode|DeptName), `position` (2), `attendance` (76: Emp|Date|Status; add `employee_id, attendance_date, attendance_status Present/Absent/Half/Quarter` + `bulk_attendance`), `holiday` (0: Date|Name), `weekend` (2: Date|Desc), `deduction` (1: Emp|Date|Type|Amount), `bonus` (2), `tax_deduction` (2: Emp|Date|TaxType|Amount), `advance_salary` (10: Emp|ReqDate|Amount|Status Pending/Approved/Rejected), `leave` (15: Emp|Date|Type Full/Half/Quarter|Status), `payroll` (9: Emp|Base|Bonuses|Deductions|Tax|Advance|LeaveDed|Leaves|Net; `bulk_payroll_form, create_payroll`).

**REPORTS** (`report/*`, filter + table + totals row)
- `sale` (370 rows embedded), `purchase` (60), `product`, `product_sale`, `product_purchase`, `stock`, `stock_value` (Product|AvailQty|PurchVal|SaleVal), `closing_stock` (Opening/Pur/PurRet/Sale/SaleRet/StockIn/StockOut/ClStock + values PR/PTD), `ledger` (needs `ledger_id`), `receivable`/`payable` (Invoice|Paid|Balance + totals 8.6Cr recv / 10.49Cr pay), `customer_payment_due`/`supplier_payment_due`, `gstr1` (from,to,invoice_type,customer), `gstr2` (from,to,supplier), `hsn_sale`/`hsn_purchase` (HSN|Desc|UOM|Qty|Value|Rate|Taxable|IGST|CGST|SGST + grouping), `expense`, `sales_return`, `purchase_return`, `inventory_product_added`, `balance_sheet`, plus menu-only `Profit & Loss`, `Product Detail`, `Product Expiry Alert` (permission names exist, routes 404 — build fresh).

**SETTINGS**
- `settings` (Company): company_name, gem_seller_id, email, mobile, country/state/city, address1/2, pincode, whatsapp, gst_reg_type, gstin, bank_detail, FY from/to month+year, terms, logo/favicon/signature uploads, currency_id, seperator, all doc prefix/date_format/sequence rows, payment_duration sale/purchase, instance_id/access_token (WhatsApp), upi_status+address, qr_type, show_qr_in_proforma, financial_year.
- `application_settings`: app-level flags + `activate` (license key modal on every page — skip in clone, keep `license_key` column nullable).
- `email_template` (3, ajax empty — use HTML table), `whatsapp_template` (3: Type|Action; add `wm_type, wm_message`), `custom_field` toggles.

## 3. Next.js + PostgreSQL target

**Stack:** Next.js 14 App Router + TypeScript, Prisma ORM + PostgreSQL 15, NextAuth.js credentials (bcrypt), Zod + React Hook Form, TanStack Table (server pagination mirroring `ajax_list`), react-select, date-fns, pdf-lib/react-pdf for invoices, Tailwind + shadcn/ui.
**Suggested PG schema (Prisma models):** `users, roles, permissions, role_permissions, companies, doc_sequences(prefix, date_format, next_seq)`, `customers(+shipping_* , margin, payment_duration)`, `suppliers`, `warehouses`, `uoms`, `taxes(name,sgst,cgst,igst,status)`, `product_categories(product_category+tax_id+tax_type)`, `products(name,desc,category_id,hsn,markup,alert_qty,uom_id,cost,selling_price,price,status,image)`, `warehouse_stock(warehouse_id,product_id,batch,mfg,expiry,qty,free_qty,cost,price)`, `discounts, currencies, promotions, items, expense_categories`, `sales(header: ref_no,inv_no,inv_date,due_date,warehouse_id,customer_id,totals,discount,taxable,tax(cgst/sgst/igst split),tds,total,paid,due,delivery_status,rcm,ewaybill_*,notes,bank_detail,terms + lines: product_id,qty,free_qty,price,cost,mrp,batch,mfg,expiry,discount_id/type/value/amount,uom,tax_id/type,rates,tax_amounts,taxable,subtotal)`, same shape `purchase_orders, purchases, purchase_returns, sales_returns, quotations(status), proforma_invoices, transfers(from_wh,to_wh)`, `expenses(+expense_lines, docs)`, `bank_accounts, cash_bank_entries(voucher_type,date,ref,from,to,amount,narration), bank_statements(+reconcile), pdc_receives/pdc_payments(+deposits), credit_debit_notes`, `hr: departments, positions, employees, attendances, holidays, weekends, deductions, bonuses, tax_deductions, advance_salaries, leaves, payrolls`, `transactions(entry_type, module, entry_id, from_account, to_account, amount, date, mode, ref)`, `deliveries(module, entry_id, items JSONB, date)`, `email_templates, whatsapp_templates, custom_fields`, `audit_logs`.
Keep `legacy_id INT UNIQUE NULL` on every table for migration traceability.

## 4. Data migration (already half-built)

Migration is COMPLETE. Verified totals: sales Rs 104,350,504.01 and purchases Rs 1,005,861,829.62 — both match the old `report/sale` and `report/purchase` footer totals exactly.
DB tables: currencies, taxes, warehouses, product_categories, uoms(44 seeded), products, customers (37, enriched billing+shipping from view pages), suppliers, bank_accounts, sales(457)+sale_lines(622), purchases(61)+purchase_lines(58), doc_headers(123: quotation/proforma/order/returns/transfer)+doc_lines(192), employees, departments, positions, cash_bank_entries, expenses(5, exact tax splits from views), stock_entries(67), hr_events(117), misc, app_users, doc_sequences(19).

1. `tools/dump-lists.ps1` — logs in, POSTs each `{module}/ajax_list` with big `length`, saves `data/raw/{module}.json` (`recordsTotal` + `data`). Also dumps `users`, `user_roles` HTML tables. **Re-run** to refresh; fix 6 partial modules by paging: `currency(26), transfer(14), cash_bank_entry(48), bank_statement(5), pdc_receive(6), pdc_payment(5), email_template(3)` — loop `start+=got` with `length=5~10` until `data=[]` (server ignores large `length` on these).
2. `tools/normalize-csv.ps1` — maps each raw `data[][]` to header names scraped from the page `<table>` (mode-matched when thead/tfoot differ), strips HTML to text, writes `data/csv/*.csv` + `data/schema/table-headers.json`. Re-run after step 1.
3. Detail pass (not yet dumped — needed for lines/payments): for each id in `sale,purchase,sales_return,purchase_return,quotation,proforma_invoice,transfer` fetch `/{module}/view/{base64id}` and `/{module}/edit/{id}` HTML; parse header fields + item rows + payment/delivery tables into `data/raw/detail_{module}_{id}.json`. Same for `customer/view/*`, `bank_account/view`, `payroll/view/`.
4. Reference dumps: `GET product_core/add` (UOM `<select>` 45 options — already captured), `tax` modal data, `settings` page full field set + doc-sequence table, `application_settings`.
5. Load to PG: `prisma db push`, then Node script `tools/import-to-pg.mjs` (to write): read CSVs in FK order `currencies→taxes→uoms→warehouses→categories→products→customers→suppliers→employees...→docs→lines→transactions`; strip commas from amounts (`1,00,52,45,360.76` Indian format → Decimal), `dd-mm-yyyy`→ISO, `Active`→boolean, base64 `view/*` id → `legacy_id`; keep raw HTML `Action` column dropped.
6. Verify: row counts vs §2 table; spot-check `report/sale` totals (Sale ₹10.43Cr, Purchase ₹100.58Cr), receivable/payable sums; open 3 invoices and compare header+lines+tax math vs old `view` pages.

## 5. Build order (clone section by section)

0. Scaffold: monorepo `app/(auth)/login`, `(dashboard)`, Prisma schema above, seed roles+permissions (import `user_roles` matrix verbatim), NextAuth + middleware RBAC (`permission[]` check per route, same names as old app).
1. Masters: Currency, Tax, UOM, Warehouse, Product Category, Product (+image upload, `warehouse_wise qty`), Item, Discount, Promotion, Expense Category, Custom Fields, Company Settings (incl. doc sequences).
2. People/Account: Customers, Suppliers (import CSV buttons — old app has them), Users/Roles, Bank Accounts, Cash/Bank Entries, Bank Statements+Reconcile, PDC Receive/Payment+Deposit, Expenses, Credit/Debit Notes.
3. Inventory ops: Stock Entry, Transfers, Scrap Entry/Issue/Receive + Scrap Products.
4. Sales cycle: Quotation → Proforma → Sale (full line-item grid, discount/tax/inclusive toggle, EWaybill fields, docs upload, TDS) → Sales Return; each with View (invoice print), Payment modal, Delivery modal, PDF, Email/WhatsApp stubs.
5. Purchase cycle: Purchase Order → Purchase → Purchase Return (same pattern, supplier-side).
6. HR: Departments, Positions, Employees, Attendance (+bulk), Holidays, Weekends, Deductions, Bonuses, Tax Deductions, Advance Salary, Leaves, Payroll (+bulk create, payslip view).
7. Reports: port each `report/*` filter set verbatim; server-computed SQL views for Stock Value, Closing Stock, Receivable/Payable, Due reports, GSTR-1/2 (+JSON export), HSN Sale/Purchase, Ledger, P&L, Balance Sheet.
8. Polish: dashboard widgets (Sales&Expenses chart `get_sale_expense_chart_data`, recent sales/expenses/customers/products, alerts, cash-on-hand + bank balances sidebar), shortcuts modal, CSV imports, audit log, backups (old `create_backup/restore_dummy_data` → `pg_dump`).

> Skip: Envato `activation_key` licensing modals, `clear/restore dummy data` (dev-only), SMS config (route 404s anyway).
