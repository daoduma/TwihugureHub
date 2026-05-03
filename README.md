# TwihugureHub 🌱

**Multilingual Agricultural Training Platform for Rwanda**

TwihugureHub connects Rwandan farmers with professional agricultural training through an accessible, multilingual digital platform supporting English, French, and Kinyarwanda. Built by Mbaza and designed for mobile-first access in rural contexts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        TwihugureHub                         │
├─────────────────┬───────────────────┬───────────────────────┤
│   Next.js 14    │    PostgreSQL 15   │      Redis (cache)    │
│  (App Router)   │    via Prisma ORM  │   (session / queue)  │
├─────────────────┴───────────────────┴───────────────────────┤
│                    Multilingual Layer                        │
│          i18next  ·  en  ·  fr  ·  rw (Kinyarwanda)        │
├──────────────────────────────────────────────────────────────┤
│                      AI Translation                          │
│   Anthropic Claude · OpenAI · Google Gemini · Mistral       │
│   (Config stored encrypted in DB; fallback to env vars)     │
├──────────────────────────────────────────────────────────────┤
│              Role-Based Access Control                       │
│   ADMIN · TRAINER · MBAZA_STAFF · FARMER                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- **Node.js** ≥ 20
- **PostgreSQL** 15
- **npm** ≥ 10
- Docker & Docker Compose (for containerised setup)

---

## Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-org/twihugure-hub.git
cd twihugure-hub
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, NEXTAUTH_SECRET, ENCRYPTION_SECRET
```

> **ENCRYPTION_SECRET** must be exactly 32 characters — it encrypts the LLM API key stored in the database.

### 3. Option A — Docker Compose (recommended)
```bash
docker-compose up -d          # Start db + redis + app
docker-compose exec app npm run db:migrate
docker-compose exec app npm run db:seed
```

### 4. Option B — Local development
```bash
npm install
npx prisma migrate dev
npm run db:seed               # Seeds all demo data
npm run dev                   # http://localhost:3000
```

---

## Seed Accounts

After running `npm run db:seed`:

| Role        | Email                         | Password      |
|-------------|-------------------------------|---------------|
| Admin       | admin@twihugurehub.rw         | Admin@1234    |
| Trainer 1   | trainer1@twihugurehub.rw      | Trainer@1234  |
| Trainer 2   | trainer2@twihugurehub.rw      | Trainer@1234  |
| Mbaza Staff | mbaza@twihugurehub.rw         | Mbaza@1234    |
| Farmers     | farmer1–10@twihugurehub.rw    | Farmer@1234   |

> ⚠️ Update all passwords before going to production.

---

## Role-Based Access Summary

| Feature                        | Admin | Trainer | Mbaza Staff | Farmer |
|-------------------------------|:-----:|:-------:|:-----------:|:------:|
| User management                | ✅    |         |             |        |
| Course approval / rejection    | ✅    |         |             |        |
| AI settings (LLM config)       | ✅    |         |             |        |
| Audit logs                     | ✅    |         |             |        |
| Create / edit courses          |       | ✅      |             |        |
| Submit course for approval     |       | ✅      |             |        |
| AI quiz translation            |       | ✅      |             |        |
| View farmer progress           |       |         | ✅          |        |
| Flag / intervene farmers       |       |         | ✅          |        |
| Generate PDF / XLSX reports    |       |         | ✅          |        |
| Send messages to farmers       |       |         | ✅          |        |
| Manage farmer groups           |       |         | ✅          |        |
| Browse & enroll in courses     |       |         |             | ✅     |
| Take lessons & quizzes         |       |         |             | ✅     |
| Download certificates          |       |         |             | ✅     |
| Offline lesson access          |       |         |             | ✅     |

---

## LLM Configuration Guide

TwihugureHub uses AI to auto-translate quiz questions into French and Kinyarwanda.

### Setting up AI (as Admin)

1. Log in as Admin → go to **Settings > AI Settings**
2. Select your LLM provider (Anthropic recommended)
3. Enter your API key — it is encrypted with AES-256-CBC before storage
4. Click **Validate** to test the connection
5. Click **Save Configuration**

### Fallback behaviour
If no DB config exists, the app falls back to environment variables:
```
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-20250514
AI_API_KEY=your-key-here
```
This is useful for local development without database access.

---

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# All tests with coverage
npm run test:coverage

# E2E tests (requires running app on port 3000)
npm run dev &
npm run test:e2e
```

---

## Deployment Guide

### Docker (production)

```bash
# Build and run
docker-compose -f docker-compose.yml up --build -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Seed initial data (first deploy only)
docker-compose exec app npm run db:seed
```

### Environment variables for production

| Variable            | Required | Description                              |
|---------------------|----------|------------------------------------------|
| `DATABASE_URL`      | ✅       | PostgreSQL connection string             |
| `NEXTAUTH_SECRET`   | ✅       | Random 32+ char string for auth          |
| `NEXTAUTH_URL`      | ✅       | Production URL (e.g. https://your.app)   |
| `ENCRYPTION_SECRET` | ✅       | Exactly 32 chars — encrypts LLM API key  |
| `AI_API_KEY`        | Optional | LLM API key fallback (use DB config)     |

### Recommended production checklist
- [ ] Set all required env vars
- [ ] Use a strong `NEXTAUTH_SECRET` (run `openssl rand -base64 32`)
- [ ] Use a proper `ENCRYPTION_SECRET` (exactly 32 chars)
- [ ] Configure LLM API key via Admin > AI Settings (not env vars)
- [ ] Set up PostgreSQL backups
- [ ] Configure a CDN for `/public/uploads`

---

## Color Palette

| Name       | Hex       | Usage                  |
|------------|-----------|------------------------|
| Primary    | `#2D6A4F` | Buttons, nav, headings |
| Secondary  | `#E9C46A` | Accents, highlights    |
| Background | `#F8F9FA` | Page backgrounds       |
| Text       | `#1B1B1B` | Body text              |

---

## License

MIT © TwihugureHub / Mbaza Rwanda
