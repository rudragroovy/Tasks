const OTP_DELIVERY_CHANNEL_VALUES = ['EMAIL', 'PHONE', 'BOTH'];
const OTP_DELIVERY_CHANNELS = new Set(OTP_DELIVERY_CHANNEL_VALUES);

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

function buildDoctorProfileResponse(doctor, user) {
  const parsedName = splitDoctorName(user?.name);
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
    practitionerType: doctor?.practitionerType || 'General Practitioner (GP)',
    services: doctor?.services || '',
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
      practitionerType: readStringField(payload, 'practitionerType', doctor?.practitionerType, { max: 120 }),
      services: readStringField(payload, 'services', doctor?.services, { max: 200 }),
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
