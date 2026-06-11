const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentController = require('../controllers/documentController');
const chatController = require('../controllers/chatController');

// Configure Multer for file uploads in memory (15MB limit)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }
});

router.post('/upload', upload.single('file'), documentController.uploadPdf);
router.get('/pages/:docId/:pageNum', documentController.getPageExcerpt);
router.post('/chat', chatController.handleChat);

module.exports = router;
