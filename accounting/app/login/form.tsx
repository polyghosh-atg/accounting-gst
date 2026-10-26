'use client';

import { useActionState } from 'react';
import { loginUser } from '@/lib/auth';

export function LoginForm({ next }: { next: string }) {
  const [state, submit, pending] = useActionState(loginUser, { error: '' });
  return (
    <form action={submit} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Username</label>
        <input
          name="username"
          required
          autoComplete="username"
          placeholder="Enter username"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Enter password"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
      </div>
      {state.error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-sm font-bold text-white shadow hover:opacity-95 disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}
