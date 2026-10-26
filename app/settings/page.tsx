import { Suspense } from 'react';
import Link from 'next/link';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';

const CARDS = [
  { href: '/settings/company', title: 'Company Settings', desc: 'Name, address, GSTIN, bank, FY & doc prefixes', table: null },
  { href: '/settings/custom', title: 'Custom Settings', desc: 'Extra fields per module', table: 'custom_fields' },
  { href: '/settings/email-templates', title: 'Email Template', desc: 'Invoice, reminder & order mails', table: 'email_templates' },
  { href: '/settings/whatsapp-templates', title: 'Whatsapp Template', desc: 'Order & payment messages', table: 'whatsapp_templates' },
  { href: '/settings/expense-categories', title: 'Expense Category', desc: 'Office, travel & other heads', table: 'expense_categories' },
  { href: '/settings/items', title: 'Item', desc: 'Named items with tax mapping', table: 'items' },
  { href: '/settings/taxes', title: 'Tax', desc: 'SGST / CGST / IGST masters', table: 'taxes' },
  { href: '/settings/discounts', title: 'Discounts', desc: 'Percentage & flat offers with validity', table: 'discounts' },
  { href: '/settings/currencies', title: 'Currency', desc: 'Billing currencies & symbols', table: 'currencies' },
  { href: '/settings/email', title: 'Email Configuration', desc: 'SMTP host, port & credentials', table: null },
  { href: '/settings/logs', title: 'History Logs', desc: 'Who changed what, and when', table: 'activity_logs' },
];

export default function Settings() {
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" sub="Company profile, masters, templates & activity history" />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const counts: Record<string, number> = {};
  await Promise.all(CARDS.filter((c) => c.table).map(async (c) => {
    try {
      const r = await q(`SELECT count(*) n FROM ${c.table}`);
      counts[c.table!] = Number(r[0].n);
    } catch { counts[c.table!] = 0; }
  }));
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {CARDS.map((c, i) => (
        <Link
          key={c.href}
          href={c.href}
          className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:border-indigo-300 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-extrabold text-white">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="font-bold text-slate-900 group-hover:text-indigo-800">{c.title} →</span>
            {c.table && (
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-600">
                {counts[c.table] ?? 0}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{c.desc}</p>
        </Link>
      ))}
    </div>
  );
}
