import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import { AddButton, RowButtons, TableShell, SearchBar } from '@/components/settings-modals';
import { addWhatsappTemplate, updateWhatsappTemplate, deleteWhatsappTemplate } from '../actions';
import { WtplFields, wtplLabel } from './fields';

type Wtpl = { id: number; wm_type: string; wm_message: string };

export default function WhatsappTemplates({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader
        title="Whatsapp template list"
        sub="Home / Settings / Whatsapp Template"
        actions={
          <a
            href="/settings/whatsapp-messages"
            title="Click here to show whatsapp messages list"
            className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
          >
            Whatsapp messages
          </a>
        }
      />
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
  const used = rows.map((r) => r.wm_type);
  return (
    <>
      <SearchBar query={query} count={rows.length} noun="templates">
        {query && <a href="/settings/whatsapp-templates" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <AddButton label="Add whatsapp template" title="Add whatsapp template" action={addWhatsappTemplate}>
          <WtplFields used={used} />
        </AddButton>
      </SearchBar>
      <TableShell heads={['Type', 'Action']}>
        {rows.map((t) => (
          <tr key={t.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="px-3 py-2 font-bold text-slate-900">{wtplLabel(t.wm_type)}</td>
            <td className="px-3 py-2">
              <RowButtons idName="template_id" id={t.id} editTitle="Edit whatsapp template"
                delText={`Remove template "${wtplLabel(t.wm_type)}"?`}
                editAction={updateWhatsappTemplate} delAction={deleteWhatsappTemplate} wide>
                <WtplFields current={t.wm_type} message={t.wm_message} used={used} />
              </RowButtons>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={2} className="px-3 py-8 text-center text-slate-400">No templates found</td></tr>}
      </TableShell>
    </>
  );
}
