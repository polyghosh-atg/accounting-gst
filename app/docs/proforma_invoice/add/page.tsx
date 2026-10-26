import { q } from '@/lib/db';
import { PageHeader } from '@/components/ui';
import { AddForm } from './form';

export default async function AddProforma() {
  const [custs, prods] = await Promise.all([
    q<{ company_name: string }>('SELECT company_name FROM customers ORDER BY company_name'),
    q<{ name: string }>('SELECT DISTINCT name FROM products ORDER BY name'),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="❄ Add Proforma Invoice" sub="Header + line items · totals auto-calculated" actions={
        <a href="/docs/proforma_invoice" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700">← Back to list</a>
      } />
      <AddForm
        customers={custs.map((x) => String(x.company_name)).filter(Boolean)}
        products={prods.map((x) => String(x.name)).filter(Boolean)}
      />
    </div>
  );
}
