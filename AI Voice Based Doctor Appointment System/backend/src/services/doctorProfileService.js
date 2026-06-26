const OTP_DELIVERY_CHANNEL_VALUES = ['EMAIL', 'PHONE', 'BOTH'];
const OTP_DELIVERY_CHANNELS = new Set(OTP_DELIVERY_CHANNEL_VALUES);
const PRACTITIONER_TYPE_VALUES = [
  'General Practitioner (GP)',
  'Nurse Practitioner (NP)',
  'Nurse',
  'Dentist',
  'Specialist',
];
const PRACTITIONER_TYPES = new Set(PRACTITIONER_TYPE_VALUES);
const LEGACY_PRACTITIONER_TYPE_MAP = {
  Consultant: 'Specialist',
  'Resident Medical Officer': 'General Practitioner (GP)',
};
const MAX_SERVICE_ITEMS = 80;
const MAX_SERVICE_ITEM_LENGTH = 120;
const MAX_SERVICE_PAYLOAD_LENGTH = 12000;

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function sanitizeText(value, { max = 255, allowEmpty = false } = {}) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return allowEmpty ? '' : null;
  return text.slice(0, max);
}

function sanitizeEmail(value) {
  const email = sanitizeText(value, { max: 254 });
  return email ? email.toLowerCase() : null;
}

function sanitizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeOtpDeliveryChannel(value, fallback = 'BOTH') {
  if (value === null || value === undefined) return fallback;
  const channel = String(value).trim().toUpperCase();
  if (!OTP_DELIVERY_CHANNELS.has(channel)) return null;
  return channel;
}

function sanitizeServiceItem(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, MAX_SERVICE_ITEM_LENGTH);
}

function sanitizeServiceList(value) {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const normalized = [];
  const seen = new Set();

  for (const item of rawItems) {
    const sanitized = sanitizeServiceItem(item);
    if (!sanitized) continue;
    const dedupeKey = sanitized.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    normalized.push(sanitized);
    if (normalized.length >= MAX_SERVICE_ITEMS) break;
  }

  return normalized;
}

function sanitizeServiceRateMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const sanitized = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = sanitizeServiceItem(rawKey);
    if (!key) continue;
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric) || numeric <= 0) continue;
    sanitized[key] = Number(numeric.toFixed(2));
  }
  return sanitized;
}

function alignServiceRatesWithSelectedServices(rateMap, selectedServices) {
  const normalizedRates = sanitizeServiceRateMap(rateMap);
  const selectedList = sanitizeServiceList(selectedServices);
  if (!selectedList.length) return {};

  const selectedLookup = new Set(selectedList.map((name) => name.toLowerCase()));
  const aligned = {};
  for (const [serviceName, rate] of Object.entries(normalizedRates)) {
    if (!selectedLookup.has(serviceName.toLowerCase())) continue;
    aligned[serviceName] = rate;
  }

  return aligned;
}

function parseStoredDoctorServices(value) {
  if (value === null || value === undefined) {
    return { selectedServiceTypes: [], selectedServices: [], selectedServiceRates: {} };
  }

  if (typeof value !== 'string') {
    return {
      selectedServiceTypes: [],
      selectedServices: sanitizeServiceList(value),
      selectedServiceRates: {},
    };
  }

  const raw = value.trim();
  if (!raw) {
    return { selectedServiceTypes: [], selectedServices: [], selectedServiceRates: {} };
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return {
        selectedServiceTypes: [],
        selectedServices: sanitizeServiceList(parsed),
        selectedServiceRates: {},
      };
    }
    if (parsed && typeof parsed === 'object') {
      const nextSelectedServices = sanitizeServiceList(
        parsed.selectedServices ?? parsed.services
      );
      return {
        selectedServiceTypes: sanitizeServiceList(
          parsed.selectedServiceTypes ?? parsed.serviceTypes
        ),
        selectedServices: nextSelectedServices,
        selectedServiceRates: alignServiceRatesWithSelectedServices(
          parsed.selectedServiceRates ?? parsed.serviceRates,
          nextSelectedServices
        ),
      };
    }
  } catch (error) {
    // Legacy non-JSON values are handled as a comma-separated service list.
  }

  return {
    selectedServiceTypes: [],
    selectedServices: sanitizeServiceList(raw),
    selectedServiceRates: {},
  };
}

