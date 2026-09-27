# BondCheck BD — বাংলাদেশ প্রাইজবন্ড চেকার

Tells Bangladeshi prize-bond holders, automatically, whether any of their bonds won.

Local-first: bonds live on the phone; there are no accounts and no user database. After each draw a small public `results.json` (last 8 draws = the 2-year claim window, ~6 KB) is published, and the app checks bonds on the device.

```
mobile/    Expo (React Native) Android app
pipeline/  Fetches Bangladesh Bank result PDFs, parses them, builds the site
site/      Static results website (nginx on Railway): results.json, a page per draw, checker, privacy policy
store/     Play Store listing text and graphics
docs/      Review and decisions (docs/REVIEW-2026-09-26.md), original planning docs
```

- Results site: https://bondcheck.hundredships.com
- Publish a new draw: `cd pipeline && npm run publish-draw`, then `cd ../site && railway up --detach --service bondcheck-site` (automated in `.github/workflows/publish-results.yml`).
- App: `cd mobile && npx expo prebuild --platform android && cd android && ./gradlew assembleRelease` (or `bundleRelease` for Play).
