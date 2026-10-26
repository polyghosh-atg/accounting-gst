'use server';

import { revalidatePath } from 'next/cache';
import { q } from '@/lib/db';

export type FyYear = {
  id: number;
  label: string;
  start_year: number;
  end_year: number;
  is_active: boolean;
};

function row(r: Record<string, string>): FyYear {
  return {
    id: Number(r.id),
    label: String(r.label),
    start_year: Number(r.start_year),
    end_year: Number(r.end_year),
    is_active: (r.is_active as unknown) === true || String(r.is_active) === 'true',
  };
}

export async function getFinancialYears(): Promise<FyYear[]> {
  const rows = await q('SELECT * FROM financial_years ORDER BY start_year DESC');
  return rows.map(row);
}

export async function getActiveFyLabel(): Promise<string> {
  const rows = await q<{ label: string }>(
    'SELECT label FROM financial_years WHERE is_active ORDER BY start_year DESC LIMIT 1'
  );
  return rows[0]?.label ?? '';
}

export async function addFinancialYear(form: FormData) {
  const start = Number(form.get('start_year'));
  if (!Number.isInteger(start) || start < 1900 || start > 2200) {
    throw new Error('Enter a valid start year (e.g. 2026).');
  }
  const end = start + 1;
  const label = `${start}-${end}`;
  const dup = await q('SELECT id FROM financial_years WHERE label=$1', [label]);
  if (dup.length > 0) throw new Error(`FY ${label} already exists.`);
  const count = await q<{ c: string }>('SELECT count(*) c FROM financial_years');
  await q('INSERT INTO financial_years(label,start_year,end_year,is_active) VALUES($1,$2,$3,$4)', [
    label,
    String(start),
    String(end),
    Number(count[0]?.c ?? 0) === 0 ? 'true' : 'false',
  ]);
  revalidatePath('/', 'layout');
}

export async function setActiveFinancialYear(form: FormData) {
  const id = Number(form.get('fy_id'));
  if (!id) throw new Error('invalid year');
  await q('UPDATE financial_years SET is_active=false');
  await q('UPDATE financial_years SET is_active=true WHERE id=$1', [String(id)]);
  revalidatePath('/', 'layout');
}
