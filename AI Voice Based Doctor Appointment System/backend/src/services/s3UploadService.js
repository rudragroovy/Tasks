const { randomUUID } = require('crypto');
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/html',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

let cachedS3Client = null;

function asRequiredString(value, key) {
  const next = String(value || '').trim();
  if (!next) {
    const error = new Error(`${key} is not configured`);
    error.statusCode = 500;
    throw error;
  }
  return next;
}

function getS3Config() {
  const bucket = asRequiredString(process.env.AWS_S3_BUCKET_NAME, 'AWS_S3_BUCKET_NAME');
  const region = asRequiredString(process.env.AWS_REGION, 'AWS_REGION');
  const accessKeyId = asRequiredString(process.env.AWS_ACCESS_KEY_ID, 'AWS_ACCESS_KEY_ID');
  const secretAccessKey = asRequiredString(process.env.AWS_SECRET_ACCESS_KEY, 'AWS_SECRET_ACCESS_KEY');
  const publicBaseUrl = String(process.env.AWS_S3_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');

  return {
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
  };
}

function getS3Client(config) {
  if (cachedS3Client) return cachedS3Client;

  cachedS3Client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedS3Client;
}

function sanitizePathSegment(value, fallback = 'general') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function sanitizeFileName(fileName) {
  const normalized = String(fileName || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
  return normalized || 'upload.bin';
}

function buildFileKey({ context, userId, originalName }) {
  const datePrefix = new Date().toISOString().slice(0, 10);
  const safeContext = sanitizePathSegment(context, 'general');
  const safeUserId = sanitizePathSegment(userId, 'anonymous');
  const safeName = sanitizeFileName(originalName);
  return `${safeContext}/${safeUserId}/${datePrefix}/${randomUUID()}-${safeName}`;
}

function buildPublicUrl(config, key) {
  if (config.publicBaseUrl) return `${config.publicBaseUrl}/${key}`;
  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

function assertAllowedFile(file) {
  if (!file || !file.buffer) {
    const error = new Error('File is required');
    error.statusCode = 400;
    throw error;
  }

  const fileSize = Number(file.size || 0);
  if (fileSize <= 0) {
    const error = new Error('Uploaded file is empty');
    error.statusCode = 400;
    throw error;
  }
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    const error = new Error(`File too large. Max size is ${Math.floor(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB`);
    error.statusCode = 400;
    throw error;
  }

  const mimeType = String(file.mimetype || '').trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    const error = new Error('Unsupported file type');
    error.statusCode = 400;
    throw error;
  }
}

async function uploadBufferToS3({ file, userId, context }) {
  assertAllowedFile(file);

  const config = getS3Config();
  const s3 = getS3Client(config);
  const key = buildFileKey({
    context,
    userId,
    originalName: file.originalname,
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: 'inline',
    })
  );

  return {
    key,
    url: buildPublicUrl(config, key),
    name: String(file.originalname || '').trim() || 'file',
    contentType: file.mimetype,
    size: Number(file.size || 0),
  };
}

module.exports = {
  MAX_FILE_SIZE_BYTES,
  uploadBufferToS3,
};