function serializeDoctorServicesSelection({ selectedServiceTypes, selectedServices, selectedServiceRates }) {
  const nextSelectedServices = sanitizeServiceList(selectedServices);
  const payload = JSON.stringify({
    selectedServiceTypes: sanitizeServiceList(selectedServiceTypes),
    selectedServices: nextSelectedServices,
    selectedServiceRates: alignServiceRatesWithSelectedServices(selectedServiceRates, nextSelectedServices),
  });

  if (payload.length > MAX_SERVICE_PAYLOAD_LENGTH) {
    const error = new Error('Selected services payload is too large');
    error.statusCode = 400;
    throw error;
  }

  return payload;
}

function readDoctorServicesSelection(payload, doctor) {
  const hasSelectedServiceTypes = hasOwn(payload, 'selectedServiceTypes');
  const hasSelectedServices = hasOwn(payload, 'selectedServices');
  const hasSelectedServiceRates = hasOwn(payload, 'selectedServiceRates');
  const hasLegacyServices = hasOwn(payload, 'services');

  if (!hasSelectedServiceTypes && !hasSelectedServices && !hasSelectedServiceRates && !hasLegacyServices) {
    return doctor?.services ?? null;
  }

  const existing = parseStoredDoctorServices(doctor?.services);
  const nextSelectedServiceTypes = hasSelectedServiceTypes
    ? sanitizeServiceList(payload.selectedServiceTypes)
    : existing.selectedServiceTypes;
  const nextSelectedServices = hasSelectedServices
    ? sanitizeServiceList(payload.selectedServices)
    : hasLegacyServices
      ? sanitizeServiceList(payload.services)
      : existing.selectedServices;
  const nextSelectedServiceRates = hasSelectedServiceRates
    ? alignServiceRatesWithSelectedServices(payload.selectedServiceRates, nextSelectedServices)
    : alignServiceRatesWithSelectedServices(existing.selectedServiceRates, nextSelectedServices);

  return serializeDoctorServicesSelection({
    selectedServiceTypes: nextSelectedServiceTypes,
    selectedServices: nextSelectedServices,
    selectedServiceRates: nextSelectedServiceRates,
  });
}

function splitDoctorName(fullName) {
  const cleaned = String(fullName || '')
    .replace(/^Dr\.?\s*/i, '')
    .trim();

  if (!cleaned) return { givenName: '', familyName: '' };
  const tokens = cleaned.split(/\s+/);
  if (tokens.length === 1) return { givenName: tokens[0], familyName: '' };

  return {
    givenName: tokens[0],
    familyName: tokens.slice(1).join(' '),
  };
}

function buildDoctorName({ givenName, secondaryName, familyName, noFamilyName, fallbackName }) {
  const segments = [];
  if (givenName) segments.push(givenName);
  if (secondaryName) segments.push(secondaryName);
  if (!noFamilyName && familyName) segments.push(familyName);

  const merged = segments.join(' ').trim();
  return merged || String(fallbackName || '').trim() || 'Doctor';
}

function readStringField(payload, key, currentValue, options) {
  if (!hasOwn(payload, key)) return currentValue ?? null;
  return sanitizeText(payload[key], options);
}

function readBooleanField(payload, key, currentValue) {
  if (!hasOwn(payload, key)) return Boolean(currentValue);
  return sanitizeBoolean(payload[key], Boolean(currentValue));
}

function normalizePractitionerType(value, fallback = 'General Practitioner (GP)') {
  const raw = sanitizeText(value, { max: 120 });
  if (!raw) return fallback;
  const mapped = LEGACY_PRACTITIONER_TYPE_MAP[raw] || raw;
  if (PRACTITIONER_TYPES.has(mapped)) return mapped;
  return null;
}

