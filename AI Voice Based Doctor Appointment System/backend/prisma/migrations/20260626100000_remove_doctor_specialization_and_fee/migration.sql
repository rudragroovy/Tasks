-- Align doctor schema to practitionerType + service-based pricing.
ALTER TABLE "Doctor" DROP CONSTRAINT IF EXISTS "Doctor_specializationId_fkey";

ALTER TABLE "Doctor"
  DROP COLUMN IF EXISTS "specializationId",
  DROP COLUMN IF EXISTS "fee";

DROP TABLE IF EXISTS "Specialization";
