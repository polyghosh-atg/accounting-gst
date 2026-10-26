import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, Badge } from '@/components/ui';
import { AddCategoryButton, CategoryButtons, type Category, type Tax } from '@/components/inventory-modals';

export default function Categories() {
  return (
    <div>
      <PageHeader title="Product Category" sub="Categories with default tax" />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const rows = await q<Category & { tax_name: string }>(
    `SELECT c.*, t.name AS tax_name FROM product_categories c LEFT JOIN taxes t ON t.id=c.tax_id ORDER BY c.name`);
  const taxes = await q<Tax>('SELECT id, name FROM taxes ORDER BY name');
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-auto text-sm text-slate-500">{rows.length} categories</span>
        <AddCategoryButton taxes={taxes} />
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-bold text-slate-900">{c.name}</span>
              <CategoryButtons c={c} taxes={taxes} />
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              {c.tax_name ? <Badge tone="blue">{c.tax_name}</Badge> : <span>No tax</span>}
              <span className="truncate">{c.description}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
