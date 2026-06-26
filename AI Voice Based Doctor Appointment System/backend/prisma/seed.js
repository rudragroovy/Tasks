const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { ensureDefaultWorkingHours, CONSULTATION_MODES } = require('../src/utils/doctorAvailability');
const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'password123';

function buildServicesPayload({ selectedServiceTypes = [], selectedServices = [], selectedServiceRates = {} }) {
  return JSON.stringify({
    selectedServiceTypes,
    selectedServices,
    selectedServiceRates,
  });
}

function practitionerServicesFor(type) {
  if (type === 'Specialist') {
    const services = ['Cardiology', 'Neurology', 'Respiratory & Sleep'];
    return buildServicesPayload({
      selectedServiceTypes: ['specialist-referral'],
      selectedServices: services,
      selectedServiceRates: {
        Cardiology: 180,
        Neurology: 210,
        'Respiratory & Sleep': 165,
      },
    });
  }

  const services = ['General Consultation', 'Prescription', 'Medical Certificate'];
  return buildServicesPayload({
    selectedServiceTypes: ['telehealth-consultation', 'prescription', 'medical-certificates'],
    selectedServices: services,
    selectedServiceRates: {
      'General Consultation': 75,
      Prescription: 35,
      'Medical Certificate': 30,
    },
  });
}

async function upsertUser({
  name,
  email,
  role,
  hashedPassword,
}) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
    },
    create: {
      name,
      email,
      password: hashedPassword,
      role,
    },
  });
}

async function upsertDoctorProfile({
  userId,
  practitionerType,
  isOnline = true,
  qualification = 'MBBS',
  experienceRange = '6-10 years',
}) {
  const doctor = await prisma.doctor.upsert({
    where: { userId },
    update: {
      practitionerType,
      services: practitionerServicesFor(practitionerType),
      qualification,
      experienceRange,
      isOnline,
    },
    create: {
      userId,
      practitionerType,
      services: practitionerServicesFor(practitionerType),
      qualification,
      experienceRange,
      isOnline,
    },
  });

  await Promise.all(
    CONSULTATION_MODES.map((mode) => ensureDefaultWorkingHours(prisma, userId, mode))
  );

  return doctor;
}

async function main() {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await upsertUser({
    name: 'System Admin',
    email: 'admin@example.com',
    role: 'ADMIN',
    hashedPassword,
  });

  const patientUser = await upsertUser({
    name: 'Peninna Macauley',
    email: 'patient@example.com',
    role: 'PATIENT',
    hashedPassword,
  });

  await prisma.patientProfile.upsert({
    where: { userId: patientUser.id },
    update: {
      givenName: 'Peninna',
      familyName: 'Macauley',
      gender: 'Female',
      phoneCode: '+61',
      phone: '0400123456',
      patientConsentGiven: true,
    },
    create: {
      userId: patientUser.id,
      givenName: 'Peninna',
      familyName: 'Macauley',
      gender: 'Female',
      phoneCode: '+61',
      phone: '0400123456',
      patientConsentGiven: true,
    },
  });

  await prisma.familyMember.upsert({
    where: { id: 'seed-family-member-1' },
    update: {
      patientId: patientUser.id,
      name: 'Noah Macauley',
      relation: 'Son',
      age: 9,
      gender: 'Male',
    },
    create: {
      id: 'seed-family-member-1',
      patientId: patientUser.id,
      name: 'Noah Macauley',
      relation: 'Son',
      age: 9,
      gender: 'Male',
    },
  });

  const doctors = [
    {
      name: 'Dr. Sarah Smith',
      email: 'dr.smith@example.com',
      practitionerType: 'General Practitioner (GP)',
      qualification: 'MBBS, FRACGP',
      experienceRange: '11-15 years',
    },
    {
      name: 'Dr. Bruno Allerton',
      email: 'bruno@example.com',
      practitionerType: 'Nurse Practitioner (NP)',
      qualification: 'MNursPrac',
      experienceRange: '6-10 years',
    },
    {
      name: 'Dr. Emily White',
      email: 'dr.white@example.com',
      practitionerType: 'Dentist',
      qualification: 'BDS',
      experienceRange: '6-10 years',
    },
    {
      name: 'Dr. Michael Johnson',
      email: 'dr.johnson@example.com',
      practitionerType: 'Specialist',
      qualification: 'MBBS, MD',
      experienceRange: '11-15 years',
    },
  ];

  for (const doctorSeed of doctors) {
    const doctorUser = await upsertUser({
      name: doctorSeed.name,
      email: doctorSeed.email,
      role: 'DOCTOR',
      hashedPassword,
    });

    await upsertDoctorProfile({
      userId: doctorUser.id,
      practitionerType: doctorSeed.practitionerType,
      qualification: doctorSeed.qualification,
      experienceRange: doctorSeed.experienceRange,
      isOnline: true,
    });
  }

  console.log('Seed completed successfully.');
  console.log('Demo users (password: password123):');
  console.log('- admin@example.com (ADMIN)');
  console.log('- patient@example.com (PATIENT)');
  console.log('- dr.smith@example.com (DOCTOR)');
  console.log('- bruno@example.com (DOCTOR)');
  console.log('- dr.white@example.com (DOCTOR)');
  console.log('- dr.johnson@example.com (DOCTOR)');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
