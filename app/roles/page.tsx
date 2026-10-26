import { Suspense } from 'react';
import { q } from '@/lib/db';
import { Table } from '@/components/table';
import { PageHeader, LoadingRows, Badge } from '@/components/ui';
import Link from 'next/link';

export default function Roles() {
  return (
    <div>
      <PageHeader title="User Roles" sub="List roles — open a role to assign permissions" />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const rows = await q(`SELECT r.id, r.name, r.description,
    (SELECT count(*) FROM role_permissions rp WHERE rp.role_id=r.id) perms,
    (SELECT count(*) FROM app_users u WHERE lower(u.role)=lower(r.name)
       OR (lower(u.role) LIKE '%' || lower(r.name) || '%' AND length(r.name) > 4)) users
    FROM roles r ORDER BY r.id`);
  return (
    <Table
      heads={['Name', 'Description', 'Permissions', 'Users', 'Action']}
      align={['l', 'l', 'r', 'r', 'l']}
      rows={rows.map((r) => [
        <b key="n">{String(r.name)}</b>,
        String(r.description),
        <Badge key="p" tone="blue">{String(r.perms)}</Badge>,
        String(r.users),
        <Link key="a" className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-100" href={`/roles/${r.id}`}>Permissions →</Link>,
      ])}
    />
  );
}
