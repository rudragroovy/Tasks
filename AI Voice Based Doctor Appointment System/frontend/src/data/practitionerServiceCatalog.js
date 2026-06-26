import { patientCategoryContentList } from './patientCategoryContent';
import { normalizeStringArray } from '../utils/doctorServices';

export const PRACTITIONER_TYPE_OPTIONS = [
  'General Practitioner (GP)',
  'Nurse Practitioner (NP)',
  'Nurse',
  'Dentist',
  'Specialist',
];

const LEGACY_PRACTITIONER_TYPE_MAP = {
  Consultant: 'Specialist',
  'Resident Medical Officer': 'General Practitioner (GP)',
};

export const SERVICE_TYPE_OPTIONS = [
  { key: 'telehealth-consultation', label: 'Telehealth Medical Consultation' },
  { key: 'prescription', label: 'Prescription' },
  { key: 'medical-certificates', label: 'Medical Certificates' },
  { key: 'pathology-requests', label: 'Pathology Requests' },
  { key: 'radiology-requests', label: 'Radiology Requests' },
  { key: 'specialist-referral', label: 'Specialist Referral' },
];

export const CATEGORY_GROUP_TO_SERVICE_TYPE_KEY = {
  'Telehealth Medical Consultation': 'telehealth-consultation',
  Prescription: 'prescription',
  'Medical Certificates': 'medical-certificates',
  'Pathology Requests': 'pathology-requests',
  'Radiology Requests': 'radiology-requests',
  'Specialist Referral': 'specialist-referral',
};

export const SPECIALIST_SERVICE_OPTIONS = [
  'Audiologist Consultation',
  'Cardiology',
  'Diabetes and Endocrinology',
  'General Physician',
  'Geriatrics',
  'Neurology',
  'Pain Management',
  'Renal and Blood Pressure',
  'Respiratory & Sleep',
  'Radiation Oncology',
  'Rheumatology',
  'Urology',
];

const SERVICE_TYPE_LABEL_BY_KEY = Object.fromEntries(
  SERVICE_TYPE_OPTIONS.map((item) => [item.key, item.label])
);

const SERVICE_TYPE_BASE_RATE = {
  'telehealth-consultation': 55,
  prescription: 32,
  'medical-certificates': 30,
  'pathology-requests': 58,
  'radiology-requests': 72,
  'specialist-referral': 85,
};

const SERVICE_TYPE_RATE_STEP = {
  'telehealth-consultation': 3,
  prescription: 4,
  'medical-certificates': 5,
  'pathology-requests': 4,
  'radiology-requests': 5,
  'specialist-referral': 6,
};

const SPECIALIST_BASE_RATE = 120;
const SPECIALIST_RATE_STEP = 8;

function buildServiceCatalogByType() {
  const byType = {};
  for (const option of SERVICE_TYPE_OPTIONS) {
    byType[option.key] = [];
  }

  for (const category of patientCategoryContentList) {
    const serviceTypeKey = CATEGORY_GROUP_TO_SERVICE_TYPE_KEY[category.group];
    if (!serviceTypeKey) continue;
    const serviceNames = Array.isArray(category.services)
      ? category.services.map((item) => item?.name).filter(Boolean)
      : [];

    byType[serviceTypeKey] = normalizeStringArray([
      ...(byType[serviceTypeKey] || []),
      ...serviceNames,
    ]);
  }

  return byType;
}

function buildPredefinedServiceRates() {
  const rates = {};

  for (const option of SERVICE_TYPE_OPTIONS) {
    const services = SERVICE_CATALOG_BY_TYPE[option.key] || [];
    const base = SERVICE_TYPE_BASE_RATE[option.key] || 50;
    const step = SERVICE_TYPE_RATE_STEP[option.key] || 3;
    services.forEach((serviceName, index) => {
      if (rates[serviceName] !== undefined) return;
      rates[serviceName] = base + index * step;
    });
  }

  SPECIALIST_SERVICE_OPTIONS.forEach((serviceName, index) => {
    rates[serviceName] = SPECIALIST_BASE_RATE + index * SPECIALIST_RATE_STEP;
  });

  return rates;
}

export const SERVICE_CATALOG_BY_TYPE = buildServiceCatalogByType();
export const PREDEFINED_SERVICE_RATES = buildPredefinedServiceRates();

export function normalizePractitionerType(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'General Practitioner (GP)';
  const mapped = LEGACY_PRACTITIONER_TYPE_MAP[raw] || raw;
  if (PRACTITIONER_TYPE_OPTIONS.includes(mapped)) return mapped;
  return 'General Practitioner (GP)';
}

export function isSpecialistPractitionerType(practitionerType) {
  return normalizePractitionerType(practitionerType) === 'Specialist';
}

export function inferServiceTypesFromServices(selectedServices) {
  const normalizedServices = normalizeStringArray(selectedServices);
  if (!normalizedServices.length) return [];
  const lookup = new Set(normalizedServices.map((name) => String(name).toLowerCase()));

  const inferred = [];
  for (const option of SERVICE_TYPE_OPTIONS) {
    const services = SERVICE_CATALOG_BY_TYPE[option.key] || [];
    const hasMatch = services.some((name) => lookup.has(String(name).toLowerCase()));
    if (hasMatch) inferred.push(option.key);
  }
  return inferred;
}

export function getServiceGroupsForSelection(practitionerType, selectedServiceTypeKeys) {
  if (isSpecialistPractitionerType(practitionerType)) {
    return [
      {
        key: 'specialist-consultations',
        label: 'Specialist Consultations',
        services: SPECIALIST_SERVICE_OPTIONS,
      },
    ];
  }

  const normalizedTypeKeys = normalizeStringArray(selectedServiceTypeKeys).filter((key) =>
    SERVICE_TYPE_LABEL_BY_KEY[key]
  );

  return normalizedTypeKeys.map((serviceTypeKey) => ({
    key: serviceTypeKey,
    label: SERVICE_TYPE_LABEL_BY_KEY[serviceTypeKey] || serviceTypeKey,
    services: SERVICE_CATALOG_BY_TYPE[serviceTypeKey] || [],
  }));
}

export function getPersistedServiceTypesForPractitioner(
  practitionerType,
  selectedServiceTypeKeys,
  selectedServices
) {
  if (isSpecialistPractitionerType(practitionerType)) {
    return ['specialist-referral'];
  }

  const normalizedTypeKeys = normalizeStringArray(selectedServiceTypeKeys).filter((key) =>
    SERVICE_TYPE_LABEL_BY_KEY[key]
  );
  if (normalizedTypeKeys.length > 0) return normalizedTypeKeys;
  return inferServiceTypesFromServices(selectedServices);
}

export function getServiceRate(serviceName) {
  const key = String(serviceName || '').trim();
  if (!key) return 0;
  return PREDEFINED_SERVICE_RATES[key] ?? 75;
}

export function buildSelectedServiceRates(selectedServices) {
  const rates = {};
  for (const serviceName of normalizeStringArray(selectedServices)) {
    rates[serviceName] = getServiceRate(serviceName);
  }
  return rates;
}
