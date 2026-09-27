// Renders the app icon set from SVG via headless Chrome.
import { chromium } from 'playwright-core';
const bond = (fill = '#fff', ink = '#0B5E41') => `
  <rect x="222" y="352" width="580" height="360" rx="56" fill="${fill}" transform="rotate(-6 512 532)"/>
  <g transform="rotate(-6 512 532)">
    <circle cx="352" cy="500" r="62" fill="none" stroke="${ink}" stroke-width="30"/>
    <rect x="460" y="456" width="250" height="36" rx="18" fill="${ink}"/>
    <rect x="460" y="524" width="170" height="36" rx="18" fill="${ink}" opacity=".45"/>
    <rect x="300" y="620" width="410" height="30" rx="15" fill="${ink}" opacity=".25"/>
  </g>`;
const seal = `<circle cx="760" cy="330" r="130" fill="#F2B233" stroke="#0B3D2E" stroke-width="22"/>
  <path d="M700 330l44 44 82-86" fill="none" stroke="#0B3D2E" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>`;
const bg = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16A06E"/><stop offset="1" stop-color="#0A5A3E"/></linearGradient>
  <radialGradient id="glow" cx=".78" cy=".2" r=".6"><stop offset="0" stop-color="#F2B233" stop-opacity=".35"/><stop offset="1" stop-color="#F2B233" stop-opacity="0"/></radialGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/><rect width="1024" height="1024" fill="url(#glow)"/>`;
const svgs: Record<string, string> = {
  'icon.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${bg}${bond()}${seal}</svg>`,
  // Adaptive foreground: art scaled into the 66% safe zone, transparent background.
  'adaptive-icon.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><g transform="translate(512 512) scale(.62) translate(-512 -512)">${bond()}${seal}</g></svg>`,
  'splash.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><g transform="translate(512 512) scale(.5) translate(-512 -512)">${bond()}${seal}</g></svg>`,
  'notification-icon.png': `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><g transform="scale(.09375)">${bond('#fff', 'transparent')}<circle cx="760" cy="330" r="130" fill="#fff"/></g></svg>`,
  'store-icon-512.png': `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><g transform="scale(.5)">${bg}${bond()}${seal}</g></svg>`,
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
for (const [name, svg] of Object.entries(svgs)) {
  const size = Number(svg.match(/width="(\d+)"/)![1]);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  const out = name.startsWith('store') ? `../store/${name}` : `../mobile/assets/${name}`;
  await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', out);
}
await browser.close();
