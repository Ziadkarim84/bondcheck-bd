# BondCheck BD — Upgrade Path: Free → Production

> This document describes **when** and **how** to upgrade each component from the
> zero-cost free stack to a robust, production-grade infrastructure — component by
> component, in priority order.

---

## Upgrade Decision Framework

Do NOT upgrade a component until you hit one of these triggers:

| Signal | Meaning |
|---|---|
| Free tier limit reached | Usage exceeds the free quota |
| User-facing degradation | Slow responses, downtime, failed OCR |
| Revenue milestone reached | You have money to spend |
| Security / compliance need | User data requires stronger guarantees |

Upgrade the components that hurt users most first. Everything else stays free as long as it works.

---

## Upgrade Priority Order

```
1. OCR Engine          ← most likely to cause user-facing quality issues
2. API Hosting         ← free tier has cold starts / sleep
3. Database            ← free tier has resource limits
4. Storage             ← free tier bandwidth can be exceeded
5. Redis / Queue       ← free tier request limits
6. Email               ← 100 emails/day breaks at scale
7. SMS / OTP           ← email-only OTP limits some users
8. Monitoring          ← deeper visibility needed at scale
9. Domain              ← professional credibility
10. CDN / Security     ← advanced DDoS, WAF
```

---

## 1. OCR Engine: Tesseract.js → Google Cloud Vision

### When to upgrade

- OCR accuracy on damaged/handwritten/low-light bonds is causing user complaints
- You have consistent traffic to justify the cost
- You want to support photo quality below print-perfect conditions

### Cost

- Google Cloud Vision: **$1.50 per 1,000 images** (DOCUMENT_TEXT_DETECTION)
- First 1,000 images/month: **free**
- At 10,000 scans/month: ~**$13.50/month**

### How to upgrade

```bash
npm install @google-cloud/vision
```

```typescript
// src/services/ocrService.ts — replace Tesseract with Google Vision

import vision from '@google-cloud/vision';
import { extractBondNumbers } from '../utils/banglaDigits';

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export async function runOCR(imagePath: string): Promise<string[]> {
  const [result] = await client.documentTextDetection(imagePath);
  const fullText = result.fullTextAnnotation?.text ?? '';
  return extractBondNumbers(fullText);
}
```

Add `GOOGLE_APPLICATION_CREDENTIALS` (path to service account JSON) to your
environment variables.

### Recommended hybrid strategy

Keep Tesseract.js as a **free fallback** for jobs where Google Vision confidence
is low. Only call Google Vision when Tesseract returns 0 results or low confidence.

```typescript
export async function runOCRWithFallback(imagePath: string): Promise<string[]> {
  // Try Tesseract first (free)
  const tesseractResults = await runTesseractOCR(imagePath);
  if (tesseractResults.length > 0) return tesseractResults;

  // Fall back to Google Vision (paid, but only when needed)
  return runGoogleVisionOCR(imagePath);
}
```

---

## 2. API Hosting: Railway → DigitalOcean / AWS

### When to upgrade

- Railway $5 credit is consistently exhausted before month end
- You need zero-downtime deployments
- You need persistent background workers that never sleep

### Option A — DigitalOcean Droplet (Best value, ~$12–24/month)

Best for a solo developer who wants full control.

```
$12/month Droplet (2 vCPU, 2 GB RAM) → handles ~500 concurrent users
$24/month Droplet (2 vCPU, 4 GB RAM) → handles ~2,000 concurrent users
```

**Migration steps:**

```bash
# 1. Create a Droplet (Ubuntu 22.04)
# 2. Install Docker
curl -fsSL https://get.docker.com | sh

# 3. Install Nginx
apt install nginx certbot python3-certbot-nginx

# 4. Clone repo and deploy
git clone https://github.com/yourname/bondcheck-bd
cd bondcheck-bd
docker compose up -d

# 5. Configure Nginx reverse proxy
# /etc/nginx/sites-available/api.bondcheckbd.com
server {
    server_name api.bondcheckbd.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# 6. Free SSL via Let's Encrypt
certbot --nginx -d api.bondcheckbd.com
```

