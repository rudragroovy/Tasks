const express = require('express');
const { 
  getDoctors, 
  createAppointment, 
  updateStatus, 
  getUserAppointments,
  inviteDoctor,
  submitDoctorNote,
  getAppointmentById
} = require('../controllers/appointmentController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getUserAppointments);
router.get('/doctors', authenticate, getDoctors);
router.get('/:id', authenticate, getAppointmentById);
router.post('/', authenticate, createAppointment);
router.put('/:id/status', authenticate, updateStatus);
router.post('/:id/invite', authenticate, inviteDoctor);
router.post('/:id/notes', authenticate, submitDoctorNote);

module.exports = router;
