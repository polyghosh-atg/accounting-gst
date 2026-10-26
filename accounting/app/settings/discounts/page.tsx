import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, Badge, statusTone, fieldCls } from '@/components/ui';
import { AddButton, RowButtons, StatusSelect, TableShell, SearchBar } from '@/components/settings-modals';
import { addDiscount, updateDiscount, deleteDiscount } from '../actions';

type Disc = { id: number; name: string; type: string; value: string; valid_from: string; valid_to: string; description: string; status: string };

function DiscFields({ d }: { d?: Disc }) {
  return (
    <>
      <input name="name" required defaultValue={d?.name || ''} placeholder="Discount Name *" className={fieldCls} />
      <div className="grid grid-cols-2 gap-2">
        <select name="type" defaultValue={d?.type || 'Percentage'} className={fieldCls}>
          <option>Percentage</option>
          <option>Fixed</option>
        </select>
        <input name="value" type="number" step="any" defaultValue={d?.value || ''} placeholder="Value *" className={fieldCls} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-bold text-slate-600">Valid from<input name="valid_from" type="date" defaultValue={String(d?.valid_from || '').slice(0, 10)} className={fieldCls} /></label>
        <label className="text-xs font-bold text-slate-600">Valid to<input name="valid_to" type="date" defaultValue={String(d?.valid_to || '').slice(0, 10)} className={fieldCls} /></label>
      </div>
      <input name="description" defaultValue={d?.description || ''} placeholder="Description" className={fieldCls} />
      <StatusSelect name="status" value={d?.status} />
    </>
  );
}

export default function Discounts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader title="Discounts" sub="Percentage & flat offers with validity dates" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const rows = await q<Disc>(
    query ? 'SELECT * FROM discounts WHERE name ILIKE $1 ORDER BY id DESC' : 'SELECT * FROM discounts ORDER BY id DESC',
    query ? [`%${query}%`] : []
  );
  return (
    <>
      <SearchBar query={query} count={rows.length} noun="discounts">
        {query && <a href="/settings/discounts" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <AddButton label="+ Add Discount" title="Add Discount" action={addDiscount}><DiscFields /></AddButton>
      </SearchBar>
      <TableShell heads={['Name', 'Type', 'Value', 'Valid from', 'Valid to', 'Description', 'Status', '']}>
        {rows.map((d) => (
          <tr key={d.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="px-3 py-2 font-bold text-slate-900">{d.name}</td>
            <td className="px-3 py-2">{d.type}</td>
            <td className="px-3 py-2 font-bold tabular-nums">{d.value}{d.type === 'Percentage' ? '%' : ''}</td>
            <td className="px-3 py-2 whitespace-nowrap">{String(d.valid_from || '').slice(0, 10) || '—'}</td>
            <td className="px-3 py-2 whitespace-nowrap">{String(d.valid_to || '').slice(0, 10) || '—'}</td>
            <td className="max-w-52 truncate px-3 py-2 text-slate-600">{d.description || '—'}</td>
            <td className="px-3 py-2"><Badge tone={statusTone(d.status)}>{d.status}</Badge></td>
            <td className="px-3 py-2">
              <RowButtons idName="discount_id" id={d.id} editTitle={`Edit ${d.name}`}
                delText={`Remove discount "${d.name}"?`} editAction={updateDiscount} delAction={deleteDiscount}>
                <DiscFields d={d} />
              </RowButtons>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">No discounts found</td></tr>}
      </TableShell>
    </>
  );
}