function readPractitionerTypeField(payload, key, currentValue) {
  const fallback = normalizePractitionerType(currentValue, 'General Practitioner (GP)') || 'General Practitioner (GP)';
  if (!hasOwn(payload, key)) return fallback;
  const normalized = normalizePractitionerType(payload[key], fallback);
  if (!normalized) {
    const error = new Error(`practitionerType must be one of: ${PRACTITIONER_TYPE_VALUES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function buildDoctorProfileResponse(doctor, user) {
  const parsedName = splitDoctorName(user?.name);
  const servicesSelection = parseStoredDoctorServices(doctor?.services);
  const servicesSummary = servicesSelection.selectedServices.join(', ');
  const emailChannelConfigured = Boolean(String(user?.email || '').trim());
  const phoneChannelConfigured = Boolean(String(doctor?.phone || '').trim());
  const hiConfigured = Boolean(String(doctor?.hpiIndividualNumber || '').trim());
  const mimsConfigured = Boolean(String(doctor?.mimsUserId || '').trim());

  return {
    givenName: doctor?.givenName || parsedName.givenName || '',
    secondaryName: doctor?.secondaryName || '',
    familyName: doctor?.familyName || parsedName.familyName || '',
    noFamilyName: Boolean(doctor?.noFamilyName),
    gender: doctor?.gender || 'Male',
    dateOfBirth: doctor?.dateOfBirth || '',
    phoneCode: doctor?.phoneCode || '+91',
    phoneNumber: doctor?.phone || '',
    email: user?.email || '',
    address: doctor?.address || '',
    experience: doctor?.experienceRange || '0-1',
    qualification: doctor?.qualification || 'MBBS',
    practitionerType: normalizePractitionerType(doctor?.practitionerType, 'General Practitioner (GP)') || 'General Practitioner (GP)',
    services: servicesSummary,
    selectedServiceTypes: servicesSelection.selectedServiceTypes,
    selectedServices: servicesSelection.selectedServices,
    selectedServiceRates: servicesSelection.selectedServiceRates,
    about: doctor?.about || '',
    ahpraNumber: doctor?.ahpraNumber || '',
    prescriberNumber: doctor?.prescriberNumber || '',
    providerNumber: doctor?.providerNumber || '',
    hpiIndividualNumber: doctor?.hpiIndividualNumber || '',
    hpioNumber: doctor?.hpioNumber || '',
    saveMyHINumber: doctor?.saveMyHINumber ?? true,
    mimsUserId: doctor?.mimsUserId || '',
    mimsEulaAccepted: doctor?.mimsEulaAccepted ?? false,
    mimsTermsAccepted: doctor?.mimsTermsAccepted ?? false,
    prescriptionEntityId: doctor?.prescriptionEntityId || '',
    prescriptionAccessEnabled: doctor?.prescriptionAccessEnabled ?? true,
    accountHolderName: doctor?.accountHolderName || '',
    accountNumber: doctor?.accountNumber || '',
    routingNumber: doctor?.routingNumber || '',
    autoDraftNotesEnabled: doctor?.autoDraftNotesEnabled ?? false,
    showOnlineOnLogin: doctor?.showOnlineOnLogin ?? true,
    otpDeliveryChannel: doctor?.otpDeliveryChannel || 'BOTH',
    isOnline: Boolean(doctor?.isOnline),
    emailChannelConfigured,
    phoneChannelConfigured,
    hiStatusLabel: hiConfigured ? 'Configured' : 'Not Set',
    mimsStatusLabel: mimsConfigured ? 'Configured' : 'Not Set',
    otpDeliveryDescription:
      'Choose where you receive your one-time login code based on your configured contact details.',
    phoneChannelHint: phoneChannelConfigured
      ? ''
      : 'Add a phone number in profile to use SMS OTP.',
    otpSecurityNote: phoneChannelConfigured
      ? 'Your login code is delivered only to configured channels.'
      : 'Phone channel is missing. OTP will be delivered using email only.',
    otpSecurityActionText:
      'Update your email and phone details from your Profile to enable additional options.',
    hiInfoUrl:
      'https://www.servicesaustralia.gov.au/health-identifiers-for-health-professionals',
    hiInfoText: 'Learn more about Health Identifiers.',
  };
}

function sanitizeDoctorProfilePayload(payload, doctor, user) {
  const givenName = readStringField(payload, 'givenName', doctor?.givenName, { max: 80 });
  const secondaryName = readStringField(payload, 'secondaryName', doctor?.secondaryName, { max: 80 });
  const noFamilyName = readBooleanField(payload, 'noFamilyName', doctor?.noFamilyName);
  let familyName = readStringField(payload, 'familyName', doctor?.familyName, { max: 80 });
  if (noFamilyName) familyName = null;

  const email = hasOwn(payload, 'email')
    ? sanitizeEmail(payload.email)
    : sanitizeEmail(user?.email);
  if (!email) {
    const error = new Error('Email is required');
    error.statusCode = 400;
    throw error;
  }

  const nextUserName = buildDoctorName({
    givenName,
    secondaryName,
    familyName,
    noFamilyName,
    fallbackName: user?.name,
  });

  return {
    userData: {
      name: nextUserName,
      email,
    },
    doctorData: {
      givenName,
      secondaryName,
      familyName,
      noFamilyName,
      gender: readStringField(payload, 'gender', doctor?.gender, { max: 20 }),
      dateOfBirth: readStringField(payload, 'dateOfBirth', doctor?.dateOfBirth, { max: 20 }),
      phoneCode: readStringField(payload, 'phoneCode', doctor?.phoneCode, { max: 8 }),
      phone: readStringField(payload, 'phoneNumber', doctor?.phone, { max: 25 }),
      address: readStringField(payload, 'address', doctor?.address, { max: 300 }),
      experienceRange: readStringField(payload, 'experience', doctor?.experienceRange, { max: 20 }),
      qualification: readStringField(payload, 'qualification', doctor?.qualification, { max: 120 }),
      practitionerType: readPractitionerTypeField(payload, 'practitionerType', doctor?.practitionerType),
      services: readDoctorServicesSelection(payload, doctor),
      about: readStringField(payload, 'about', doctor?.about, { max: 500 }),
      ahpraNumber: readStringField(payload, 'ahpraNumber', doctor?.ahpraNumber, { max: 80 }),
      prescriberNumber: readStringField(payload, 'prescriberNumber', doctor?.prescriberNumber, { max: 80 }),
      providerNumber: readStringField(payload, 'providerNumber', doctor?.providerNumber, { max: 80 }),
      hpiIndividualNumber: readStringField(payload, 'hpiIndividualNumber', doctor?.hpiIndividualNumber, { max: 80 }),
      hpioNumber: readStringField(payload, 'hpioNumber', doctor?.hpioNumber, { max: 80 }),
      saveMyHINumber: readBooleanField(payload, 'saveMyHINumber', doctor?.saveMyHINumber),
      mimsUserId: readStringField(payload, 'mimsUserId', doctor?.mimsUserId, { max: 120 }),
      mimsEulaAccepted: readBooleanField(payload, 'mimsEulaAccepted', doctor?.mimsEulaAccepted),
      mimsTermsAccepted: readBooleanField(payload, 'mimsTermsAccepted', doctor?.mimsTermsAccepted),
      prescriptionEntityId: readStringField(payload, 'prescriptionEntityId', doctor?.prescriptionEntityId, { max: 80 }),
      prescriptionAccessEnabled: readBooleanField(payload, 'prescriptionAccessEnabled', doctor?.prescriptionAccessEnabled),
    },
  };
}

function sanitizeDoctorBankPayload(payload, doctor) {
  return {
    accountHolderName: readStringField(payload, 'accountHolderName', doctor?.accountHolderName, { max: 120 }),
    accountNumber: readStringField(payload, 'accountNumber', doctor?.accountNumber, { max: 60 }),
    routingNumber: readStringField(payload, 'routingNumber', doctor?.routingNumber, { max: 60 }),
  };
}

function sanitizeDoctorSettingsPayload(payload, doctor) {
  const nextSettings = {};

  if (hasOwn(payload, 'showOnlineOnLogin')) {
    if (typeof payload.showOnlineOnLogin !== 'boolean') {
      const error = new Error('showOnlineOnLogin must be a boolean');
      error.statusCode = 400;
      throw error;
    }
    nextSettings.showOnlineOnLogin = payload.showOnlineOnLogin;
    nextSettings.isOnline = payload.showOnlineOnLogin;
  }

  if (hasOwn(payload, 'autoDraftNotesEnabled')) {
    if (typeof payload.autoDraftNotesEnabled !== 'boolean') {
      const error = new Error('autoDraftNotesEnabled must be a boolean');
      error.statusCode = 400;
      throw error;
    }
    nextSettings.autoDraftNotesEnabled = payload.autoDraftNotesEnabled;
  }

  if (hasOwn(payload, 'otpDeliveryChannel')) {
    const normalizedOtp = sanitizeOtpDeliveryChannel(payload.otpDeliveryChannel, doctor?.otpDeliveryChannel || 'BOTH');
    if (!normalizedOtp) {
      const error = new Error(`otpDeliveryChannel must be one of: ${OTP_DELIVERY_CHANNEL_VALUES.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    nextSettings.otpDeliveryChannel = normalizedOtp;
  }

  if (Object.keys(nextSettings).length === 0) {
    const error = new Error('No valid settings provided');
    error.statusCode = 400;
    throw error;
  }

  return nextSettings;
}

function buildDoctorSettingsResponse(doctor) {
  return {
    showOnlineOnLogin: doctor?.showOnlineOnLogin ?? true,
    autoDraftNotesEnabled: doctor?.autoDraftNotesEnabled ?? false,
    otpDeliveryChannel: doctor?.otpDeliveryChannel || 'BOTH',
    isOnline: Boolean(doctor?.isOnline),
  };
}

module.exports = {
  OTP_DELIVERY_CHANNEL_VALUES,
  buildDoctorProfileResponse,
  sanitizeDoctorProfilePayload,
  sanitizeDoctorBankPayload,
  sanitizeDoctorSettingsPayload,
  buildDoctorSettingsResponse,
};
