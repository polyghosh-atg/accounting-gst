import { LoginForm } from './form';

export const metadata = {
  title: 'Sign In — Office ERP',
};

// Reads searchParams (?next=) — must block on the server, no static shell.
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = (await searchParams).next || '/';
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-1 text-center text-2xl font-extrabold tracking-tight text-slate-900">
          Office<span className="text-indigo-600"> ERP</span>
        </div>
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-slate-400">
          Accounting · GST
        </p>
        <LoginForm next={next} />
        <p className="mt-4 text-center text-xs text-slate-400">
          Use your ERP username &amp; password to sign in.
        </p>
      </div>
    </div>
  );
}
