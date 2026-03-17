# BondCheck BD — বাংলাদেশ প্রাইজবন্ড চেকার

A full-stack app to scan, track, and get notified when your Bangladesh prize bonds win.

**Stack:** Node.js · TypeScript · MySQL · React · React Native (Expo)
**Cost:** $0/month on free tiers — see [FREE_STACK.md](../FREE_STACK.md)

---

## Architecture

```
bondcheck-bd/
├── backend/    Node.js API + OCR worker + scheduler
├── web/        React web app (Vite + Tailwind)
└── mobile/     React Native app (Expo Router)
```

---

## Quickstart (Local Development)

### Prerequisites
- Node.js 20 (`nvm use 20`)
- Docker (for local MySQL + Redis) **or** Railway credentials

### 1. Clone & install

```bash
git clone https://github.com/yourname/bondcheck-bd
cd bondcheck-bd
nvm use 20
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Fill in your credentials (see Free Service Setup below)
```

### 3. Run database migration

```bash
node_modules/.bin/prisma db push --schema=backend/prisma/schema.prisma
```

### 4. Start all services (3 separate terminals)

```bash
# Terminal 1 — API
export PATH="$HOME/.nvm/versions/node/v20.15.1/bin:$PATH"
node_modules/.bin/ts-node backend/src/server.ts
# → http://localhost:3000

# Terminal 2 — OCR worker
export PATH="$HOME/.nvm/versions/node/v20.15.1/bin:$PATH"
npm run worker
# → BullMQ worker listening on Redis queue

# Terminal 3 — Web frontend
export PATH="$HOME/.nvm/versions/node/v20.15.1/bin:$PATH"
npm run dev:web
# → http://localhost:5173
```

### 5. Mobile app (optional)

```bash
cd mobile && npx expo start
# Scan QR with Expo Go app on your phone
```

---

## Free Service Setup

Sign up for these free accounts and add credentials to `.env`:

| Service | URL | What for |
|---|---|---|
| Railway | railway.app | MySQL database + Redis |
| Cloudinary | cloudinary.com | Bond image storage |
| Firebase | console.firebase.google.com | Push notifications (FCM) |
| Resend | resend.com | Email OTP + win alerts |

---

## API Endpoints

```
POST /v1/auth/register        Register with email + password
POST /v1/auth/login           Login → access + refresh tokens
POST /v1/auth/refresh         Refresh access token
POST /v1/auth/logout          Logout
POST /v1/auth/otp/send        Send email OTP
POST /v1/auth/otp/verify      Verify OTP → tokens
GET  /v1/auth/me              Current user

GET  /v1/bonds                List my bonds
POST /v1/bonds                Add bond manually
POST /v1/bonds/ocr            Upload image → OCR job
GET  /v1/bonds/ocr/:jobId     Poll OCR job status
POST /v1/bonds/ocr/:jobId/confirm  Save extracted numbers
DELETE /v1/bonds/:id          Remove bond

GET  /v1/results/latest       Latest draw result
GET  /v1/results/:drawNumber  Specific draw
GET  /v1/matches              My winning bonds

PUT  /v1/notifications/token  Register FCM / Expo push token

POST /v1/admin/results/upload   Manual result upload (JSON)
POST /v1/admin/results/fetch    Trigger Puppeteer scraper
POST /v1/admin/results/match    Re-run matching engine
GET  /v1/admin/stats            System stats
```

Admin endpoints require `x-admin-secret` header.

### Upload draw results (admin)

```bash
curl -X POST http://localhost:3000/v1/admin/results/upload \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: <ADMIN_SECRET>" \
  -d '{
    "results": [
      { "drawNumber": 120, "drawDate": "2024-10-31", "prizeRank": 1, "prizeAmount": 6000000, "winningNumber": "1234567" },
      { "drawNumber": 120, "drawDate": "2024-10-31", "prizeRank": 2, "prizeAmount": 3250000, "winningNumber": "9876543" }
    ]
  }'
```

---

## Deploy (Free)

### Backend → Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Set all `.env` variables in Railway → Variables.

### Web → Vercel

```bash
npm install -g vercel
cd web && vercel --prod
```

Set `VITE_API_URL=https://your-api.up.railway.app/v1` in Vercel environment.

### Mobile → Expo EAS

```bash
npm install -g eas-cli
cd mobile && eas build --platform android
```

---

## Environment Variables

See `.env.example` for the full list. Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | JWT refresh signing secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `RESEND_API_KEY` | Resend email API key |
| `ADMIN_SECRET` | Admin API secret header value |

---

*বাংলাদেশের জন্য তৈরি। Built for Bangladesh.*
