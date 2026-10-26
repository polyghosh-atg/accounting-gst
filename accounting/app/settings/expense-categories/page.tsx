import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, fieldCls } from '@/components/ui';
import { AddButton, RowButtons, TableShell, SearchBar } from '@/components/settings-modals';
import { addExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from '../actions';

type Cat = { id: number; name: string; description: string; type: string };

function CatFields({ c }: { c?: Cat }) {
  return (
    <>
      <input name="name" required defaultValue={c?.name || ''} placeholder="Expense Category Name *" className={fieldCls} />
      <input name="description" defaultValue={c?.description || ''} placeholder="Description" className={fieldCls} />
      <input name="type" defaultValue={c?.type || ''} placeholder="Type (e.g. OFFICE EXPENSE)" className={fieldCls} />
    </>
  );
}

export default function ExpenseCategories({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader title="Expense Category" sub="Heads used on expense bills" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const rows = await q<Cat>(
    query ? 'SELECT * FROM expense_categories WHERE name ILIKE $1 OR type ILIKE $1 ORDER BY name' : 'SELECT * FROM expense_categories ORDER BY name',
    query ? [`%${query}%`] : []
  );
  return (
    <>
      <SearchBar query={query} count={rows.length} noun="categories">
        {query && <a href="/settings/expense-categories" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <AddButton label="+ Add Category" title="Add Expense Category" action={addExpenseCategory}><CatFields /></AddButton>
      </SearchBar>
      <TableShell heads={['Expense Category Name', 'Description', 'Type', '']}>
        {rows.map((c) => (
          <tr key={c.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="px-3 py-2 font-bold text-slate-900">{c.name}</td>
            <td className="px-3 py-2 text-slate-600">{c.description || '—'}</td>
            <td className="px-3 py-2 text-slate-600">{c.type || '—'}</td>
            <td className="px-3 py-2">
              <RowButtons idName="category_id" id={c.id} editTitle={`Edit ${c.name}`}
                delText={`Remove category "${c.name}"? Expenses keep its name as plain text.`}
                editAction={updateExpenseCategory} delAction={deleteExpenseCategory}><CatFields c={c} /></RowButtons>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">No categories found</td></tr>}
      </TableShell>
    </>
  );
}
