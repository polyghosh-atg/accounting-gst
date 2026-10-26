/* GST rate data bundled with hsn-code-package (static JSON import so Turbopack
   bundles it — its own JS uses dynamic require() which can't be bundled).
   Server-only — never import from client. */
import hsnCodes from 'hsn-code-package/data/hsn_codes.json';
import gstRates from 'hsn-code-package/data/gst_rates.json';
import pkg from 'hsn-code-package/package.json';

export type GstRateRow = {
  code: string;
  description: string;
  cgst: number;
  sgst: number;
  igst: number;
  effectiveFrom: string;
};

export const RATE_SOURCE = {
  notification: 'Notification No. 09/2025-CT(Rate) dated 17 Sep 2025',
  effective: '2025-09-22',
  packageVersion: (pkg as { version: string }).version,
};

type RateRec = { code: string; igstRate: number; cgstRate: number; sgstRate: number; effectiveFrom: string };
type CodeRec = { code: string; description: string };

let cache: { rates: Map<string, RateRec>; codes: CodeRec[] } | null = null;

function load() {
  if (!cache) {
    const rates = gstRates as RateRec[];
    const codes = hsnCodes as CodeRec[];
    cache = { rates: new Map(rates.map((r) => [String(r.code), r])), codes };
  }
  return cache;
}

const norm = (v: unknown) => String(v ?? '').trim();
const strip0 = (s: string) => s.replace(/^0+/, '');

export function rateStats(): { codes: number; updated: string } {
  const { rates } = load();
  void rates;
  return { codes: load().codes.length, updated: '2026-06-02' };
}

function match(code: string, desc: string, q: string, qDigits: string): boolean {
  if (!q) return true;
  const c = q.replace(/\s/g, '');
  if (/^[0-9]+$/.test(c) && qDigits) return code.startsWith(c) || strip0(code).startsWith(qDigits);
  return desc.toLowerCase().includes(q) || code.includes(c);
}

function toRow(code: string, desc: string, rates: Map<string, RateRec>): GstRateRow | null {
  const r = rates.get(code);
  if (!r) return null;
  return { code, description: desc, cgst: r.cgstRate, sgst: r.sgstRate, igst: r.igstRate, effectiveFrom: r.effectiveFrom || '2025-09-22' };
}

export function searchRates(query: string, slab: string): { rows: GstRateRow[]; total: number; truncated: boolean } {
  const { rates, codes } = load();
  const q = norm(query).toLowerCase();
  const qDigits = strip0(q.replace(/[^0-9]/g, ''));
  const CAP = 200;
  const out: GstRateRow[] = [];
  for (const e of codes) {
    const code = String(e.code);
    if (!match(code, String(e.description || ''), q, qDigits)) continue;
    const row = toRow(code, String(e.description || ''), rates);
    if (!row) continue;
    if (slab !== '' && String(row.igst) !== slab) continue;
    out.push(row);
    if (out.length >= CAP) break;
  }
  let total = out.length;
  if (out.length >= CAP) {
    total = 0;
    for (const e of codes) {
      const code = String(e.code);
      if (!match(code, String(e.description || ''), q, qDigits)) continue;
      const row = toRow(code, '', rates);
      if (!row) continue;
      if (slab !== '' && String(row.igst) !== slab) continue;
      total++;
    }
  }
  return { rows: out, total, truncated: out.length >= CAP };
}

export async function checkRateUpdate(): Promise<{ latest: string; current: string; updateAvailable: boolean; checkedAt: string; error?: string }> {
  const current = RATE_SOURCE.packageVersion;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch('https://registry.npmjs.org/hsn-code-package/latest', { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error(`registry ${r.status}`);
    const j = (await r.json()) as { version: string };
    return { latest: j.version, current, updateAvailable: j.version !== current, checkedAt: new Date().toISOString().slice(0, 10) };
  } catch (e) {
    return { latest: current, current, updateAvailable: false, checkedAt: new Date().toISOString().slice(0, 10), error: e instanceof Error ? e.message.slice(0, 100) : 'unreachable' };
  }
}
