# BondCheck BD — 100% Free Stack

> Every service listed here has a **permanently free tier** or is **open source / self-hosted**.
> No credit card required unless noted. Monthly cost: **$0**.

---

## Free Stack at a Glance

| Layer | Free Choice | Free Limits |
|---|---|---|
| API Hosting | Railway.app | $5 credit/month (covers light traffic) |
| Worker Process | Railway.app | Same $5 credit pool |
| Database | Railway MySQL | Included in $5 credit |
| Cache / Queue | Upstash Redis | 10,000 req/day, 256 MB |
| File Storage | Cloudinary | 25 GB storage, 25 GB bandwidth/month |
| OCR | Tesseract.js (self-hosted) | Unlimited — runs on your own server |
| Push Notifications | Firebase FCM | Unlimited |
| Email | Resend | 100 emails/day, 3,000/month |
| OTP / SMS | Email OTP (no SMS cost) | Free via Resend |
| Web Frontend | Vercel | Unlimited personal projects |
| Mobile Dev | Expo Go + EAS Free | 30 builds/month |
| CI/CD | GitHub Actions | 2,000 min/month (public repo: unlimited) |
| Error Monitoring | Sentry | 5,000 errors/month |
| Web Scraping | Puppeteer (self-hosted) | Unlimited — runs on your server |
| Domain | Railway/Vercel subdomain | Free (e.g. `bondcheck.up.railway.app`) |
| SSL | Auto via platforms | Free |

---

## 1. API & Worker Hosting — Railway.app

Railway gives **$5 of free credit every month**, which covers a small Node.js API
and a background worker running at low traffic.

### Why Railway over alternatives

| Platform | Free Tier | Catch |
|---|---|---|
| **Railway** ✅ | $5/month credit | Credit resets monthly |
| Render | 1 free web service | Spins down after 15 min idle |
| Fly.io | 3 shared VMs | Requires credit card |
| Cyclic | Serverless Node | No persistent workers |

### Deploy steps

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and init
railway login
railway init

# Deploy API
railway up

# Add MySQL and Redis as Railway plugins (one click in dashboard)
```

### `railway.toml` (monorepo)

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start"
restartPolicyType = "on_failure"
```

For the worker, create a second Railway service in the same project pointing to
the same repo with `startCommand = "npm run worker"`.

---

## 2. Database — Railway MySQL

Railway provisions a **MySQL 8** instance as a one-click plugin inside your project.
Connection string is auto-injected as `DATABASE_URL`.

```bash
# In Railway dashboard: New Plugin → MySQL
# Prisma picks it up automatically via DATABASE_URL env var

npx prisma migrate deploy
```

**Storage limit:** Railway free tier database storage is included in the $5 credit.
For a new app with a few thousand users this is more than sufficient.

**Alternative:** If you need more headroom, use **Turso** (SQLite-compatible, 500
databases, 9 GB storage free). Switch Prisma provider from `mysql` to `sqlite`.

---

## 3. Cache & Job Queue — Upstash Redis

Upstash is **serverless Redis** with a generous free tier.

- 10,000 commands/day
- 256 MB data
- Free forever (no expiry)

```bash
# Create free database at upstash.com
# Copy UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to Railway env vars
```

### BullMQ with Upstash

```typescript
// src/lib/redis.ts
import { Redis } from 'ioredis';

export const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
```

**Free tier caveat:** 10,000 commands/day is enough for development and early users.
Each OCR job uses ~5–10 Redis commands. So ~1,000–2,000 OCR jobs/day before hitting
the limit. More than enough to start.

---

## 4. File Storage — Cloudinary

Cloudinary replaces AWS S3/R2. Free tier gives:
- **25 GB** storage
- **25 GB** bandwidth/month
- Image transformations included

Bond images are typically 200–500 KB each. 25 GB = ~50,000–125,000 bond images free.

```bash
npm install cloudinary
```

```typescript
// src/services/storageService.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadBondImage(buffer: Buffer, userId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: `bonds/${userId}`, resource_type: 'image' },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve(result.secure_url);
      }
    ).end(buffer);
  });
}
```

---

## 5. OCR — Tesseract.js (replaces Google Cloud Vision)

This is the **most important substitution**. Instead of paying $1.50 per 1,000 images
to Google Vision, run Tesseract.js directly on your Railway server. Completely free.

Tesseract.js supports **Bengali (`ben`) + English (`eng`)** out of the box and
downloads language models automatically on first run.

```bash
npm install tesseract.js
```

### OCR Service

