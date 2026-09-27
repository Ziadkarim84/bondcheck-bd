// Builds data/results.json (last 8 draws = the 2-year claim window) and the
// static results site. Usage:
//   npm run publish-draw            fetch newest PDFs from Bangladesh Bank, then build
//   npm run publish-draw -- --local only use PDFs already in pdfs/ (manual fallback:
//                                   save a PDF as pdfs/<draw>.pdf from a browser)
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { withBB, downloadPdf } from './bb.ts';
import { parsePdf, type Draw } from './parse.ts';
import { buildSite } from './site.ts';

const KEEP = 8;
const local = process.argv.includes('--local');
mkdirSync('pdfs', { recursive: true });

if (!local) {
  await withBB(async (ctx, links) => {
    for (const l of links.slice(0, KEEP)) {
      const file = `pdfs/${l.drawNumber}.pdf`;
      if (!existsSync(file)) {
        writeFileSync(file, await downloadPdf(ctx, l.url));
        console.log(`downloaded draw ${l.drawNumber}`);
      }
    }
  });
}

const numbers = readdirSync('pdfs').map((f) => Number(f.replace('.pdf', ''))).filter(Boolean).sort((a, b) => b - a).slice(0, KEEP);
const draws: Draw[] = [];
for (const n of numbers) draws.push(await parsePdf(readFileSync(`pdfs/${n}.pdf`), n));

// Draws are roughly quarterly; the next one is expected ~3 months after the latest.
const last = new Date(draws[0].date + 'T00:00:00Z');
const next = new Date(last);
next.setUTCMonth(next.getUTCMonth() + 3);

const data = {
  version: 1,
  updatedAt: new Date().toISOString(),
  latestDraw: draws[0].draw,
  nextDrawExpected: next.toISOString().slice(0, 10),
  claimYears: 2,
  taxRate: 0.2,
  draws,
};
buildSite(data);
console.log(`published ${draws.length} draws (latest ${draws[0].draw}, ${draws[0].date}); next expected ~${data.nextDrawExpected}`);
