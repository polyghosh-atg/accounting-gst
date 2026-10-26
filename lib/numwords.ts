const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function two(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

function three(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return `${h ? `${ONES[h]} hundred${r ? ' ' : ''}` : ''}${r ? two(r) : ''}`;
}

/** Indian system amount in words (lowercase, no 'only'). */
export function amountInWords(n: number): string {
  const v = Math.round(Math.abs(n));
  if (v === 0) return 'zero';
  const cr = Math.floor(v / 10000000);
  const lk = Math.floor((v % 10000000) / 100000);
  const th = Math.floor((v % 100000) / 1000);
  const rest = v % 1000;
  const parts: string[] = [];
  if (cr) parts.push(`${three(cr)} crore`);
  if (lk) parts.push(`${two(lk)} lakh`);
  if (th) parts.push(`${two(th)} thousand`);
  if (rest) parts.push(three(rest));
  return parts.join(' ');
}
