import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import Link from 'next/link';
import Matrix from './matrix';

export default function RoleDetail({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roles = await q('SELECT id, name, description FROM roles WHERE id=$1', [id]);
  if (!roles.length) return <div>Role not found. <Link className="text-indigo-700" href="/roles">Back</Link></div>;
  const role = roles[0];
  const perms = await q('SELECT id, label, module FROM permissions ORDER BY module, label');
  const granted = await q<{ permission_id: number }>('SELECT permission_id FROM role_permissions WHERE role_id=$1', [id]);

  const groups: { module: string; perms: { id: number; label: string; module: string }[] }[] = [];
  const byMod = new Map<string, { id: number; label: string; module: string }[]>();
  for (const p of perms) {
    const m = String(p.module || 'other');
    if (!byMod.has(m)) byMod.set(m, []);
    byMod.get(m)!.push({ id: Number(p.id), label: String(p.label), module: m });
  }
  for (const [module, list] of [...byMod.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    groups.push({ module, perms: list });
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={`Permission — ${String(role.name)}`}
        sub={String(role.description || '')}
        actions={<Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-indigo-700" href="/roles">← All roles</Link>}
      />
      <Matrix
        roleId={Number(role.id)}
        roleName={String(role.name)}
        groups={groups}
        granted={granted.map((g) => Number(g.permission_id))}
      />
    </div>
  );
}
