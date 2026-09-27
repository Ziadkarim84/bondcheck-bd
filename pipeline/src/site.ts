// Static results site: one page per draw, a number checker, privacy policy.
// Output goes to ../site/public (served by nginx on Railway).
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Draw } from './parse.ts';

export interface ResultsData {
  version: number;
  updatedAt: string;
  latestDraw: number;
  nextDrawExpected: string;
  claimYears: number;
  taxRate: number;
  draws: Draw[];
}

const OUT = '../site/public';
const SITE_URL = (process.env.SITE_URL ?? 'https://bondcheck.hundredships.com').replace(/\/$/, '');
const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.bondcheckbd.app';
const ADMOB_PUB = 'pub-1144671244479208';
const CONTACT = 'zklab@hundredships.com';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const bn = (s: string | number) => String(s).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
const taka = (n: number) => '৳' + n.toLocaleString('en-IN');
const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateBn = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${bn(d)} ${MONTHS_BN[m - 1]} ${bn(y)}`; };
const dateEn = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS_EN[m - 1]} ${y}`; };
const ordinalBn = (n: number) => `${bn(n)}তম`;
const RANK_BN = ['', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম'];
const RANK_EN = ['', '1st', '2nd', '3rd', '4th', '5th'];

function write(path: string, body: string) {
  const file = `${OUT}/${path}`;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

function page(opts: { title: string; description: string; path: string; body: string; checker?: boolean }) {
  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${opts.title}</title>
<meta name="description" content="${opts.description}">
<link rel="canonical" href="${SITE_URL}${opts.path}">
<meta property="og:title" content="${opts.title}">
<meta property="og:description" content="${opts.description}">
<meta name="theme-color" content="#0B3D2E">
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@500;600;700&family=Manrope:wght@500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<header class="top"><div class="wrap row">
  <a class="brand" href="/"><img src="/assets/icon.svg" alt="" width="32" height="32"><span>BondCheck BD</span></a>
  <a class="btn small" href="${PLAY_URL}">অ্যাপ ডাউনলোড</a>
</div></header>
<main class="wrap">${opts.body}</main>
<footer class="wrap foot">
  <p>ফলাফলের উৎস: বাংলাদেশ ব্যাংক (bb.org.bd)। নিশ্চিত হতে সবসময় অফিসিয়াল ফলাফল মিলিয়ে নিন।<br>Results from Bangladesh Bank. Always confirm with the official result before claiming.</p>
  <p><a href="/privacy/">Privacy policy</a> · <a href="mailto:${CONTACT}">${CONTACT}</a></p>
</footer>
${opts.checker ? '<script src="/assets/checker.js" defer></script>' : ''}
</body>
</html>`;
}

function checker(data: ResultsData) {
  return `<section class="card checker" id="check">
  <h2>আপনার বন্ড মিলিয়ে দেখুন <span class="en">Check your bond</span></h2>
  <p class="muted">শেষ ${bn(data.draws.length)}টি ড্র (দাবি করার সময়সীমার মধ্যে) এর সাথে মেলানো হবে।</p>
  <form class="check-form" autocomplete="off">
    <input name="n" inputmode="numeric" maxlength="7" placeholder="০১২৩৪৫৬" aria-label="7-digit bond number">
    <button class="btn" type="submit">মিলিয়ে দেখুন</button>
  </form>
  <div class="check-out" aria-live="polite"></div>
</section>`;
}

function prizeBlocks(d: Draw) {
  return d.prizes.map((p) => `<div class="prize r${p.rank}">
    <div class="prize-head"><span class="rank">${RANK_BN[p.rank]} পুরস্কার <span class="en">${RANK_EN[p.rank]} prize</span></span><span class="amount">${taka(p.amount)}</span></div>
    <div class="nums">${p.numbers.map((n) => `<span class="num">${n}</span>`).join('')}</div>
  </div>`).join('');
}

function appCta() {
  return `<section class="card cta">
  <div><h2>প্রতি ড্র-তে নিজে থেকে চেক করুন</h2><p class="muted">আপনার সব বন্ড নম্বর একবার যোগ করুন, প্রতিটি নতুন ড্রয়ের পর BondCheck BD নিজেই মিলিয়ে দেখবে এবং জিতলে জানাবে। কোনো অ্যাকাউন্ট লাগবে না।</p></div>
  <a class="btn" href="${PLAY_URL}">Google Play থেকে নিন</a>
</section>`;
}

export function buildSite(data: ResultsData) {
  const latest = data.draws[0];
  write('data/results.json', JSON.stringify(data));
  mkdirSync(`${OUT}/assets`, { recursive: true });
  copyFileSync('assets/site.css', `${OUT}/assets/site.css`);

  // Draw pages
  for (const d of data.draws) {
    const title = `${ordinalBn(d.draw)} প্রাইজবন্ড ড্র ফলাফল ${bn(d.date.slice(0, 4))} | ${d.draw}th Prize Bond Draw Result`;
    const body = `
<nav class="crumbs"><a href="/">সব ড্র</a> › ${ordinalBn(d.draw)} ড্র</nav>
<section class="hero">
  <p class="over">${dateBn(d.date)} · ${dateEn(d.date)}</p>
  <h1>${ordinalBn(d.draw)} প্রাইজবন্ড ড্র-এর ফলাফল</h1>
  <p class="sub">100 Taka Prize Bond · ${d.draw}th draw result</p>
</section>
${checker(data)}
<section class="card"><h2>বিজয়ী নম্বর <span class="en">Winning numbers</span></h2>
<p class="muted">একই ৪৬টি নম্বর সব সিরিজের জন্য প্রযোজ্য। Same 46 numbers apply to every series.</p>
${prizeBlocks(d)}</section>
${appCta()}`;
    write(`draw/${d.draw}/index.html`, page({ title, description: `${ordinalBn(d.draw)} প্রাইজবন্ড ড্র (${dateBn(d.date)}) এর সব বিজয়ী নম্বর। 1st prize ${d.prizes[0].numbers[0]}, 2nd prize ${d.prizes[1].numbers[0]}.`, path: `/draw/${d.draw}/`, body, checker: true }));
  }

  // Home
  const home = `
<section class="hero">
  <p class="over">সর্বশেষ ড্র · ${dateBn(latest.date)}</p>
  <h1>প্রাইজবন্ড ড্র-এর ফলাফল</h1>
  <p class="sub">Bangladesh 100 Taka Prize Bond results — latest draw ${latest.draw}, ${dateEn(latest.date)}</p>
  <div class="stats">
    <div><strong>${taka(latest.prizes[0].amount)}</strong><span>১ম পুরস্কার: ${latest.prizes[0].numbers[0]}</span></div>
    <div><strong>${bn(46)}টি</strong><span>বিজয়ী নম্বর, সব সিরিজে</span></div>
    <div><strong>${dateBn(data.nextDrawExpected)}</strong><span>পরের ড্র (আনুমানিক)</span></div>
  </div>
</section>
${checker(data)}
<section class="card"><h2>${ordinalBn(latest.draw)} ড্র-এর বিজয়ী নম্বর</h2>
${prizeBlocks(latest)}
<p><a class="link" href="/draw/${latest.draw}/">পুরো ফলাফল দেখুন →</a></p></section>
<section class="card"><h2>আগের ড্রগুলো <span class="en">Previous draws</span></h2>
<ul class="draws">${data.draws.map((d) => `<li><a href="/draw/${d.draw}/"><span>${ordinalBn(d.draw)} ড্র</span><span class="muted">${dateBn(d.date)}</span></a></li>`).join('')}</ul>
<p class="muted small">পুরস্কার ড্র-এর তারিখ থেকে ${bn(data.claimYears)} বছরের মধ্যে দাবি করতে হয়; উৎসে ${bn(data.taxRate * 100)}% কর কাটা হয়।</p></section>
${appCta()}`;
  write('index.html', page({
    title: `প্রাইজবন্ড ড্র ফলাফল ${bn(latest.date.slice(0, 4))} — ${ordinalBn(latest.draw)} ড্র | Prize Bond Result`,
    description: `সর্বশেষ ${ordinalBn(latest.draw)} প্রাইজবন্ড ড্র-এর ফলাফল (${dateBn(latest.date)})। আপনার বন্ড নম্বর দিয়ে শেষ ${bn(data.draws.length)}টি ড্র এক ক্লিকে মিলিয়ে দেখুন।`,
    path: '/', body: home, checker: true,
  }));

  // Privacy (covers the app too)
  write('privacy/index.html', page({
    title: 'Privacy policy — BondCheck BD', description: 'How BondCheck BD handles your data.', path: '/privacy/',
    body: `<section class="card prose"><h1>Privacy policy</h1><p class="muted">Last updated ${dateEn(data.updatedAt.slice(0, 10))}</p>
<p><strong>BondCheck BD</strong> (the app and this website) helps you check Bangladesh prize bond results.</p>
<h2>Your bond numbers stay on your phone</h2><p>The app has no accounts. Bond numbers you add are stored only on your device (and in your phone's own Android backup, if you use it). They are never sent to us. The app downloads the public list of winning numbers from this website and checks your bonds on your phone.</p>
<h2>Website checker</h2><p>The number checker on this website runs in your browser. The number you type is not sent to us.</p>
<h2>Advertising</h2><p>The free app shows ads from Google AdMob, and this website may show Google AdSense ads. Google may use your device's advertising ID and approximate location to show and measure ads, according to <a href="https://policies.google.com/technologies/partner-sites">Google's policy</a>. Users in the EEA/UK are asked for consent first. You can reset or delete your advertising ID in your phone's settings.</p>
<h2>Notifications</h2><p>If you allow notifications, the app checks this website for new results in the background and shows a notification on your phone when a new draw is published or one of your bonds wins. The check only downloads the public results; nothing about you or your bonds is sent.</p>
<h2>Purchases</h2><p>BondCheck BD Pro is sold through Google Play. We don't receive your payment details.</p>
<h2>Crash reports</h2><p>Google Play may share anonymous crash and performance data with us.</p>
<h2 id="delete">Deleting your data</h2><p>Everything the app stores (your bond numbers, settings and Pro status) is on your phone. To delete it, remove bonds in the app, or clear the app's storage (Settings → Apps → BondCheck BD → Storage → Clear storage), or uninstall the app. We keep no copy, so there is nothing to request from us. Advertising data held by Google can be managed in your Google account and by resetting or deleting your advertising ID in your phone's settings. Questions: <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
<h2>Contact</h2><p><a href="mailto:${CONTACT}">${CONTACT}</a></p></section>`,
  }));

  write('app-ads.txt', `google.com, ${ADMOB_PUB}, DIRECT, f08c47fec0942fa0\n`);
  write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  const urls = ['/', ...data.draws.map((d) => `/draw/${d.draw}/`), '/privacy/'];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${SITE_URL}${u}</loc><lastmod>${data.updatedAt.slice(0, 10)}</lastmod></url>`).join('')}</urlset>\n`);
  copyFileSync('assets/checker.js', `${OUT}/assets/checker.js`);
  copyFileSync('assets/icon.svg', `${OUT}/assets/icon.svg`);
}
