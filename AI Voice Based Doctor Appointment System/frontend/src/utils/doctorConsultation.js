import { getServiceRate } from '../data/practitionerServiceCatalog';
import {
  getServiceRateFromMap,
  normalizeStringArray,
  parseDoctorServiceSelections,
} from './doctorServices';

function toPositiveNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Number(numeric.toFixed(2));
}

function getServiceNameFromSummary(summary) {
  const source = summary && typeof summary === 'object' ? summary : {};
  const candidates = [
    source.serviceName,
    source.service,
    source.selected_service,
    source.suggested_service,
  ];
  for (const candidate of candidates) {
    const text = String(candidate || '').trim();
    if (!text) continue;
    return text;
  }
  return '';
}

export function getPractitionerTypeLabel(doctorLike, fallback = 'General Practitioner (GP)') {
  const text =
    doctorLike?.practitionerType ||
    doctorLike?.doctorProfile?.practitionerType ||
    fallback;
  return String(text || fallback).trim() || fallback;
}

export function getDoctorConsultationFeeFromDoctorRecord(doctor, fallback = 75) {
  const directFee = toPositiveNumber(doctor?.consultationFee);
  if (directFee) return directFee;

  const parsed = parseDoctorServiceSelections(doctor?.services);
  const rates = Object.values(parsed.selectedServiceRates || {})
    .map((value) => toPositiveNumber(value))
    .filter(Boolean);

  if (rates.length > 0) {
    const total = rates.reduce((sum, value) => sum + value, 0);
    return Number((total / rates.length).toFixed(2));
  }

  const firstService = normalizeStringArray(parsed.selectedServices)[0];
  if (firstService) return getServiceRate(firstService);
  return fallback;
}

export function getAppointmentConsultationFee(appointment, fallback = 75) {
  const fromSummary = toPositiveNumber(appointment?.aiSummary?.consultationFee);
  if (fromSummary) return fromSummary;

  const doctorSource = appointment?.doctor?.doctorProfile || appointment?.doctor || {};
  const parsed = parseDoctorServiceSelections(doctorSource?.services);
  const serviceName = getServiceNameFromSummary(appointment?.aiSummary);
  const mappedRate = serviceName
    ? toPositiveNumber(getServiceRateFromMap(parsed.selectedServiceRates, serviceName))
    : null;
  if (mappedRate) return mappedRate;

  const rates = Object.values(parsed.selectedServiceRates || {})
    .map((value) => toPositiveNumber(value))
    .filter(Boolean);
  if (rates.length > 0) {
    const total = rates.reduce((sum, value) => sum + value, 0);
    return Number((total / rates.length).toFixed(2));
  }

  if (serviceName) return getServiceRate(serviceName);
  const firstService = normalizeStringArray(parsed.selectedServices)[0];
  if (firstService) return getServiceRate(firstService);
  return fallback;
}
