ALTER TABLE "DoctorWorkingHour"
ADD COLUMN "segmentIndex" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "DoctorWorkingHour_doctorId_dayOfWeek_key";

CREATE UNIQUE INDEX "DoctorWorkingHour_doctorId_dayOfWeek_segmentIndex_key"
ON "DoctorWorkingHour"("doctorId", "dayOfWeek", "segmentIndex");
