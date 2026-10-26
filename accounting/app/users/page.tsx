import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows, Badge, statusTone } from '@/components/ui';
import { AddUserButton, UserButtons, type AppUser } from '@/components/user-modals';

export default function Users() {
  return (
    <div>
      <PageHeader title="Users" sub="Logins, roles & password resets" />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const rows = await q<AppUser>('SELECT * FROM app_users ORDER BY id');
  const roles = await q<{ name: string }>('SELECT name FROM roles ORDER BY name');
  const roleNames = roles.map((r) => r.name);
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-auto text-sm text-slate-500">{rows.length} users</span>
        <AddUserButton roles={roleNames} />
      </div>
      <div className="space-y-2.5 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-2">
              <a href={`/users/${r.id}`} className="truncate font-bold text-slate-900">{r.first_name} {r.last_name}</a>
              <Badge tone={statusTone(r.status)}>{r.status}</Badge>
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{r.username}</div>
            <div className="mt-0.5 text-xs text-slate-500"><Badge tone="blue">{r.role}</Badge></div>
            <div className="mt-2 border-t border-slate-100 pt-2"><UserButtons u={r} roles={roleNames} showView={false} /></div>
          </div>
        ))}
      </div>
      <div className="slim-scroll hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] md:block">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-50/95">
            <tr>{['First Name', 'Last Name', 'Username', 'User Role', 'Email', 'Phone', 'Status', 'Action'].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide text-slate-800">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/60">
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">{r.first_name}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.last_name}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600">{r.username}</td>
                <td className="whitespace-nowrap px-3 py-2"><Badge tone="blue">{r.role}</Badge></td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.email}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.phone}</td>
                <td className="whitespace-nowrap px-3 py-2"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                <td className="whitespace-nowrap px-3 py-2"><UserButtons u={r} roles={roleNames} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">{rows.length} users · passwords stored as scrypt hashes</p>
    </>
  );
}
