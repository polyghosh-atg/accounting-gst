import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

export type LedgerEntry = {
  date: string; // ISO yyyy-mm-dd
  particulars: string;
  href?: string;
  ref?: string;
  dr: number;
  cr: number;
};

const num = (v: unknown) => Number(v ?? 0) || 0;
const iso = (v: unknown) => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const s = String(v ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

export type LedgerOption = { value: string; group: string };

export async function ledgerOptions(): Promise<LedgerOption[]> {
  const opts: LedgerOption[] = [{ value: 'CASH ACCOUNT - CASH', group: 'Cash' }];
  const banks = await pool.query('SELECT DISTINCT name FROM bank_accounts ORDER BY name');
  for (const r of banks.rows) if (String(r.name).trim()) opts.push({ value: `${r.name} - BANK ACCOUNTS`, group: 'Bank Accounts' });
  const custs = await pool.query('SELECT DISTINCT company_name FROM customers ORDER BY company_name');
  for (const r of custs.rows) if (String(r.company_name).trim()) opts.push({ value: `${r.company_name} - SUNDRY DEBTORS`, group: 'Sundry Debtors' });
  const sups = await pool.query('SELECT DISTINCT company_name FROM suppliers ORDER BY company_name');
  for (const r of sups.rows) if (String(r.company_name).trim()) opts.push({ value: `${r.company_name} - SUNDRY CREDITORS`, group: 'Sundry Creditors' });
  opts.push({ value: 'SALE - SALES', group: 'Sales' });
  opts.push({ value: 'PURCHASE ACCOUNT - PURCHASE', group: 'Purchase' });
  const cats = await pool.query('SELECT DISTINCT category FROM expenses ORDER BY category');
  for (const r of cats.rows) if (String(r.category).trim()) opts.push({ value: `${r.category} - OFFICE EXPENSE`, group: 'Office Expense' });
  return opts;
}

export async function ledgerReport(
  ledger: string, from: string, to: string
): Promise<{ entries: LedgerEntry[]; opening: number; drTotal: number; crTotal: number; closing: number }> {
  const dash = ledger.lastIndexOf(' - ');
  const name = dash >= 0 ? ledger.slice(0, dash) : ledger;
  const type = dash >= 0 ? ledger.slice(dash + 3) : '';
  const all: LedgerEntry[] = [];

  const within = (d: string | null) => {
    if (!d) return 'skip';
    if (from && d < from) return 'before';
    if (to && d > to) return 'after';
    return 'in';
  };

  if (type === 'SUNDRY DEBTORS') {
    const sales = await pool.query('SELECT inv_no, inv_date, total FROM sales WHERE customer=$1 ORDER BY inv_date NULLS LAST, id', [name]);
    for (const s of sales.rows) {
      const d = iso(s.inv_date);
      all.push({ date: d ?? '', particulars: `SALE [${s.inv_no}]`, href: `/sales/${s.inv_no}`, ref: String(s.inv_no), dr: num(s.total), cr: 0, _w: within(d) } as LedgerEntry & { _w: string });
    }
    const r = await pool.query(
      `SELECT t.voucher_date, t.amount, s.inv_no FROM transactions t JOIN sales s ON s.id=t.entry_id
       WHERE t.module='Sale' AND t.txn_type='Receipt' AND s.customer=$1`, [name]);
    for (const x of r.rows) {
      const d = iso(x.voucher_date);
      all.push({ date: d ?? '', particulars: `Receipt [${x.inv_no || 'payment'}]`, href: x.inv_no ? `/sales/${x.inv_no}` : undefined, ref: String(x.inv_no || ''), dr: 0, cr: num(x.amount), _w: within(d) } as LedgerEntry & { _w: string });
    }
  } else if (type === 'SUNDRY CREDITORS') {
    const ps = await pool.query('SELECT id, po_no, inv_no, purchase_date, total FROM purchases WHERE supplier=$1 ORDER BY purchase_date NULLS LAST, id', [name]);
    for (const s of ps.rows) {
      const d = iso(s.purchase_date);
      all.push({ date: d ?? '', particulars: `PURCHASE [${s.po_no || s.inv_no}]`, href: `/purchases/view/${s.id}`, ref: String(s.po_no || s.inv_no), dr: 0, cr: num(s.total), _w: within(d) } as LedgerEntry & { _w: string });
    }
    const r = await pool.query(
      `SELECT t.voucher_date, t.amount, p.id, p.po_no, p.inv_no FROM transactions t JOIN purchases p ON p.id=t.entry_id
       WHERE t.module='Purchase' AND t.txn_type='Payment' AND p.supplier=$1`, [name]);
    for (const x of r.rows) {
      const d = iso(x.voucher_date);
      all.push({ date: d ?? '', particulars: `Payment [${x.po_no || x.inv_no || 'payment'}]`, href: `/purchases/view/${x.id}`, ref: String(x.po_no || x.inv_no || ''), dr: num(x.amount), cr: 0, _w: within(d) } as LedgerEntry & { _w: string });
    }
  } else if (type === 'CASH') {
    const cbe = await pool.query(
      `SELECT ref_no, vouch_type, from_acct, to_acct, amount, voucher_date, narration FROM cash_bank_entries
       WHERE upper(from_acct)='CASH ACCOUNT' OR upper(to_acct)='CASH ACCOUNT' ORDER BY id`);
    for (const x of cbe.rows) {
      const d = iso(x.voucher_date);
      const isIn = String(x.to_acct).toUpperCase() === 'CASH ACCOUNT';
      all.push({ date: d ?? '', particulars: `${x.vouch_type || 'Entry'} [${x.ref_no || ''}] ${isIn ? String(x.from_acct || '') : String(x.to_acct || '')}`.trim(), dr: isIn ? num(x.amount) : 0, cr: isIn ? 0 : num(x.amount), _w: within(d) } as LedgerEntry & { _w: string });
    }
    const cashIn = await pool.query(
      `SELECT t.voucher_date, t.amount, s.customer, s.inv_no FROM transactions t LEFT JOIN sales s ON s.id=t.entry_id AND t.module='Sale'
       WHERE t.txn_type='Receipt' AND t.pay_mode='Cash' AND (t.module='Sale' OR t.module='PRM')`);
    for (const x of cashIn.rows) {
      const d = iso(x.voucher_date);
      all.push({ date: d ?? '', particulars: `${x.customer || 'Receipt'} [${x.inv_no || 'cash'}]`, href: x.inv_no ? `/sales/${x.inv_no}` : undefined, ref: String(x.inv_no || ''), dr: num(x.amount), cr: 0, _w: within(d) } as LedgerEntry & { _w: string });
    }
    const cashOut = await pool.query(
      `SELECT t.voucher_date, t.amount, t.module, p.supplier, p.po_no, p.id AS pid FROM transactions t
       LEFT JOIN purchases p ON p.id=t.entry_id AND t.module='Purchase'
       WHERE t.txn_type='Payment' AND t.pay_mode='Cash'`);
    for (const x of cashOut.rows) {
      const d = iso(x.voucher_date);
      all.push({ date: d ?? '', particulars: `${x.module} payment ${x.supplier ? `- ${x.supplier}` : ''} [${x.po_no || 'cash'}]`, href: x.pid ? `/purchases/view/${x.pid}` : undefined, ref: String(x.po_no || ''), dr: 0, cr: num(x.amount), _w: within(d) } as LedgerEntry & { _w: string });
    }
  } else if (type === 'BANK ACCOUNTS') {
    const cbe = await pool.query(
      `SELECT ref_no, vouch_type, from_acct, to_acct, amount, voucher_date FROM cash_bank_entries
       WHERE upper(from_acct)=upper($1) OR upper(to_acct)=upper($1) ORDER BY id`, [name]);
    for (const x of cbe.rows) {
      const d = iso(x.voucher_date);
      const isIn = String(x.to_acct).toUpperCase() === String(name).toUpperCase();
      all.push({ date: d ?? '', particulars: `${x.vouch_type || 'Entry'} [${x.ref_no || ''}]`, dr: isIn ? num(x.amount) : 0, cr: isIn ? 0 : num(x.amount), _w: within(d) } as LedgerEntry & { _w: string });
    }
  } else if (type === 'SALES') {
    const sales = await pool.query('SELECT inv_no, inv_date, customer, total FROM sales ORDER BY inv_date NULLS LAST, id');
    for (const s of sales.rows) {
      const d = iso(s.inv_date);
      all.push({ date: d ?? '', particulars: `${s.customer || 'Sale'} [${s.inv_no}]`, href: `/sales/${s.inv_no}`, ref: String(s.inv_no), dr: 0, cr: num(s.total), _w: within(d) } as LedgerEntry & { _w: string });
    }
  } else if (type === 'PURCHASE') {
    const ps = await pool.query('SELECT id, po_no, inv_no, purchase_date, supplier, total FROM purchases ORDER BY purchase_date NULLS LAST, id');
    for (const s of ps.rows) {
      const d = iso(s.purchase_date);
      all.push({ date: d ?? '', particulars: `${s.supplier || 'Purchase'} [${s.po_no || s.inv_no}]`, href: `/purchases/view/${s.id}`, ref: String(s.po_no || s.inv_no), dr: num(s.total), cr: 0, _w: within(d) } as LedgerEntry & { _w: string });
    }
  } else if (type === 'OFFICE EXPENSE') {
    const ex = await pool.query('SELECT id, bill_date, supplier, remarks, total FROM expenses WHERE category=$1 ORDER BY bill_date NULLS LAST, id', [name]);
    for (const s of ex.rows) {
      const d = iso(s.bill_date);
      all.push({ date: d ?? '', particulars: `Expense ${s.supplier ? `- ${s.supplier}` : ''} [${s.remarks || `EXP${s.id}`}]`.trim(), dr: num(s.total), cr: 0, _w: within(d) } as LedgerEntry & { _w: string });
    }
    const r = await pool.query(
      `SELECT t.voucher_date, t.amount FROM transactions t JOIN expenses e ON e.id=t.entry_id
       WHERE t.module='Expense' AND t.txn_type='Payment' AND e.category=$1`, [name]);
    for (const x of r.rows) {
      const d = iso(x.voucher_date);
      all.push({ date: d ?? '', particulars: 'Expense payment', dr: 0, cr: num(x.amount), _w: within(d) } as LedgerEntry & { _w: string });
    }
  }

  const dated = (all as (LedgerEntry & { _w: string })[]).filter((e) => e._w !== 'skip');
  let opening = 0;
  for (const e of dated) if (e._w === 'before') opening += e.dr - e.cr;
  const entries = dated.filter((e) => e._w === 'in').sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const drTotal = entries.reduce((a, e) => a + e.dr, 0);
  const crTotal = entries.reduce((a, e) => a + e.cr, 0);
  const closing = opening + drTotal - crTotal;
  return { entries, opening, drTotal, crTotal, closing };
}

export const inrFmt = (n: number) =>
  'Rs ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
