-- This migration can run before PatientProfile exists in a fresh replay.
-- Keep it idempotent so shadow DB migration succeeds.
ALTER TABLE IF EXISTS "PatientProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;