**Dockerize the app:**

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: ./backend
    restart: always
    ports: ['3000:3000']
    env_file: .env
    depends_on: [db, redis]

  worker:
    build: ./backend
    restart: always
    command: npm run worker
    env_file: .env
    depends_on: [db, redis]

  db:
    image: mysql:8
    restart: always
    volumes: ['mysql_data:/var/lib/mysql']
    env_file: .env

  redis:
    image: redis:7-alpine
    restart: always

volumes:
  mysql_data:
```

### Option B — AWS ECS Fargate (~$30–60/month)

Best for auto-scaling when you have unpredictable traffic spikes.

```
API Service:  1 vCPU, 2 GB → ~$30/month
Worker Service: 0.5 vCPU, 1 GB → ~$15/month
RDS MySQL (db.t3.micro) → ~$15/month
ElastiCache Redis (cache.t3.micro) → ~$15/month
Total: ~$75/month
```

Use when monthly revenue exceeds ৳8,000–10,000 to justify the cost.

### Option C — Fly.io (~$5–20/month)

Middle ground — simpler than AWS, more reliable than Railway free tier.

```bash
fly launch
fly scale vm shared-cpu-2x   # upgrade from free tier
fly postgres create           # managed PostgreSQL
```

---

## 3. Database: Railway MySQL → Managed MySQL

### When to upgrade

- Database size approaches Railway's free credit limit
- You need automatic backups, point-in-time recovery
- Production data cannot afford to be lost

### Option A — DigitalOcean Managed MySQL (~$15/month)

```bash
# Provision in DO dashboard: Databases → MySQL 8
# Get connection string → update DATABASE_URL

# Run Prisma migrations against new DB
DATABASE_URL="mysql://user:pass@db.digitalocean.com:25060/bondcheck?ssl=true" \
  npx prisma migrate deploy
```

Enable daily automated backups (included free with managed DB).

### Option B — PlanetScale (~$29/month for Scaler Pro)

- MySQL-compatible
- Branching (like git for your schema)
- Built-in connection pooling

```bash
npm install @planetscale/database
```

```typescript
import { connect } from '@planetscale/database';

const conn = connect({ url: process.env.DATABASE_URL });
```

### Option C — AWS RDS MySQL (~$15/month for db.t3.micro)

Best if you are already on AWS for the API. Multi-AZ failover available.

### Production Database Checklist

- [ ] Automated daily backups enabled
- [ ] Point-in-time recovery enabled
- [ ] Separate read replica for heavy queries (when needed)
- [ ] Connection pooling via PgBouncer / ProxySQL (when > 100 concurrent DB connections)
- [ ] SSL connections enforced

---

## 4. File Storage: Cloudinary Free → Cloudflare R2

### When to upgrade

- Cloudinary 25 GB bandwidth exceeded (at ~50,000+ active users)
- You want to own your storage without vendor lock-in
- Image delivery speed is a concern

### Cost

**Cloudflare R2:**
- Storage: $0.015/GB/month (~**$0.75/month for 50 GB**)
- Egress: **$0** (no egress fees — huge advantage over S3)
- Operations: $0.36 per million class-A, $0.036 per million class-B

**AWS S3 (alternative):**
- Storage: $0.023/GB/month
- Egress: $0.09/GB (adds up at scale)

### Migration to Cloudflare R2

```bash
npm install @aws-sdk/client-s3  # R2 is S3-compatible
```

```typescript
// src/services/storageService.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadBondImage(buffer: Buffer, key: string): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
  }));
  return `https://pub-${process.env.CF_ACCOUNT_ID}.r2.dev/${key}`;
}
```

**Data migration script (Cloudinary → R2):**

```typescript
// scripts/migrateStorage.ts
// Fetch all bond image URLs from DB → download from Cloudinary → upload to R2
const bonds = await prisma.bond.findMany({ where: { imageUrl: { not: null } } });
for (const bond of bonds) {
  const response = await fetch(bond.imageUrl!);
  const buffer = Buffer.from(await response.arrayBuffer());
  const newUrl = await uploadToR2(buffer, `bonds/${bond.userId}/${bond.id}.jpg`);
  await prisma.bond.update({ where: { id: bond.id }, data: { imageUrl: newUrl } });
}
```

---

## 5. Redis / Queue: Upstash Free → Upstash Pay-as-you-go

### When to upgrade

- 10,000 Redis commands/day is consistently exceeded
- OCR queue starts failing due to rate limits

### Cost

Upstash pay-as-you-go:
- **$0.2 per 100,000 commands** (after free 10,000/day)
- At 100,000 OCR jobs/month (~$0.03 extra): essentially free

No migration needed — same Upstash account, just disable the daily limit cap
in the dashboard (switch from free to pay-as-you-go).

### Alternative for high throughput

If you are processing tens of thousands of jobs/day, switch to a **dedicated Redis**
on your DigitalOcean Droplet (self-hosted, zero extra cost if droplet already exists).

```bash
# On your Droplet
docker run -d --name redis -p 6379:6379 redis:7-alpine redis-server --requirepass yourpassword
```

---

## 6. Email: Resend Free → Resend Pro

### When to upgrade

- Exceeding 100 emails/day (e.g., more than 100 OTP requests/day)
- Need custom sending domain with proper SPF/DKIM for inbox deliverability

### Cost

- Resend Pro: **$20/month** — 50,000 emails/month, custom domain
- Resend Business: **$90/month** — 100,000 emails/month, priority support

### Alternative — AWS SES (~$0.10 per 1,000 emails)

At 50,000 emails/month: **$5/month**. Cheapest at scale.

```bash
npm install @aws-sdk/client-ses
```

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: 'ap-south-1' }); // Mumbai — closest to BD

export async function sendEmail(to: string, subject: string, html: string) {
  await ses.send(new SendEmailCommand({
    Source: 'noreply@bondcheckbd.com',
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } },
    },
  }));
}
```

