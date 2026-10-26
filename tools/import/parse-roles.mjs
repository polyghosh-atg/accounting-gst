// Parse user_roles.html: roles + permission catalog + per-role grants.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const h = readFileSync(join(root, '_scrape', 'user_roles.html'), 'utf8');

const strip = (s) => (s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// roles from example1 table
const t = h.match(/<table\b[^>]*id="example1"[^>]*>([\s\S]*?)<\/table>/i);
const roles = [];
if (t) {
  for (const r of t[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...r[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => strip(c[1]));
    if (!cells.length) continue;
    const gid = (r[1].match(/data-group_id="(\d+)"/) || [])[1] ?? null;
    roles.push({ group_id: gid ? Number(gid) : null, name: cells[0] || '', description: cells[1] || '' });
  }
}

// permission forms: each has hidden role_id + permission checkboxes
// labels live in <label for="{value}_{group}"> elements; data-module gives grouping
const catalog = new Map(); // value -> {label, module}
const grants = {}; // group_id -> [values]
for (const f of h.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
  const inner = f[2];
  const rid = (inner.match(/name="role_id"[^>]*value="(\d+)"/) || [])[1];
  if (!rid) continue;
  const set = new Set();
  for (const c of inner.matchAll(/<input\b(?=[^>]*name="permission")[^>]*>/gi)) {
    const tag = c[0];
    const val = (tag.match(/value="([^"]*)"/) || [])[1];
    if (!val) continue;
    set.add(val);
    if (!catalog.has(val)) {
      const mod = (tag.match(/data-module="([^"]*)"/) || [])[1] || '';
      const idm = tag.match(/id="([^"]*)"/);
      let label = val;
      if (idm) {
        const lm = inner.match(new RegExp('<label[^>]*for="' + idm[1].replace(/"/g, '') + '"[^>]*>([\\s\\S]*?)<\\/label>', 'i'));
        if (lm) label = strip(lm[1]);
      }
      if (!label || label === val) {
        const before = inner.slice(Math.max(0, c.index - 600), c.index);
        const labs = [...before.matchAll(/>([^<>]{2,60}?)<\s*\/\s*(?:h[1-6]|label|span|div|b)\s*>/gi)].map((x) => strip(x[1])).filter((x) => x && !/select all/i.test(x));
        if (labs.length) label = labs[labs.length - 1];
      }
      catalog.set(val, { label, module: mod });
    }
  }
  // checked state
  const checked = new Set();
  for (const c of inner.matchAll(/<input\b[^>]*name="permission"[^>]*checked[^>]*>/gi)) {
    const val = (c[0].match(/value="([^"]*)"/) || [])[1];
    if (val) checked.add(val);
  }
  grants[rid] = { all: [...set], granted: [...checked] };
}

mkdirSync(join(root, 'data', 'parsed'), { recursive: true });
writeFileSync(join(root, 'data', 'parsed', 'roles.json'),
  JSON.stringify({ roles, permissions: [...catalog.entries()].map(([key, v]) => ({ key, label: typeof v === 'string' ? v : v.label, module: typeof v === 'string' ? '' : v.module })), grants }, null, 1));
console.log('roles:', roles.length, 'perm keys:', catalog.size);
console.log('sample roles:', JSON.stringify(roles.slice(0, 3)));
console.log('grant sizes:', Object.entries(grants).map(([k, v]) => `${k}:${v.granted.length}/${v.all.length}`).join(' '));
