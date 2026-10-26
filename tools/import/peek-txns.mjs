import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const o = JSON.parse(readFileSync(join(root, '_scrape', 'recon_bank_statement_reconcile_entry_Mw==.html'), 'utf8'));
console.log('keys:', Object.keys(o));
console.log('entries:', o.transaction_entries.length);
console.log(JSON.stringify(o.transaction_entries[0], null, 1));
console.log(JSON.stringify(o.transaction_entries[1], null, 1));
