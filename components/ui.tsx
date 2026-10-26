import type { ReactNode } from 'react';

const PATHS: Record<string, string> = {
  dashboard: 'M3 3h7v7H3zM14 3h7v4h-7zM14 12h7v9h-7zM3 14h7v7H3z',
  sales: 'M3 7h13v10H3zM3 7l2-4h11l2 4M8 11h5M8 14h3',
  purchases: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  doc: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h7M9 17h7',
  users: 'M16 19a4 4 0 00-8 0M12 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19a4 4 0 00-3-3.87M16 11a3.5 3.5 0 013-3.45',
  bank: 'M3 9l9-6 9 6M4 9v11M20 9v11M8 13v4M12 13v4M16 13v4M2 20h20',
  box: 'M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10',
  expense: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6',
  hr: 'M9 11a3 3 0 100-6 3 3 0 000 6zM2 21v-1a5 5 0 015-5h4a5 5 0 015 5v1M16 3.5a3 3 0 010 7M21 21v-1a5 5 0 00-3-4.58',
  report: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  transfer: 'M7 4L3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 10a2 2 0 100 4 2 2 0 000-4z',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  trash: 'M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6',
  plus: 'M12 5v14M5 12h14',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  key: 'M14 10a4 4 0 100-8 4 4 0 000 8zM14 12v9M18 21h.01M21 18h.01',
};

export function Icon({ name, className = 'h-5 w-5' }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name] ?? PATHS.doc} />
    </svg>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STAT_GRAD: Record<string, string> = {
  indigo: 'from-indigo-500 to-violet-500',
  emerald: 'from-emerald-500 to-teal-500',
  amber: 'from-amber-500 to-orange-500',
  rose: 'from-rose-500 to-pink-500',
  sky: 'from-sky-500 to-cyan-500',
  slate: 'from-slate-500 to-slate-700',
};

export function Stat({ icon, label, value, sub, tone = 'indigo' }: {
  icon: string; label: string; value: ReactNode; sub?: string; tone?: keyof typeof STAT_GRAD | string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${STAT_GRAD[tone] ?? STAT_GRAD.indigo}`}>
        <Icon name={icon} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
        <div className="truncate text-lg font-bold tabular-nums text-slate-900">{value}</div>
        {sub && <div className="truncate text-xs text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

const BADGE_TONE: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200',
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: keyof typeof BADGE_TONE | string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_TONE[tone] ?? BADGE_TONE.gray}`}>
      {children}
    </span>
  );
}

export function statusTone(v: string): string {  const s = (v || '').toLowerCase();
  if (['active', 'approved', 'paid', 'delivered', 'completed'].includes(s)) return 'green';
  if (['inactive', 'rejected', 'cancelled', 'failed'].includes(s)) return 'red';
  if (['pending', 'partial', 'draft'].includes(s)) return 'amber';
  if (!s) return 'gray';
  return 'blue';
}

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

export const inr = (n: number | string | null) =>
  'Rs ' +
  Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export const fieldCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100';

export function Btn({ children, onClick, type, tone = 'primary', className = '' }: {
  children: ReactNode; onClick?: () => void; type?: 'submit' | 'button'; tone?: 'primary' | 'soft' | 'danger' | 'ghost'; className?: string;
}) {
  const tones: Record<string, string> = {
    primary: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow hover:opacity-95',
    soft: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-700',
    danger: 'bg-rose-600 text-white shadow hover:bg-rose-700',
    ghost: 'text-indigo-700 hover:underline',
  };
  return (
    <button type={type ?? 'button'} onClick={onClick} className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

export function IconBtn({ icon, label, tone = 'gray', onClick, href }: {
  icon: string; label: string; tone?: string; onClick?: () => void; href?: string;
}) {
  const tones: Record<string, string> = {
    gray: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
    slate: 'bg-slate-700 text-white hover:bg-slate-800',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100',
    red: 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100',
    purple: 'bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100',
    teal: 'bg-teal-50 text-teal-700 ring-teal-200 hover:bg-teal-100',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100',
    pink: 'bg-pink-50 text-pink-700 ring-pink-200 hover:bg-pink-100',
  };
  const cls = `inline-flex items-center justify-center rounded-lg p-1.5 ring-1 ring-inset transition ${tones[tone] ?? tones.gray}`;
  const body = <Icon name={icon} className="h-4 w-4" />;
  if (href) {
    return <a href={href} title={label} aria-label={label} className={cls}>{body}</a>;
  }
  return <button onClick={onClick} title={label} aria-label={label} className={cls}>{body}</button>;
}

export function Pill({ children, onClick, tone = 'gray', title }: {
  children: ReactNode; onClick?: () => void; tone?: string; title?: string;
}) {
  const tones: Record<string, string> = {
    gray: 'bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100',
    red: 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100',
    purple: 'bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100',
    teal: 'bg-teal-50 text-teal-700 ring-teal-200 hover:bg-teal-100',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100',
    pink: 'bg-pink-50 text-pink-700 ring-pink-200 hover:bg-pink-100',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100',
  };
  return (
    <button onClick={onClick} title={title} className={`rounded-lg px-2 py-1 text-xs font-semibold ring-1 ring-inset transition ${tones[tone] ?? tones.gray}`}>
      {children}
    </button>
  );
}

export function Modal({ title, sub, onClose, children, wide, xl, lg }: {
  title: string; sub?: string; onClose: () => void; children: ReactNode; wide?: boolean; xl?: boolean; lg?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`modal-pop max-h-[92vh] w-full ${xl ? 'max-w-4xl' : lg ? 'max-w-[612px]' : wide ? 'max-w-lg' : 'max-w-md'} overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold tracking-tight text-slate-900">{title}</h3>
            {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-100 px-2.5 py-1 text-lg leading-none text-slate-500 transition hover:bg-slate-200" aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LoadingRows({ n = 5 }: { n?: number }) {
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-4">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className={i === 0 ? 'h-5 w-2/3' : 'h-4 w-full'} />
      ))}
    </div>
  );
}

export function vBadge(vt: string) {
  if (vt.includes('receipt')) return <Badge tone="green">{vt}</Badge>;
  if (vt.includes('payment')) return <Badge tone="rose">{vt}</Badge>;
  return <Badge tone="blue">{vt}</Badge>;
}

export function pdcStatus(s: string) {
  if (s === 'Cleared') return <Badge tone="green">{s}</Badge>;
  if (s === 'Bounced') return <Badge tone="red">{s}</Badge>;
  if (s === 'Deposited') return <Badge tone="blue">{s}</Badge>;
  return <Badge tone="amber">{s || 'Pending'}</Badge>;
}
