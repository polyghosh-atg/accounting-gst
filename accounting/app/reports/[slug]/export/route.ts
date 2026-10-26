import { reportDefs, toCSV, type Filters } from '@/lib/reports';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(_req.url);
  const f: Filters = {
    from: url.searchParams.get('from') || '',
    to: url.searchParams.get('to') || '',
    party: url.searchParams.get('party') || '',
    warehouse: url.searchParams.get('warehouse') || '',
    q: url.searchParams.get('q') || '',
  };
  const defs = await reportDefs();
  const def = defs.find((d) => d.slug === slug);
  if (!def) return new Response('unknown report', { status: 404 });
  const rows = await def.fetch(f);
  return new Response(toCSV(def.cols, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.csv"`,
    },
  });
}
