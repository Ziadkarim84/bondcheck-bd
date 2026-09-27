// Renders the Play feature graphic (1024x500) via headless Chrome.
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { writeFileSync, rmSync } from 'node:fs';

const font = (name: string, file: string) =>
  `@font-face{font-family:'${name}';src:url('file://${resolve('../mobile/assets/fonts', file)}')}`;

const html = `<html><head><style>
${font('Hind', 'NotoSansBengali-SemiBold.ttf')}${font('HindB', 'NotoSansBengali-Bold.ttf')}${font('Man', 'Manrope-800.ttf')}${font('Man7', 'Manrope-700.ttf')}
*{margin:0;box-sizing:border-box}
body{width:1024px;height:500px;overflow:hidden;background:#0B2A1F;position:relative;font-family:Hind}
.glow{position:absolute;right:-120px;top:-160px;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle,rgba(242,178,51,.32),rgba(242,178,51,0) 65%)}
.ring{position:absolute;right:40px;top:-60px;width:520px;height:520px;border-radius:50%;border:1px solid rgba(255,255,255,.07)}
.left{position:absolute;left:64px;top:0;bottom:0;width:520px;display:flex;flex-direction:column;justify-content:center}
.brand{display:flex;align-items:center;gap:14px;color:#fff;font-family:Man;font-size:26px;letter-spacing:-.3px}
.brand img{width:52px;height:52px;border-radius:14px}
h1{font-family:HindB;color:#fff;font-size:50px;line-height:1.28;margin-top:26px}
h1 em{font-style:normal;color:#F2B233}
p{color:rgba(255,255,255,.7);font-size:22px;margin-top:16px}
.card{position:absolute;right:64px;top:112px;width:340px;background:#fff;border-radius:28px;padding:28px 30px;box-shadow:0 30px 60px rgba(0,0,0,.35);transform:rotate(-3deg)}
.tag{display:inline-flex;align-items:center;gap:8px;background:#FDF1D6;color:#8A5B00;font-size:18px;padding:4px 14px;border-radius:999px}
.num{font-family:Man,HindB;font-size:40px;letter-spacing:4px;color:#0D1411;margin-top:18px}
.meta{color:#68736D;font-size:18px;margin-top:2px}
.amt{font-family:Man,HindB;font-size:44px;color:#8A5B00;margin-top:18px;letter-spacing:-1px}
.net{color:#46514B;font-size:18px}
</style></head><body>
<div class="glow"></div><div class="ring"></div>
<div class="left">
  <div class="brand"><img src="file://${resolve('../store/store-icon-512.png')}">BondCheck BD</div>
  <h1>প্রাইজবন্ড জিতেছে কিনা<br><em>নিজে থেকেই</em> জানুন</h1>
  <p>অ্যাকাউন্ট ছাড়াই · প্রতিটি ড্রয়ের পর মিলিয়ে দেখে</p>
</div>
<div class="card">
  <span class="tag"><svg width="18" height="18" viewBox="0 0 24 24" fill="#8A5B00"><path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3zm0 4H6v1a2 2 0 0 0 1 1.7V7zm10 0v2.7A2 2 0 0 0 18 8V7h-1z"/></svg>২য় পুরস্কার</span>
  <div class="num">0047748</div>
  <div class="meta">১২৩তম ড্র</div>
  <div class="amt">৳৩,২৫,০০০</div>
  <div class="net">কর বাদে ৳২,৬০,০০০</div>
</div>
</body></html>`;

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
const tmp = resolve('../store/.feature.html');
writeFileSync(tmp, html);
await page.goto('file://' + tmp, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: '../store/feature-graphic.png' });
await browser.close();
rmSync(tmp);
console.log('wrote ../store/feature-graphic.png');
