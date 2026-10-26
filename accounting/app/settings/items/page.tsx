import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, Badge, fieldCls } from '@/components/ui';
import { AddButton, RowButtons, TableShell, SearchBar } from '@/components/settings-modals';
import { addItem, updateItem, deleteItem } from '../actions';

type Item = { id: number; item_name: string; item_description: string; tax_id: string; tax_name: string };
type Tax = { id: number; name: string };

function ItemFields({ it, taxes }: { it?: Item; taxes: Tax[] }) {
  return (
    <>
      <input name="item_name" required defaultValue={it?.item_name || ''} placeholder="Item Name *" className={fieldCls} />
      <textarea name="item_description" defaultValue={it?.item_description || ''} placeholder="Description" rows={3} className={fieldCls} />
      <select name="tax_id" defaultValue={it?.tax_id || ''} className={fieldCls}>
        <option value="">Tax *</option>
        {taxes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </>
  );
}

export default function Items({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader title="Item" sub="Named items with tax mapping" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const [rows, taxes] = await Promise.all([
    q<Item>(
      query
        ? 'SELECT i.*, t.name tax_name FROM items i LEFT JOIN taxes t ON t.id=i.tax_id WHERE i.item_name ILIKE $1 ORDER BY i.item_name'
        : 'SELECT i.*, t.name tax_name FROM items i LEFT JOIN taxes t ON t.id=i.tax_id ORDER BY i.item_name',
      query ? [`%${query}%`] : []
    ),
    q<Tax>('SELECT id, name FROM taxes ORDER BY name'),
  ]);
  return (
    <>
      <SearchBar query={query} count={rows.length} noun="items">
        {query && <a href="/settings/items" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <AddButton label="+ Add Item" title="Add Item" action={addItem}><ItemFields taxes={taxes} /></AddButton>
      </SearchBar>
      <TableShell heads={['Name', 'Description', 'Tax', '']}>
        {rows.map((it) => (
          <tr key={it.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="px-3 py-2 font-bold text-slate-900">{it.item_name}</td>
            <td className="max-w-72 truncate px-3 py-2 text-slate-600">{it.item_description || '—'}</td>
            <td className="px-3 py-2">{it.tax_name ? <Badge tone="blue">{it.tax_name}</Badge> : '—'}</td>
            <td className="px-3 py-2">
              <RowButtons idName="item_id" id={it.id} editTitle={`Edit ${it.item_name}`}
                delText={`Remove item "${it.item_name}"?`} editAction={updateItem} delAction={deleteItem}>
                <ItemFields it={it} taxes={taxes} />
              </RowButtons>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">No items found — add your first item</td></tr>}
      </TableShell>
    </>
  );
}