```typescript
// src/services/ocrService.ts
import Tesseract from 'tesseract.js';
import { normalizeBanglaDigits, extractBondNumbers } from '../utils/banglaDigits';

export async function runOCR(imagePath: string): Promise<string[]> {
  const { data } = await Tesseract.recognize(
    imagePath,
    'ben+eng',           // Bengali + English language packs
    {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    }
  );

  return extractBondNumbers(data.text);
}
```

### OCR Worker with Tesseract.js

```typescript
// src/workers/ocrWorker.ts
import { Worker } from 'bullmq';
import { runOCR } from '../services/ocrService';
import { downloadImage } from '../services/storageService';
import prisma from '../db';
import { redisConnection } from '../lib/redis';

const ocrWorker = new Worker(
  'ocr-queue',
  async (job) => {
    const { jobId, imageUrl, userId } = job.data;

    // 1. Download image from Cloudinary to temp buffer
    const localPath = await downloadImage(imageUrl, `/tmp/${jobId}.jpg`);

    // 2. Run Tesseract OCR (free, self-hosted)
    const bondNumbers = await runOCR(localPath);

    // 3. Update DB
    await prisma.ocrJob.update({
      where: { id: jobId },
      data: {
        status: bondNumbers.length > 0 ? 'done' : 'failed',
        resultJson: { numbers: bondNumbers },
      },
    });

    return { bondNumbers };
  },
  { connection: redisConnection }
);
```

### Quality Notes

| OCR Engine | Bengali Quality | Cost | Hosted |
|---|---|---|---|
| Tesseract.js | Good (printed bonds) | Free | Self |
| EasyOCR (Python) | Very Good | Free | Self |
| Google Vision | Excellent | $1.50/1K images | External |

For **printed prize bonds** (clean, standard format), Tesseract.js accuracy is very
good. Add image pre-processing with `sharp` to boost accuracy:

```bash
npm install sharp
```

```typescript
// src/services/imageService.ts
import sharp from 'sharp';

export async function preprocessForOCR(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace('.jpg', '_processed.jpg');
  await sharp(inputPath)
    .grayscale()
    .normalize()          // auto contrast stretch
    .sharpen()
    .threshold(128)       // binarize for cleaner OCR
    .toFile(outputPath);
  return outputPath;
}
```

---

## 6. Push Notifications — Firebase FCM

Firebase Cloud Messaging is **completely free with no limits** for push notifications.

```bash
npm install firebase-admin
```

No changes needed from the original blueprint — FCM is already free.

### Expo Push Notifications (alternative for mobile)

During development and for early users, **Expo Push Service** is also free and
simpler than setting up raw FCM/APNs:

```typescript
// React Native — uses Expo's free push service
import * as Notifications from 'expo-notifications';

const token = (await Notifications.getExpoPushTokenAsync()).data;
// Send this token to your backend
```

On the backend, send via Expo's free HTTP API:

```typescript
import Expo from 'expo-server-sdk';

const expo = new Expo();

async function sendExpoPush(token: string, title: string, body: string) {
  if (!Expo.isExpoPushToken(token)) return;
  await expo.sendPushNotificationsAsync([{ to: token, title, body }]);
}
```

---

## 7. Email & OTP — Resend

Resend free tier: **100 emails/day**, 3,000/month.

Use **email OTP** instead of SMS OTP. This removes the SMS cost entirely ($5–20/month).

```bash
npm install resend
```

```typescript
// src/services/emailService.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(email: string, otp: string) {
  await resend.emails.send({
    from: 'BondCheck BD <noreply@bondcheckbd.com>',
    to: email,
    subject: 'আপনার OTP কোড / Your OTP Code',
    html: `
      <p>আপনার OTP কোড: <strong>${otp}</strong></p>
      <p>Your OTP code: <strong>${otp}</strong></p>
      <p>This code expires in 10 minutes.</p>
    `,
  });
}

export async function sendWinNotificationEmail(
  email: string,
  bondNumber: string,
  prizeAmount: number,
  drawNumber: number
) {
  await resend.emails.send({
    from: 'BondCheck BD <noreply@bondcheckbd.com>',
    to: email,
    subject: '🎉 আপনার প্রাইজবন্ড জিতেছে!',
    html: `
      <h2>অভিনন্দন! 🎉</h2>
      <p>বন্ড নং <strong>${bondNumber}</strong> ড্র নং <strong>${drawNumber}</strong>-এ জিতেছে।</p>
      <p>পুরস্কার: <strong>৳${prizeAmount.toLocaleString()}</strong></p>
      <p>Congratulations! Bond #${bondNumber} won ৳${prizeAmount.toLocaleString()} in draw #${drawNumber}.</p>
    `,
  });
}
```

**Note on SMS:** Skip SMS OTP for now. Email OTP is equally secure. Add SMS only
when you have paying users who can fund the ~$5–20/month SMS cost.

