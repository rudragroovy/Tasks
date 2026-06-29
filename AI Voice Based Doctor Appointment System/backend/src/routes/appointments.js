const express = require('express');
const { 
  getDoctors, 
  getDoctorAvailableSlots,
  createAppointment, 
  updateStatus, 
  getUserAppointments,
  inviteDoctor,
  submitDoctorNote,
  saveGeneratedDocument,
  getAppointmentById,
  moveToGeneralQueue,
} = require('../controllers/appointmentController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getUserAppointments);
router.get('/doctors', authenticate, getDoctors);
router.get('/doctors/:doctorId/slots', authenticate, getDoctorAvailableSlots);
router.get('/:id', authenticate, getAppointmentById);
router.post('/', authenticate, createAppointment);
router.put('/:id/status', authenticate, updateStatus);
router.post('/:id/move-to-general', authenticate, moveToGeneralQueue);
router.post('/:id/invite', authenticate, inviteDoctor);
router.post('/:id/notes', authenticate, submitDoctorNote);
router.post('/:id/documents', authenticate, saveGeneratedDocument);

module.exports = router;
