import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, fieldCls } from '@/components/ui';
import { AddButton, RowButtons, TableShell, SearchBar } from '@/components/settings-modals';
import { addCurrency, updateCurrency, deleteCurrency } from '../actions';

type Cur = { id: number; name: string; symbol: string };

function CurFields({ c }: { c?: Cur }) {
  return (
    <>
      <input name="name" required defaultValue={c?.name || ''} placeholder="Currency Name *" className={fieldCls} />
      <input name="symbol" required defaultValue={c?.symbol || ''} placeholder="Symbol *" className={fieldCls} />
    </>
  );
}

export default function Currencies({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader title="Currency" sub="Billing currencies with symbols" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const rows = await q<Cur>(
    query ? 'SELECT * FROM currencies WHERE name ILIKE $1 OR symbol ILIKE $1 ORDER BY name' : 'SELECT * FROM currencies ORDER BY name',
    query ? [`%${query}%`] : []
  );
  return (
    <>
      <SearchBar query={query} count={rows.length} noun="currencies">
        {query && <a href="/settings/currencies" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <AddButton label="+ Add Currency" title="Add Currency" action={addCurrency}><CurFields /></AddButton>
      </SearchBar>
      <TableShell heads={['Currency Name', 'Symbol', '']}>
        {rows.map((c) => (
          <tr key={c.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="px-3 py-2 font-bold text-slate-900">{c.name}</td>
            <td className="px-3 py-2"><span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-mono font-bold text-indigo-700">{c.symbol}</span></td>
            <td className="px-3 py-2">
              <RowButtons idName="currency_id" id={c.id} editTitle={`Edit ${c.name}`}
                delText={`Remove currency "${c.name}"?`} editAction={updateCurrency} delAction={deleteCurrency}>
                <CurFields c={c} />
              </RowButtons>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-400">No currencies found</td></tr>}
      </TableShell>
    </>
  );
}
