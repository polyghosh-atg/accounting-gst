import pg from 'pg';
const p = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const t = await p.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1");
console.log(t.rows.map(r => r.tablename).join(','));
await p.end();
