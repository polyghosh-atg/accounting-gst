// v2: structured parse of detail view pages.
// sale/purchase/quotation/proforma/sales_return/purchase_return/transfer -> header pairs + item lines (numeric Sr only)
// expense/customer -> label:value definition tables
// Usage: node parse-details.mjs [module]   (default: all)
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rawDir = join(root, 'data', 'raw', 'details');
const outDir = join(root, 'data', 'parsed');
mkdirSync(outDir, { recursive: true });

const strip = (s) => (s ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;/g, ' ').replace(/\s+/g, ' ').trim();
const num = (s) => {
  if (s == null || s === '') return 0;
  const v = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  return isNaN(v) ? 0 : v;
};
const b64id = (f) => {
  const b = f.replace(/\.html$/, '');
  try { return parseInt(Buffer.from(b, 'base64').toString(), 10); } catch { return null; }
};

function labelValues(html) {
  const o = {};
  // <label>X</label></td><td> : </td><td>Value</td>
  for (const m of html.matchAll(/<label>([^<>]+)<\/label><\/td>\s*<td[^>]*>\s*:\s*<\/td>\s*<td[^>]*>([\s\S]{0,500}?)<\/td>/gi)) {
    const k = strip(m[1]);
    if (k && !(k in o)) o[k] = strip(m[2]);
  }
  // <b>Label: </b>Value<br>
  for (const m of html.matchAll(/<b>\s*([^<>]+?)\s*:?\s*<\/b>\s*:?\s*([^<>]*?)<\s*br\s*\/?>/gi)) {
    const k = strip(m[1]).replace(/:$/, '');
    if (k && k.length < 40 && !(k in o)) o[k] = strip(m[2]).replace(/^:\s*/, '');
  }
  // <label>X</label> : Value</td>
  for (const m of html.matchAll(/<label>([^<>]+)<\/label>\s*:?\s*([^<>]*?)<\s*\/\s*td\s*>/gi)) {
    const k = strip(m[1]);
    if (k && !(k in o)) o[k] = strip(m[2]).replace(/^:\s*/, '');
  }
  return o;
}

function itemTable(html) {
  const m = html.match(/<table class="table">([\s\S]*?)<\/table>/i);
  if (!m) return [];
  const inner = m[1];
  const heads = [...inner.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((x) => strip(x[1]));
  const rows = [];
  for (const r of inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...r[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => strip(c[1]));
    if (!cells.length) continue;
    if (!/^\d+$/.test((cells[0] || '').trim())) continue; // skip footer/total rows
    const o = {};
    heads.forEach((h, i) => (o[h] = cells[i] ?? ''));
    rows.push(o);
  }
  return rows;
}

function parseTax(s) {
  // "IGST : 0.00 (0.00%)" / "CGST : 45.00 (9.00%) SGST : ..."
  const o = {};
  for (const m of String(s).matchAll(/(IGST|CGST|SGST)\s*:\s*([0-9,.\-]+)\s*\(([0-9,.\-]+)%\)/gi))
    o[m[1].toLowerCase()] = { amt: num(m[2]), rate: num(m[3]) };
  return o;
}

const DOCS = ['sale', 'purchase', 'quotation', 'proforma_invoice', 'sales_return', 'purchase_return', 'transfer'];

function parseDoc(html, file) {
  const lv = labelValues(html);
  const lines = itemTable(html).map((r) => ({ ...r, _tax: parseTax(r['Tax (Rs)'] ?? r['Tax'] ?? '') }));
  return { legacyId: b64id(file), header: lv, lines };
}

const mods = process.argv[2] ? [process.argv[2]] : readdirSync(rawDir).filter((f) => !f.startsWith('_') && !f.includes('.'));
const summary = {};
for (const mod of mods) {
  const dir = join(rawDir, mod);
  if (!existsSync(dir)) continue;
  const rows = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.html'))) {
    const html = readFileSync(join(dir, f), 'utf8');
    if (DOCS.includes(mod)) rows.push(parseDoc(html, f));
    else rows.push({ legacyId: b64id(f), fields: labelValues(html) });
  }
  writeFileSync(join(outDir, `${mod}.json`), JSON.stringify(rows, null, 1));
  const nLines = rows.reduce((a, r) => a + (r.lines?.length ?? 0), 0);
  summary[mod] = { docs: rows.length, lines: nLines };
  console.log(`${mod}: docs=${rows.length} lines=${nLines}`);
}
console.log(JSON.stringify(summary));
