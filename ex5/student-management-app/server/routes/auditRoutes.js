const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/auditController');

router.get('/', getLogs);

module.exports = router;
