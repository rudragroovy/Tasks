WITH ranked_doctors AS (
  SELECT
    d."userId",
    ROW_NUMBER() OVER (ORDER BY d."userId") AS rn
  FROM "Doctor" d
)
UPDATE "Doctor" d
SET
  "givenName" = COALESCE(NULLIF(d."givenName", ''), 'Doctor ' || r.rn::text),
  "secondaryName" = COALESCE(NULLIF(d."secondaryName", ''), 'Demo'),
  "familyName" = CASE
    WHEN d."noFamilyName" = true THEN NULL
    ELSE COALESCE(NULLIF(d."familyName", ''), 'Profile')
  END,
  "gender" = COALESCE(
    NULLIF(d."gender", ''),
    CASE
      WHEN (r.rn % 3) = 1 THEN 'Male'
      WHEN (r.rn % 3) = 2 THEN 'Female'
      ELSE 'Other'
    END
  ),
  "dateOfBirth" = COALESCE(
    NULLIF(d."dateOfBirth", ''),
    TO_CHAR((DATE '1985-01-01' + ((r.rn % 7000) * INTERVAL '1 day'))::date, 'DD/MM/YYYY')
  ),
  "phoneCode" = COALESCE(NULLIF(d."phoneCode", ''), '+91'),
  "phone" = COALESCE(NULLIF(d."phone", ''), '9000000000'),
  "address" = COALESCE(NULLIF(d."address", ''), 'Demo Clinic Address ' || r.rn::text),
  "experienceRange" = COALESCE(
    NULLIF(d."experienceRange", ''),
    CASE
      WHEN (r.rn % 5) = 1 THEN '0-1'
      WHEN (r.rn % 5) = 2 THEN '2-5'
      WHEN (r.rn % 5) = 3 THEN '6-10'
      WHEN (r.rn % 5) = 4 THEN '11-15'
      ELSE '16+'
    END
  ),
  "qualification" = COALESCE(NULLIF(d."qualification", ''), 'MBBS'),
  "practitionerType" = COALESCE(NULLIF(d."practitionerType", ''), 'General Practitioner (GP)'),
  "services" = COALESCE(NULLIF(d."services", ''), 'General Consultation'),
  "about" = COALESCE(NULLIF(d."about", ''), 'Experienced doctor profile created for demo data.'),
  "ahpraNumber" = COALESCE(NULLIF(d."ahpraNumber", ''), 'AHPRA-DEMO-' || LPAD(r.rn::text, 6, '0')),
  "prescriberNumber" = COALESCE(NULLIF(d."prescriberNumber", ''), 'PRES-' || LPAD(r.rn::text, 6, '0')),
  "providerNumber" = COALESCE(NULLIF(d."providerNumber", ''), 'PROV-' || LPAD(r.rn::text, 6, '0')),
  "hpiIndividualNumber" = COALESCE(NULLIF(d."hpiIndividualNumber", ''), '8003-0000-0000-' || LPAD(r.rn::text, 4, '0')),
  "hpioNumber" = COALESCE(NULLIF(d."hpioNumber", ''), '8003-0000-1111-' || LPAD(r.rn::text, 4, '0')),
  "saveMyHINumber" = COALESCE(d."saveMyHINumber", true),
  "mimsUserId" = COALESCE(NULLIF(d."mimsUserId", ''), 'MIMS-DEMO-' || LPAD(r.rn::text, 6, '0')),
  "mimsEulaAccepted" = COALESCE(d."mimsEulaAccepted", true),
  "mimsTermsAccepted" = COALESCE(d."mimsTermsAccepted", true),
  "prescriptionEntityId" = COALESCE(NULLIF(d."prescriptionEntityId", ''), 'ENTITY-' || LPAD(r.rn::text, 4, '0')),
  "prescriptionAccessEnabled" = COALESCE(d."prescriptionAccessEnabled", true),
  "accountHolderName" = COALESCE(NULLIF(d."accountHolderName", ''), 'Demo Doctor ' || r.rn::text),
  "accountNumber" = COALESCE(NULLIF(d."accountNumber", ''), '1234567890'),
  "routingNumber" = COALESCE(NULLIF(d."routingNumber", ''), '000111'),
  "autoDraftNotesEnabled" = COALESCE(d."autoDraftNotesEnabled", false),
  "otpDeliveryChannel" = COALESCE(NULLIF(d."otpDeliveryChannel", ''), 'BOTH')
FROM ranked_doctors r
WHERE d."userId" = r."userId";
