import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, Badge } from '@/components/ui';
import { TableShell } from '@/components/settings-modals';
import { ClearLogsButton } from './clear-button';

type Log = {
  id: number; user_name: string; page: string; action: string;
  description: string; ip: string; created_at: string;
};

export default function Logs({ searchParams }: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  return (
    <div>
      <PageHeader
        title="History Logs"
        sub="Every master & settings change, newest first"
        actions={<ClearLogsButton />}
      />
      <Suspense fallback={<LoadingRows />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const query = (sp.q || '').trim();
  const from = sp.from || '';
  const to = sp.to || '';
  const conds: string[] = [];
  const params: string[] = [];
  if (query) {
    params.push(`%${query}%`);
    conds.push(`(page ILIKE $${params.length} OR action ILIKE $${params.length} OR description ILIKE $${params.length} OR user_name ILIKE $${params.length})`);
  }
  if (from) { params.push(from); conds.push(`created_at >= $${params.length}`); }
  if (to) { params.push(to); conds.push(`created_at <= $${params.length}::date + interval '1 day'`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = await q<Log>(`SELECT * FROM activity_logs ${where} ORDER BY id DESC LIMIT 1000`, params);
  return (
    <>
      <form method="GET" className="mb-3 flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <label className="text-xs font-bold text-slate-600">From <input name="from" type="date" defaultValue={from} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-400" /></label>
        <label className="text-xs font-bold text-slate-600">To <input name="to" type="date" defaultValue={to} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-400" /></label>
        <input name="q" defaultValue={query} placeholder="Search page, action..."
          className="w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
        <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white">Filter</button>
        {(query || from || to) && <a href="/settings/logs" className="text-xs font-semibold text-indigo-700 hover:underline">Clear</a>}
        <span className="ml-auto text-xs text-slate-500">Showing {rows.length} rows</span>
      </form>
      <TableShell heads={['User Name', 'Page(s)', 'Action', 'Description', 'Date/Time']}>
        {rows.map((l) => (
          <tr key={l.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
            <td className="whitespace-nowrap px-3 py-2 font-bold text-slate-900">{l.user_name}</td>
            <td className="whitespace-nowrap px-3 py-2">{l.page}</td>
            <td className="whitespace-nowrap px-3 py-2"><Badge tone={l.action === 'Delete' || l.action === 'Clear' ? 'red' : l.action === 'Add' ? 'green' : 'blue'}>{l.action}</Badge></td>
            <td className="max-w-md px-3 py-2 text-slate-600">{l.description}</td>
            <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600">{String(l.created_at || '').slice(0, 19).replace('T', ' ')}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No logs yet — save a setting or add a master to record activity</td></tr>}
      </TableShell>
    </>
  );
}
