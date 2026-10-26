import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, Card, LoadingRows, Badge, statusTone } from '@/components/ui';
import { UserButtons, type AppUser } from '@/components/user-modals';
import Link from 'next/link';

export default function UserProfile({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await q<AppUser>('SELECT * FROM app_users WHERE id=$1', [id]);
  if (!rows.length) return <div>Not found. <Link className="text-indigo-700" href="/users">Back</Link></div>;
  const u = rows[0];
  const roles = await q<{ name: string }>('SELECT name FROM roles ORDER BY name');
  const perms = await q<{ label: string; module: string }>(
    `SELECT p.label, p.module FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN roles r ON r.id = rp.role_id
     WHERE lower(r.name) = lower($1)
        OR (lower($1) LIKE '%' || lower(r.name) || '%' AND length(r.name) > 4)
     ORDER BY p.module, p.label`, [u.role || '']
  );
  const byMod = new Map<string, string[]>();
  for (const p of perms) {
    const m = p.module || 'other';
    if (!byMod.has(m)) byMod.set(m, []);
    byMod.get(m)!.push(p.label);
  }
  const initials = `${(u.first_name || '?')[0]}${(u.last_name || '')[0] || ''}`.toUpperCase();
  return (
    <div className="space-y-4">
      <PageHeader
        title={`${u.first_name} ${u.last_name}`}
        sub={u.username}
        actions={<>
          <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href="/users">← Users</Link>
          <UserButtons u={u} roles={roles.map((r) => r.name)} showView={false} />
        </>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl font-extrabold text-white shadow">
              {initials}
            </div>
            <div>
              <div className="font-extrabold text-slate-900">{u.first_name} {u.last_name}</div>
              <div className="font-mono text-xs text-slate-500">{u.username}</div>
            </div>
          </div>
          <dl className="mt-3 space-y-1 text-sm">
            {[['User Role', ''], ['Email', u.email], ['Phone', u.phone]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-1.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium">{k === 'User Role' ? <Badge tone="blue">{u.role || '—'}</Badge> : v || '—'}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-2 py-1.5">
              <dt className="text-slate-500">Status</dt>
              <dd><Badge tone={statusTone(u.status)}>{u.status}</Badge></dd>
            </div>
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <div className="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Role permissions — {u.role || 'no role'} ({perms.length})
          </div>
          {perms.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No permissions assigned to this role yet.</p>}
          <div className="grid max-h-[480px] gap-3 overflow-y-auto sm:grid-cols-2">
            {[...byMod.entries()].map(([m, labels]) => (
              <div key={m} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="bg-slate-100 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-700">{m} ({labels.length})</div>
                <ul className="divide-y divide-slate-100">
                  {labels.map((l) => <li key={l} className="px-2.5 py-1 text-xs text-slate-600">{l}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