---

## 7. SMS / OTP: Email OTP → SSL Wireless BD

### When to upgrade

- Users consistently fail to receive email OTP (spam filters)
- You want to serve users without email (phone-only registrations)
- App store review requires phone verification

### Bangladesh SMS providers

| Provider | Price per SMS | Notes |
|---|---|---|
| SSL Wireless | ৳0.25–0.40/SMS | Most popular in BD |
| Infobip | $0.03–0.05/SMS | Global, reliable |
| Twilio | $0.0079/SMS (BD) | Easy API |
| Robi / GP API | Varies | Direct carrier |

**At 1,000 OTPs/month via SSL Wireless:** ~৳300–400/month (~$3–4 USD).

```typescript
// src/services/smsService.ts
export async function sendOTPSMS(phone: string, otp: string) {
  const response = await fetch('https://sms.sslwireless.com/pushapi/dynamic/server.php', {
    method: 'POST',
    body: new URLSearchParams({
      hapikey: process.env.SSL_WIRELESS_API_KEY!,
      msisdn: phone,
      sms: `BondCheck BD OTP: ${otp}. Valid 10 mins.`,
      csmsid: Date.now().toString(),
    }),
  });
  return response.json();
}
```

---

## 8. Monitoring: Sentry Free → Sentry Team + Grafana

### When to upgrade

- More than 5,000 errors/month (Sentry free limit)
- You need performance tracing, not just error capture
- You need alerting and on-call workflows

### Sentry Team Plan: **$26/month**

- 50,000 errors/month
- Performance monitoring (transaction tracing)
- 90-day retention
- Slack/PagerDuty alerts

### Add Grafana + Prometheus (self-hosted, free)

For metrics dashboards (request rates, queue depth, DB performance):

```yaml
# docker-compose.yml additions
  prometheus:
    image: prom/prometheus
    volumes: ['./prometheus.yml:/etc/prometheus/prometheus.yml']
    ports: ['9090:9090']

  grafana:
    image: grafana/grafana
    ports: ['3001:3000']
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: 'true'
```

No cost — runs on your existing Droplet.

---

## 9. Domain: Platform Subdomain → Custom Domain

### Cost

