# Bangladesh Prize Bond Checker — Full Product Blueprint

> **Author:** Ziad Karim
> **Stack:** Node.js · TypeScript · MySQL · React Native · React
> **Date:** March 2026

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [How Bangladesh Prize Bonds Work](#2-how-bangladesh-prize-bonds-work)
3. [System Architecture](#3-system-architecture)
4. [Tech Stack Decision](#4-tech-stack-decision)
5. [Database Schema](#5-database-schema)
6. [Backend API Design](#6-backend-api-design)
7. [OCR Pipeline — Reading Bond Numbers from Images](#7-ocr-pipeline--reading-bond-numbers-from-images)
8. [Result Fetching Engine](#8-result-fetching-engine)
9. [Matching & Notification Engine](#9-matching--notification-engine)
10. [Mobile App — React Native (iOS + Android)](#10-mobile-app--react-native-ios--android)
11. [Web App — React](#11-web-app--react)
12. [Push Notification System](#12-push-notification-system)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Monetization Strategy](#14-monetization-strategy)
15. [Development Phases & Timeline](#15-development-phases--timeline)
16. [Third-Party Services & Cost Estimate](#16-third-party-services--cost-estimate)
17. [Legal & Compliance Considerations](#17-legal--compliance-considerations)

---

## 1. Product Overview

**BondCheck BD** (suggested name) is a multi-platform application that lets Bangladeshi citizens photograph their ৳100 prize bonds and automatically be notified when any of their bonds win a prize in each quarterly draw.

### Core Pain Points Solved

| Problem | Solution |
|---|---|
| Manual number-by-number comparison | OCR extracts numbers automatically from photos |
| No physical app access to results | Automatic fetch from official sources every draw |
| Hard to manage many bonds | Unlimited bond wallet with image storage |
| No alert system | Push notifications on draw day |
| Only English numbers recognized by most apps | Dual Bangla + English OCR pipeline |

---

## 2. How Bangladesh Prize Bonds Work

- Denomination: ৳100 (only denomination currently active)
- Issued by: Bangladesh Bank & National Savings Directorate
- Draws: 4 times per year (last day of January, April, July, October)
- Official result sources:
  - `prizebond.ird.gov.bd` — PBRIS (Prize Bond Result Inquiry Software)
  - `bb.org.bd` — Bangladesh Bank portal
  - `nationalsavings.gov.bd` — National Savings Directorate

### Prize Structure (per series)

| Prize | Amount (BDT) | Count |
|---|---|---|
| 1st Prize | ৳6,00,000 | 1 |
| 2nd Prize | ৳3,25,000 | 1 |
| 3rd Prize | ৳1,00,000 | 2 |
| 4th Prize | ৳50,000 | 2 |
| 5th Prize | ৳10,000 | 10+ |

> **Note:** 20% source tax is deducted under Income Tax Act 2023. Unclaimed prizes expire after 2 years.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ React Native │  │  React Web   │  │  (Future: USSD)  │  │
│  │  iOS/Android │  │  (Browser)   │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼─────────────┘
          │                 │                   │
          └─────────────────┴───────────────────┘
                            │  HTTPS / REST API
                    ┌───────▼────────┐
                    │   API Gateway  │ (Nginx / Cloudflare)
                    └───────┬────────┘
                            │
              ┌─────────────▼──────────────┐
              │    Node.js + TypeScript     │
              │      Express API Server     │
              │  (Auth · Bonds · OCR ·      │
              │   Results · Notifications)  │
              └──┬──────────┬──────────────┘
                 │          │
        ┌────────▼──┐  ┌────▼──────────────┐
        │  MySQL DB  │  │   Redis Cache      │
        │ (Primary   │  │ (Sessions, result  │
        │  storage)  │  │  cache, queues)    │
        └────────────┘  └───────────────────┘
                 │
        ┌────────▼───────────────────────────────┐
        │            Worker Services              │
        │  ┌──────────────┐  ┌─────────────────┐ │
        │  │  OCR Worker  │  │  Result Fetcher  │ │
        │  │ (Bull Queue) │  │  (Cron Job)      │ │
        │  └──────────────┘  └─────────────────┘ │
        │  ┌────────────────────────────────────┐ │
        │  │      Notification Worker           │ │
        │  │    (FCM · APNs · Email)            │ │
        │  └────────────────────────────────────┘ │
        └────────────────────────────────────────┘
                 │
        ┌────────▼─────────┐
        │  External APIs   │
        │  Google Vision   │
        │  prizebond.ird   │
        │  FCM / APNs      │
        │  SMTP (email)    │
        └──────────────────┘
```

---

## 4. Tech Stack Decision

### Backend

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20 LTS | Your existing expertise |
| Language | TypeScript 5.x | Type safety, maintainability |
| Framework | Express.js + Zod | Familiar, lightweight, great ecosystem |
| ORM | Prisma | Type-safe MySQL ORM, auto migrations |
| Database | MySQL 8 | Your preference; relational fits this domain |
| Cache / Queue | Redis + BullMQ | Job queues for OCR + notifications |
| Auth | JWT + Refresh tokens | Stateless, works for mobile + web |
| File Storage | AWS S3 or Cloudflare R2 | Bond images, cheap storage |
| OCR | Google Cloud Vision API | Best multilingual (Bangla + English) support |
| Scheduler | node-cron | Quarterly draw result fetching |

### Mobile

| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native + Expo | Single codebase for iOS + Android, TypeScript |
| Navigation | React Navigation v6 | Industry standard |
| State | Zustand | Lightweight, TypeScript-friendly |
| Camera | expo-camera + expo-image-picker | Image capture for OCR |
| Notifications | expo-notifications + FCM | Cross-platform push |

### Web

| Layer | Choice | Reason |
|---|---|---|
| Framework | React 18 + Vite | Fast, TypeScript-first |
| Styling | Tailwind CSS | Rapid UI development |
| State | TanStack Query | Server state, caching |
| Auth | Same JWT flow as mobile | Code reuse |

### Infrastructure

| Service | Choice |
|---|---|
| Cloud | AWS (EC2 / ECS) or DigitalOcean Droplets |
| CI/CD | GitHub Actions |
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| SSL | Let's Encrypt (Certbot) |
| Monitoring | Sentry (errors) + Grafana (metrics) |

---

## 5. Database Schema

```sql
-- Users
CREATE TABLE users (
  id            CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE,
  phone         VARCHAR(20)  UNIQUE,
  password_hash VARCHAR(255),
  tier          ENUM('free','premium') DEFAULT 'free',
  fcm_token     VARCHAR(500),
  apns_token    VARCHAR(500),
  language      ENUM('bn','en') DEFAULT 'bn',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Prize Bonds owned by users
CREATE TABLE bonds (
  id            CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id       CHAR(36)     NOT NULL,
  number        VARCHAR(10)  NOT NULL,       -- e.g. 0030401
  series        VARCHAR(10),                 -- if applicable
  image_url     VARCHAR(500),                -- S3 key of original photo
  added_via     ENUM('ocr','manual') DEFAULT 'manual',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_bond_per_user (user_id, number)
);

-- Draw results (fetched from official sources)
CREATE TABLE draw_results (
  id            CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  draw_number   INT          NOT NULL,       -- e.g. 122
  draw_date     DATE         NOT NULL,
  series        VARCHAR(10),
  prize_rank    TINYINT      NOT NULL,       -- 1, 2, 3, 4, 5
  prize_amount  INT          NOT NULL,
  winning_number VARCHAR(10) NOT NULL,
  fetched_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_draw_number (draw_number, winning_number)
);

-- Match results — which user's bonds won
CREATE TABLE match_results (
  id              CHAR(36)   PRIMARY KEY DEFAULT (UUID()),
  user_id         CHAR(36)   NOT NULL,
  bond_id         CHAR(36)   NOT NULL,
  draw_result_id  CHAR(36)   NOT NULL,
  notified_at     TIMESTAMP  NULL,
  FOREIGN KEY (user_id)        REFERENCES users(id),
  FOREIGN KEY (bond_id)        REFERENCES bonds(id),
  FOREIGN KEY (draw_result_id) REFERENCES draw_results(id)
);

-- Subscriptions (for premium)
CREATE TABLE subscriptions (
  id              CHAR(36)   PRIMARY KEY DEFAULT (UUID()),
  user_id         CHAR(36)   NOT NULL UNIQUE,
  plan            ENUM('monthly','yearly') NOT NULL,
  store           ENUM('google_play','app_store','web'),
  purchase_token  VARCHAR(500),
  valid_until     TIMESTAMP  NOT NULL,
  created_at      TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- OCR Job tracking
CREATE TABLE ocr_jobs (
  id           CHAR(36)   PRIMARY KEY DEFAULT (UUID()),
  user_id      CHAR(36)   NOT NULL,
  image_url    VARCHAR(500) NOT NULL,
  status       ENUM('pending','processing','done','failed') DEFAULT 'pending',
  result_json  JSON,
  error        TEXT,
  created_at   TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 6. Backend API Design

### Base URL
```
https://api.bondcheckbd.com/v1
```

### Authentication Endpoints
```
POST   /auth/register          Register with email or phone
POST   /auth/login             Login, returns JWT + refresh token
POST   /auth/refresh           Refresh access token
POST   /auth/logout            Invalidate refresh token
POST   /auth/otp/send          Send OTP (phone-based login)
POST   /auth/otp/verify        Verify OTP
```

### Bond Management
```
GET    /bonds                  List all user's bonds
POST   /bonds                  Add bond manually (single number)
POST   /bonds/ocr              Upload image → start OCR job → returns job ID
GET    /bonds/ocr/:jobId       Poll OCR job status + extracted numbers
POST   /bonds/ocr/:jobId/confirm  Confirm extracted numbers to save bonds
DELETE /bonds/:id              Remove a bond
GET    /bonds/stats            Count, draw history summary
```

### Draw Results
```
GET    /results                List all draws (paginated)
GET    /results/:drawNumber    Details of a specific draw
GET    /results/latest         Latest draw results
```

### Matches
```
GET    /matches                User's winning bonds across all draws
GET    /matches/:drawNumber    User's wins for a specific draw
```

### Subscription / Payments
```
GET    /subscription           Current subscription status
POST   /subscription/verify    Verify Google Play / App Store receipt
POST   /subscription/web       Create Stripe/SSLCommerz checkout session
DELETE /subscription           Cancel subscription
```

### Notifications
```
GET    /notifications          Notification history
PUT    /notifications/token    Update FCM/APNs token
PUT    /notifications/settings Update notification preferences
```

### Admin (internal)
```
POST   /admin/results/fetch    Manually trigger result fetch
GET    /admin/stats            User count, bond count, draw stats
```

---

## 7. OCR Pipeline — Reading Bond Numbers from Images

This is the most technically interesting part of the product. Bangladesh prize bonds have a 7-digit number printed in both Bangla (বাংলা) numerals and Roman numerals.

### Pipeline Flow

```
User Photo
    │
    ▼
Upload to S3 (raw image)
    │
    ▼
Pre-process image (sharp.js)
  • Convert to greyscale
  • Increase contrast
  • Crop to number region (optional)
    │
    ▼
Google Cloud Vision API
  • DOCUMENT_TEXT_DETECTION mode
  • Supports Bengali + Latin scripts
  • Returns bounding boxes + confidence
    │
    ▼
Post-processing
  • Convert Bangla digits → Roman digits
    ০→0, ১→1, ২→2, ৩→3, ৪→4
    ৫→5, ৬→6, ৭→7, ৮→8, ৯→9
  • Extract all 7-digit sequences
  • Deduplicate (Bangla and Roman may both appear)
  • Validate format (7 digits, no leading 0 edge cases)
    │
    ▼
Return extracted numbers to user for confirmation
    │
    ▼
User confirms → saved to bonds table
```

### Bangla Digit Conversion (TypeScript)

```typescript
// src/utils/banglaDigits.ts

const BANGLA_TO_ROMAN: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

export function normalizeBanglaDigits(text: string): string {
  return text.split('').map(ch => BANGLA_TO_ROMAN[ch] ?? ch).join('');
}

export function extractBondNumbers(rawText: string): string[] {
  const normalized = normalizeBanglaDigits(rawText);
  // Match exactly 7-digit sequences
  const matches = normalized.match(/\b\d{7}\b/g) ?? [];
  // Deduplicate
  return [...new Set(matches)];
}
```

### OCR Worker (BullMQ)

```typescript
// src/workers/ocrWorker.ts

import { Worker } from 'bullmq';
import vision from '@google-cloud/vision';
import { processImage } from '../services/imageService';
import { extractBondNumbers } from '../utils/banglaDigits';
import prisma from '../db';

const ocrWorker = new Worker('ocr-queue', async (job) => {
  const { jobId, imageUrl, userId } = job.data;

  // 1. Pre-process image
  const processedBuffer = await processImage(imageUrl);

  // 2. Call Google Vision
  const client = new vision.ImageAnnotatorClient();
  const [result] = await client.documentTextDetection({
    image: { content: processedBuffer.toString('base64') }
  });

  const fullText = result.fullTextAnnotation?.text ?? '';

  // 3. Extract bond numbers
  const bondNumbers = extractBondNumbers(fullText);

  // 4. Update job record
  await prisma.ocrJob.update({
    where: { id: jobId },
    data: {
      status: bondNumbers.length > 0 ? 'done' : 'failed',
      resultJson: { numbers: bondNumbers, rawText: fullText }
    }
  });

  return { bondNumbers };
}, { connection: redisConnection });
```

### Fallback: EasyOCR via Python Microservice

For cases where Google Vision underperforms on handwritten or damaged bonds, set up a lightweight Python sidecar:

```python
# ocr_service.py (FastAPI)
import easyocr
from fastapi import FastAPI, UploadFile

app = FastAPI()
reader = easyocr.Reader(['bn', 'en'])

@app.post("/ocr")
async def run_ocr(file: UploadFile):
    contents = await file.read()
    results = reader.readtext(contents)
    texts = [r[1] for r in results]
    return {"texts": texts}
```

---

## 8. Result Fetching Engine

Official sources:
1. **prizebond.ird.gov.bd** — PBRIS portal (primary)
2. **bb.org.bd** — Bangladesh Bank (backup)
3. **nationalsavings.gov.bd** — PDF downloads (tertiary)

### Strategy

Since there is no public API, the fetcher will use a combination of:

1. **Web scraping** of PBRIS with Puppeteer (headless Chromium)
2. **PDF parsing** for official gazette PDFs from nationalsavings.gov.bd using `pdf-parse`
3. **Manual admin upload** as a fallback when scraping breaks (admin API endpoint)

```typescript
// src/services/resultFetcher.ts

import puppeteer from 'puppeteer';
import { parseResultsFromHTML } from '../utils/resultParser';
import prisma from '../db';

export async function fetchLatestResults(drawNumber: number): Promise<void> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://prizebond.ird.gov.bd', {
    waitUntil: 'networkidle2'
  });

  // Navigate to the specific draw
  // (Adapt selectors based on actual site structure)
  const html = await page.content();
  await browser.close();

  const results = parseResultsFromHTML(html, drawNumber);

  // Upsert into DB
  await prisma.drawResult.createMany({
    data: results,
    skipDuplicates: true
  });
}
```

### Cron Schedule (node-cron)

```typescript
// src/jobs/scheduler.ts
import cron from 'node-cron';
import { fetchLatestResults } from '../services/resultFetcher';
import { runMatchingEngine } from '../services/matchingEngine';

// Run at 6:00 AM on draw days (Jan 31, Apr 30, Jul 31, Oct 31)
// Cron: "0 6 31 1,7 *" and "0 6 30 4,10 *" are approximations
// Better: run daily on draw months, check if results changed

cron.schedule('0 6 * 1,4,7,10 *', async () => {
  console.log('Checking for new prize bond results...');
  try {
    const latestDraw = await getLatestDrawNumber(); // fetch from DB
    await fetchLatestResults(latestDraw + 1);
    await runMatchingEngine();
  } catch (err) {
    console.error('Result fetch failed:', err);
    // Alert admin via email
  }
});
```

---

## 9. Matching & Notification Engine

```typescript
// src/services/matchingEngine.ts

import prisma from '../db';
import { sendPushNotification } from './notificationService';

export async function runMatchingEngine(): Promise<void> {
  // Get all winning numbers from the latest draw
  const latestDraw = await prisma.drawResult.findFirst({
    orderBy: { drawNumber: 'desc' }
  });

  if (!latestDraw) return;

  const winningNumbers = await prisma.drawResult.findMany({
    where: { drawNumber: latestDraw.drawNumber }
  });

  // For each winning number, find matching user bonds
  for (const result of winningNumbers) {
    const matchingBonds = await prisma.bond.findMany({
      where: { number: result.winningNumber },
      include: { user: true }
    });

    for (const bond of matchingBonds) {
      // Create match record
      await prisma.matchResult.create({
        data: {
          userId: bond.userId,
          bondId: bond.id,
          drawResultId: result.id
        }
      });

      // Send push notification
      await sendPushNotification({
        token: bond.user.fcmToken,
        title: '🎉 আপনার প্রাইজবন্ড জিতেছে!',
        body: `বন্ড নং ${bond.number} — ${result.prizeRank}ম পুরস্কার: ৳${result.prizeAmount.toLocaleString()}`,
        data: {
          type: 'WIN',
          bondNumber: bond.number,
          drawNumber: String(result.drawNumber),
          prizeAmount: String(result.prizeAmount)
        }
      });
    }
  }
}
```

---

## 10. Mobile App — React Native (iOS + Android)

### Project Setup

```bash
# Install Expo CLI
npm install -g @expo/cli

# Create project
npx create-expo-app BondCheckBD --template expo-template-blank-typescript

# Core dependencies
npx expo install expo-camera expo-image-picker expo-notifications
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install zustand @tanstack/react-query axios
npm install react-native-safe-area-context react-native-screens
```

### App Screens & Navigation

```
Bottom Tab Navigator
├── 🏠 Home
│   ├── Latest draw result summary
│   ├── Your winning bonds (if any)
│   └── Quick add bond button
├── 📋 My Bonds
│   ├── Bond list (searchable)
│   ├── Add bond (manual / scan)
│   └── Bond detail (image + history)
├── 📷 Scan Bond (center FAB)
│   ├── Camera → capture bond image
│   ├── OCR processing screen
│   └── Confirm extracted numbers
├── 📊 Results
│   ├── All draws (paginated)
│   └── Draw detail (winning numbers)
└── ⚙️ Settings
    ├── Notification preferences
    ├── Language (বাংলা / English)
    ├── Subscription management
    └── About / Support
```

### Key Component: Bond Scanner

```typescript
// screens/ScanBondScreen.tsx

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export default function ScanBondScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCapture = async (uri: string) => {
    setIsProcessing(true);
    try {
      // Upload image → backend OCR
      const formData = new FormData();
      formData.append('image', { uri, name: 'bond.jpg', type: 'image/jpeg' } as any);

      const { data } = await api.post('/bonds/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Poll for job completion
      const result = await pollOcrJob(data.jobId);

      // Navigate to confirmation screen
      navigation.navigate('ConfirmBonds', { numbers: result.numbers });
    } finally {
      setIsProcessing(false);
    }
  };

  // Also support picking from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9
    });
    if (!result.canceled) handleCapture(result.assets[0].uri);
  };

  return (
    // Camera + gallery button UI
  );
}
```

### Bangla / English Language Support

```typescript
// i18n/index.ts
const strings = {
  bn: {
    scanBond: 'বন্ড স্ক্যান করুন',
    myBonds: 'আমার বন্ডসমূহ',
    youWon: 'আপনি জিতেছেন! 🎉',
    noPrize: 'এই ড্রতে কোনো পুরস্কার নেই',
    addBond: 'বন্ড যোগ করুন',
  },
  en: {
    scanBond: 'Scan Bond',
    myBonds: 'My Bonds',
    youWon: 'You Won! 🎉',
    noPrize: 'No prize in this draw',
    addBond: 'Add Bond',
  }
};
```

---

## 11. Web App — React

```bash
npm create vite@latest bondcheck-web -- --template react-ts
cd bondcheck-web
npm install @tanstack/react-query axios tailwindcss
npm install react-router-dom react-dropzone
```

### Web-Specific Features

- File drag-and-drop for bond images (no camera needed on desktop)
- Bulk CSV upload for power users (enter many bond numbers at once)
- Printable result report per draw
- Admin dashboard (internal use only)

---

## 12. Push Notification System

### Firebase Cloud Messaging (Android + Web)

```typescript
// src/services/notificationService.ts
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export async function sendPushNotification({
  token, title, body, data
}: NotificationPayload) {
  if (!token) return;

  await admin.messaging().send({
    token,
    notification: { title, body },
    data,
    android: {
      priority: 'high',
      notification: { sound: 'default', channelId: 'prize-wins' }
    },
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } }
    }
  });
}
```

### Notification Types

| Type | Trigger | Audience |
|---|---|---|
| WIN | Your bond won a prize | Winner only |
| DRAW_PUBLISHED | New results available | All users |
| SCAN_COMPLETE | OCR finished | Requesting user |
| REMINDER | "Buy/check bonds before next draw" | Premium users |

---

## 13. Deployment & Infrastructure

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: ./backend
    ports: ['3000:3000']
    environment:
      DATABASE_URL: mysql://root:password@db:3306/bondcheck
      REDIS_URL: redis://redis:6379
    depends_on: [db, redis]

  worker:
    build: ./backend
    command: npm run worker
    depends_on: [db, redis]

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: bondcheck
    volumes: ['mysql_data:/var/lib/mysql']

  redis:
    image: redis:7-alpine

  ocr_sidecar:          # Optional Python OCR fallback
    build: ./ocr-service
    ports: ['8000:8000']

volumes:
  mysql_data:
```

### Production (AWS Recommended Setup)

```
Route 53 (DNS)
    │
Cloudflare (CDN + DDoS protection)
    │
Application Load Balancer
    │
    ├── ECS Fargate (API containers) — auto-scaling
    ├── ECS Fargate (Worker containers)
    │
RDS MySQL 8 (Multi-AZ for production)
ElastiCache Redis
S3 (bond images)
CloudWatch (logs + alerts)
```

**Cheaper Alternative (early stage):**
- DigitalOcean Droplet ($12/mo) — API + Workers
- DigitalOcean Managed MySQL ($15/mo)
- DigitalOcean Spaces (S3-compatible, $5/mo)
- Total: ~$32/month to start

---

## 14. Monetization Strategy

### Tier Structure

| Feature | Free | Premium (৳99/mo or ৳799/yr) |
|---|---|---|
| Manual bond entry | Up to 10 bonds | Unlimited |
| OCR scan | 3 scans/month | Unlimited |
| Push notifications | Win alerts only | All alerts + reminders |
| Bond image storage | None | Original image saved |
| History | Last draw only | All historical draws |
| Bulk import (CSV) | ❌ | ✅ |
| Priority support | ❌ | ✅ |
| Ads shown | Yes | No |

### Revenue Streams

**1. Subscription (Primary)**
- Monthly: ৳99/month (~$0.90 USD)
- Yearly: ৳799/year (~$7.25 USD, 33% discount)
- Payment: Google Play Billing, Apple In-App Purchase, SSLCommerz (web/bKash)

**2. Ads (Free Tier)**
- Google AdMob in the mobile app
- Place ads on: home screen, between result pages
- Avoid ads on win notifications (maintain emotional moment)
- Estimated: ৳2–5 per 1,000 impressions in BD market

**3. Affiliate / Financial Partnerships**
- Partner with banks/insurance companies who want to reach savers
- "Smart savers" are a premium demographic
- Display contextual offers: FD rates, savings schemes

**4. SMS / Notification API (B2B)**
- Sell the result-fetching + notification engine as an API to:
  - Financial media outlets (Prothom Alo, The Daily Star)
  - Bank apps that want to offer this feature

**5. White-Label for Banks**
- Package the entire solution for Bangladeshi banks to offer under their brand
- One-time licensing fee: ৳2–5 lakh per bank

### Projections (Conservative)

| Users | Free | Premium (5%) | Monthly Revenue |
|---|---|---|---|
| 5,000 | 4,750 | 250 | ~৳25,000 |
| 20,000 | 19,000 | 1,000 | ~৳1,00,000 |
| 50,000 | 47,500 | 2,500 | ~৳2,50,000 |

---

## 15. Development Phases & Timeline

### Phase 1 — MVP Backend + Web (Weeks 1–6)

**Week 1–2: Foundation**
- [ ] Project scaffolding (monorepo with Turborepo or simple folders)
- [ ] MySQL schema + Prisma migrations
- [ ] Auth endpoints (JWT + OTP via SMS)
- [ ] Bond CRUD endpoints
- [ ] Basic result fetcher (manual trigger, parse PBRIS)

**Week 3–4: Core Features**
- [ ] OCR pipeline with Google Vision
- [ ] Bangla digit normalization
- [ ] Matching engine
- [ ] FCM notification setup
- [ ] Result fetch cron job

**Week 5–6: Web App**
- [ ] React web app with auth + bond management
- [ ] OCR drag-and-drop upload
- [ ] Result history display
- [ ] Docker + deploy to DigitalOcean

### Phase 2 — Mobile App (Weeks 7–12)

**Week 7–8: React Native Foundation**
- [ ] Expo project setup
- [ ] Auth screens (login / register)
- [ ] Bond list + add manually
- [ ] Navigation structure

**Week 9–10: Camera + OCR**
- [ ] Camera permission + capture
- [ ] Gallery picker
- [ ] OCR job polling UI
- [ ] Confirm + save extracted numbers

**Week 11–12: Notifications + Polish**
- [ ] FCM integration on mobile
- [ ] Push notification handling
- [ ] Bilingual UI (Bangla / English)
- [ ] Beta testing

### Phase 3 — Monetization + Scale (Weeks 13–18)

- [ ] Google Play Billing integration
- [ ] Apple In-App Purchase integration
- [ ] SSLCommerz / bKash for web payments
- [ ] Google AdMob (free tier)
- [ ] App Store + Play Store submission
- [ ] Analytics (Mixpanel or Firebase Analytics)
- [ ] Admin dashboard

### Phase 4 — Growth (Months 5+)

- [ ] USSD service (for feature phone users — massive BD market)
- [ ] SMS-based checking (no internet needed)
- [ ] Referral program
- [ ] Social sharing of wins
- [ ] Bank partnership API

---

## 16. Third-Party Services & Cost Estimate

| Service | Plan | Monthly Cost |
|---|---|---|
| Google Cloud Vision API | Pay-per-use (~$1.50/1000 images) | $10–50 |
| Firebase (FCM) | Free tier (very generous) | $0 |
| AWS S3 / DO Spaces | 25GB images | $5 |
| DigitalOcean Droplet | 2 vCPU, 4GB RAM | $24 |
| DigitalOcean MySQL | 1GB RAM managed | $15 |
| Cloudflare | Free plan | $0 |
| SMS OTP (SSL Wireless BD) | Per OTP ~৳0.30 | $5–20 |
| Sentry (error tracking) | Free tier | $0 |
| **Total** | | **~$60–115/mo** |

---

## 17. Legal & Compliance Considerations

1. **No official API from Bangladesh Bank** — scraping is technically against ToS of most sites. Mitigate by:
   - Always crediting official source
   - Not caching results for more than the draw cycle
   - Building a manual admin upload fallback
   - Reaching out to Bangladesh Bank for official API access (it may be possible)

2. **20% tax on prizes** — always display the tax notice prominently when showing a match result. Do not display incorrect prize amounts.

3. **User data (NID/personal info)** — you are not collecting NID; bond numbers are not personally identifiable. GDPR-adjacent good practice still recommended.

4. **App Store policies** — both Google and Apple require honest subscription terms. Your pricing (৳99/mo) must be clearly communicated before purchase.

5. **bKash / Nagad payments** — to accept mobile banking payments, register as a merchant with bKash for Commerce.

---

## Quick Start Commands

```bash
# Clone / init monorepo
mkdir bondcheck-bd && cd bondcheck-bd
mkdir backend web mobile

# Backend
cd backend
npm init -y
npm install express typescript prisma @prisma/client
npm install bullmq ioredis node-cron
npm install @google-cloud/vision puppeteer sharp
npm install jsonwebtoken bcryptjs zod
npm install -D ts-node nodemon @types/express @types/node

# Initialize Prisma
npx prisma init --datasource-provider mysql

# Web
cd ../web
npm create vite@latest . -- --template react-ts
npm install @tanstack/react-query axios tailwindcss react-router-dom

# Mobile
cd ../mobile
npx create-expo-app . --template expo-template-blank-typescript
npx expo install expo-camera expo-image-picker expo-notifications
npm install @react-navigation/native @react-navigation/bottom-tabs zustand
```

---

*Built for Bangladesh. বাংলাদেশের জন্য তৈরি।*
