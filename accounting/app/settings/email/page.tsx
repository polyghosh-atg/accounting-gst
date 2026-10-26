import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, Btn, fieldCls } from '@/components/ui';
import { saveEmailConfig } from '../actions';

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-slate-600">
      {label}
      <span className="mt-1 block font-normal">{children}</span>
    </label>
  );
}

export default function EmailConfig() {
  return (
    <div>
      <PageHeader title="Email Configuration" sub="SMTP settings used to send invoices & reminders" />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const rows = await q<Record<string, string>>('SELECT * FROM email_configs WHERE id=1');
  const c = rows[0] || {};
  return (
    <form action={saveEmailConfig} className="max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <F label="Protocol *">
          <select name="protocol" defaultValue={c.protocol || 'smtp'} className={fieldCls}>
            <option value="smtp">SMTP</option>
            <option value="mail">Mail</option>
            <option value="sendmail">Sendmail</option>
          </select>
        </F>
        <F label="Encryption *">
          <select name="encryption" defaultValue={c.encryption || 'tls'} className={fieldCls}>
            <option value="tls">TLS</option>
            <option value="ssl">SSL</option>
            <option value="">None</option>
          </select>
        </F>
        <F label="Host *"><input name="host" required defaultValue={c.host || ''} placeholder="smtp.gmail.com" className={fieldCls} /></F>
        <F label="Port *"><input name="port" required defaultValue={c.port || '587'} placeholder="587" className={fieldCls} /></F>
        <F label="Email *"><input name="email" type="email" required defaultValue={c.email || ''} className={fieldCls} /></F>
        <F label="From Name"><input name="from_name" defaultValue={c.from_name || ''} className={fieldCls} /></F>
        <F label="Username *"><input name="username" required defaultValue={c.username || ''} className={fieldCls} /></F>
        <F label="Password *"><input name="password" type="password" required defaultValue={c.password || ''} className={fieldCls} /></F>
      </div>
      <div className="mt-3 flex justify-end">
        <Btn type="submit" className="px-8">Save Configuration</Btn>
      </div>
    </form>
  );
}
