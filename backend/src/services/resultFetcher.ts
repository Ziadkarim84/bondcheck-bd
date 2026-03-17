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
 * Parse prize bond results from PDF text.
 * Handles both Bangla and English text in Bangladesh Bank PDFs.
 */
function parsePdfText(text: string, drawNumber: number): DrawResultInput[] {
  // Normalize Bangla digits to ASCII
  const normalized = normalizeBanglaDigits(text);
  const results: DrawResultInput[] = [];

  // Extract draw date — look for patterns like "31 January 2025" or "২০২৫"
  const datePatterns = [
    /(\d{1,2})\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/,
  ];
  let drawDate = new Date().toISOString().split('T')[0];
  for (const pat of datePatterns) {
    const m = normalized.match(pat);
    if (m) {
      const parsed = new Date(m[0]);
      if (!isNaN(parsed.getTime())) {
        drawDate = parsed.toISOString().split('T')[0];
        break;
      }
    }
  }

  // Extract all 7-digit numbers from the PDF text
  const allNumbers = normalized.match(/(?<!\d)\d{7}(?!\d)/g) ?? [];
  if (allNumbers.length === 0) {
    console.warn('[ResultFetcher] No 7-digit numbers found in PDF');
    return results;
  }

  // Strategy: split text into sections by prize tier keywords, then extract numbers from each section
  // Bangladesh Bank PDFs label prizes as "1st Prize", "2nd Prize" or in Bangla "১ম পুরস্কার"
  const sections = splitIntoSections(normalized);

  if (sections.length > 0) {
    for (const section of sections) {
      const tier = PRIZE_TIERS[section.rank - 1];
      if (!tier) continue;
      const nums = section.text.match(/(?<!\d)\d{7}(?!\d)/g) ?? [];
      for (const num of nums) {
        results.push({
          drawNumber,
          drawDate,
          series: section.series ?? undefined,
          prizeRank: tier.rank,
          prizeAmount: tier.amount,
          winningNumber: num,
        });
      }
    }
  } else {
    // Fallback: assign numbers to tiers by position (1 for rank1, 1 for rank2, 2 for rank3, 2 for rank4, rest for rank5)
    // Expected distribution per Bangladesh Bank: 1, 1, 2, 4, 38 per series
    const countByRank = [1, 1, 2, 4, 38];
    let idx = 0;
    for (let rankIdx = 0; rankIdx < PRIZE_TIERS.length; rankIdx++) {
      const tier = PRIZE_TIERS[rankIdx];
      for (let i = 0; i < countByRank[rankIdx] && idx < allNumbers.length; i++, idx++) {
        results.push({
          drawNumber,
          drawDate,
          prizeRank: tier.rank,
          prizeAmount: tier.amount,
          winningNumber: allNumbers[idx],
        });
      }
    }
  }

  return results;
}

interface PdfSection {
  rank: number;
  series?: string;
  text: string;
}

function splitIntoSections(text: string): PdfSection[] {
  const sections: PdfSection[] = [];

  // Patterns for prize rank headers in English or transliterated Bangla
  const rankPatterns = [
    { rank: 1, pattern: /1st\s+prize|prize\s+1st|1[_\s]*m\s+pur|puraskar\s+1/i },
    { rank: 2, pattern: /2nd\s+prize|prize\s+2nd|2[_\s]*y\s+pur/i },
    { rank: 3, pattern: /3rd\s+prize|prize\s+3rd|3[_\s]*y\s+pur/i },
    { rank: 4, pattern: /4th\s+prize|prize\s+4th|4[_\s]*th\s+pur/i },
    { rank: 5, pattern: /5th\s+prize|prize\s+5th|5[_\s]*th\s+pur/i },
  ];

  // Find positions of each rank section
  const found: Array<{ rank: number; pos: number }> = [];
  for (const rp of rankPatterns) {
    const m = text.search(rp.pattern);
    if (m !== -1) found.push({ rank: rp.rank, pos: m });
  }

  if (found.length === 0) return [];

  found.sort((a, b) => a.pos - b.pos);

  for (let i = 0; i < found.length; i++) {
    const start = found[i].pos;
    const end = found[i + 1]?.pos ?? text.length;
    sections.push({
      rank: found[i].rank,
      text: text.slice(start, end),
    });
  }

  return sections;
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
