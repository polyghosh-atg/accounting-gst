import { q } from '@/lib/db';
import { PageHeader } from '@/components/ui';
import { AddForm } from './form';

// Reads masters from DB — must block on the server, no static shell.
export const instant = false;

export default async function AddPurchaseOrder() {
  const [sups, whs, prods] = await Promise.all([
    q<{ company_name: string }>('SELECT company_name FROM suppliers ORDER BY company_name'),
    q<{ name: string }>('SELECT name FROM warehouses ORDER BY name'),
    q<{ name: string }>('SELECT DISTINCT name FROM products ORDER BY name'),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="＋ Add Purchase Order" sub="Header + line items · totals auto-calculated" actions={
        <a href="/docs/purchase_order" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700">← Back to list</a>
      } />
      <AddForm
        suppliers={sups.map((x) => String(x.company_name)).filter(Boolean)}
        warehouses={whs.map((x) => String(x.name)).filter(Boolean)}
        products={prods.map((x) => String(x.name)).filter(Boolean)}
      />
    </div>
  );
}
