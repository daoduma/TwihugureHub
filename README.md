# TwihugureHub 🌱

> **Multilingual Agricultural Training Platform for Rwanda**
> Built with Next.js 14, TypeScript, Tailwind CSS, Prisma, PostgreSQL, NextAuth.js, and i18next.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values before running the app.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Prisma format) |
| `NEXTAUTH_SECRET` | ✅ | Random secret for signing JWTs — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Canonical URL of your app, e.g. `http://localhost:3000` |

### Example `.env.local`

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/twihugure"
NEXTAUTH_SECRET="your_super_secret_random_string_here"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database ORM | Prisma |
| Database | PostgreSQL |
| Auth | NextAuth.js v4 (JWT + Credentials) |
| i18n | i18next + react-i18next |
| Validation | Zod |

---

## User Roles

| Role | Dashboard Route | Registration |
|---|---|---|
| `FARMER` | `/farmer/dashboard` | Self-registration via `/register` |
| `TRAINER` | `/trainer/dashboard` | Created by Admin |
| `ADMIN` | `/admin/dashboard` | Created by Admin (or seeded) |
| `MBAZA_STAFF` | `/mbaza/dashboard` | Created by Admin |

---

## Supported Languages

| Code | Language | Native Name |
|---|---|---|
| `en` | English | English |
| `fr` | French | Français |
| `rw` | Kinyarwanda | Ikinyarwanda |

The language preference is:
1. Stored on the `User` record in the database
2. Loaded into the JWT session on login
3. Synced to i18next on app load
4. Also storable in a cookie (`twihugure_lang`) for pre-login use (e.g. login/register pages)

---

## Project Structure

```
twihugure-hub/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login form
│   │   ├── register/page.tsx       # Farmer registration
│   │   └── layout.tsx              # Auth layout (redirects if logged in)
│   ├── (dashboard)/
│   │   ├── farmer/dashboard/       # Farmer dashboard
│   │   ├── trainer/dashboard/      # Trainer dashboard
│   │   ├── admin/dashboard/        # Admin dashboard (with live DB stats)
│   │   ├── mbaza/dashboard/        # Mbaza staff dashboard
│   │   └── layout.tsx              # Authenticated layout wrapper
│   ├── api/
│   │   ├── auth/[...nextauth]/     # NextAuth handler
│   │   └── auth/register/          # Farmer registration API
│   ├── globals.css
│   ├── layout.tsx                  # Root layout (SessionProvider + I18nProvider)
│   └── page.tsx                    # Root redirect
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx              # Top navbar
│   │   ├── Sidebar.tsx             # Role-aware sidebar
│   │   └── DashboardShell.tsx      # Client wrapper for layout
│   ├── providers/
│   │   ├── SessionProvider.tsx     # NextAuth session provider
│   │   └── I18nProvider.tsx        # i18next provider
│   └── ui/
│       └── LanguageSelector.tsx    # Language switcher dropdown
├── lib/
│   ├── auth.ts                     # NextAuth config + helpers
│   ├── audit.ts                    # Audit log utility
│   ├── db.ts                       # Prisma client singleton
│   ├── i18n.ts                     # i18next initialization
│   ├── useTranslation.ts           # Custom hook wrappers
│   └── utils.ts                    # cn(), getInitials(), etc.
├── locales/
│   ├── en/common.json              # English translations
│   ├── fr/common.json              # French translations
│   └── rw/common.json              # Kinyarwanda translations
├── prisma/
│   ├── schema.prisma               # Database models
│   └── seed.ts                     # Demo data seeder
├── types/
│   ├── index.ts                    # Global types + constants
│   └── next-auth.d.ts              # NextAuth type augmentation
├── middleware.ts                   # Route protection middleware
└── .env.example                    # Environment variable template
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- `pnpm` (recommended) or `npm`

### Installation

```bash
# 1. Clone and install
git clone <repo-url>
cd twihugure-hub
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 3. Push the Prisma schema to the database
pnpm db:push

# 4. Generate Prisma client
pnpm db:generate

# 5. (Optional) Seed demo data
pnpm db:seed

# 6. Start the development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Demo Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@twihugure.rw | Admin@2024! |
| Trainer | trainer@twihugure.rw | Trainer@2024! |
| Mbaza Staff | mbaza@twihugure.rw | Mbaza@2024! |
| Farmer | farmer@twihugure.rw | Farmer@2024! |

---

## Authentication Flow

1. User submits email + password on `/login`
2. NextAuth `CredentialsProvider` verifies against DB (bcrypt hash comparison)
3. On success, a JWT is issued containing `{ id, role, preferredLanguage }`
4. The middleware reads the JWT and enforces role-based access:
   - `/farmer/*` → FARMER only
   - `/trainer/*` → TRAINER only
   - `/admin/*` → ADMIN only
   - `/mbaza/*` → MBAZA_STAFF only
5. Wrong-role access redirects to the user's own dashboard (not a 403)

---

## Route Protection

The `middleware.ts` file uses `next-auth/middleware`'s `withAuth` wrapper.

- All routes under `/farmer`, `/trainer`, `/admin`, `/mbaza` are protected
- Unauthenticated users are redirected to `/login?callbackUrl=<requested-path>`
- Authenticated users accessing the wrong role route are redirected to their dashboard

---

## Internationalization

Translation files are in `/locales/{en,fr,rw}/common.json`.

- **Pre-login**: Language selector in the navbar changes `i18n.language` and writes the `twihugure_lang` cookie
- **Post-login**: The user's `preferredLanguage` from the DB is loaded into the JWT session and synced to i18next on app mount
- **Adding a key**: Add it to all three JSON files simultaneously to avoid missing-key warnings

---

## Audit Logging

Every login is automatically logged to the `audit_logs` table. Use `createAuditLog()` from `lib/audit.ts` to log any other action:

```ts
import { createAuditLog, AuditActions } from "@/lib/audit";

await createAuditLog({
  userId: session.user.id,
  action: AuditActions.UPDATE_PROFILE,
  entity: "User",
  entityId: session.user.id,
  metadata: { changedFields: ["name"] },
});
```

---

## What's Next

This foundation is ready for the following features:

- [ ] Course creation and management (Trainer)
- [ ] Course enrollment and progress tracking (Farmer)
- [ ] Quiz builder and auto-grading
- [ ] Mbaza knowledge base (Q&A, articles)
- [ ] Admin user management CRUD
- [ ] Notification system
- [ ] Certificate generation (PDF)
- [ ] Offline-capable PWA mode

---

## License

Proprietary — TwihugureHub / Rwanda Agricultural Training Initiative
