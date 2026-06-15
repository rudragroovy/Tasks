const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const cardiologist = await prisma.specialization.upsert({
    where: { name: 'Cardiologist' },
    update: {},
    create: { name: 'Cardiologist' }
  });

  const dermatologist = await prisma.specialization.upsert({
    where: { name: 'Dermatologist' },
    update: {},
    create: { name: 'Dermatologist' }
  });

  const generalPhysician = await prisma.specialization.upsert({
    where: { name: 'General Physician' },
    update: {},
    create: { name: 'General Physician' }
  });

  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@example.com' },
    update: {},
    create: {
      name: 'Peninna Macauley',
      email: 'patient@example.com',
      password: hashedPassword,
      role: 'PATIENT',
    }
  });

  const docUser1 = await prisma.user.upsert({
    where: { email: 'dr.smith@example.com' },
    update: {},
    create: {
      name: 'Dr. Smith',
      email: 'dr.smith@example.com',
      password: hashedPassword,
      role: 'DOCTOR',
    }
  });

  await prisma.doctor.upsert({
    where: { userId: docUser1.id },
    update: { isOnline: true },
    create: {
      userId: docUser1.id,
      specializationId: cardiologist.id,
      fee: 100.0,
      isOnline: true
    }
  });

  const docUser2 = await prisma.user.upsert({
    where: { email: 'bruno@example.com' },
    update: {},
    create: {
      name: 'Dr. Bruno ALLERTON',
      email: 'bruno@example.com',
      password: hashedPassword,
      role: 'DOCTOR',
    }
  });

  await prisma.doctor.upsert({
    where: { userId: docUser2.id },
    update: { isOnline: true },
    create: {
      userId: docUser2.id,
      specializationId: generalPhysician.id,
      fee: 80.0,
      isOnline: true
    }
  });

  console.log('Seeding finished.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
