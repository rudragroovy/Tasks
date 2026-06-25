import { patientCategoryContentList } from './patientCategoryContent';

const groupModeMap = {
  'Telehealth Medical Consultation': ['Video Consultation', 'Telephone Consultation', 'In-Person Visit'],
  Prescription: ['Video Consultation', 'Telephone Consultation'],
  'Medical Certificates': ['Video Consultation', 'Telephone Consultation'],
  'Pathology Requests': ['Video Consultation', 'Clinic Follow-up'],
  'Radiology Requests': ['Video Consultation', 'In-Person Visit'],
  'Specialist Referral': ['Video Consultation', 'Telephone Consultation'],
};

const kindTemplates = {
  consultation: {
    highlights: [
      'AHPRA-verified doctors',
      'Fast booking confirmation',
      'Digital documents where required',
      'Secure, private consultations',
    ],
    includes: [
      'Clinical assessment for {service}',
      'Doctor guidance and treatment plan',
      'Prescription or referral when clinically required',
      'Post-consult summary',
    ],
    process: [
      'Select your preferred consultation mode',
      'Share symptoms and relevant history',
      'Connect with the doctor at your booked time',
      'Receive guidance and documents as required',
    ],
    suitableFor: [
      'Patients needing timely medical advice',
      'Follow-up care and ongoing condition support',
      'People who prefer remote access to care',
    ],
    waitTime: '5-15 mins',
    sessionTime: '15-25 mins',
  },
  prescription: {
    highlights: [
      'Digital and paper prescription support',
      'Fast doctor review process',
      'Secure documentation handling',
      'Clear renewal guidance',
    ],
    includes: [
      'Doctor review for {service}',
      'Prescription issue when clinically appropriate',
      'Medication usage instructions',
      'Follow-up recommendation if needed',
    ],
    process: [
      'Submit current medication and health details',
      'Doctor reviews your request',
      'Attend brief telehealth consultation if required',
      'Receive prescription and next-step advice',
    ],
    suitableFor: [
      'Repeat medication requests',
      'Medication continuation after recent consultation',
      'Patients needing quick prescription turnaround',
    ],
    waitTime: '3-10 mins',
    sessionTime: '10-15 mins',
  },
  certificate: {
    highlights: [
      'Same-day certificate workflow',
      'Work, school, and carer leave coverage',
      'Digitally delivered documentation',
      'Clear validity and usage details',
    ],
    includes: [
      'Clinical review for {service}',
      'Medical certificate where appropriate',
      'Issue date and recommended rest period',
      'Support note for employer or institution',
    ],
    process: [
      'Choose the certificate service type',
      'Share symptoms and required leave context',
      'Complete telehealth review with a doctor',
      'Receive certificate digitally',
    ],
    suitableFor: [
      'Work or study leave requirements',
      'Carer leave support requests',
      'Short-notice documentation needs',
    ],
    waitTime: '5-12 mins',
    sessionTime: '10-20 mins',
  },
  pathology: {
    highlights: [
      'Doctor-led test selection',
      'National pathology referral support',
      'Targeted panel recommendations',
      'Result follow-up pathway',
    ],
    includes: [
      'Clinical suitability review for {service}',
      'Digital pathology request form',
      'Collection instructions and preparation notes',
      'Follow-up recommendation for results review',
    ],
    process: [
      'Select the required test panel',
      'Complete a quick symptoms and history check',
      'Doctor confirms and issues pathology request',
      'Attend collection and review results as advised',
    ],
    suitableFor: [
      'Preventive health checks',
      'Condition-specific monitoring needs',
      'Patients wanting test requests without long clinic waits',
    ],
    waitTime: '5-15 mins',
    sessionTime: '10-20 mins',
  },
  radiology: {
    highlights: [
      'Doctor-reviewed imaging requests',
      'Clear scan suitability guidance',
      'Referral-ready documentation',
      'Follow-up care planning',
    ],
    includes: [
      'Clinical review for {service}',
      'Digital imaging referral where appropriate',
      'Preparation guidance before scan',
      'Plan for post-report follow-up',
    ],
    process: [
      'Describe symptoms and duration',
      'Doctor confirms appropriate imaging modality',
      'Receive digital radiology referral',
      'Complete scan and book follow-up if needed',
    ],
    suitableFor: [
      'Patients needing diagnostic imaging referrals',
      'Ongoing symptom investigation',
      'Follow-up imaging advised by clinicians',
    ],
    waitTime: '6-16 mins',
    sessionTime: '10-20 mins',
  },
  referral: {
    highlights: [
      'Specialist referral pathways',
      'Clinically appropriate referral letters',
      'Condition-specific triage',
      'Continuity of care support',
    ],
    includes: [
      'Primary assessment for {service}',
      'Referral letter when clinically indicated',
      'Specialist type matching guidance',
      'Advice on next appointment steps',
    ],
    process: [
      'Select referral service and provide history',
      'Doctor assesses current symptoms and needs',
      'Referral documentation is prepared',
      'Proceed with specialist booking',
    ],
    suitableFor: [
      'Patients needing specialist escalation',
      'Condition-focused secondary opinion needs',
      'Planned care pathway transitions',
    ],
    waitTime: '5-15 mins',
    sessionTime: '15-25 mins',
  },
};

