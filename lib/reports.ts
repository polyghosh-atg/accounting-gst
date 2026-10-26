import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

export type Filters = { from: string; to: string; party: string; warehouse: string; q: string };
export type Col = { key: string; label: string; align?: 'l' | 'r'; money?: boolean };
export type ReportDef = {
  slug: string;
  title: string;
  desc: string;
  cols: Col[];
  totals?: string[];
  dateFilter?: boolean;
  partyFilter?: { label: string; options: string[] } | null;
  warehouseFilter?: boolean;
  fetch: (f: Filters) => Promise<Record<string, string>[]>;
};

const num = (v: unknown) => Number(v ?? 0);
const has = (v: string) => v && v.trim() !== '';

function dateWhere(col: string, f: Filters, params: string[], startIdx: number): string {
  const c: string[] = [];
  if (has(f.from)) { params.push(f.from); c.push(`${col} >= $${startIdx + params.length - 1}`); }
  if (has(f.to)) { params.push(f.to); c.push(`${col} <= $${startIdx + params.length - 1}`); }
  return c.length ? ` AND ${c.join(' AND ')}` : '';
}

async function parties(kind: 'customer' | 'supplier'): Promise<string[]> {
  const t = kind === 'customer' ? 'customers' : 'suppliers';
  const col = kind === 'customer' ? 'company_name' : 'company_name';
  const r = await pool.query(`SELECT DISTINCT ${col} AS n FROM ${t} ORDER BY 1`);
  return r.rows.map((x) => x.n).filter(Boolean);
}
async function warehouses(): Promise<string[]> {
  const r = await pool.query('SELECT name FROM warehouses ORDER BY name');
  return r.rows.map((x) => x.name);
}

const M = (k: string): Col => ({ key: k, label: k, align: 'r', money: true });

