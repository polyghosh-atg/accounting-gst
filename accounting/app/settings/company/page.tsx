import { Suspense } from 'react';
import { q } from '@/lib/db';
import { PageHeader, LoadingRows } from '@/components/ui';
import CompanyTabs from './company-tabs';

export default function Company() {
  return (
    <div>
      <PageHeader title="Company Settings" sub="Profile printed on invoices, bills & QR codes" />
      <Suspense fallback={<LoadingRows />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const [cos, countries, states, cities, curs, prefs] = await Promise.all([
    q<Record<string, string>>('SELECT * FROM company_settings WHERE id=1'),
    q<{ id: number; name: string; code: string }>('SELECT id, name, code FROM countries ORDER BY name'),
    q<{ id: number; name: string }>('SELECT id, name FROM states ORDER BY name'),
    q<{ id: number; name: string }>('SELECT id, name FROM cities ORDER BY name'),
    q<{ id: number; name: string; symbol: string }>('SELECT id, name, symbol FROM currencies ORDER BY name'),
    q<{ doc_type: string; label: string; prefix: string; date_format: string; sequence: string }>(
      `SELECT * FROM doc_prefixes ORDER BY CASE doc_type
       WHEN 'purchase_order' THEN 0 WHEN 'purchase' THEN 1 WHEN 'purchase_return' THEN 2
       WHEN 'quotation' THEN 3 WHEN 'sale' THEN 4 WHEN 'sale_return' THEN 5
       WHEN 'proforma_invoice' THEN 6 WHEN 'credit_debit_note' THEN 7 WHEN 'bank_payment' THEN 8
       WHEN 'cash_payment' THEN 9 WHEN 'bank_receipt' THEN 10 WHEN 'cash_receipt' THEN 11
       WHEN 'contra' THEN 12 WHEN 'scrap_issue' THEN 13 WHEN 'scrap_entry' THEN 14
       WHEN 'scrap_receive' THEN 15 WHEN 'employee' THEN 16 WHEN 'department' THEN 17
       WHEN 'position' THEN 18 ELSE 99 END`),
  ]);
  return (
    <CompanyTabs
      co={cos[0] || {}}
      countries={countries}
      states={states}
      cities={cities}
      currencies={curs}
      prefixes={prefs}
    />
  );
}
