import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, Badge, statusTone, fieldCls } from '@/components/ui';
import { AddButton, RowButtons, StatusSelect, TableShell, SearchBar } from '@/components/settings-modals';
import { addCustomField, updateCustomField, deleteCustomField } from '../actions';

type F = { id: number; module: string; field_label: string; field_name: string; field_type: string; required: string; status: string };

const MODULES = ['sale', 'purchase', 'sales_return', 'purchase_return', 'quotation', 'expense', 'customer', 'supplier', 'product'];
const TYPES = ['text', 'number', 'date', 'textarea', 'dropdown'];

function FFields({ f }: { f?: F }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <select name="module" defaultValue={f?.module || 'sale'} className={fieldCls}>
          {MODULES.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select name="field_type" defaultValue={f?.field_type || 'text'} className={fieldCls}>
          {TYPES.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <input name="field_label" required defaultValue={f?.field_label || ''} placeholder="Field Label *" className={fieldCls} />
      <input name="field_name" defaultValue={f?.field_name || ''} placeholder="Field Name (auto from label if empty)" className={fieldCls} />
      <div className="grid grid-cols-2 gap-2">
        <select name="required" defaultValue={f?.required || 'No'} className={fieldCls}>
          <option>No</option>
          <option>Yes</option>
        </select>
        <StatusSelect name="status" value={f?.status} />
      </div>
    </>
  );
}

export default function CustomFields({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader title="Custom Settings" sub="Extra fields attached to each module" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const rows = await q<F>(
    query
      ? 'SELECT * FROM custom_fields WHERE field_label ILIKE $1 OR module ILIKE $1 ORDER BY module, field_label'
      : 'SELECT * FROM custom_fields ORDER BY module, field_label',
    query ? [`%${query}%`] : []
  );
  return (
    <>
      <SearchBar query={query} count={rows.length} noun="fields">
        {query && <a href="/settings/custom" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <AddButton label="+ Add Field" title="Add Custom Field" action={addCustomField}><FFields /></AddButton>
      </SearchBar>
      <TableShell heads={['Module', 'Field Label', 'Field Name', 'Type', 'Required', 'Status', '']}>
        {rows.map((f) => (
          <tr key={f.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="px-3 py-2"><Badge tone="blue">{f.module}</Badge></td>
            <td className="px-3 py-2 font-bold text-slate-900">{f.field_label}</td>
            <td className="px-3 py-2 font-mono text-xs text-slate-600">{f.field_name}</td>
            <td className="px-3 py-2">{f.field_type}</td>
            <td className="px-3 py-2">{f.required}</td>
            <td className="px-3 py-2"><Badge tone={statusTone(f.status)}>{f.status}</Badge></td>
            <td className="px-3 py-2">
              <RowButtons idName="field_id" id={f.id} editTitle={`Edit ${f.field_label}`}
                delText={`Remove custom field "${f.field_label}"?`}
                editAction={updateCustomField} delAction={deleteCustomField}><FFields f={f} /></RowButtons>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No custom fields found</td></tr>}
      </TableShell>
    </>
  );
}
