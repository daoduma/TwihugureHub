# Database Sync

This project uses **`prisma db push`** to keep the live database schema in sync
with `prisma/schema.prisma`. It runs automatically on every Vercel deploy as
part of the `build` script:

```
"build": "prisma generate && prisma db push --skip-generate && next build"
```

`db push` is the right tool here because the schema is still evolving: it
detects differences between `schema.prisma` and the live DB and applies them
without requiring a versioned migration history. All changes in this project
are additive (new columns, new tables, new enums) so no data is lost.

## If a deploy fails because of a schema mismatch

If you need to fix the database **right now** without redeploying — for example
the error `column "questions.aiGrading" does not exist` — open the Supabase SQL
editor and run `prisma/manual_sync.sql`. It is idempotent (uses `IF NOT EXISTS`
guards) so it is safe to run multiple times.

## Local development

- `npm run db:push` — sync schema to your local DB without creating a migration
- `npm run db:studio` — visual editor for the DB
- `npm run db:seed` — reseed test data

## Switching to versioned migrations later

When the schema stabilises and you want a real migration history, run:

```
npx prisma migrate dev --name init --create-only
```

against a fresh DB to baseline, then change the build script back to
`prisma migrate deploy`.
