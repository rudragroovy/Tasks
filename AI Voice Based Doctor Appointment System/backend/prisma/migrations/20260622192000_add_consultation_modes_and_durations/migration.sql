-- CreateEnum
CREATE TYPE "ConsultationMode" AS ENUM ('VIDEO', 'AUDIO', 'IN_PERSON');

-- AlterTable Doctor
ALTER TABLE "Doctor" ADD COLUMN "slotDurationMinutesVideo" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Doctor" ADD COLUMN "slotDurationMinutesAudio" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "Doctor" ADD COLUMN "slotDurationMinutesInPerson" INTEGER NOT NULL DEFAULT 40;

-- Backfill from legacy slotDurationMinutes when present
UPDATE "Doctor"
SET "slotDurationMinutesVideo" = COALESCE("slotDurationMinutes", 30);

-- Remove legacy column
ALTER TABLE "Doctor" DROP COLUMN "slotDurationMinutes";

-- AlterTable Appointment
ALTER TABLE "Appointment" ADD COLUMN "consultationMode" "ConsultationMode" NOT NULL DEFAULT 'VIDEO';
ALTER TABLE "Appointment" ADD COLUMN "scheduledUntil" TIMESTAMP(3);

-- Backfill scheduledUntil from DoctorSlot when possible
UPDATE "Appointment" a
SET "scheduledUntil" = s."endAt"
FROM "DoctorSlot" s
WHERE s."appointmentId" = a."id"
  AND a."scheduledFor" IS NOT NULL
  AND a."scheduledUntil" IS NULL;

-- Fallback backfill: +30 min
UPDATE "Appointment"
SET "scheduledUntil" = "scheduledFor" + interval '30 minute'
WHERE "scheduledFor" IS NOT NULL
  AND "scheduledUntil" IS NULL;

-- AlterTable DoctorWorkingHour
ALTER TABLE "DoctorWorkingHour" ADD COLUMN "consultationMode" "ConsultationMode" NOT NULL DEFAULT 'VIDEO';

-- AlterTable DoctorWorkingHourOverride
ALTER TABLE "DoctorWorkingHourOverride" ADD COLUMN "consultationMode" "ConsultationMode" NOT NULL DEFAULT 'VIDEO';

-- Drop old indexes/constraints and create new ones
DROP INDEX IF EXISTS "DoctorWorkingHour_doctorId_idx";
DROP INDEX IF EXISTS "DoctorWorkingHour_doctorId_dayOfWeek_segmentIndex_key";
CREATE UNIQUE INDEX "DoctorWorkingHour_doctorId_consultationMode_dayOfWeek_segmentIndex_key"
  ON "DoctorWorkingHour"("doctorId", "consultationMode", "dayOfWeek", "segmentIndex");
CREATE INDEX "DoctorWorkingHour_doctorId_consultationMode_idx"
  ON "DoctorWorkingHour"("doctorId", "consultationMode");

DROP INDEX IF EXISTS "DoctorWorkingHourOverride_doctorId_date_idx";
DROP INDEX IF EXISTS "DoctorWorkingHourOverride_doctorId_date_segmentIndex_key";
CREATE UNIQUE INDEX "DoctorWorkingHourOverride_doctorId_consultationMode_date_segmentIndex_key"
  ON "DoctorWorkingHourOverride"("doctorId", "consultationMode", "date", "segmentIndex");
CREATE INDEX "DoctorWorkingHourOverride_doctorId_consultationMode_date_idx"
  ON "DoctorWorkingHourOverride"("doctorId", "consultationMode", "date");

-- Index for overlap checks
CREATE INDEX "Appointment_doctorId_scheduledFor_scheduledUntil_idx"
  ON "Appointment"("doctorId", "scheduledFor", "scheduledUntil");
