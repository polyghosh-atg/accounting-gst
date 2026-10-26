'use client';

import { useState, useActionState } from 'react';
import { addUser, updateUser, deleteUser, changePassword } from '@/app/users/actions';
import { Modal, Btn, IconBtn, fieldCls } from '@/components/ui';

export type AppUser = {
  id: number; first_name: string; last_name: string; username: string;
  role: string; email: string; phone: string; status: string;
};

function UserForm({ action, initial, roles, submitLabel, withPassword }: {
  action: (f: FormData) => Promise<void>;
  initial?: Partial<AppUser>;
  roles: string[];
  submitLabel: string;
  withPassword?: boolean;
}) {
  const v = (k: keyof AppUser) => (initial?.[k] as string) || '';
  return (
    <form action={action} className="space-y-2.5">
      {initial?.id ? <input type="hidden" name="user_id" value={initial.id} /> : null}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input name="first_name" required defaultValue={v('first_name')} placeholder="First Name *" className={fieldCls} />
        <input name="last_name" defaultValue={v('last_name')} placeholder="Last Name" className={fieldCls} />
        <input name="username" required defaultValue={v('username')} placeholder="Username *" className={fieldCls} />
        <select name="role" className={fieldCls} defaultValue={v('role')}>
          <option value="">Select role</option>
          {roles.map((r) => <option key={r}>{r}</option>)}
        </select>
        <input name="email" type="email" defaultValue={v('email')} placeholder="Email" className={fieldCls} />
        <input name="phone" defaultValue={v('phone')} placeholder="Phone" className={fieldCls} />
        <select name="status" className={fieldCls} defaultValue={v('status') || 'Active'}>
          <option>Active</option><option>Inactive</option>
        </select>
        {withPassword && (
          <input name="password" type="password" required minLength={6} placeholder="Login password (6+ chars) *" className={fieldCls} />
        )}
      </div>
      <Btn type="submit" className="w-full">{submitLabel}</Btn>
    </form>
  );
}

function PasswordForm({ userId, userName }: { userId: number; userName: string }) {
  const [msg, act, pending] = useActionState(changePassword, '');
  return (
    <form action={act} className="space-y-2.5">
      <input type="hidden" name="user_id" value={userId} />
      <p className="text-sm text-slate-600">Set a new login password for <b>{userName}</b>.</p>
      <input name="new_password" type="password" required minLength={6} placeholder="New password *" className={fieldCls} />
      <input name="confirm_password" type="password" required minLength={6} placeholder="Confirm password *" className={fieldCls} />
      <Btn type="submit" className="w-full">{pending ? 'Saving...' : 'Change Password'}</Btn>
      {msg && <p className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800">{msg}</p>}
    </form>
  );
}

type Kind = null | 'add' | 'edit' | 'password' | 'delete';

export function UserButtons({ u, roles, showView = true }: { u: AppUser; roles: string[]; showView?: boolean }) {
  const [kind, setKind] = useState<Kind>(null);
  const close = () => setKind(null);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {showView && <IconBtn icon="eye" label="Profile" tone="slate" href={`/users/${u.id}`} />}
        <IconBtn icon="edit" label="Edit" tone="indigo" onClick={() => setKind('edit')} />
        <IconBtn icon="key" label="Change login password" tone="amber" onClick={() => setKind('password')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setKind('delete')} />
      </div>
      {kind === 'edit' && (
        <Modal title={`Edit ${u.username}`} onClose={close} wide>
          <UserForm action={updateUser} initial={u} roles={roles} submitLabel="Save User" />
        </Modal>
      )}
      {kind === 'password' && (
        <Modal title="Change Login Password" onClose={close}>
          <PasswordForm userId={u.id} userName={u.username} />
        </Modal>
      )}
      {kind === 'delete' && (
        <Modal title={`Delete ${u.username}?`} onClose={close}>
          <form action={deleteUser}>
            <input type="hidden" name="user_id" value={u.id} />
            <p className="mb-3 text-sm text-slate-600">This removes the login. Their name on old records stays as plain text.</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AddUserButton({ roles }: { roles: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>+ Add User</Btn>
      {open && (
        <Modal title="Add User" sub="Login credentials included" onClose={() => setOpen(false)} wide>
          <UserForm action={addUser} roles={roles} submitLabel="Add User" withPassword />
        </Modal>
      )}
    </>
  );
}
