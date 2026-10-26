import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

export async function q<T = Record<string, string>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const r = await pool.query(text, params as unknown[]);
  return r.rows as T[];
}

export const inr = (n: number | string | null) =>
  'Rs ' +
  Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
