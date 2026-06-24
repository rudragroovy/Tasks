const bcrypt = require('bcryptjs');
const prisma = require('../models/prismaClient');

async function ensureDefaultAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@admin.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin';
  const name = process.env.ADMIN_NAME || 'Super Admin';

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    if (existingUser.role !== 'ADMIN') {
      console.warn(`[bootstrap] User ${email} exists but is not ADMIN. Skipping default admin creation.`);
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'ADMIN'
    }
  });

  console.log(`[bootstrap] Default admin created: ${email}`);
}

module.exports = { ensureDefaultAdmin };
