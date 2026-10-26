'use client';

import { useState } from 'react';
import { savePermissions } from '@/app/roles/actions';
import { Btn } from '@/components/ui';

type Perm = { id: number; label: string; module: string };

export default function Matrix({ roleId, roleName, groups, granted }: {
  roleId: number; roleName: string;
  groups: { module: string; perms: Perm[] }[];
  granted: number[];
}) {
  const [sel, setSel] = useState<Set<number>>(new Set(granted));
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (id: number) => {
    const next = new Set(sel);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSel(next);
    setSaved('');
  };

  const toggleModule = (perms: Perm[]) => {
    const next = new Set(sel);
    const all = perms.every((p) => next.has(p.id));
    perms.forEach((p) => (all ? next.delete(p.id) : next.add(p.id)));
    setSel(next);
    setSaved('');
  };

  const save = async () => {
    setSaving(true);
    await savePermissions(roleId, [...sel]);
    setSaving(false);
    setSaved(`Saved ${sel.size} permissions for ${roleName}.`);
  };

  return (
    <div className="space-y-3">
      <div className="sticky top-[57px] z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-2.5 shadow-sm backdrop-blur">
        <span className="mr-auto text-sm text-slate-600"><b className="tabular-nums">{sel.size}</b> permissions selected</span>
        <Btn onClick={save}>{saving ? 'Saving...' : 'Save Permission'}</Btn>
      </div>
      {saved && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{saved}</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => {
          const all = g.perms.every((p) => sel.has(p.id));
          return (
            <div key={g.module} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between bg-slate-100 px-3 py-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">{g.module} ({g.perms.length})</span>
                <button onClick={() => toggleModule(g.perms)} className="text-[11px] font-bold text-indigo-700 hover:underline">
                  {all ? 'Unselect all' : 'Select all'}
                </button>
              </div>
              <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto p-1.5">
                {g.perms.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-[13px] text-slate-700 transition hover:bg-indigo-50">
                      <input
                        type="checkbox"
                        checked={sel.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="h-4 w-4 shrink-0 accent-indigo-600"
                      />
                      {p.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
