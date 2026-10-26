import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, Badge, statusTone } from '@/components/ui';
import { TableShell, SearchBar } from '@/components/settings-modals';

type Wmsg = { id: number; message: string; sent_to: string; status: string; created_at: string };

export default function WhatsappMessages({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <PageHeader title="whatsapp message list" sub="Home / Settings / Whatsapp Messages" />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();
  const rows = await q<Wmsg>(
    query ? 'SELECT * FROM whatsapp_messages WHERE message ILIKE $1 OR sent_to ILIKE $1 ORDER BY id DESC'
      : 'SELECT * FROM whatsapp_messages ORDER BY id DESC',
    query ? [`%${query}%`] : []
  );
  return (
    <>
      <SearchBar query={query} count={rows.length} noun="messages">
        {query && <a href="/settings/whatsapp-messages" className="text-sm font-semibold text-indigo-700 hover:underline">Clear</a>}
      </SearchBar>
      <TableShell heads={['Message', 'To', 'Status', '']}>
        {rows.map((m) => (
          <tr key={m.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="max-w-xl px-3 py-2 text-slate-600">{m.message || '—'}</td>
            <td className="whitespace-nowrap px-3 py-2 text-slate-900">{m.sent_to || '—'}</td>
            <td className="px-3 py-2"><Badge tone={statusTone(m.status)}>{m.status || '—'}</Badge></td>
            <td className="px-3 py-2 text-sm text-slate-400">{String(m.created_at || '').slice(0, 10)}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">No messages found</td></tr>}
      </TableShell>
    </>
  );
}
