// Fetches prize-bond result PDFs from Bangladesh Bank. The site sits behind a
// bot shield that serves a JavaScript challenge to plain HTTP clients, so we go
// through a real (headless) Chrome.
import { chromium, type BrowserContext } from 'playwright-core';

const LIST_URL = 'https://www.bb.org.bd/en/index.php/investfacility/prizebond';

export interface DrawLink { drawNumber: number; url: string }

export async function withBB<T>(fn: (ctx: BrowserContext, links: DrawLink[]) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(LIST_URL, { waitUntil: 'networkidle', timeout: 90_000 });
    const html = await page.content();
    const urls = [...new Set(html.match(/https?:\/\/www\.bb\.org\.bd\/investfacility\/prizebond\/\d+(?:st|nd|rd|th)draw\.pdf/gi) ?? [])];
    const links = urls
      .map((url) => ({ url, drawNumber: Number(url.match(/(\d+)(?:st|nd|rd|th)draw/i)![1]) }))
      .sort((a, b) => b.drawNumber - a.drawNumber);
    return await fn(ctx, links);
  } finally {
    await browser.close();
  }
}

export async function downloadPdf(ctx: BrowserContext, url: string): Promise<Buffer> {
  const res = await ctx.request.get(url, { timeout: 60_000 });
  const body = await res.body();
  if (res.status() !== 200 || body.subarray(0, 4).toString() !== '%PDF') {
    throw new Error(`Not a PDF from ${url} (HTTP ${res.status()})`);
  }
  return body;
}
