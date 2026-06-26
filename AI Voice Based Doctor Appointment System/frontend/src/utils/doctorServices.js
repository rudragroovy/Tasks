export function normalizeStringArray(values) {
  const list = Array.isArray(values)
    ? values
    : typeof values === 'string'
      ? values.split(',')
      : [];

  const normalized = [];
  const seen = new Set();

  for (const value of list) {
    const text = String(value || '').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(text);
  }

  return normalized;
}

function normalizeServiceRateMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const output = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = String(rawKey || '').trim();
    if (!key) continue;
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric) || numeric <= 0) continue;
    output[key] = Number(numeric.toFixed(2));
  }
  return output;
}

export function parseDoctorServiceSelections(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return {
      selectedServiceTypes: [],
      selectedServices: [],
      selectedServiceRates: {},
    };
  }

  if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    return {
      selectedServiceTypes: normalizeStringArray(rawValue.selectedServiceTypes ?? rawValue.serviceTypes),
      selectedServices: normalizeStringArray(rawValue.selectedServices ?? rawValue.services),
      selectedServiceRates: normalizeServiceRateMap(rawValue.selectedServiceRates ?? rawValue.serviceRates),
    };
  }

  if (typeof rawValue !== 'string') {
    return {
      selectedServiceTypes: [],
      selectedServices: normalizeStringArray(rawValue),
      selectedServiceRates: {},
    };
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return {
      selectedServiceTypes: [],
      selectedServices: [],
      selectedServiceRates: {},
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return {
        selectedServiceTypes: [],
        selectedServices: normalizeStringArray(parsed),
        selectedServiceRates: {},
      };
    }
    if (parsed && typeof parsed === 'object') {
      return {
        selectedServiceTypes: normalizeStringArray(parsed.selectedServiceTypes ?? parsed.serviceTypes),
        selectedServices: normalizeStringArray(parsed.selectedServices ?? parsed.services),
        selectedServiceRates: normalizeServiceRateMap(parsed.selectedServiceRates ?? parsed.serviceRates),
      };
    }
  } catch (error) {
    // Legacy plain text payloads are parsed as comma-separated values.
  }

  return {
    selectedServiceTypes: [],
    selectedServices: normalizeStringArray(trimmed),
    selectedServiceRates: {},
  };
}

export function getServiceRateFromMap(rateMap, serviceName) {
  if (!rateMap || typeof rateMap !== 'object' || !serviceName) return null;
  const exact = rateMap[serviceName];
  if (Number.isFinite(Number(exact))) return Number(exact);

  const target = String(serviceName).trim().toLowerCase();
  if (!target) return null;

  for (const [key, value] of Object.entries(rateMap)) {
    if (String(key).trim().toLowerCase() !== target) continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}
