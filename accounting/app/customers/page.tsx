import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import { AddCustomerButton, CustomerButtons, type Customer } from '@/components/customer-modals';

export default function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader
        title="Customers"
        sub="Billing & shipping details with GSTIN"
        actions={<AddCustomerButton />}
      />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const like = `%${query}%`;
  const rows = await q<Customer>(
    query
      ? `SELECT * FROM customers WHERE company_name ILIKE $1 OR gstin ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR city ILIKE $1 OR state ILIKE $1 ORDER BY id LIMIT 200`
      : `SELECT * FROM customers ORDER BY id`,
    query ? [like] : []
  );
  return (
    <>
      <form method="GET" className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <input
          name="q" defaultValue={query} placeholder="Search name, GSTIN, email, phone, city..."
          className="min-w-52 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Search</button>
        {query && <a href="/customers" className="text-sm font-semibold text-indigo-700 hover:underline">Clear ({rows.length})</a>}
      </form>

      {/* mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {rows.length === 0 && <div className="rounded-2xl border bg-white px-3 py-8 text-center text-sm text-slate-400">No customers found</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <a href={`/customers/${r.id}`} className="truncate font-bold text-slate-900">{r.company_name}</a>
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{r.gstin || 'no GSTIN'}</div>
            <div className="mt-0.5 truncate text-xs text-slate-500">{[r.email, r.phone].filter(Boolean).join(' · ')}</div>
            <div className="mt-0.5 truncate text-xs text-slate-400">{[r.city, r.state, r.country].filter(Boolean).join(', ')}</div>
            <div className="mt-2 border-t border-slate-100 pt-2"><CustomerButtons c={r} compact /></div>
          </div>
        ))}
      </div>

      {/* desktop table */}
      <div className="slim-scroll hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] md:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>{['Customer Name', 'GSTIN', 'Email', 'Phone', 'City', 'State', 'Action'].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide text-slate-800">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No customers found</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">{r.company_name}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600">{r.gstin || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.email || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.phone || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.city || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.state || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2"><CustomerButtons c={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">{rows.length} customers{query ? ` matching “${query}”` : ''}</p>
    </>
  );
}
