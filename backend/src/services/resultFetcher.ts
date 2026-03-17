import axios from 'axios';
import pdfParse from 'pdf-parse';
import prisma from '../db';
import { normalizeBanglaDigits } from '../utils/banglaDigits';

export interface DrawResultInput {
  drawNumber: number;
  drawDate: string; // ISO date string e.g. "2025-01-31"
  series?: string;
  prizeRank: number;
  prizeAmount: number;
  winningNumber: string;
}

// Prize structure for Bangladesh 100-taka prize bonds
const PRIZE_TIERS = [
  { rank: 1, amount: 600000 },
  { rank: 2, amount: 325000 },
  { rank: 3, amount: 100000 },
  { rank: 4, amount: 50000 },
  { rank: 5, amount: 10000 },
];

/**
 * Calculate the expected draw number for a given date.
 * Anchor: 114th draw = January 2024 (Q1).
 * Draws happen in Jan, Apr, Jul, Oct each year.
 */
export function getDrawNumberForDate(date: Date = new Date()): number {
  const ANCHOR_DRAW = 114;
  const ANCHOR_YEAR = 2024;
  const ANCHOR_QUARTER = 1; // Jan = Q1

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // Which quarter are we in?
  let quarter: number;
  if (month <= 3) quarter = 1;
  else if (month <= 6) quarter = 2;
  else if (month <= 9) quarter = 3;
  else quarter = 4;

  // Draw happens at end of quarter; if draw hasn't happened yet this quarter, use previous
  const drawMonths = [1, 4, 7, 10];
  const drawDays = [31, 30, 31, 31]; // approximate draw day per quarter
  const drawDayForQuarter = drawDays[quarter - 1];
  const drawMonthForQuarter = drawMonths[quarter - 1];
  const drawHasHappened =
    month > drawMonthForQuarter ||
    (month === drawMonthForQuarter && date.getDate() >= drawDayForQuarter);

  const effectiveQuarter = drawHasHappened ? quarter : quarter - 1 || 4;
  const effectiveYear = drawHasHappened ? year : (quarter === 1 ? year - 1 : year);

  const quartersElapsed =
    (effectiveYear - ANCHOR_YEAR) * 4 + (effectiveQuarter - ANCHOR_QUARTER);

  return ANCHOR_DRAW + quartersElapsed;
}

/**
 * Download the prize bond result PDF from Bangladesh Bank.
 * URL pattern: https://www.bb.org.bd/investfacility/prizebond/{N}thdraw.pdf
 */
async function downloadPdf(drawNumber: number): Promise<Buffer> {
  const url = `https://www.bb.org.bd/investfacility/prizebond/${drawNumber}thdraw.pdf`;
  console.log(`[ResultFetcher] Downloading PDF: ${url}`);

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Referer': 'https://www.bb.org.bd/en/index.php/Investfacility/prizebond',
      'Accept': 'application/pdf,*/*',
    },
  });

  return Buffer.from(response.data);
}

/**
 * Compute the expected draw date from a draw number.
 * Anchor: 114th draw = January 31, 2024.
 * Quarterly schedule: Jan 31, Apr 30, Jul 31, Oct 31.
 */
