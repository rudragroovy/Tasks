const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = require('../models/prismaClient');
const { uploadBufferToS3 } = require('../services/s3UploadService');

const LOCAL_PRESCRIPTIONS_DIR = path.resolve(__dirname, '../../public/prescriptions');

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function extractFileNameFromUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const noQuery = raw.split('?')[0].split('#')[0].replace(/\\/g, '/');
  return path.posix.basename(noQuery);
}

function parseLimit(args) {
  const entry = args.find((arg) => arg.startsWith('--limit='));
  if (!entry) return Number.POSITIVE_INFINITY;
  const parsed = Number(entry.slice('--limit='.length));
  if (!Number.isFinite(parsed) || parsed <= 0) return Number.POSITIVE_INFINITY;
  return Math.floor(parsed);
}

async function migrate({ applyChanges, limit }) {
  const rows = await prisma.consultation.findMany({
    where: { prescriptionUrl: { not: null } },
    select: {
      id: true,
      appointmentId: true,
      prescriptionUrl: true,
      appointment: {
        select: {
          patientId: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'asc',
    },
  });

  const stats = {
    total: rows.length,
    alreadyAbsoluteUrl: 0,
    candidates: 0,
    migrated: 0,
    missingLocalFile: 0,
    invalidUrl: 0,
    failed: 0,
  };

  for (const row of rows) {
    if (stats.migrated >= limit) break;

    const currentUrl = String(row.prescriptionUrl || '').trim();
    if (!currentUrl) {
      stats.invalidUrl += 1;
      continue;
    }

    if (isAbsoluteUrl(currentUrl)) {
      stats.alreadyAbsoluteUrl += 1;
      continue;
    }

    const fileName = extractFileNameFromUrl(currentUrl);
    if (!fileName || !fileName.toLowerCase().endsWith('.pdf')) {
      stats.invalidUrl += 1;
      continue;
    }

    const localFilePath = path.join(LOCAL_PRESCRIPTIONS_DIR, fileName);
    if (!fs.existsSync(localFilePath)) {
      stats.missingLocalFile += 1;
      console.warn(`[missing] ${row.id} -> ${localFilePath}`);
      continue;
    }

    stats.candidates += 1;
    if (!applyChanges) {
      continue;
    }

    try {
      const buffer = await fs.promises.readFile(localFilePath);
      const uploaded = await uploadBufferToS3({
        file: {
          buffer,
          size: buffer.length,
          mimetype: 'application/pdf',
          originalname: fileName,
        },
        userId: row.appointment?.patientId || row.appointmentId,
        context: 'prescriptions',
      });

      await prisma.consultation.update({
        where: { id: row.id },
        data: { prescriptionUrl: uploaded.url },
      });

      stats.migrated += 1;
      console.log(`[migrated] ${row.id} -> ${uploaded.url}`);
    } catch (error) {
      stats.failed += 1;
      console.error(`[failed] ${row.id}: ${error.message}`);
    }
  }

  return stats;
}

function runSelfCheck() {
  assert.strictEqual(extractFileNameFromUrl('/prescriptions/a.pdf'), 'a.pdf');
  assert.strictEqual(extractFileNameFromUrl('prescriptions/b.pdf?x=1'), 'b.pdf');
  assert.strictEqual(isAbsoluteUrl('https://example.com/file.pdf'), true);
  assert.strictEqual(isAbsoluteUrl('/prescriptions/file.pdf'), false);
  console.log('self-check passed');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--self-check')) {
    runSelfCheck();
    return;
  }

  const applyChanges = args.includes('--apply');
  const limit = parseLimit(args);

  console.log(
    applyChanges
      ? 'Running prescription migration (apply mode)...'
      : 'Running prescription migration (dry-run mode)...'
  );

  const stats = await migrate({ applyChanges, limit });
  console.log('Migration summary:', stats);
}

main()
  .catch((error) => {
    console.error('Migration crashed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