export async function reportDefs(): Promise<ReportDef[]> {
  const [custs, sups, whs] = await Promise.all([parties('customer'), parties('supplier'), warehouses()]);
  const iq = (s: string) => s; // identifier passthrough (static cols only)

  const saleTax = `COALESCE((SELECT SUM(igst_tax) FROM sale_lines l WHERE l.sale_id=s.id),0) AS igst,
    COALESCE((SELECT SUM(cgst_tax) FROM sale_lines l WHERE l.sale_id=s.id),0) AS cgst,
    COALESCE((SELECT SUM(sgst_tax) FROM sale_lines l WHERE l.sale_id=s.id),0) AS sgst`;

  const defs: ReportDef[] = [
    {
      slug: 'customer_payment_due', title: 'Customer Payment Due', desc: 'Pending bills only: invoice, paid & balance per customer',
      cols: [
        { key: 'customer', label: 'Customer Name' },
        { key: 'invoiced', label: 'Invoice Amount', align: 'r', money: true },
        { key: 'paid', label: 'Paid Amount', align: 'r', money: true },
        { key: 'pending', label: 'Pending Amount', align: 'r', money: true },
      ],
      totals: ['invoiced', 'paid', 'pending'],
      partyFilter: { label: 'Customer', options: custs },
      fetch: async (f) => {
        const p: string[] = [];
        let w = 'WHERE due > 0';
        if (has(f.party)) { p.push(f.party); w += ` AND customer=$${p.length}`; }
        const r = await pool.query(
          `SELECT customer, COALESCE(SUM(total),0) invoiced, COALESCE(SUM(paid),0) paid,
             COALESCE(SUM(total),0)-COALESCE(SUM(paid),0) pending,
             count(*) bills FROM sales ${w} GROUP BY customer ORDER BY pending DESC`, p);
        return filterQ(r.rows, f, ['customer']);
      },
    },
    {
      slug: 'supplier_payment_due', title: 'Supplier Payment Due', desc: 'Pending bills only: billed, paid & balance per supplier',
      cols: [
        { key: 'supplier', label: 'Company Name' },
        { key: 'invoiced', label: 'Purchase Order Amount', align: 'r', money: true },
        { key: 'paid', label: 'Paid Amount', align: 'r', money: true },
        { key: 'pending', label: 'Pending Amount', align: 'r', money: true },
      ],
      totals: ['invoiced', 'paid', 'pending'],
      partyFilter: { label: 'Supplier', options: sups },
      fetch: async (f) => {
        const p: string[] = [];
        let w = 'WHERE due > 0';
        if (has(f.party)) { p.push(f.party); w += ` AND supplier=$${p.length}`; }
        const r = await pool.query(
          `SELECT supplier, COALESCE(SUM(total),0) invoiced, COALESCE(SUM(paid),0) paid,
             COALESCE(SUM(total),0)-COALESCE(SUM(paid),0) pending,
             count(*) bills FROM purchases ${w} GROUP BY supplier ORDER BY pending DESC`, p);
        return filterQ(r.rows, f, ['supplier']);
      },
    },
    {
      slug: 'receivable', title: 'Receivable', desc: 'All bills of customers carrying dues',
      cols: [
        { key: 'customer', label: 'Customer Name' },
        { key: 'gstin', label: 'GSTIN/UIN of Recipient' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'country', label: 'Country' },
        { key: 'state', label: 'State' },
        { key: 'invoiced', label: 'Invoice Amount', align: 'r', money: true },
        { key: 'paid', label: 'Paid Amount', align: 'r', money: true },
        { key: 'receivable', label: 'Receivable', align: 'r', money: true },
      ],
      partyFilter: { label: 'Customer', options: custs },
      fetch: async (f) => {
        const r = await pool.query(
          `SELECT s.customer, MAX(c.gstin) gstin, MAX(c.email) email, MAX(c.phone) phone,
             MAX(c.country) country, MAX(c.state) state,
             COALESCE(SUM(s.total),0) invoiced, COALESCE(SUM(s.paid),0) paid,
             COALESCE(SUM(s.total),0)-COALESCE(SUM(s.paid),0) receivable,
             MIN(c.legacy_id) legacy_id
           FROM sales s LEFT JOIN customers c ON c.company_name=s.customer
           WHERE EXISTS (SELECT 1 FROM sales s2 WHERE s2.customer=s.customer AND s2.due > 0)
           GROUP BY s.customer ORDER BY legacy_id NULLS LAST`);
        const g = await pool.query('SELECT COALESCE(SUM(total),0) i, COALESCE(SUM(paid),0) p FROM sales');
        const gi = Number(g.rows[0].i), gp = Number(g.rows[0].p);
        const rd = (n: number) => String(Math.round(n * 100) / 100);
        const rows = filterQ(r.rows, f, ['customer']).map((x) => ({
          customer: String(x.customer ?? ''),
          gstin: String(x.gstin ?? ''),
          email: String(x.email ?? ''),
          phone: String(x.phone ?? ''),
          country: String(x.country ?? ''),
          state: String(x.state ?? ''),
          invoiced: String(x.invoiced ?? 0),
          paid: String(x.paid ?? 0),
          receivable: String(x.receivable ?? 0),
        }));
        rows.push({ customer: 'Total', gstin: '', email: '', phone: '', country: '', state: '', invoiced: rd(gi), paid: rd(gp), receivable: rd(gi - gp) });
        return rows;
      },
    },
    {
      slug: 'payable', title: 'Payable', desc: 'Supplier-wise invoice, paid & payable',
      cols: [{ key: 'supplier', label: 'Company Name' }, { key: 'gstin', label: 'GSTIN' }, M('invoiced'), M('paid'), M('payable')],
      totals: ['invoiced', 'paid', 'payable'],
      partyFilter: { label: 'Supplier', options: sups },
      fetch: async (f) => {
        const p: string[] = [];
        let w = '';
        if (has(f.party)) { p.push(f.party); w = `WHERE p.supplier=$1`; }
        const r = await pool.query(
          `SELECT p.supplier, max(s.gstin) gstin, COALESCE(SUM(p.total),0) invoiced, COALESCE(SUM(p.paid),0) paid,
             COALESCE(SUM(p.due),0) payable, count(*) bills
           FROM purchases p LEFT JOIN suppliers s ON s.company_name=p.supplier ${w}
           GROUP BY p.supplier ORDER BY payable DESC`, p);
        return filterQ(r.rows, f, ['supplier', 'gstin']);
      },
    },
    {
      slug: 'sale', title: 'Sales Report', desc: 'All sales with tax splits & profit',
      cols: [
        { key: 'inv_no', label: 'Invoice No' }, { key: 'inv_date', label: 'Invoice Date' }, { key: 'customer', label: 'Customer' },
        M('discount'), M('taxable'), M('igst'), M('cgst'), M('sgst'), M('total'),
      ],
      totals: ['discount', 'taxable', 'igst', 'cgst', 'sgst', 'total'],
      dateFilter: true, partyFilter: { label: 'Customer', options: custs },
      fetch: async (f) => {
        const p: string[] = [];
        let w = 'WHERE 1=1' + dateWhere('s.inv_date', f, p, 1);
        if (has(f.party)) { p.push(f.party); w += ` AND s.customer=$${p.length}`; }
        const r = await pool.query(
          `SELECT s.inv_no, s.inv_date, s.customer, s.discount, s.taxable AS taxable, ${saleTax}, s.total
           FROM sales s ${w} ORDER BY s.inv_date DESC, s.id DESC LIMIT 2000`, p);
        return filterQ(r.rows.map(fmtDate('inv_date')), f, ['inv_no', 'customer']);
      },
    },
    {
      slug: 'purchase', title: 'Purchase Report', desc: 'All purchases with tax & payments',
      cols: [
        { key: 'po_no', label: 'PO No.' }, { key: 'inv_no', label: 'Invoice No' }, { key: 'purchase_date', label: 'Purchase Date' },
        { key: 'warehouse', label: 'Warehouse' }, { key: 'supplier', label: 'Supplier' },
        M('discount'), M('taxable'), M('tax'), M('total'), M('paid'), M('due'),
      ],
      totals: ['discount', 'taxable', 'tax', 'total', 'paid', 'due'],
      dateFilter: true, partyFilter: { label: 'Supplier', options: sups },
      fetch: async (f) => {
        const p: string[] = [];
        let w = 'WHERE 1=1' + dateWhere('purchase_date', f, p, 1);
        if (has(f.party)) { p.push(f.party); w += ` AND supplier=$${p.length}`; }
        const r = await pool.query(`SELECT * FROM purchases ${w} ORDER BY purchase_date DESC, id DESC LIMIT 2000`, p);
        return filterQ(r.rows.map(fmtDate('purchase_date')), f, ['po_no', 'inv_no', 'supplier']);
      },
    },
    {
      slug: 'sales_return', title: 'Sales Return Report', desc: 'Sales returns with tax',
      cols: [
        { key: 'ref_no', label: 'Reference No' }, { key: 'doc_date', label: 'Return Date' }, { key: 'party', label: 'Customer' },
        M('discount'), M('taxable'), M('tax'), M('total'),
      ],
      totals: ['discount', 'taxable', 'tax', 'total'],
      dateFilter: true,
      fetch: async (f) => {
        const p: string[] = [];
        const w = `WHERE doc_type='sales_return'` + dateWhere('doc_date', f, p, 1);
        const r = await pool.query(`SELECT ref_no, doc_date, party, discount, taxable, tax, total FROM doc_headers ${w} ORDER BY doc_date DESC LIMIT 2000`, p);
        return filterQ(r.rows.map(fmtDate('doc_date')), f, ['ref_no', 'party']);
      },
    },
    {
      slug: 'purchase_return', title: 'Purchase Return Report', desc: 'Purchase returns with tax',
      cols: [
        { key: 'ref_no', label: 'Reference No' }, { key: 'doc_date', label: 'Return Date' }, { key: 'party', label: 'Supplier' },
        M('discount'), M('taxable'), M('tax'), M('total'),
      ],
      totals: ['discount', 'taxable', 'tax', 'total'],
      dateFilter: true,
      fetch: async (f) => {
        const p: string[] = [];
        const w = `WHERE doc_type='purchase_return'` + dateWhere('doc_date', f, p, 1);
        const r = await pool.query(`SELECT ref_no, doc_date, party, discount, taxable, tax, total FROM doc_headers ${w} ORDER BY doc_date DESC LIMIT 2000`, p);
        return filterQ(r.rows.map(fmtDate('doc_date')), f, ['ref_no', 'party']);
      },
    },
    {
      slug: 'expense', title: 'Expense Report', desc: 'Expenses with GST split',
      cols: [
        { key: 'bill_date', label: 'Bill Date' }, { key: 'category', label: 'Category' }, { key: 'supplier', label: 'Supplier' },
        M('taxable'), M('cgst'), M('sgst'), M('igst'), M('total'),
      ],
      totals: ['taxable', 'cgst', 'sgst', 'igst', 'total'],
      dateFilter: true,
      fetch: async (f) => {
        const p: string[] = [];
        const w = 'WHERE 1=1' + dateWhere('bill_date', f, p, 1);
        const r = await pool.query(`SELECT bill_date, category, supplier, taxable, cgst, sgst, igst, total FROM expenses ${w} ORDER BY bill_date DESC LIMIT 2000`, p);
        return filterQ(r.rows.map(fmtDate('bill_date')), f, ['category', 'supplier']);
      },
    },
    {
      slug: 'gstr1', title: 'GSTR1 Report', desc: 'Outward supplies for GST filing',
      cols: [
        { key: 'inv_no', label: 'Invoice No' }, { key: 'inv_date', label: 'Invoice Date' }, { key: 'customer', label: 'Customer' },
        { key: 'gstin', label: 'GSTIN' }, M('taxable'), M('igst'), M('cgst'), M('sgst'), M('total'),
      ],
      totals: ['taxable', 'igst', 'cgst', 'sgst', 'total'],
      dateFilter: true, partyFilter: { label: 'Customer', options: custs },
      fetch: async (f) => {
        const p: string[] = [];
        let w = 'WHERE 1=1' + dateWhere('s.inv_date', f, p, 1);
        if (has(f.party)) { p.push(f.party); w += ` AND s.customer=$${p.length}`; }
        const r = await pool.query(
          `SELECT s.inv_no, s.inv_date, s.customer, max(c.gstin) gstin, SUM(s.taxable) taxable, ${saleTax}, SUM(s.total) total
           FROM sales s LEFT JOIN customers c ON c.company_name=s.customer ${w}
           GROUP BY s.id
           HAVING COALESCE(SUM(s.taxable),0) <> 0 OR COALESCE(SUM(s.total),0) <> 0
             OR COALESCE((SELECT SUM(igst_tax) FROM sale_lines l WHERE l.sale_id=s.id),0) <> 0
             OR COALESCE((SELECT SUM(cgst_tax) FROM sale_lines l WHERE l.sale_id=s.id),0) <> 0
             OR COALESCE((SELECT SUM(sgst_tax) FROM sale_lines l WHERE l.sale_id=s.id),0) <> 0
           ORDER BY s.inv_date DESC LIMIT 2000`, p);
        return filterQ(r.rows.map(fmtDate('inv_date')), f, ['inv_no', 'customer', 'gstin']);
      },
    },
    {
      slug: 'gstr2', title: 'GSTR2 Report', desc: 'Inward supplies for GST filing',
      cols: [
        { key: 'inv_no', label: 'Invoice No' }, { key: 'purchase_date', label: 'Purchase Date' }, { key: 'supplier', label: 'Supplier' },
        { key: 'gstin', label: 'GSTIN' }, M('taxable'), M('tax'), M('total'),
      ],
      totals: ['taxable', 'tax', 'total'],
      dateFilter: true, partyFilter: { label: 'Supplier', options: sups },
      fetch: async (f) => {
        const p: string[] = [];
        let w = 'WHERE 1=1' + dateWhere('p.purchase_date', f, p, 1);
        if (has(f.party)) { p.push(f.party); w += ` AND p.supplier=$${p.length}`; }
        const r = await pool.query(
          `SELECT p.inv_no, p.purchase_date, p.supplier, max(s.gstin) gstin, p.taxable AS taxable, p.tax AS tax, p.total AS total
           FROM purchases p LEFT JOIN suppliers s ON s.company_name=p.supplier ${w}
           GROUP BY p.id ORDER BY p.purchase_date DESC LIMIT 2000`, p);
        return filterQ(r.rows.map(fmtDate('purchase_date')), f, ['inv_no', 'supplier', 'gstin']);
      },
    },
    {
      slug: 'hsn_sale', title: 'HSN Sale Report', desc: 'HSN-wise outward summary',
      cols: [
        { key: 'hsn', label: 'HSN' }, M('qty'), M('taxable'), M('igst'), M('cgst'), M('sgst'), M('total'),
      ],
      totals: ['qty', 'taxable', 'igst', 'cgst', 'sgst', 'total'],
      fetch: async (f) => {
        const r = await pool.query(
          `SELECT COALESCE(NULLIF(hsn,''),'â€”') hsn, SUM(qty) qty, SUM(taxable) taxable,
             SUM(igst_tax) igst, SUM(cgst_tax) cgst, SUM(sgst_tax) sgst, SUM(subtotal) total
           FROM sale_lines GROUP BY 1 ORDER BY total DESC`);
        return filterQ(r.rows, f, ['hsn']);
      },
    },
    {
      slug: 'hsn_purchase', title: 'HSN Purchase Report', desc: 'HSN-wise inward summary',
      cols: [
        { key: 'hsn', label: 'HSN' }, M('qty'), M('taxable'), M('total'),
      ],
      totals: ['qty', 'taxable', 'total'],
      fetch: async (f) => {
        const r = await pool.query(
          `SELECT COALESCE(NULLIF(pr.hsn,''),'â€”') hsn, SUM(pl.qty) qty, SUM(pl.taxable) taxable, SUM(pl.subtotal) total
           FROM purchase_lines pl LEFT JOIN products pr ON pr.name=pl.item_name
           GROUP BY 1 ORDER BY total DESC`);
        return filterQ(r.rows, f, ['hsn']);
      },
    },
    {
      slug: 'stock', title: 'Stock Report', desc: 'Warehouse-wise stock entries',
      cols: [
        { key: 'warehouse', label: 'Warehouse' }, { key: 'product', label: 'Product' }, M('qty'),
        { key: 'unit', label: 'Unit' }, M('cost'), M('sell_price'), { key: 'entry_type', label: 'Type' }, { key: 'entry_date', label: 'Date' },
      ],
      warehouseFilter: true,
      fetch: async (f) => {
        const p: string[] = [];
        let w = 'WHERE 1=1';
        if (has(f.warehouse)) { p.push(f.warehouse); w += ` AND warehouse=$${p.length}`; }
        const r = await pool.query(`SELECT * FROM stock_entries ${w} ORDER BY warehouse, product LIMIT 2000`, p);
        return filterQ(r.rows.map(fmtDate('entry_date')), f, ['product']);
      },
    },
    {
      slug: 'stock_value', title: 'Stock Value Report', desc: 'Warehouse available quantity with purchase (cost) and sale (MRP) value',
      cols: [
        { key: 'product', label: 'Product Name' },
        { key: 'qty', label: 'Available Total Quantity', align: 'r' },
        { key: 'purchase_value', label: 'Total Purchase Value', align: 'r', money: true },
        { key: 'sale_value', label: 'Total Sale Value', align: 'r' },
      ],
      fetch: async (f) => {
        const r = await pool.query(
          `SELECT w.product, SUM(w.qty) qty, SUM(w.qty*w.cost) purchase_value,
             MAX(COALESCE(pr.mrp,0)) mrp, SUM(w.qty)*MAX(COALESCE(pr.mrp,0)) sale_value
           FROM warehouse_products w LEFT JOIN products pr ON pr.name ILIKE w.product || '%'
           GROUP BY w.product ORDER BY w.product`);
        const rows = filterQ(r.rows, f, ['product']).map((x) => ({
          product: String(x.product ?? ''),
          qty: String(x.qty ?? '0'),
          purchase_value: String(x.purchase_value ?? '0'),
          sale_value: Number(x.mrp) > 0 ? String(x.sale_value ?? '0') : 'Please update selling price',
        }));
        const tq = rows.reduce((a, x) => a + (parseFloat(x.qty) || 0), 0);
        const tp = rows.reduce((a, x) => a + (parseFloat(x.purchase_value) || 0), 0);
        const ts = rows.reduce((a, x) => a + (parseFloat(x.sale_value) || 0), 0);
        const rd = (n: number) => String(Math.round(n * 100) / 100);
        rows.push({ product: 'Total', qty: rd(tq), purchase_value: rd(tp), sale_value: rd(ts) });
        return rows;
      },
    },
    {
      slug: 'closing_stock', title: 'Closing Stock Report', desc: 'Opening + purchase, sale and stock movement per product',
      cols: [
        { key: 'sr', label: 'Sr. No' },
        { key: 'product', label: 'Product Name' },
        { key: 'op', label: 'Opening Stock', align: 'r' },
        { key: 'op_vl', label: 'Op Stock Value P. Rate', align: 'r', money: true },
        { key: 'pur', label: 'Pur', align: 'r' },
        { key: 'pur_vl', label: 'Pur vl', align: 'r', money: true },
        { key: 'pur_ret', label: 'Pur. Ret', align: 'r' },
        { key: 'pur_ret_vl', label: 'Pur. Ret vl', align: 'r', money: true },
        { key: 'sale', label: 'Sale', align: 'r' },
        { key: 'sale_vl', label: 'Sale vl', align: 'r', money: true },
        { key: 'sale_ret', label: 'Sale Ret', align: 'r' },
        { key: 'sale_ret_vl', label: 'Sale Ret vl', align: 'r', money: true },
        { key: 'st_in', label: 'Stock In', align: 'r' },
        { key: 'st_in_vl', label: 'Stock In vl', align: 'r', money: true },
        { key: 'st_out', label: 'Stock Out', align: 'r' },
        { key: 'st_out_vl', label: 'Stock Out vl', align: 'r', money: true },
        { key: 'cl', label: 'Cl Stock', align: 'r' },
        { key: 'cl_vl', label: 'Cl Stock Value P. Rate', align: 'r', money: true },
      ],
      dateFilter: true,
      fetch: async (f) => {
        const from = (f.from || '').trim();
        const to = (f.to || '').trim() || '9999-12-31';
        const needle = f.q.trim();
        const r = await pool.query(
          `SELECT w.id, w.product, COALESCE(w.cost,0) cost, COALESCE(pr.mrp,0) mrp,
             (SELECT COALESCE(SUM(l.qty),0) FROM purchase_lines l JOIN purchases p ON p.id=l.purchase_id
              WHERE l.item_name ILIKE w.product || '%' AND p.purchase_date < $1) AS pur_op,
             (SELECT COALESCE(SUM(l.qty),0) FROM purchase_lines l JOIN purchases p ON p.id=l.purchase_id
              WHERE l.item_name ILIKE w.product || '%' AND p.purchase_date >= $1 AND p.purchase_date <= $2) AS pur,
             (SELECT COALESCE(SUM(l.qty*l.cost),0) FROM purchase_lines l JOIN purchases p ON p.id=l.purchase_id
              WHERE l.item_name ILIKE w.product || '%' AND p.purchase_date >= $1 AND p.purchase_date <= $2) AS pur_vl,
             (SELECT COALESCE(SUM(l.qty),0) FROM sale_lines l JOIN sales s ON s.id=l.sale_id
              WHERE l.item_name ILIKE w.product || '%' AND s.inv_date < $1) AS sale_op,
             (SELECT COALESCE(SUM(l.qty),0) FROM sale_lines l JOIN sales s ON s.id=l.sale_id
              WHERE l.item_name ILIKE w.product || '%' AND s.inv_date >= $1 AND s.inv_date <= $2) AS sale,
             (SELECT COALESCE(SUM(l.qty*l.price),0) FROM sale_lines l JOIN sales s ON s.id=l.sale_id
              WHERE l.item_name ILIKE w.product || '%' AND s.inv_date >= $1 AND s.inv_date <= $2) AS sale_vl,
             (SELECT COALESCE(SUM(s.qty),0) FROM stock_entries s
              WHERE s.product=w.product AND s.warehouse=w.warehouse AND s.entry_type='IN' AND s.entry_date < $1) AS stin_op,
             (SELECT COALESCE(SUM(s.qty),0) FROM stock_entries s
              WHERE s.product=w.product AND s.warehouse=w.warehouse AND s.entry_type='IN' AND s.entry_date >= $1 AND s.entry_date <= $2) AS st_in,
             (SELECT COALESCE(SUM(s.qty),0) FROM stock_entries s
              WHERE s.product=w.product AND s.warehouse=w.warehouse AND s.entry_type='OUT' AND s.entry_date >= $1 AND s.entry_date <= $2) AS st_out
           FROM warehouse_products w LEFT JOIN products pr ON pr.name ILIKE w.product || '%'
           WHERE ($3 = '' OR w.product ILIKE $3)
           ORDER BY w.product, w.warehouse`,
          [from || '0001-01-01', to, needle === '' ? '' : '%' + needle + '%']);
        let i = 0;
        const rows: Record<string, string>[] = [];
        const T: Record<string, number> = {};
        for (const x of r.rows) {
          const num = (v: unknown) => Number(v ?? 0);
          const op = from === '' ? 0 : num(x.pur_op) - num(x.sale_op) + num(x.stin_op);
          const cl = op + num(x.pur) - num(x.sale) + num(x.st_in) - num(x.st_out);
          const cost = num(x.cost), mrp = num(x.mrp) > 0 ? num(x.mrp) : cost;
          const row = {
            sr: String(++i), product: String(x.product ?? ''),
            op: String(Math.round(op * 100) / 100), op_vl: String(Math.round(op * cost * 100) / 100),
            pur: String(x.pur ?? 0), pur_vl: String(Math.round(Number(x.pur_vl ?? 0) * 100) / 100),
            pur_ret: '0', pur_ret_vl: '0',
            sale: String(x.sale ?? 0), sale_vl: String(Math.round(Number(x.sale_vl ?? 0) * 100) / 100),
            sale_ret: '0', sale_ret_vl: '0',
            st_in: String(x.st_in ?? 0), st_in_vl: String(Math.round(num(x.st_in) * mrp * 100) / 100),
            st_out: String(x.st_out ?? 0), st_out_vl: String(Math.round(num(x.st_out) * mrp * 100) / 100),
            cl: String(Math.round(cl * 100) / 100), cl_vl: String(Math.round(cl * cost * 100) / 100),
          };
          if (op !== 0 || num(x.pur) !== 0 || num(x.sale) !== 0 || num(x.st_in) !== 0 || num(x.st_out) !== 0) rows.push(row);
        }
        const keys = ['op','op_vl','pur','pur_vl','pur_ret','pur_ret_vl','sale','sale_vl','sale_ret','sale_ret_vl','st_in','st_in_vl','st_out','st_out_vl','cl','cl_vl'];
        for (const k of keys) T[k] = rows.reduce((a, x) => a + (parseFloat(x[k]) || 0), 0);
        if (rows.length > 0) {
          const tot: Record<string, string> = { sr: '', product: 'Total' };
          for (const k of keys) tot[k] = String(Math.round(T[k] * 100) / 100);
          rows.push(tot);
        }
        return rows;
      },
    },
    {
      slug: 'inventory_product_added', title: 'Inventory Product Added', desc: 'Products brought in through purchases',
      cols: [
        { key: 'sr', label: 'Sr. No' },
        { key: 'product', label: 'Product Name' },
        { key: 'batch', label: 'Batch No' },
        { key: 'qty', label: 'Purchase Qty', align: 'r' },
        { key: 'val', label: 'Purchase value', align: 'r', money: true },
      ],
      dateFilter: true,
      fetch: async (f) => {
        const from = (f.from || '').trim() || '0001-01-01';
        const to = (f.to || '').trim() || '9999-12-31';
        const r = await pool.query(
          `SELECT pr.name AS product,
             (SELECT batch_no FROM warehouse_products w
              WHERE pr.name ILIKE w.product || '%' AND COALESCE(w.batch_no,'') <> ''
              ORDER BY w.id LIMIT 1) AS batch,
             COALESCE((SELECT SUM(l.qty) FROM purchase_lines l JOIN purchases p ON p.id=l.purchase_id
              WHERE l.item_name ILIKE pr.name || '%' AND p.purchase_date >= $1 AND p.purchase_date <= $2),0) AS qty,
             COALESCE((SELECT SUM(l.subtotal) FROM purchase_lines l JOIN purchases p ON p.id=l.purchase_id
              WHERE l.item_name ILIKE pr.name || '%' AND p.purchase_date >= $1 AND p.purchase_date <= $2),0) AS val
           FROM products pr ORDER BY pr.name`,
          [from, to]);
        let i = 0;
        const rows = filterQ(r.rows, f, ['product'])
          .filter((x) => Number(x.qty) !== 0)
          .map((x) => ({
            sr: String(++i), product: String(x.product ?? ''),
            batch: String(x.batch ?? '') || '—',
            qty: String(x.qty ?? 0),
            val: String(Math.round(Number(x.val ?? 0) * 100) / 100),
          }));
        return rows;
      },
    },
    {
      slug: 'product', title: 'Product Detail Report', desc: 'Full product master with stock',
      cols: [
        { key: 'name', label: 'Product Name' }, { key: 'category_name', label: 'Category' }, { key: 'hsn', label: 'HSN' },
        { key: 'uom', label: 'UOM' }, M('cost'), M('selling_price'), M('stock'), { key: 'status', label: 'Status' },
      ],
      fetch: async (f) => {
        const r = await pool.query(
          `SELECT p.name, c.name category_name, p.hsn, p.uom, p.cost, p.selling_price, p.status,
             COALESCE((SELECT SUM(CASE WHEN entry_type='IN' THEN qty ELSE -qty END) FROM stock_entries s WHERE s.product=p.name),0) stock
           FROM products p LEFT JOIN product_categories c ON c.id=p.category_id ORDER BY p.name`);
        return filterQ(r.rows, f, ['name', 'hsn', 'category_name']);
      },
    },
    {
      slug: 'product_sale', title: 'Product Sale Report', desc: 'Line-level sales with customer',
      cols: [
        { key: 'item_name', label: 'Product Name' }, { key: 'inv_date', label: 'Sale Date' }, { key: 'inv_no', label: 'Sale Invoice' },
        M('qty'), M('price'), M('subtotal'), { key: 'customer', label: 'Customer' },
      ],
      totals: ['qty', 'price', 'subtotal'],
      dateFilter: true, partyFilter: { label: 'Customer', options: custs },
      fetch: async (f) => {
        const p: string[] = [];
        let w = 'WHERE 1=1' + dateWhere('s.inv_date', f, p, 1);
        if (has(f.party)) { p.push(f.party); w += ` AND s.customer=$${p.length}`; }
        const r = await pool.query(
          `SELECT l.item_name, s.inv_date, s.inv_no, l.qty, l.selling_price AS price, l.subtotal, s.customer
           FROM sale_lines l JOIN sales s ON s.id=l.sale_id ${w} ORDER BY s.inv_date DESC LIMIT 3000`, p);
        return filterQ(r.rows.map(fmtDate('inv_date')), f, ['item_name', 'inv_no', 'customer']);
      },
    },
    {
      slug: 'product_purchase', title: 'Product Purchase Report', desc: 'Line-level purchases with supplier',
      cols: [
        { key: 'item_name', label: 'Product Name' }, { key: 'purchase_date', label: 'Purchase Date' }, { key: 'po_no', label: 'PO Number' },
        M('qty'), M('cost'), M('subtotal'), { key: 'supplier', label: 'Supplier' },
      ],
      totals: ['qty', 'cost', 'subtotal'],
      dateFilter: true, partyFilter: { label: 'Supplier', options: sups },
      fetch: async (f) => {
        const p: string[] = [];
        let w = 'WHERE 1=1' + dateWhere('p.purchase_date', f, p, 1);
        if (has(f.party)) { p.push(f.party); w += ` AND p.supplier=$${p.length}`; }
        const r = await pool.query(
          `SELECT l.item_name, p.purchase_date, p.po_no, l.qty, l.cost, l.subtotal, p.supplier
           FROM purchase_lines l JOIN purchases p ON p.id=l.purchase_id ${w} ORDER BY p.purchase_date DESC LIMIT 3000`, p);
        return filterQ(r.rows.map(fmtDate('purchase_date')), f, ['item_name', 'po_no', 'supplier']);
      },
    },
    {
      slug: 'ledger', title: 'Ledger Report', desc: 'Voucher entries per ledger with running balance',
      cols: [
        { key: 'ref_no', label: 'Reference No' }, { key: 'vouch_type', label: 'Voucher' }, { key: 'voucher_date', label: 'Date' },
        { key: 'other', label: 'Other Ledger' }, M('debit'), M('credit'), M('balance'),
      ],
      partyFilter: { label: 'Ledger', options: [...new Set([...custs, ...sups])] },
      fetch: async (f) => {
        if (!has(f.party)) return [];
        const r = await pool.query(
          `SELECT ref_no, vouch_type, voucher_date,
             CASE WHEN upper(from_acct)=upper($1) THEN to_acct ELSE from_acct END AS other,
             CASE WHEN upper(to_acct)=upper($1) THEN 0 ELSE amount END AS debit,
             CASE WHEN upper(to_acct)=upper($1) THEN amount ELSE 0 END AS credit,
             amount
           FROM cash_bank_entries WHERE upper(from_acct)=upper($1) OR upper(to_acct)=upper($1)
           ORDER BY voucher_date NULLS LAST, id LIMIT 2000`, [f.party]);
        let bal = 0;
        return r.rows.map(fmtDate('voucher_date')).map((x) => {
          bal += num(x.credit) - num(x.debit);
          return { ...x, balance: String(Math.round(bal * 100) / 100) };
        });
      },
    },
    {
      slug: 'transaction', title: 'Transaction Report', desc: 'All payment/receipt transactions',
      cols: [
        { key: 'module', label: 'Module' }, { key: 'txn_type', label: 'Type' }, { key: 'ref_no', label: 'Reference No' },
        { key: 'voucher_date', label: 'Date' }, { key: 'pay_mode', label: 'Payment Mode' }, M('amount'),
      ],
      totals: ['amount'],
      dateFilter: true,
      fetch: async (f) => {
        const p: string[] = [];
        const w = 'WHERE 1=1' + dateWhere('voucher_date', f, p, 1);
        const r = await pool.query(
          `SELECT module, txn_type, ref_no, voucher_date, pay_mode, amount FROM transactions ${w}
           ORDER BY voucher_date DESC, id DESC LIMIT 3000`, p);
        return filterQ(r.rows.map(fmtDate('voucher_date')), f, ['module', 'txn_type', 'ref_no', 'pay_mode']);
      },
    },
  ];
  void iq;
  return defs;
}

function fmtDate(key: string) {
  return (r: Record<string, string>) => ({
    ...r,
    [key]: r[key] ? String(r[key]).slice(0, 10) : '',
  });
}

function filterQ(rows: Record<string, string>[], f: Filters, keys: string[]) {
  const q = f.q.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
}

export function toCSV(cols: Col[], rows: Record<string, string>[]) {
  const cell = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) => cols.map((c) => cell(r[c.key])).join(','));
  return '\uFEFF' + cols.map((c) => cell(c.label)).join(',') + '\n' + lines.join('\n');
}
