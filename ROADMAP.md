# BondCheck BD — Feature Roadmap

## Completed

- [x] User auth (password + OTP + JWT refresh tokens)
- [x] Bond CRUD (add, delete, list)
- [x] Range bond entry (e.g. 0000010–0000100)
- [x] OCR bond scanning (camera + gallery, Tesseract)
- [x] PDF parser for Bangladesh Bank draw results (Bijoy encoding)
- [x] Automatic matching engine (bonds vs draw results)
- [x] Push notifications (Expo + FCM) on win
- [x] Email notifications on win (via Resend)
- [x] Admin tools (PDF upload, debug, rematch, clear)
- [x] Scheduler for auto-fetching quarterly draws
- [x] Free/Premium tier system (50 bond limit for free)
- [x] AdMob integration (banner + interstitial, free tier only)
- [x] Onboarding slides (3-step intro)
- [x] Bilingual support (Bangla + English)
- [x] Draw countdown on home screen
- [x] Win sharing (native share)
- [x] Prize expiry warnings (90-day countdown)
- [x] Results accordion (latest + 7 previous draws)
- [x] Bond search & sort (by date, number, series)
- [x] CSV export (premium only)
- [x] Web app (login, bonds, results, matches)
- [x] Privacy policy page

---

## High Impact, Low Effort

- [ ] Win history & analytics — chart of wins over time, total earnings, win rate
- [ ] Draw reminder push notification — 1 day before each quarterly draw
- [ ] Smart notifications — "You have 47 bonds in the next draw" before draw day
- [x] Social sharing / referral — invite friends with referral link (5 bonus slots per referral, base limit 25)
- [ ] Claim deadline tracker — prominent countdown for unclaimed prizes (2-year expiry)

## Medium Effort, High Differentiation

- [ ] Live draw day experience — real-time "checking your bonds..." animation on draw day
- [ ] Bond portfolio value dashboard — total invested, total won, ROI %
- [ ] Family/group bonds — organize bonds by person/family member
- [ ] Claim guide — step-by-step instructions for claiming prize money (bank, docs, tax)
- [ ] Duplicate bond detection — warn if bond already registered by another user

## Bigger Bets

- [ ] WhatsApp/SMS notifications — WhatsApp Business API or Twilio SMS
- [ ] Bond marketplace — list bonds for sale/transfer
- [ ] Historical win statistics — fun patterns like "numbers ending in 7 win more"
- [ ] Android home screen widget — countdown to next draw + bond count

## Platform & Distribution

- [ ] Wire up Google Play billing (premium subscriptions)
- [ ] Play Store submission (needs $25 Google Play Dev account)
- [ ] iOS build (needs $99/yr Apple Dev account)
- [ ] Custom domain for web app
- [ ] SEO / landing page for organic traffic

## Technical Debt

- [ ] Fix EAS build issue ("Failed to resolve plugin for module expo-router")
- [ ] Upgrade Vite CJS deprecation warning
- [ ] Add automated tests (backend API + mobile screens)
- [ ] Rate limiting on public endpoints
- [ ] Error monitoring (Sentry or similar)
