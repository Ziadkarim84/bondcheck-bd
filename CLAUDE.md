# BondCheck BD — Bangladesh prize-bond checker

Tells Bangladeshi prize-bond holders, automatically, whether any of their bonds won. Audience: Bangladesh, Bangla first, English second. Draws are roughly quarterly; each draw has 46 winning numbers (1×৳6 lakh, 1×৳3.25 lakh, 2×৳1 lakh, 2×৳50k, 40×৳10k) that apply to every series. 20% tax at source; claim within 2 years.

Moved here from ~/personal-projects/Prize bond checker on 2026-09-26 (original planning docs in `docs/planning/`). v2 (local-first rebuild) is on branch `v2-local-first`; the old backend/web live only in git history. Git remote: git@github.com:Ziadkarim84/bondcheck-bd.git.

## Architecture (v2, local-first, no accounts)
- `pipeline/` (Node 20 arm64 — the nvm v22 installs are x64 and break esbuild; use `PATH=~/.nvm/versions/node/v20.17.0/bin:$PATH`, tsx): `npm run publish-draw` fetches Bangladesh Bank PDFs through headless Chrome (bb.org.bd serves a JS bot challenge to plain HTTP; PDF links use ordinal suffixes 121st/122nd/123rd/124th), parses them (Bijoy-encoded; must yield 1/1/2/2/40 numbers), reads the real draw date from the PDF, writes `site/public/data/results.json` (last 8 draws, ~6 KB) and the static site. `--local` uses PDFs already in `pipeline/pdfs/`. App icons: `npx tsx src/icons.ts`.
- `site/` nginx on Railway project `bondcheck-site` (service `bondcheck-site`): https://bondcheck.hundredships.com — home, `/draw/<n>/`, in-browser number checker, `/privacy/` (covers the app), `app-ads.txt`, sitemap. Deploy: `cd site && railway up --detach --service bondcheck-site`.
- `.github/workflows/publish-results.yml` runs the pipeline on a schedule in draw months and deploys when results change (needs repo secret `RAILWAY_TOKEN`).
- `mobile/` Expo SDK 54 + expo-router + zustand. Package `com.bondcheckbd.app`. State in `documents/state.json`; results cached in `documents/results.json` with a bundled snapshot `assets/results.json` (copy the latest from `site/public/data/` before each release). Background check every 12h (expo-background-task) + check on app open → local notification for a new draw or a win.
  - Key files: `src/store.ts` (limits), `src/results.ts` (fetch/match), `src/notify.ts`, `src/ads.tsx`, `src/iap.ts`, `src/i18n.ts` (all strings bn/en), `src/theme.ts` (tokens), `src/ui/kit.tsx`.
  - Build: `npx expo prebuild --platform android`, then in `android/`: `ANDROID_HOME=/usr/local/share/android-commandlinetools NODE_ENV=production ./gradlew assembleRelease` (APK for emulator) or `bundleRelease` (AAB for Play). Release signing: `plugins/withReleaseSigning.js` reads `../signing/keystore.properties` (upload key `signing/upload-keystore.jks`, git-ignored; owner must back up). Copy AABs to `release/` (git-ignored). Use Node 22 for mobile. `android/` is generated and git-ignored. Emulator AVD: `tankbook`.

## Monetization (owner-approved)
- Free: 30 bonds. Rewarded ad: +3 slots each, up to 60 total. Pro (`bondcheck_pro`, one-time Play purchase, ~৳199–299): unlimited bonds + no ads. Backup/restore file is free.
- Banners on Home/Bonds/Results; at most one interstitial per session, after adding bonds; never gate the win result behind an ad.
- AdMob app `ca-app-pub-1144671244479208~4979757958` (GDPR consent message "Nonet + BondCheck GDPR consent" published 2026-09-27 — before that the app had none); banner `/2473848269`, interstitial `/4486735681`, rewarded `/2613260398` (3 slots). Debug builds always use test IDs.
- Results website: AdSense planned; needs a custom domain (AdSense won't accept *.up.railway.app).

## Design rules
- Emerald accent (#0B8457), dark green hero card, gold only for wins. Noto Sans Bengali for Bangla text (Hind Siliguri was dropped: its "১" glyph looked wrong to users), Manrope for figures and bond numbers. Ionicons only, no emoji.
- Android under-measures Bangla conjunct/nukta clusters (২য়, ৪র্থ): short labels in a row need `flex: 1` or they get clipped.
- Every user-facing string lives in `src/i18n.ts` in both languages.
- Keep scope to `docs/REVIEW-2026-09-26.md` (sections 2 and 6); no new features without a user need.

## Current state (2026-09-26)
- Pipeline + site live; draws 117–124 published (latest 124 on 2026-08-02; next expected ~2026-11-02).
- App rebuilt and tested on the emulator (welcome, add range, win detection, bonds, results, settings). Not yet on Play.
- Domain bondcheck.hundredships.com (Cloudflare DNS, CNAME + Railway TXT) live 2026-09-27.
- Signed AAB `release/bondcheck-bd-1.0.0-vc2.aab` (versionCode 2, Noto Sans Bengali) built 2026-09-27 (vc1 was uploaded to Play but dropped — old font); Play app created 2026-09-27: app id 4975718801115101719 (default language bn-BD, free).
- Play: closed-test track "Alpha" 4699336700278906109 (177 countries, list "CarJot testers", feedback zklab@) has draft release vc2; bn-BD store listing done (store/feature-graphic.png via `npx tsx src/feature.ts`, store/shots/); `bondcheck_pro` active at ৳199 (one-time product, purchase option `buy`).
- 2026-09-27: closed test (vc2) + listing (bn-BD default, en-US) + all app-content declarations (answers in store/data-safety.md; category Tools; IARC done) SENT FOR REVIEW. Owner approved accepting terms and submitting.
- To do: after review passes, testers opt in (same 12 as CarJot); run 14 days; then production. Add RAILWAY_TOKEN secret, commit and push `v2-local-first` (nothing committed yet — ask owner first); AdSense for the site.
