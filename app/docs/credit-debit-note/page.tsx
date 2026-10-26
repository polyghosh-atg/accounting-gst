import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';

export default function CreditDebitNote() {
  return (
    <div>
      <PageHeader title="Credit Debit Note" sub="Credit & debit notes against invoices" />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const rows = await q(`SELECT * FROM doc_headers WHERE doc_type='credit_debit_note' ORDER BY id DESC`);
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
        <div className="text-3xl">🧾</div>
        <div className="mt-2 font-bold text-slate-800">No credit / debit notes yet</div>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          The source system holds no credit-debit-note records either. Notes created here will appear in this list.
        </p>
      </div>
    );
  }
  return <div className="text-sm text-slate-500">{rows.length} records</div>;
}