const toSlug = (value) =>
  value
    .toLowerCase()
    .replace(/['".]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const withServiceName = (items, serviceName) =>
  items.map((item) => item.replaceAll('{service}', serviceName));

const detectKind = (serviceName, category) => {
  const text = `${serviceName} ${category.label} ${category.group}`.toLowerCase();

  if (/blood test|pathology|pcr|cholesterol|fertility test/.test(text)) return 'pathology';
  if (/ct scan|x-ray|xray|mri|radiology/.test(text)) return 'radiology';
  if (/certificate/.test(text)) return 'certificate';
  if (/prescription/.test(text)) return 'prescription';
  if (/referral|psychiatrist|psychologist|specialist/.test(text)) return 'referral';
  return 'consultation';
};

const allCategoryRecords = patientCategoryContentList.map((category) => ({
  key: category.key,
  label: category.label,
  group: category.group,
  heroImage: category.heroImage,
  services: category.services.map((service) => service.name),
}));

const slugToServiceMap = {};
const serviceLookupByCategory = new Map();
const serviceLookupByName = new Map();

for (const category of allCategoryRecords) {
  for (const serviceName of category.services) {
    const baseSlug = toSlug(serviceName);
    let slug = baseSlug;
    let counter = 2;

    while (slugToServiceMap[slug]) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    const template = kindTemplates[detectKind(serviceName, category)];
    const serviceRecord = {
      slug,
      name: serviceName,
      categoryKey: category.key,
      categoryLabel: category.label,
      serviceGroup: category.group,
      heroImage: category.heroImage,
      modes: groupModeMap[category.group] ?? ['Video Consultation', 'Telephone Consultation'],
      waitTime: template.waitTime,
      sessionTime: template.sessionTime,
      highlights: template.highlights,
      includes: withServiceName(template.includes, serviceName),
      process: template.process,
      suitableFor: template.suitableFor,
      faq: [
        `Who should book ${serviceName.toLowerCase()}?`,
        `How quickly can I access ${serviceName.toLowerCase()}?`,
        `Are documents like referrals or prescriptions available if required?`,
      ],
    };

    slugToServiceMap[slug] = serviceRecord;
    serviceLookupByCategory.set(`${category.key}::${serviceName.toLowerCase()}`, slug);
    if (!serviceLookupByName.has(serviceName.toLowerCase())) {
      serviceLookupByName.set(serviceName.toLowerCase(), slug);
    }
  }
}

export const servicePageList = Object.values(slugToServiceMap);

export const getServiceBySlug = (slug) => slugToServiceMap[slug] ?? null;

export const getServiceRoute = (serviceName, categoryKey = null) => {
  const normalizedService = serviceName.toLowerCase();
  if (categoryKey) {
    const categoryMatch = serviceLookupByCategory.get(`${categoryKey}::${normalizedService}`);
    if (categoryMatch) return `/services/${categoryMatch}`;
  }

  const globalMatch = serviceLookupByName.get(normalizedService);
  if (globalMatch) return `/services/${globalMatch}`;
  return `/services/${toSlug(serviceName)}`;
};

export const getRelatedServices = (serviceRecord, limit = 4) =>
  servicePageList
    .filter(
      (item) =>
        item.slug !== serviceRecord.slug &&
        item.categoryKey === serviceRecord.categoryKey
    )
    .slice(0, limit);
