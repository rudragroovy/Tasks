const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const {
  getMyProfile,
  upsertMyProfile,
} = require('../controllers/patientProfileController');

const router = express.Router();

router.use(authenticate);
router.get('/me', getMyProfile);
router.put('/me', upsertMyProfile);

module.exports = router;