---

## 8. Web Frontend — Vercel

Vercel free tier for personal projects:
- Unlimited deployments
- 100 GB bandwidth/month
- Auto SSL, CDN, preview URLs

```bash
npm install -g vercel
cd web
vercel --prod
```

Auto-deploys on every `git push` via GitHub integration.

---

## 9. Mobile — Expo + EAS Free Tier

```bash
# Development: use Expo Go app (completely free)
npx expo start

# Build for distribution: EAS Build free tier
# 30 builds/month on free plan
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android   # APK for testing
```

For testing with real users before app store submission, distribute via:
- **Expo Go** (scan QR code, instant)
- **EAS internal distribution** (direct APK link, free)

---

## 10. CI/CD — GitHub Actions

Free for public repos (unlimited). Free for private repos: 2,000 minutes/month.

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: ./backend

      - name: Run tests
        run: npm test
        working-directory: ./backend

      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: 'api'
```

---

## 11. Error Monitoring — Sentry Free

Sentry free tier: **5,000 errors/month**, 14-day retention.

```bash
npm install @sentry/node
```

```typescript
// src/app.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

---

## 12. Result Fetching — Puppeteer (self-hosted)

Puppeteer runs on your Railway server at no extra cost. It is already open source.

The only change needed: install Chromium system dependencies for Railway's Linux
environment.

```dockerfile
# Dockerfile
FROM node:20-slim

# Chromium deps for Puppeteer on Linux
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-noto \
    fonts-noto-cjk \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

```typescript
// src/services/resultFetcher.ts
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? undefined,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],  // required on Linux
});
```

---

## 13. Domain & SSL

While you can register a `.com` domain (~$10–12/year), use **free platform subdomains**
at zero cost:

| Service | Free Subdomain |
|---|---|
| Railway | `bondcheck.up.railway.app` |
| Vercel (web) | `bondcheck-web.vercel.app` |

SSL certificates are auto-provisioned by both platforms via Let's Encrypt.

When ready for a custom domain, `.xyz` domains cost as little as **$1/year** on
Namecheap or Porkbun.

---

## 14. Free Tier Limits Summary

| Component | Limit | Expected Usage (MVP) |
|---|---|---|
| Railway ($5 credit) | ~500 dyno-hours/month | Sufficient for < 500 daily users |
| Upstash Redis | 10,000 req/day | ~1,000 OCR jobs/day |
| Cloudinary storage | 25 GB | ~50,000–100,000 bond images |
| Cloudinary bandwidth | 25 GB/month | Image loads for ~50K users |
| Resend email | 100/day, 3K/month | All OTP + win notifications |
| Sentry errors | 5,000/month | Fine for early stage |
| EAS builds | 30/month | Fine for development |
| GitHub Actions | 2,000 min/month | ~100+ deployments |

---

## 15. Quick Start — Free Stack

```bash
# 1. Clone and set up monorepo
mkdir bondcheck-bd && cd bondcheck-bd
mkdir backend web mobile

# 2. Backend setup
cd backend
npm init -y
npm install express typescript prisma @prisma/client
npm install bullmq ioredis node-cron
npm install tesseract.js sharp cloudinary
npm install firebase-admin puppeteer
npm install jsonwebtoken bcryptjs zod resend
npm install -D ts-node nodemon @types/express @types/node

# 3. Prisma init (MySQL from Railway)
npx prisma init --datasource-provider mysql

# 4. Web setup
cd ../web
npm create vite@latest . -- --template react-ts
npm install @tanstack/react-query axios tailwindcss react-router-dom

# 5. Mobile setup
cd ../mobile
npx create-expo-app . --template expo-template-blank-typescript
npx expo install expo-camera expo-image-picker expo-notifications
npm install @react-navigation/native @react-navigation/bottom-tabs zustand

# 6. Deploy
railway login && railway init && railway up  # backend
cd ../web && vercel --prod                   # frontend
```

### Required Free Accounts (sign up once)

- [ ] [Railway.app](https://railway.app) — API + DB + Redis
- [ ] [Cloudinary.com](https://cloudinary.com) — image storage
- [ ] [Firebase Console](https://console.firebase.google.com) — push notifications
- [ ] [Resend.com](https://resend.com) — email / OTP
- [ ] [Sentry.io](https://sentry.io) — error monitoring
- [ ] [Vercel.com](https://vercel.com) — web frontend
- [ ] [Expo.dev](https://expo.dev) — mobile builds
- [ ] [GitHub.com](https://github.com) — source control + CI/CD

---

*Total monthly cost: **$0*** — until you have real users and real revenue.
