import { Suspense } from 'react';
import { reportDefs } from '@/lib/reports';
import { PageHeader, LoadingRows } from '@/components/ui';
import Link from 'next/link';

export default function Reports() {
  return (
    <div className="space-y-4">
      <PageHeader title="Reports" sub="All GST, stock & ledger reports with filters and Excel export" />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const defs = await reportDefs();
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {defs.map((d, i) => (
        <Link
          key={d.slug}
          href={`/reports/${d.slug}`}
          className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:border-indigo-300 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-extrabold text-white">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="font-bold text-slate-900 group-hover:text-indigo-800">{d.title} →</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{d.desc}</p>
        </Link>
      ))}
    </div>
  );
}
