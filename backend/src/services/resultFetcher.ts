import puppeteer from 'puppeteer';
import prisma from '../db';

export interface DrawResultInput {
  drawNumber: number;
  drawDate: string; // ISO date string e.g. "2025-01-31"
  series?: string;
  prizeRank: number;
  prizeAmount: number;
  winningNumber: string;
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

/**
 * Scrape latest results from prizebond.ird.gov.bd.
 * This is a best-effort scraper. If the site changes its HTML structure,
 * use the admin manual upload endpoint as fallback.
 */
export async function scrapeLatestResults(): Promise<DrawResultInput[]> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    );

    await page.goto('https://www.bb.org.bd/fnansys/paymentsys/prizebond.php', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Extract text from the page — adapt selectors once you inspect the live page
    // page.evaluate runs in browser context; cast to any for TypeScript
    const rawText = await page.evaluate(() => {
      // @ts-ignore — this runs inside headless Chromium, not Node.js
      return document.body.innerText; // eslint-disable-line no-undef
    }) as string;

    const results = parseResultsFromText(rawText);
    console.log(`Scraper: found ${results.length} results`);
    return results;
  } finally {
    await browser.close();
  }
}

/**
 * Parse prize bond results from scraped text.
 * Patterns: 7-digit numbers near prize amounts.
 * Adjust regex based on actual page structure.
 */
function parseResultsFromText(text: string): DrawResultInput[] {
  const results: DrawResultInput[] = [];

  // Draw number pattern: "122nd Draw" or "ড্র নং ১২২"
  const drawMatch = text.match(/(\d+)(?:st|nd|rd|th)?\s*draw/i);
  const drawNumber = drawMatch ? parseInt(drawMatch[1], 10) : 0;

  // Date pattern
  const dateMatch = text.match(/\d{1,2}[\s/-]\w+[\s/-]\d{4}/);
  const drawDate = dateMatch ? new Date(dateMatch[0]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  if (!drawNumber) return results;

  // Prize structure — look for 7-digit numbers near prize labels
  const prizePatterns: Array<{ rank: number; amount: number; pattern: RegExp }> = [
    { rank: 1, amount: 600000, pattern: /1st[^0-9]*(\d{7})/i },
    { rank: 2, amount: 325000, pattern: /2nd[^0-9]*(\d{7})/i },
    { rank: 3, amount: 100000, pattern: /3rd[^0-9]*(\d{7})/ig },
    { rank: 4, amount: 50000, pattern: /4th[^0-9]*(\d{7})/ig },
    { rank: 5, amount: 10000, pattern: /5th[^0-9]*(\d{7})/ig },
  ];

  for (const pp of prizePatterns) {
    let match;
    const re = new RegExp(pp.pattern.source, pp.pattern.flags);
    while ((match = re.exec(text)) !== null) {
      results.push({
        drawNumber,
        drawDate,
        prizeRank: pp.rank,
        prizeAmount: pp.amount,
        winningNumber: match[1],
      });
    }
  }

  return results;
}