| Domain | Registrar | Cost/Year |
|---|---|---|
| bondcheckbd.com | Porkbun | ~$10 |
| bondcheck.xyz | Porkbun | ~$1 first year |
| bondcheck.app | Namecheap | ~$14 |

**Cloudflare DNS (free):** Point your domain to Cloudflare for free DNS management,
DDoS protection, and SSL.

```bash
# Update DNS A record: api.bondcheckbd.com → your server IP
# Update DNS CNAME: www.bondcheckbd.com → your Vercel deployment

# Nginx config update
server_name api.bondcheckbd.com;

# Re-run Certbot for new domain
certbot --nginx -d api.bondcheckbd.com -d bondcheckbd.com
```

---

## 10. CDN & Security: Cloudflare Free → Cloudflare Pro

### When to upgrade

- You are experiencing DDoS attacks or bot traffic
- API response latency is high for users in Bangladesh
- You need Web Application Firewall (WAF) rules

### Cloudflare Pro: **$25/month**

- Advanced WAF
- Image optimization (Polish)
- Better DDoS mitigation
- Analytics and bot fight mode

For 99% of the time the **Cloudflare free plan** is sufficient.

---

## Full Cost Comparison

### Free Stack (0 users → ~500 daily active users)

| Component | Service | Cost |
|---|---|---|
| API + Worker | Railway free | $0 |
| Database | Railway MySQL | $0 |
| Redis | Upstash free | $0 |
| Storage | Cloudinary free | $0 |
| OCR | Tesseract.js | $0 |
| Push | Firebase FCM | $0 |
| Email | Resend free | $0 |
| Web | Vercel free | $0 |
| CI/CD | GitHub Actions | $0 |
| Monitoring | Sentry free | $0 |
| **Total** | | **$0/month** |

---

### Early Production (~500–5,000 daily active users)

| Component | Service | Cost |
|---|---|---|
| API + Worker | DigitalOcean $24 Droplet | $24 |
| Database | DO Managed MySQL | $15 |
| Redis | Self-hosted on Droplet | $0 |
| Storage | Cloudflare R2 | ~$2 |
| OCR | Tesseract.js (on Droplet) | $0 |
| Push | Firebase FCM | $0 |
| Email | Resend Pro | $20 |
| Web | Vercel free | $0 |
| CI/CD | GitHub Actions | $0 |
| Monitoring | Sentry Team | $26 |
| SMS OTP | SSL Wireless | ~$4 |
| Domain | Porkbun .com | ~$1 |
| **Total** | | **~$92/month** |

---

### Full Production (5,000–50,000 daily active users)

| Component | Service | Cost |
|---|---|---|
| API (2 containers) | AWS ECS Fargate | $60 |
| Worker (1 container) | AWS ECS Fargate | $15 |
| Database | AWS RDS MySQL Multi-AZ | $60 |
| Redis | AWS ElastiCache | $30 |
| Storage | Cloudflare R2 | ~$5 |
| OCR | Google Cloud Vision | $20–50 |
| Push | Firebase FCM | $0 |
| Email | AWS SES | $5 |
| Web | Vercel Pro | $20 |
| CI/CD | GitHub Actions | $0 |
| Monitoring | Sentry Team + Grafana | $26 |
| SMS OTP | Twilio / SSL Wireless | $15 |
| Domain + CDN | Cloudflare Pro | $25 |
| **Total** | | **~$280–$315/month** |

Break-even at **~300 premium subscribers** at ৳99/month.

---

## Recommended Upgrade Sequence

```
Month 1–3:   Full free stack. Ship. Get users.
             ↓
Month 4–6:   Revenue from first premium subscribers.
             Upgrade hosting to DO Droplet ($24).
             Add SMS OTP ($4).
             ↓
Month 6–12:  500+ paying users.
             Upgrade to managed DB ($15).
             Add Sentry Team ($26).
             Register domain ($10/year).
             ↓
Year 2+:     1,000+ paying users.
             Migrate to AWS ECS for auto-scaling.
             Switch OCR to Google Vision for accuracy.
             Move storage to Cloudflare R2.
```

---

*Free until it hurts. Then upgrade exactly what hurts.*
