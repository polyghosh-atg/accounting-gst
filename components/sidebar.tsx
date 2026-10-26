'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Icon, Modal, fieldCls } from './ui';
import { logoutUser } from '@/lib/auth';
import { setActiveFinancialYear, addFinancialYear } from '@/lib/fy';

export type FyYear = { id: number; label: string; start_year: number; end_year: number; is_active: boolean };

const shortFy = (label: string) => {
  const [a, b] = label.split('-');
  return b && b.length === 4 ? `${a}-${b.slice(2)}` : label;
};

function FyModal({ years, onClose }: { years: FyYear[]; onClose: () => void }) {
  const active = years.find((f) => f.is_active);
  return (
    <Modal title="Financial Year" sub={active ? `Active: FY ${active.label}` : 'Pick the active year'} onClose={onClose}>
      <div className="space-y-1.5">
        {years.map((f) => (
          <div key={f.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-sm font-bold text-slate-900">FY {f.label}</span>
            {f.is_active ? (
              <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">Active</span>
            ) : (
              <form action={async (fd) => { await setActiveFinancialYear(fd); }} className="ml-auto">
                <input type="hidden" name="fy_id" value={f.id} />
                <button className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700">
                  Set Active
                </button>
              </form>
            )}
          </div>
        ))}
        {years.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No years yet — add one below.</p>}
      </div>
      <form action={async (fd) => { await addFinancialYear(fd); }} className="mt-3 flex items-end gap-2 border-t border-slate-100 pt-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Add year (start)</label>
          <input name="start_year" required inputMode="numeric" pattern="[0-9]{4}" placeholder="e.g. 2027" className={fieldCls} />
        </div>
        <button className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white">Add</button>
      </form>
    </Modal>
  );
}

const PEOPLE: { label: string; href: string; icon: string }[] = [
  { label: 'Customers', href: '/customers', icon: 'users' },
  { label: 'Suppliers', href: '/suppliers', icon: 'users' },
  { label: 'User Roles', href: '/roles', icon: 'users' },
  { label: 'Users', href: '/users', icon: 'hr' },
];

const NAV: { label: string; href: string; icon: string }[] = [
  { label: 'Dashboard', href: '/', icon: 'dashboard' },
  { label: 'Bank & Cash', href: '/bank', icon: 'bank' },
];

const REPORT_ITEMS: { label: string; href: string; icon: string }[] = [
  { label: 'All Reports', href: '/reports', icon: 'report' },
  { label: 'Customer Payment Due', href: '/reports/customer_payment_due', icon: 'report' },
  { label: 'Supplier Payment Due', href: '/reports/supplier_payment_due', icon: 'report' },
  { label: 'Stock Value', href: '/reports/stock_value', icon: 'report' },
  { label: 'Closing Stock', href: '/reports/closing_stock', icon: 'report' },
  { label: 'Inventory Added', href: '/reports/inventory_product_added', icon: 'report' },
  { label: 'Receivable', href: '/reports/receivable', icon: 'report' },
  { label: 'Payable', href: '/reports/payable', icon: 'report' },
  { label: 'GSTR1', href: '/reports/gstr1', icon: 'report' },
  { label: 'GSTR2', href: '/reports/gstr2', icon: 'report' },
  { label: 'HSN Sale', href: '/reports/hsn_sale', icon: 'report' },
  { label: 'HSN Purchase', href: '/reports/hsn_purchase', icon: 'report' },
  { label: 'Stock', href: '/reports/stock', icon: 'report' },
  { label: 'Product Detail', href: '/reports/product', icon: 'report' },
  { label: 'Product Sale', href: '/reports/product_sale', icon: 'report' },
  { label: 'Product Purchase', href: '/reports/product_purchase', icon: 'report' },
  { label: 'Sales', href: '/reports/sale', icon: 'report' },
  { label: 'Sales Return', href: '/reports/sales_return', icon: 'report' },
  { label: 'Purchase', href: '/reports/purchase', icon: 'report' },
  { label: 'Purchase Return', href: '/reports/purchase_return', icon: 'report' },
  { label: 'Expense', href: '/reports/expense', icon: 'report' },
  { label: 'Ledger', href: '/reports/ledger', icon: 'report' },
  { label: 'Transaction', href: '/reports/transaction', icon: 'report' },
];

const SETTINGS_ITEMS: { label: string; href: string; icon: string }[] = [
  { label: 'All Settings', href: '/settings', icon: 'key' },
  { label: 'Company Settings', href: '/settings/company', icon: 'key' },
  { label: 'Custom Settings', href: '/settings/custom', icon: 'doc' },
  { label: 'Email Template', href: '/settings/email-templates', icon: 'doc' },
  { label: 'Whatsapp Template', href: '/settings/whatsapp-templates', icon: 'doc' },
  { label: 'Expense Category', href: '/settings/expense-categories', icon: 'expense' },
  { label: 'Item', href: '/settings/items', icon: 'box' },
  { label: 'Tax', href: '/settings/taxes', icon: 'doc' },
  { label: 'Discounts', href: '/settings/discounts', icon: 'sales' },
  { label: 'Currency', href: '/settings/currencies', icon: 'bank' },
  { label: 'Email Configuration', href: '/settings/email', icon: 'doc' },
  { label: 'History Logs', href: '/settings/logs', icon: 'report' },
];

const TRANSACTION: { label: string; href: string; icon: string }[] = [
  { label: 'Purchase Order', href: '/docs/purchase_order', icon: 'doc' },
  { label: 'Purchase', href: '/purchases', icon: 'purchases' },
  { label: 'Purchase Return', href: '/docs/purchase_return', icon: 'transfer' },
  { label: 'Transfer', href: '/docs/transfer', icon: 'transfer' },
  { label: 'Quotation', href: '/docs/quotation', icon: 'doc' },
  { label: 'Proforma Invoice', href: '/docs/proforma_invoice', icon: 'doc' },
  { label: 'Sales', href: '/sales', icon: 'sales' },
  { label: 'Sales Return', href: '/docs/sales_return', icon: 'transfer' },
  { label: 'Credit Debit Note', href: '/docs/credit-debit-note', icon: 'doc' },
];

function NavItem({ n, active, onNav }: { n: { label: string; href: string; icon: string }; active: boolean; onNav?: () => void }) {
  return (
    <Link
      href={n.href}
      onClick={onNav}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
          : 'text-indigo-100/80 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon name={n.icon} className="h-[18px] w-[18px] shrink-0 opacity-90" />
      {n.label}
    </Link>
  );
}

const ACCOUNT: { label: string; href: string; icon: string }[] = [
  { label: 'Cash Bank Entry', href: '/account/cash-bank', icon: 'bank' },
  { label: 'Bank Statement', href: '/account/bank-statement', icon: 'doc' },
  { label: 'PDC Receive', href: '/account/pdc-receive', icon: 'sales' },
  { label: 'PDC Payment', href: '/account/pdc-payment', icon: 'purchases' },
  { label: 'Scrap Entry', href: '/account/scrap-entry', icon: 'box' },
  { label: 'Scrap Issue', href: '/account/scrap-issue', icon: 'box' },
  { label: 'Scrap Receive', href: '/account/scrap-receive', icon: 'box' },
  { label: 'Expenses', href: '/expenses', icon: 'expense' },
];

const INVENTORY: { label: string; href: string; icon: string }[] = [  { label: 'Warehouse', href: '/inventory/warehouses', icon: 'bank' },
  { label: 'Product Category', href: '/inventory/categories', icon: 'doc' },
  { label: 'Add Product', href: '/products', icon: 'plus' },
  { label: 'All Products', href: '/products', icon: 'box' },
  { label: 'All Scrap Products', href: '/inventory/scrap-products', icon: 'box' },
  { label: 'Stock Entry', href: '/stock', icon: 'transfer' },
];

function Group({ title, icon, items, path, onNav }: {
  title: string; icon: string; items: { label: string; href: string; icon: string }[]; path: string; onNav?: () => void;
}) {
  const hasActive = items.some((n) => path === n.href || path.startsWith(n.href + '/'));
  const [open, setOpen] = useState(hasActive);
  return (
    <div className="overflow-hidden rounded-xl">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold tracking-wide transition ${
          hasActive ? 'bg-white/15 text-white' : 'text-indigo-100 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon name={icon} className="h-[18px] w-[18px] shrink-0 opacity-90" />
        {title}
        <span className={`ml-auto text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/15 pl-2">
          {items.map((n) => (
            <NavItem key={n.href + n.label} n={n} onNav={onNav} active={path === n.href || path.startsWith(n.href + '/')} />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountGroup({ path, onNav }: { path: string; onNav?: () => void }) {  const hasActive = ACCOUNT.some((n) => path === n.href || path.startsWith(n.href + '/'));
  const [open, setOpen] = useState(hasActive);
  return (
    <div className="overflow-hidden rounded-xl">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold tracking-wide transition ${
          hasActive ? 'bg-white/15 text-white' : 'text-indigo-100 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon name="bank" className="h-[18px] w-[18px] shrink-0 opacity-90" />
        ACCOUNT
        <span className={`ml-auto text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/15 pl-2">
          {ACCOUNT.map((n) => (
            <NavItem key={n.href} n={n} onNav={onNav} active={path === n.href || path.startsWith(n.href + '/')} />
          ))}
        </div>
      )}
    </div>
  );
}

function PeopleGroup({ path, onNav }: { path: string; onNav?: () => void }) {
  const hasActive = PEOPLE.some((n) => path === n.href || path.startsWith(n.href + '/'));
  const [open, setOpen] = useState(hasActive);
  return (
    <div className="overflow-hidden rounded-xl">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold tracking-wide transition ${
          hasActive ? 'bg-white/15 text-white' : 'text-indigo-100 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon name="users" className="h-[18px] w-[18px] shrink-0 opacity-90" />
        PEOPLE
        <span className={`ml-auto text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/15 pl-2">
          {PEOPLE.map((n) => (
            <NavItem key={n.href} n={n} onNav={onNav} active={path === n.href || path.startsWith(n.href + '/')} />
          ))}
        </div>
      )}
    </div>
  );
}

function NavList({ onNav }: { onNav?: () => void }) {
  return (
    <Suspense fallback={<NavLinks active="" onNav={onNav} />}>
      <NavLinksActive onNav={onNav} />
    </Suspense>
  );
}

function NavLinksActive({ onNav }: { onNav?: () => void }) {
  const path = usePathname();
  return <NavLinks active={path} onNav={onNav} />;
}

function NavLinks({ active, onNav }: { active: string; onNav?: () => void }) {
  const top = NAV.filter((n) => n.href === '/' || n.href === '/bank');
  const rest = NAV.filter((n) => n.href !== '/' && n.href !== '/bank');
  return (
    <nav className="space-y-0.5">
      {top.map((n) => (
        <NavItem key={n.href} n={n} onNav={onNav} active={active === n.href} />
      ))}
      <PeopleGroup path={active} onNav={onNav} />
      <AccountGroup path={active} onNav={onNav} />
      <Group title="TRANSACTION" icon="transfer" items={TRANSACTION} path={active} onNav={onNav} />
      <Group title="REPORTS" icon="report" items={REPORT_ITEMS} path={active} onNav={onNav} />
      <Group title="INVENTORY" icon="box" items={INVENTORY} path={active} onNav={onNav} />
      <Group title="SETTINGS" icon="key" items={SETTINGS_ITEMS} path={active} onNav={onNav} />
      {rest.map((n) => (
        <NavItem
          key={n.href}
          n={n}
          onNav={onNav}
          active={active === n.href || active.startsWith(n.href + '/')}
        />
      ))}
    </nav>
  );
}

export default function Sidebar({ user, fyYears }: { user?: { username: string; role: string }; fyYears: FyYear[] }) {
  const [open, setOpen] = useState(false);
  const [fyOpen, setFyOpen] = useState(false);
  const activeFy = fyYears.find((f) => f.is_active)?.label ?? '';
  return (
    <>
      {/* top bar (mobile menu button lives here) */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 py-2.5 backdrop-blur print:hidden lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
          Office ERP
        </span>
        <button onClick={() => setFyOpen(true)} title="Change financial year" className="ml-auto rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-100">FY {shortFy(activeFy)}</button>      </header>

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[290px] shrink-0 flex-col bg-gradient-to-b from-indigo-950 via-indigo-900 to-violet-950 p-4 text-white print:hidden lg:flex">
        <div className="mb-1 px-2">
          <div className="text-xl font-extrabold tracking-tight">Office<span className="text-violet-300"> ERP</span></div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-widest text-indigo-300/80">Accounting · GST</div>
        </div>
        <button onClick={() => setFyOpen(true)} title="Change financial year" className="my-3 w-full rounded-xl bg-white/10 px-3 py-2 text-left text-xs font-semibold text-indigo-100 ring-1 ring-inset ring-white/15 transition hover:bg-white/20">FY {activeFy}</button>
        <div className="slim-scroll flex-1 overflow-y-auto pr-1"><NavList /></div>
        {user && (
          <form action={logoutUser} className="mt-3 rounded-xl bg-white/10 p-3 text-white ring-1 ring-inset ring-white/15">
            <div className="truncate text-xs font-bold">{user.username}</div>
            <div className="truncate text-[11px] text-indigo-200/80">{user.role || 'User'}</div>
            <button className="mt-2 w-full rounded-lg bg-white/15 px-2 py-1.5 text-xs font-bold transition hover:bg-white/25">
              Sign Out
            </button>
          </form>
        )}
        <div className="mt-3 rounded-xl bg-white/10 p-3 text-[11px] leading-relaxed text-indigo-100/80 ring-1 ring-inset ring-white/15">
          Cloned data from vaksys.com/pro · 2026
        </div>
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="modal-pop absolute left-0 top-0 flex h-full w-72 flex-col bg-gradient-to-b from-indigo-950 via-indigo-900 to-violet-950 p-4 text-white shadow-2xl">
            <div className="mb-3 flex items-center justify-between px-2">
              <div className="text-lg font-extrabold">Office<span className="text-violet-300"> ERP</span></div>
              <button onClick={() => setOpen(false)} className="rounded-lg bg-white/10 px-2.5 py-1 text-lg leading-none" aria-label="Close menu">×</button>
            </div>
            <div className="slim-scroll flex-1 overflow-y-auto pr-1"><NavList onNav={() => setOpen(false)} /></div>
          </aside>
        </div>
      )}

      {fyOpen && <FyModal years={fyYears} onClose={() => setFyOpen(false)} />}
    </>
  );
}
