import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, Badge, fieldCls } from '@/components/ui';
import { AddButton, RowButtons, TableShell, SearchBar } from '@/components/settings-modals';
import { addEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '../actions';

type Tpl = {
  id: number; template_name: string; from_name: string; from_email: string;
  subject: string; module: string; mail_header: string; mail_body: string;
  mail_footer: string; created_at: string;
};

const MODULES = ['sale', 'sales_return', 'purchase', 'purchase_return', 'quotation', 'proforma_invoice', 'expense', 'payment'];

function TplFields({ t }: { t?: Tpl }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <input name="template_name" required defaultValue={t?.template_name || ''} placeholder="Template Name *" className={fieldCls} />
        <select name="module" defaultValue={t?.module || 'sale'} className={fieldCls}>
          {MODULES.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="from_name" defaultValue={t?.from_name || ''} placeholder="From Name" className={fieldCls} />
        <input name="from_email" defaultValue={t?.from_email || ''} placeholder="Reply To (email)" className={fieldCls} />
      </div>
      <input name="subject" defaultValue={t?.subject || ''} placeholder="Subject" className={fieldCls} />
      <textarea name="mail_header" defaultValue={t?.mail_header || ''} placeholder="Mail Header" rows={2} className={fieldCls} />
      <textarea name="mail_body" defaultValue={t?.mail_body || ''} placeholder="Mail Body (use {customer}, {invoice_no}, {amount}…)" rows={4} className={fieldCls} />
      <textarea name="mail_footer" defaultValue={t?.mail_footer || ''} placeholder="Mail Footer" rows={2} className={fieldCls} />
    </>
  );
}

export default function EmailTemplates({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader title="Email Template" sub="Invoice, reminder & order mails with placeholders" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const rows = await q<Tpl>(
    query
      ? 'SELECT * FROM email_templates WHERE template_name ILIKE $1 OR module ILIKE $1 OR subject ILIKE $1 ORDER BY id DESC'
      : 'SELECT * FROM email_templates ORDER BY id DESC',
    query ? [`%${query}%`] : []
  );
  return (
    <>
      <SearchBar query={query} count={rows.length} noun="templates">
        {query && <a href="/settings/email-templates" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
        <AddButton label="+ Add Template" title="Add Email Template" action={addEmailTemplate}><TplFields /></AddButton>
      </SearchBar>
      <TableShell heads={['Template Name', 'From Name', 'Reply To', 'Module', 'Created Date', '']}>
        {rows.map((t) => (
          <tr key={t.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="px-3 py-2 font-bold text-slate-900">{t.template_name}</td>
            <td className="px-3 py-2">{t.from_name || '—'}</td>
            <td className="px-3 py-2">{t.from_email || '—'}</td>
            <td className="px-3 py-2"><Badge tone="blue">{t.module || '—'}</Badge></td>
            <td className="px-3 py-2 whitespace-nowrap">{String(t.created_at || '').slice(0, 10)}</td>
            <td className="px-3 py-2">
              <RowButtons idName="template_id" id={t.id} editTitle={`Edit ${t.template_name}`}
                delText={`Remove template "${t.template_name}"?`}
                editAction={updateEmailTemplate} delAction={deleteEmailTemplate} wide><TplFields t={t} /></RowButtons>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No templates found</td></tr>}
      </TableShell>
    </>
  );
}
