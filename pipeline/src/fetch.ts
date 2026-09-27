// Downloads the most recent draw PDFs into pdfs/. Usage: npm run fetch [-- count]
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { withBB, downloadPdf } from './bb.ts';

const count = Number(process.argv[2] ?? 8);
mkdirSync('pdfs', { recursive: true });
await withBB(async (ctx, links) => {
  for (const l of links.slice(0, count)) {
    const file = `pdfs/${l.drawNumber}.pdf`;
    if (existsSync(file)) { console.log(`have ${file}`); continue; }
    writeFileSync(file, await downloadPdf(ctx, l.url));
    console.log(`saved ${file}`);
  }
});
