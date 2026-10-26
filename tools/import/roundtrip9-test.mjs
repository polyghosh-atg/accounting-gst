import * as XLSX from 'xlsx';
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['Transaction Date', 'Cheque No', 'Particulars', 'Withdraw', 'Deposit'],
  ['01-06-2026', 'CHQ100', 'UPI TEST LEDGER', 1500, ''],
  ['02-06-2026', '', 'NEFT SALARY', '', 50000],
]);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
// replicate actions.ts parsing
const wb2 = XLSX.read(buf, { type: 'buffer', cellDates: true });
const rows = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { defval: '' });
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
const key = (o, names) => {
  const keys = Object.keys(o);
  for (const n of names) {
    const hit = keys.find((k) => k.toLowerCase().replace(/[^a-z]/g, '') === n);
    if (hit) return o[hit];
  }
  return '';
};
for (const o of rows) {
  console.log(JSON.stringify({
    date: key(o, ['transactiondate', 'date', 'txndate']),
    chq: key(o, ['chequeno', 'cheque', 'chqno']),
    part: key(o, ['particulars', 'description', 'narration', 'details']),
    w: num(key(o, ['withdraw', 'withdrawal', 'debit'])),
    d: num(key(o, ['deposit', 'credit'])),
  }));
}
