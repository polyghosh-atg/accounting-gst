import { Suspense } from 'react';
import { q, inr } from '@/lib/db';
import { PageHeader, LoadingRows, Badge, statusTone } from '@/components/ui';
import { AddProductButton, ProductButtons, type Product, type Uom } from '@/components/inventory-modals';

async function lookups() {
  const [cats, uoms] = await Promise.all([
    q<{ id: number; name: string }>('SELECT id, name FROM product_categories ORDER BY name'),
    q<Uom>('SELECT code, name FROM uoms ORDER BY name'),
  ]);
  return { categories: cats, uoms };
}

export default function Products({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div className="space-y-4">
      <PageHeader title="All Products" sub="Catalogue with cost & selling prices" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const like = `%${query}%`;
  const rows = await q<Product & { category_name: string }>(
    query
      ? `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN product_categories c ON c.id=p.category_id
         WHERE p.name ILIKE $1 OR p.hsn ILIKE $1 ORDER BY p.name LIMIT 200`
      : `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN product_categories c ON c.id=p.category_id ORDER BY p.name LIMIT 200`,
    query ? [like] : []
  );
  const { categories, uoms } = await lookups();
  return (
    <>
      <form method="GET" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <span className="mr-auto text-sm text-slate-500">{rows.length} products</span>
        <input name="q" defaultValue={query} placeholder="Search name, HSN..."
          className="w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white sm:w-52" />
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Search</button>
        {query && <a href="/products" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <AddProductButton categories={categories} uoms={uoms} />
      </form>
      <div className="space-y-2.5 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-bold">{r.name}</span>
              <Badge tone={statusTone(r.status)}>{r.status}</Badge>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">{r.category_name} · HSN {r.hsn} · {r.uom}</div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-slate-500">Cost {inr(r.cost)} · Sell {inr(r.selling_price)}</span>
              <ProductButtons p={r} categories={categories} uoms={uoms} />
            </div>
          </div>
        ))}
      </div>
      <div className="slim-scroll hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] md:block">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>{['Name', 'Category', 'HSN', 'UOM', 'Cost', 'Selling', 'MRP', 'Status', 'Action'].map((h, i) => (
              <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 ${i >= 4 && i <= 6 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                <td className="whitespace-nowrap px-3 py-2 font-semibold">{r.name}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.category_name}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.hsn}</td>
                <td className="whitespace-nowrap px-3 py-2"><Badge tone="blue">{r.uom}</Badge></td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{inr(r.cost)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{inr(r.selling_price)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{inr(r.mrp)}</td>
                <td className="whitespace-nowrap px-3 py-2"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                <td className="whitespace-nowrap px-3 py-2"><ProductButtons p={r} categories={categories} uoms={uoms} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
