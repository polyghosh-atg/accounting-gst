import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, fieldCls } from '@/components/ui';
import { AddButton, RowButtons, TableShell, SearchBar } from '@/components/settings-modals';
import { addWhatsappTemplate, updateWhatsappTemplate, deleteWhatsappTemplate } from '../actions';

type Wtpl = { id: number; wm_type: string; wm_message: string };

function WFields({ t }: { t?: Wtpl }) {
  return (
    <>
      <input name="wm_type" required defaultValue={t?.wm_type || ''} placeholder="Type * (e.g. Payment Reminder)" className={fieldCls} />
      <textarea name="wm_message" defaultValue={t?.wm_message || ''} placeholder="Message (use {name}, {ref_no}, {amount}…)" rows={4} className={fieldCls} />
    </>
  );
}

export default function WhatsappTemplates({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader title="Whatsapp Template" sub="Order & payment messages with placeholders" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const rows = await q<Wtpl>(
    query ? 'SELECT * FROM whatsapp_templates WHERE wm_type ILIKE $1 OR wm_message ILIKE $1 ORDER BY id DESC'
      : 'SELECT * FROM whatsapp_templates ORDER BY id DESC',
    query ? [`%${query}%`] : []
  );
  return (
    <>
      <SearchBar query={query} count={rows.length} noun="templates">
        {query && <a href="/settings/whatsapp-templates" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <AddButton label="+ Add Template" title="Add Whatsapp Template" action={addWhatsappTemplate}><WFields /></AddButton>
      </SearchBar>
      <TableShell heads={['Type', 'Message', '']}>
        {rows.map((t) => (
          <tr key={t.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="whitespace-nowrap px-3 py-2 font-bold text-slate-900">{t.wm_type}</td>
            <td className="max-w-xl px-3 py-2 text-slate-600">{t.wm_message || '—'}</td>
            <td className="px-3 py-2">
              <RowButtons idName="template_id" id={t.id} editTitle={`Edit ${t.wm_type}`}
                delText={`Remove template "${t.wm_type}"?`}
                editAction={updateWhatsappTemplate} delAction={deleteWhatsappTemplate}><WFields t={t} /></RowButtons>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-400">No templates found</td></tr>}
      </TableShell>
    </>
  );
}
