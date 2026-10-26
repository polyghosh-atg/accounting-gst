import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const h = readFileSync(join(root, '_scrape', 'user_roles.html'), 'utf8');
const strip = (s) => (s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
let n = 0;
for (const m of h.matchAll(/<input\b(?=[^>]*name="permission")[^>]*>/gi)) {
  const tag = m[0];
  const vm = tag.match(/value="(\d+)"/);
  if (!vm) continue;
  if (n++ >= 6) break;
  console.log('TAG:', m[0].replace(/\s+/g, ' ').slice(0, 220));
  console.log('AFTER:', JSON.stringify(strip(h.slice(m.index + m[0].length, m.index + m[0].length + 120))));
}
