const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const {
  createReview,
  getDoctorMyReviews,
  getDoctorPublicReviews,
  getPatientMyReviews,
} = require('../controllers/reviewController');

const router = express.Router();

router.post('/', authenticate, createReview);
router.get('/doctor/me', authenticate, getDoctorMyReviews);
router.get('/doctor/:doctorId/public', getDoctorPublicReviews);
router.get('/patient/me', authenticate, getPatientMyReviews);

module.exports = router;
