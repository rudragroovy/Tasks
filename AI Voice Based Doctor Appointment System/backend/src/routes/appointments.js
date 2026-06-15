const express = require('express');
const { getDoctors, createAppointment, updateStatus, getUserAppointments } = require('../controllers/appointmentController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getUserAppointments);
router.get('/doctors', authenticate, getDoctors);
router.post('/', authenticate, createAppointment);
router.put('/:id/status', authenticate, updateStatus);

module.exports = router;
