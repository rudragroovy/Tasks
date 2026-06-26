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

const DEFAULT_CONSULTATION_FEE = 75;

function sanitizeServiceItem(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeStringArray(values) {
  const list = Array.isArray(values)
    ? values
    : typeof values === 'string'
      ? values.split(',')
      : [];

  const output = [];
  const seen = new Set();
  for (const value of list) {
    const sanitized = sanitizeServiceItem(value);
    if (!sanitized) continue;
    const dedupeKey = sanitized.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    output.push(sanitized);
  }
  return output;
}

function sanitizeServiceRateMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const output = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = sanitizeServiceItem(rawKey);
    if (!key) continue;
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric) || numeric <= 0) continue;
    output[key] = Number(numeric.toFixed(2));
  }
  return output;
}

function parseDoctorServicesSelection(value) {
  if (value === null || value === undefined) {
    return { selectedServiceTypes: [], selectedServices: [], selectedServiceRates: {} };
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return {
      selectedServiceTypes: normalizeStringArray(value.selectedServiceTypes ?? value.serviceTypes),
      selectedServices: normalizeStringArray(value.selectedServices ?? value.services),
      selectedServiceRates: sanitizeServiceRateMap(value.selectedServiceRates ?? value.serviceRates),
    };
  }

  if (typeof value !== 'string') {
    return { selectedServiceTypes: [], selectedServices: normalizeStringArray(value), selectedServiceRates: {} };
  }

  const raw = value.trim();
  if (!raw) {
    return { selectedServiceTypes: [], selectedServices: [], selectedServiceRates: {} };
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { selectedServiceTypes: [], selectedServices: normalizeStringArray(parsed), selectedServiceRates: {} };
    }
    if (parsed && typeof parsed === 'object') {
      return {
        selectedServiceTypes: normalizeStringArray(parsed.selectedServiceTypes ?? parsed.serviceTypes),
        selectedServices: normalizeStringArray(parsed.selectedServices ?? parsed.services),
        selectedServiceRates: sanitizeServiceRateMap(parsed.selectedServiceRates ?? parsed.serviceRates),
      };
    }
  } catch (error) {
    // Legacy comma-separated payloads are handled below.
  }

  return { selectedServiceTypes: [], selectedServices: normalizeStringArray(raw), selectedServiceRates: {} };
}

function getServiceRateFromMap(rateMap, serviceName) {
  if (!rateMap || typeof rateMap !== 'object' || !serviceName) return null;

  const direct = Number(rateMap[serviceName]);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const target = String(serviceName).trim().toLowerCase();
  if (!target) return null;

  for (const [key, value] of Object.entries(rateMap)) {
    if (String(key).trim().toLowerCase() !== target) continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }

  return null;
}

function getDefaultConsultationFeeFromServicesSelection(selection) {
  const rateMap = sanitizeServiceRateMap(selection?.selectedServiceRates);
  const rates = Object.values(rateMap)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!rates.length) return DEFAULT_CONSULTATION_FEE;
  const total = rates.reduce((sum, value) => sum + value, 0);
  return Number((total / rates.length).toFixed(2));
}

function normalizePractitionerType(value, fallback = 'General Practitioner (GP)') {
  const raw = sanitizeServiceItem(value);
  if (!raw) return fallback;
  const mapped = LEGACY_PRACTITIONER_TYPE_MAP[raw] || raw;
  if (PRACTITIONER_TYPES.has(mapped)) return mapped;
  return fallback;
}

function getPractitionerTypeListAsSpecializationItems() {
  return PRACTITIONER_TYPE_VALUES.map((name) => ({
    id: name,
    name,
  }));
}

module.exports = {
  PRACTITIONER_TYPE_VALUES,
  DEFAULT_CONSULTATION_FEE,
  normalizePractitionerType,
  normalizeStringArray,
  parseDoctorServicesSelection,
  getServiceRateFromMap,
  getDefaultConsultationFeeFromServicesSelection,
  getPractitionerTypeListAsSpecializationItems,
};
