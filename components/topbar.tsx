'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
export type Acct = { id: number; name: string; bank_name: string; closing: string };

function Drop({ label, children, tone = '' }: {
  label: React.ReactNode; children: (close: () => void) => React.ReactNode; tone?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-sm transition ${tone || 'border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700'}`}
      >
        {label} <span className="text-[10px] opacity-70">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute right-0 z-50 mt-1.5 max-h-[70vh] w-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {children(close)}
          </div>
        </>
      )}
    </div>
  );
}

function Item({ href, children, soon, onClick }: { href?: string; children: React.ReactNode; soon?: boolean; onClick?: () => void }) {
  if (soon) {
    return (
      <span className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-400">
        {children}<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold">soon</span>
      </span>
    );
  }
  return (
    <a href={href} onClick={onClick} className="block px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-800">
      {children}
    </a>
  );
}

const REPORTS: { label: string; href: string }[] = [
  { label: 'Customer Payment Due', href: '/reports/customer_payment_due' },
  { label: 'Supplier Payment Due', href: '/reports/supplier_payment_due' },
  { label: 'Stock Value', href: '/reports/stock_value' },
  { label: 'Closing Stock', href: '/reports/closing_stock' },
  { label: 'Inventory Product Added', href: '/reports/inventory_product_added' },
  { label: 'Receivable', href: '/reports/receivable' },
  { label: 'Payable', href: '/reports/payable' },
  { label: 'GSTR1', href: '/reports/gstr1' },
  { label: 'GSTR2', href: '/reports/gstr2' },
  { label: 'HSN Sale', href: '/reports/hsn_sale' },
  { label: 'HSN Purchase', href: '/reports/hsn_purchase' },
  { label: 'Stock', href: '/reports/stock' },
  { label: 'Product Detail', href: '/reports/product' },
  { label: 'Product Sale', href: '/reports/product_sale' },
  { label: 'Product Purchase', href: '/reports/product_purchase' },
  { label: 'Sales', href: '/reports/sale' },
  { label: 'Sales Return', href: '/reports/sales_return' },
  { label: 'Purchase', href: '/reports/purchase' },
  { label: 'Purchase Return', href: '/reports/purchase_return' },
  { label: 'Expense', href: '/reports/expense' },
  { label: 'Ledger', href: '/reports/ledger' },
  { label: 'Transaction', href: '/reports/transaction' },
];

const ADD: { label: string; href?: string }[] = [
  { label: 'Purchase Order', href: '/docs/purchase_order' },
  { label: 'Purchase', href: '/purchases' },
  { label: 'Purchase Return', href: '/docs/purchase_return' },
  { label: 'Transfer', href: '/docs/transfer' },
  { label: 'Quotation', href: '/docs/quotation' },
  { label: 'Proforma Invoice', href: '/docs/proforma_invoice' },
  { label: 'Sale', href: '/sales' },
  { label: 'Credit Debit Note', href: '/docs/credit-debit-note' },
  { label: 'Expense', href: '/expenses' },
];

type SiteLink = { label: string; href?: string };
const SITEMAP: { head: string; links: SiteLink[] }[] = [
  { head: 'PEOPLE', links: [
    { label: 'User Roles', href: '/roles' }, { label: 'Users', href: '/users' },
    { label: 'Customers', href: '/customers' }, { label: 'Suppliers', href: '/suppliers' },
  ]},
  { head: 'ACCOUNT', links: [
    { label: 'Cash Bank Entry', href: '/account/cash-bank' }, { label: 'Bank Statement', href: '/account/bank-statement' },
    { label: 'PDC Receive', href: '/account/pdc-receive' }, { label: 'PDC Payment', href: '/account/pdc-payment' },
    { label: 'Scrap Entry', href: '/account/scrap-entry' }, { label: 'Scrap Issue', href: '/account/scrap-issue' },
    { label: 'Scrap Receive', href: '/account/scrap-receive' },
  ]},
  { head: 'INVENTORY', links: [
    { label: 'Promotion' }, { label: 'Warehouse', href: '/inventory/warehouses' },
    { label: 'Product Category', href: '/inventory/categories' }, { label: 'Add Product', href: '/products' },
    { label: 'All Products', href: '/products' }, { label: 'All Scrap Products', href: '/inventory/scrap-products' },
    { label: 'Stock Entry', href: '/stock' },
  ]},
  { head: 'TRANSACTION', links: [
    { label: 'Sale', href: '/sales' }, { label: 'Purchase Order', href: '/docs/purchase_order' },
    { label: 'Purchase', href: '/purchases' }, { label: 'Purchase Return', href: '/docs/purchase_return' },
    { label: 'Transfer', href: '/docs/transfer' }, { label: 'Quotation', href: '/docs/quotation' },
    { label: 'Proforma Invoice', href: '/docs/proforma_invoice' }, { label: 'Sales Return', href: '/docs/sales_return' },
    { label: 'Credit Debit Note', href: '/docs/credit-debit-note' }, { label: 'Expense', href: '/expenses' },
  ]},
  { head: 'REPORTS', links: [
    { label: 'Customer Payment Due', href: '/reports/customer_payment_due' }, { label: 'Supplier Payment Due', href: '/reports/supplier_payment_due' },
    { label: 'Stock Value', href: '/reports/stock_value' }, { label: 'Closing Stock', href: '/reports/closing_stock' },
    { label: 'Inventory Product Added', href: '/reports/inventory_product_added' }, { label: 'Receivable', href: '/reports/receivable' },
    { label: 'Payable', href: '/reports/payable' }, { label: 'GSTR1', href: '/reports/gstr1' }, { label: 'GSTR2', href: '/reports/gstr2' },
    { label: 'HSN Sale', href: '/reports/hsn_sale' }, { label: 'HSN Purchase', href: '/reports/hsn_purchase' }, { label: 'Stock', href: '/reports/stock' },
    { label: 'Product Detail', href: '/reports/product' }, { label: 'Product Sale', href: '/reports/product_sale' },
    { label: 'Product Purchase', href: '/reports/product_purchase' }, { label: 'Sales', href: '/reports/sale' },
    { label: 'Sales Return', href: '/reports/sales_return' }, { label: 'Purchase', href: '/reports/purchase' },
    { label: 'Purchase Return', href: '/reports/purchase_return' }, { label: 'Expense', href: '/reports/expense' },
    { label: 'Ledger', href: '/reports/ledger' }, { label: 'Transaction', href: '/reports/transaction' },
  ]},
  { head: 'SETTINGS', links: [
    { label: 'Company Settings', href: '/settings/company' }, { label: 'Custom Settings', href: '/settings/custom' },
    { label: 'Email Template', href: '/settings/email-templates' }, { label: 'Whatsapp Template', href: '/settings/whatsapp-templates' },
    { label: 'GST Live Rates', href: '/settings/gst-rates' },
    { label: 'Expense Category', href: '/settings/expense-categories' }, { label: 'Item', href: '/settings/items' },
    { label: 'Tax', href: '/settings/taxes' }, { label: 'Discount', href: '/settings/discounts' },
    { label: 'Currency', href: '/settings/currencies' },
  ]},
];

function Calculator() {
  const [disp, setDisp] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const calc = (a: number, b: number, o: string) => {
    if (o === '+') return a + b;
    if (o === '−') return a - b;
    if (o === '×') return a * b;
    if (o === '÷') return b === 0 ? NaN : a / b;
    return b;
  };
  const fmt = (r: number) => (isNaN(r) ? 'Error' : String(Math.round(r * 1e10) / 1e10));

  const digit = (d: string) => {
    if (disp === 'Error' || fresh) { setDisp(d === '.' ? '0.' : d); setFresh(false); }
    else if (!(d === '.' && disp.includes('.'))) setDisp(disp === '0' && d !== '.' ? d : disp + d);
  };

  const setOperator = (o: string) => {
    const v = parseFloat(disp);
    if (acc !== null && op && !fresh) {
      const r = calc(acc, v, op);
      setAcc(isNaN(r) ? null : r); setDisp(fmt(r));
    } else setAcc(v);
    setOp(o); setFresh(true);
  };

  const equals = () => {
    if (acc === null || !op) return;
    const r = calc(acc, parseFloat(disp), op);
    setDisp(fmt(r));
    setAcc(null); setOp(null); setFresh(true);
  };

  const clear = () => { setDisp('0'); setAcc(null); setOp(null); setFresh(true); };
  const back = () => { setDisp(disp.length > 1 && disp !== 'Error' ? disp.slice(0, -1) : '0'); };

  const press = (k: string) => {
    if (k === 'C') clear();
    else if (k === '⌫') back();
    else if (k === '%') { setDisp(fmt(parseFloat(disp) / 100)); setFresh(true); }
    else if (k === '=') equals();
    else if (['+', '−', '×', '÷'].includes(k)) setOperator(k);
    else digit(k);
  };

  // physical keyboard: 0-9 . + - * / % Enter(=) Backspace Esc(C)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[0-9.]$/.test(k)) press(k);
      else if (k === '+') press('+');
      else if (k === '-') press('−');
      else if (k === '*') press('×');
      else if (k === '/') { press('÷'); e.preventDefault(); }
      else if (k === '%') press('%');
      else if (k === 'Enter' || k === '=') { press('='); e.preventDefault(); }
      else if (k === 'Backspace') press('⌫');
      else if (k === 'Escape') press('C');
      else return;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const keys: string[] = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '='];
  return (
    <div>
      <div className="mb-1.5 overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-2.5 py-1.5 text-right shadow-inner ring-1 ring-white/10">
        <div className="h-3.5 truncate text-[10px] tabular-nums text-indigo-300">
          {acc !== null && op ? `${acc} ${op}` : ' '}
        </div>
        <div className="truncate text-xl font-extrabold leading-tight tabular-nums text-white">{disp}</div>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className={`rounded-lg py-1.5 text-xs font-bold shadow-sm transition active:scale-95 ${
              k === '='
                ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 hover:opacity-95'
                : ['÷', '×', '−', '+'].includes(k)
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100 hover:bg-indigo-100'
                  : k === 'C'
                    ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100 hover:bg-rose-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-center text-[10px] text-slate-400">Keyboard: Enter = · Esc = C</p>
    </div>
  );
}

export default function Topbar({ cash, accounts }: { cash: string; accounts: Acct[] }) {
  const [calcOpen, setCalcOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-2 sm:px-6">
        <Drop label={<>📊 REPORTS</>}>
          {(close) => <>{REPORTS.map((r) => <Item key={r.label} href={r.href} soon={!r.href} onClick={close}>{r.label}</Item>)}</>}
        </Drop>
        <button
          onClick={() => setMenuOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
        >
          🧭 GO TO →
        </button>
        <Drop label={<>＋ ADD</>}>
          {(close) => <>{ADD.map((a) => <Item key={a.label} href={a.href} soon={!a.href} onClick={close}>{a.label}</Item>)}</>}
        </Drop>
        <button
          onClick={() => setCalcOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold text-amber-950 shadow-sm transition hover:bg-amber-300"
        >
          🧮 Calculator
        </button>
        <div className="ml-auto shrink-0">
          <Drop
            label={<>💰 Cash on Hand: <span className="tabular-nums">{cash}</span></>}
            tone="bg-lime-200 text-lime-950 hover:bg-lime-100"
          >
            {(close) => (
              <>
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Account Balance</div>
                {accounts.map((a) => (
                  <a key={a.id} href={`/bank/${a.id}`} onClick={close} className="block border-t border-slate-100 px-3 py-1.5 transition hover:bg-indigo-50">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-slate-800">{a.name}</span>
                      <span className="shrink-0 tabular-nums text-slate-500">{a.closing}</span>
                    </div>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400" />
                    </div>
                    <div className="text-[11px] text-slate-400">{a.bank_name}</div>
                  </a>
                ))}
              </>
            )}
          </Drop>
        </div>
      </div>

      {mounted && menuOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6" onClick={() => setMenuOpen(false)} role="dialog" aria-modal="true" aria-label="Menu">
          <div className="modal-pop my-4 w-full max-w-5xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">Menu</h3>
              <button onClick={() => setMenuOpen(false)} className="rounded-lg bg-slate-100 px-2.5 py-1 text-lg leading-none text-slate-500 hover:bg-slate-200" aria-label="Close">×</button>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { label: '📊 DASHBOARD', href: '/' },
                { label: '🏦 BANK ACCOUNT', href: '/bank' },
              ].map((b) => (
                <a key={b.href + b.label} href={b.href} className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-3 py-2.5 text-center text-sm font-bold text-indigo-800 transition hover:border-indigo-400 hover:bg-indigo-50">
                  {b.label}
                </a>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {SITEMAP.map((col) => (
                <div key={col.head} className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="bg-slate-100 px-2.5 py-1.5 text-[11px] font-extrabold tracking-wider text-slate-700">{col.head}</div>
                  <ul className="divide-y divide-slate-100">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        {l.href ? (
                          <a href={l.href} className="block px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-800">
                            {l.label}
                          </a>
                        ) : (
                          <span className="flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-400">
                            {l.label}<span className="rounded bg-slate-100 px-1 py-px text-[10px] font-semibold">soon</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && calcOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center" onClick={() => setCalcOpen(false)}>
          <div className="modal-pop w-full max-w-[250px] rounded-2xl bg-white p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-sm font-extrabold tracking-tight text-slate-900">🧮 Calculator</h3>
              <button onClick={() => setCalcOpen(false)} className="rounded-lg bg-slate-100 px-2.5 py-1 text-lg leading-none text-slate-500 hover:bg-slate-200" aria-label="Close">×</button>
            </div>
            <Calculator />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
