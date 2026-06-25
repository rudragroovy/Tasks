CREATE TABLE "PatientProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profilePictureUrl" TEXT,
  "givenName" TEXT,
  "secondaryName" TEXT,
  "familyName" TEXT,
  "noFamilyName" BOOLEAN NOT NULL DEFAULT false,
  "relation" TEXT,
  "gender" TEXT,
  "dateOfBirth" TEXT,
  "phoneCode" TEXT DEFAULT '+61',
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "ctgIslandOrigin" TEXT,
  "allergies" TEXT,
  "medicareCardNumber" TEXT,
  "medicareIrn" TEXT,
  "dvaCardNumber" TEXT,
  "dvaCardColor" TEXT,
  "currentGpName" TEXT,
  "currentGpEmail" TEXT,
  "partnerCode" TEXT,
  "noCurrentGpDetails" BOOLEAN NOT NULL DEFAULT false,
  "healthIdentifierType" TEXT DEFAULT 'Medicare Number',
  "saveHealthIdentifier" BOOLEAN NOT NULL DEFAULT false,
  "onBehalfOfFamilyMember" BOOLEAN NOT NULL DEFAULT false,
  "patientConsentGiven" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientProfile_userId_key" ON "PatientProfile"("userId");

ALTER TABLE "PatientProfile"
ADD CONSTRAINT "PatientProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
