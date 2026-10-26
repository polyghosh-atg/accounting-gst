import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, Badge, statusTone, fieldCls } from '@/components/ui';
import { AddButton, RowButtons, StatusSelect, TableShell, SearchBar } from '@/components/settings-modals';
import { addTax, updateTax, deleteTax } from '../actions';
import { checkRateUpdate } from '@/lib/gst-rates';

type Tax = { id: number; name: string; sgst: string; cgst: string; igst: string; status: string };

function TaxFields({ t }: { t?: Tax }) {
  return (
    <>
      <input name="name" required defaultValue={t?.name || ''} placeholder="Tax name *" className={fieldCls} />
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs font-bold text-slate-600">SGST %<input name="sgst" type="number" step="any" defaultValue={t?.sgst || ''} placeholder="2.5" className={fieldCls} /></label>
        <label className="text-xs font-bold text-slate-600">CGST %<input name="cgst" type="number" step="any" defaultValue={t?.cgst || ''} placeholder="2.5" className={fieldCls} /></label>
        <label className="text-xs font-bold text-slate-600">IGST %<input name="igst" type="number" step="any" defaultValue={t?.igst || ''} placeholder="5" className={fieldCls} /></label>
      </div>
      <StatusSelect name="status" value={t?.status} />
    </>
  );
}

export default function Taxes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader title="Tax" sub="SGST / CGST / IGST masters used on products & bills" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const [rows, upd] = await Promise.all([
    q<Tax>(
      query ? 'SELECT * FROM taxes WHERE name ILIKE $1 ORDER BY name' : 'SELECT * FROM taxes ORDER BY name',
      query ? [`%${query}%`] : []
    ),
    checkRateUpdate(3000).catch(() => null),
  ]);
  return (
    <>
      <style>{`@keyframes gstBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } } .gst-blink { animation: gstBlink 1.1s ease-in-out infinite; }`}</style>
      <SearchBar query={query} count={rows.length} noun="taxes">
        {upd?.updateAvailable && (
          <a href="/settings/gst-rates?check=1" title={`New GST rates published (v${upd.latest}) — view and update`}
            className="gst-blink rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 px-3.5 py-1.5 text-sm font-extrabold text-white shadow-lg ring-2 ring-amber-300">
            🔴 GST new update v{upd.latest}
          </a>
        )}
        {query && <a href="/settings/taxes" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <AddButton label="+ Add Tax" title="Add Tax" action={addTax}><TaxFields /></AddButton>
      </SearchBar>
      <TableShell heads={['Tax name', 'SGST', 'CGST', 'IGST', 'Status', '']}>
        {rows.map((t) => (
          <tr key={t.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="px-3 py-2 font-bold text-slate-900">{t.name}</td>
            <td className="px-3 py-2 tabular-nums">{t.sgst}%</td>
            <td className="px-3 py-2 tabular-nums">{t.cgst}%</td>
            <td className="px-3 py-2 tabular-nums">{t.igst}%</td>
            <td className="px-3 py-2"><Badge tone={statusTone(t.status)}>{t.status}</Badge></td>
            <td className="px-3 py-2">
              <RowButtons idName="tax_id" id={t.id} editTitle={`Edit ${t.name}`}
                delText={`Remove tax "${t.name}"? Products using it keep working.`}
                editAction={updateTax} delAction={deleteTax}><TaxFields t={t} /></RowButtons>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No taxes found</td></tr>}
      </TableShell>
    </>
  );
}