function getDrawDate(drawNumber: number): string {
  const ANCHOR_DRAW = 114;
  const ANCHOR_YEAR = 2024;
  const drawMonths = [1, 4, 7, 10];
  const drawDays  = [31, 30, 31, 31];

  const quartersFromAnchor = drawNumber - ANCHOR_DRAW;
  const year    = ANCHOR_YEAR + Math.floor(quartersFromAnchor / 4);
  const quarter = ((quartersFromAnchor % 4) + 4) % 4; // 0=Jan,1=Apr,2=Jul,3=Oct

  const month = drawMonths[quarter];
  const day   = drawDays[quarter];
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parse prize bond results from PDF text.
 *
 * Bangladesh Bank PDFs use Bijoy/ANSI encoding (not Unicode Bangla).
 * Prize rank labels in that encoding:
 *   1g cyi  = ১ম পুরস্কার  (1st prize)
 *   2q cyi  = ২য় পুরস্কার  (2nd prize)
 *   3q cyi  = ৩য় পুরস্কার  (3rd prize)
 *   4_©     = ৪র্থ পুরস্কার (4th prize)  — note the leading "4_"
 *   5g cyi  = ৫ম পুরস্কার  (5th prize)
 *
 * Ranks 1 & 2 have their winning number on the SAME line as the label.
 * Ranks 3-5 have their numbers on the FOLLOWING lines.
 * A summary table (starts with "84 wU" / "168 wU") follows the rank-5 numbers.
 *
 * The string "0000001" in the preamble ("from 0000001 to 10,00,000") is a
 * range description — it is excluded because it appears before the first label.
 */
function parsePdfText(text: string, drawNumber: number): DrawResultInput[] {
  const drawDate = getDrawDate(drawNumber);
  const results: DrawResultInput[] = [];

  // ── locate prize section ─────────────────────────────────────────────
  const prizeStart = text.search(/1g\s+cyi/);
  if (prizeStart === -1) {
    console.warn('[ResultFetcher] Prize section not found in PDF text');
    return results;
  }
  const prize = text.slice(prizeStart);

  // ── rank 1 & 2: number is on the same line ───────────────────────────
  const r1 = prize.match(/1g\s+cyi[^\n\r]*?(\d{7})/);
  if (r1) results.push({ drawNumber, drawDate, prizeRank: 1, prizeAmount: 600000, winningNumber: r1[1] });

  const r2 = prize.match(/2q\s+cyi[^\n\r]*?(\d{7})/);
  if (r2) results.push({ drawNumber, drawDate, prizeRank: 2, prizeAmount: 325000, winningNumber: r2[1] });

  // ── locate section boundaries ────────────────────────────────────────
  const idx3 = prize.search(/3q\s+cyi/);
  const idx4 = prize.search(/4_/);          // "4_© cyi" — Bijoy encoding for ৪র্থ
  const idx5 = prize.search(/5g\s+cyi/);
  // Summary table starts with "84 wU" (84 prizes of 6,00,000 each)
  const idxSummary = prize.search(/84\s+wU|168\s+wU|3360\s+wU/);

  // ── rank 3 ───────────────────────────────────────────────────────────
  if (idx3 !== -1) {
    const end = idx4 !== -1 ? idx4 : (idx5 !== -1 ? idx5 : prize.length);
    sevenDigits(prize.slice(idx3, end)).forEach((n) =>
      results.push({ drawNumber, drawDate, prizeRank: 3, prizeAmount: 100000, winningNumber: n })
    );
  }

  // ── rank 4 ───────────────────────────────────────────────────────────
  if (idx4 !== -1) {
    const end = idx5 !== -1 ? idx5 : prize.length;
    sevenDigits(prize.slice(idx4, end)).forEach((n) =>
      results.push({ drawNumber, drawDate, prizeRank: 4, prizeAmount: 50000, winningNumber: n })
    );
  }

  // ── rank 5 ───────────────────────────────────────────────────────────
  if (idx5 !== -1) {
    const end = idxSummary !== -1 ? idxSummary : prize.length;
    sevenDigits(prize.slice(idx5, end)).forEach((n) =>
      results.push({ drawNumber, drawDate, prizeRank: 5, prizeAmount: 10000, winningNumber: n })
    );
  }

  console.log(`[ResultFetcher] Parsed: R1=${results.filter(r=>r.prizeRank===1).length} R2=${results.filter(r=>r.prizeRank===2).length} R3=${results.filter(r=>r.prizeRank===3).length} R4=${results.filter(r=>r.prizeRank===4).length} R5=${results.filter(r=>r.prizeRank===5).length}`);
  return results;
}

function sevenDigits(text: string): string[] {
  return text.match(/(?<!\d)\d{7}(?!\d)/g) ?? [];
}

/**
 * Parse a PDF buffer directly (for admin upload endpoint).
 * drawNumber must be provided since we can't detect it from the URL.
 */
export async function parsePdfBuffer(buffer: Buffer, drawNumber: number): Promise<DrawResultInput[]> {
  const parsed = await pdfParse(buffer);
  console.log(`[ResultFetcher] Uploaded PDF text length: ${parsed.text.length} chars`);
  const results = parsePdfText(parsed.text, drawNumber);
  console.log(`[ResultFetcher] Parsed ${results.length} winning numbers from draw #${drawNumber}`);
  return results;
}

/**
 * Fetch and parse the prize bond result PDF for a given draw number.
 */
export async function fetchDrawResults(drawNumber: number): Promise<DrawResultInput[]> {
  const pdfBuffer = await downloadPdf(drawNumber);
  const parsed = await pdfParse(pdfBuffer);
  console.log(`[ResultFetcher] PDF text length: ${parsed.text.length} chars`);

  const results = parsePdfText(parsed.text, drawNumber);
  console.log(`[ResultFetcher] Parsed ${results.length} winning numbers from draw #${drawNumber}`);
  return results;
}

/**
 * Fetch results for the latest draw (auto-detected from today's date).
 * Tries current draw, falls back to previous if PDF not yet published.
 */
export async function fetchLatestResults(): Promise<DrawResultInput[]> {
  const drawNumber = getDrawNumberForDate();
  console.log(`[ResultFetcher] Attempting draw #${drawNumber}`);

  try {
    const results = await fetchDrawResults(drawNumber);
    if (results.length > 0) return results;
    // No numbers found — try previous draw
    console.log(`[ResultFetcher] No results in draw #${drawNumber}, trying #${drawNumber - 1}`);
    return fetchDrawResults(drawNumber - 1);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      // PDF not published yet — try previous draw
      console.log(`[ResultFetcher] Draw #${drawNumber} PDF not found (404), trying #${drawNumber - 1}`);
      return fetchDrawResults(drawNumber - 1);
    }
    throw err;
  }
}

/**
 * Save draw results to the database (upsert — safe to call multiple times).
 */
export async function saveDrawResults(results: DrawResultInput[]): Promise<number> {
  let saved = 0;
  for (const r of results) {
    await prisma.drawResult.upsert({
      where: { unique_draw_number: { drawNumber: r.drawNumber, winningNumber: r.winningNumber } },
      create: {
        drawNumber: r.drawNumber,
        drawDate: new Date(r.drawDate),
        series: r.series,
        prizeRank: r.prizeRank,
        prizeAmount: r.prizeAmount,
        winningNumber: r.winningNumber,
      },
      update: {},
    });
    saved++;
  }
  return saved;
}
