-- Migration: Add short answer grading and dispute system
-- Run this against your database after deploying the schema changes

-- Step 1: Add new enum values to NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHORT_ANSWER_GRADED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHORT_ANSWER_FLAGGED';

-- Step 2: Create GradingStatus enum
DO $$ BEGIN
  CREATE TYPE "GradingStatus" AS ENUM ('PENDING', 'AI_GRADED', 'MANUALLY_GRADED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Step 3: Create FlagStatus enum
DO $$ BEGIN
  CREATE TYPE "FlagStatus" AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Step 4: Add new columns to questions table
ALTER TABLE "questions"
  ADD COLUMN IF NOT EXISTS "aiGrading" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "desiredResponse" JSONB;

-- Step 5: Add new columns to quiz_answers table
ALTER TABLE "quiz_answers"
  ADD COLUMN IF NOT EXISTS "gradingStatus" "GradingStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "manualScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "trainerFeedback" TEXT;

-- Step 6: Backfill gradingStatus for existing non-short-answer quiz answers
UPDATE "quiz_answers" qa
SET "gradingStatus" = 'MANUALLY_GRADED'
FROM "questions" q
WHERE qa."questionId" = q.id
  AND q.type != 'SHORT_ANSWER';

-- Step 7: Create short_answer_flags table
CREATE TABLE IF NOT EXISTS "short_answer_flags" (
  "id"           TEXT NOT NULL,
  "answerId"     TEXT NOT NULL,
  "farmerId"     TEXT NOT NULL,
  "reason"       TEXT NOT NULL,
  "status"       "FlagStatus" NOT NULL DEFAULT 'OPEN',
  "resolution"   TEXT,
  "resolvedById" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"   TIMESTAMP(3),

  CONSTRAINT "short_answer_flags_pkey" PRIMARY KEY ("id")
);

-- Step 8: Add foreign keys
ALTER TABLE "short_answer_flags"
  ADD CONSTRAINT "short_answer_flags_answerId_fkey"
    FOREIGN KEY ("answerId") REFERENCES "quiz_answers"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "short_answer_flags_farmerId_fkey"
    FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "short_answer_flags_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL;

-- Step 9: Create indexes
CREATE INDEX IF NOT EXISTS "short_answer_flags_answerId_idx" ON "short_answer_flags"("answerId");
CREATE INDEX IF NOT EXISTS "short_answer_flags_farmerId_idx" ON "short_answer_flags"("farmerId");
CREATE INDEX IF NOT EXISTS "short_answer_flags_status_idx" ON "short_answer_flags"("status");
