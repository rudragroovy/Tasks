-- CreateTable
CREATE TABLE "DoctorWorkingHourOverride" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "segmentIndex" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorWorkingHourOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorWorkingHourOverride_doctorId_date_segmentIndex_key" ON "DoctorWorkingHourOverride"("doctorId", "date", "segmentIndex");

-- CreateIndex
CREATE INDEX "DoctorWorkingHourOverride_doctorId_date_idx" ON "DoctorWorkingHourOverride"("doctorId", "date");

-- AddForeignKey
ALTER TABLE "DoctorWorkingHourOverride" ADD CONSTRAINT "DoctorWorkingHourOverride_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
