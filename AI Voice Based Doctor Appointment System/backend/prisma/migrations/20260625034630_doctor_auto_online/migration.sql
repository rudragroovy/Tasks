-- DropIndex
DROP INDEX "Appointment_doctorId_scheduledFor_scheduledUntil_idx";

-- AlterTable
ALTER TABLE "DoctorWorkingHour" ALTER COLUMN "segmentIndex" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "DoctorWorkingHour_doctorId_consultationMode_dayOfWeek_segmentIn" RENAME TO "DoctorWorkingHour_doctorId_consultationMode_dayOfWeek_segme_key";

-- RenameIndex
ALTER INDEX "DoctorWorkingHourOverride_doctorId_consultationMode_date_segmen" RENAME TO "DoctorWorkingHourOverride_doctorId_consultationMode_date_se_key";
