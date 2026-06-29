const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middlewares/authMiddleware');
const { MAX_FILE_SIZE_BYTES, uploadBufferToS3 } = require('../services/s3UploadService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

router.post('/single', authenticate, (req, res) => {
  upload.single('file')(req, res, async (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `File too large. Max size is ${Math.floor(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.` });
      }
      return res.status(400).json({ error: error.message || 'File upload failed' });
    }

    try {
      const uploadedFile = await uploadBufferToS3({
        file: req.file,
        userId: req.user?.id,
        context: req.body?.context,
      });

      return res.status(201).json(uploadedFile);
    } catch (uploadError) {
      console.error('S3 upload failed:', uploadError);
      const status = Number(uploadError?.statusCode || uploadError?.$metadata?.httpStatusCode) || 500;
      return res.status(status).json({
        error: uploadError?.message || 'Failed to upload file',
      });
    }
  });
});

module.exports = router;
