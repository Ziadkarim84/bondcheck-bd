// Parses a Bangladesh Bank prize-bond result PDF. The PDFs use Bijoy (ANSI)
// encoding rather than Unicode Bangla, so labels look like "1g cyi" (১ম পুরস্কার).
import { createRequire } from 'node:module';
const pdfParse = createRequire(import.meta.url)('pdf-parse') as (b: Buffer) => Promise<{ text: string }>;

export interface Prize { rank: 1 | 2 | 3 | 4 | 5; amount: number; numbers: string[] }
export interface Draw { draw: number; date: string; prizes: Prize[] }

const AMOUNTS: Record<number, number> = { 1: 600000, 2: 325000, 3: 100000, 4: 50000, 5: 10000 };
const EXPECTED: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 40 };

// Gregorian month names as they appear in Bijoy-encoded text.
const MONTHS: [string, number][] = [
  ['Rvby', 1], ['deª', 2], ['gvP', 3], ['Gwc', 4], ['Ryb', 6], ['Ryj', 7], ['AvM', 8],
  ['m‡Þ', 9], ['A‡±', 10], ['b‡f', 11], ['wW‡m', 12], ['‡g', 5],
];

const seven = (t: string) => t.match(/(?<!\d)\d{7}(?!\d)/g) ?? [];

export function parseDate(text: string): string {
  // "... 1433 e½vã/02 AvM÷, 2026 ..." → Bangla calendar date / Gregorian date
  const m = text.match(/e½vã\s*\/\s*(\d{1,2})\s*([^\s,\d]+)\s*,\s*(\d{4})/);
  if (!m) throw new Error('Draw date not found in PDF');
  const month = MONTHS.find(([k]) => m[2].includes(k))?.[1];
  if (!month) throw new Error(`Unknown month "${m[2]}"`);
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function parseText(text: string, draw: number): Draw {
  const start = text.search(/1g\s+cyi/);
  if (start === -1) throw new Error(`Prize section not found (draw ${draw})`);
  const p = text.slice(start);
  const idx = {
    2: p.search(/2q\s+cyi/), 3: p.search(/3q\s+cyi/), 4: p.search(/4_/), 5: p.search(/5g\s+cyi/),
    end: p.search(/\d+\s+wU/),
  };
  const slice = (a: number, b: number) => p.slice(a, b === -1 ? p.length : b);
  const numbers: Record<number, string[]> = {
    1: seven(slice(0, idx[2])).slice(0, 1),
    2: seven(slice(idx[2], idx[3])).slice(0, 1),
    3: seven(slice(idx[3], idx[4])),
    4: seven(slice(idx[4], idx[5])),
    5: seven(slice(idx[5], idx.end > idx[5] ? idx.end : -1)),
  };
  const prizes = ([1, 2, 3, 4, 5] as const).map((rank) => ({ rank, amount: AMOUNTS[rank], numbers: numbers[rank] }));
  for (const pr of prizes) {
    if (pr.numbers.length !== EXPECTED[pr.rank]) {
      throw new Error(`Draw ${draw}: prize ${pr.rank} has ${pr.numbers.length} numbers, expected ${EXPECTED[pr.rank]}`);
    }
  }
  return { draw, date: parseDate(text), prizes };
}

export async function parsePdf(buf: Buffer, draw: number): Promise<Draw> {
  const { text } = await pdfParse(buf);
  return parseText(text, draw);
}
