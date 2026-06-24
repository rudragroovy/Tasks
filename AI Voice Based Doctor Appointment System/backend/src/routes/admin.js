const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate, authorize(['ADMIN']));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/doctors', adminController.getAllDoctors);
router.post('/doctors', adminController.addDoctor);
router.get('/patients', adminController.getAllPatients);
router.get('/appointments', adminController.getAllAppointments);
router.get('/appointments/:id/audit', adminController.getAppointmentAuditLog);
router.patch('/appointments/:id/cancel', adminController.cancelAppointment);
router.patch('/appointments/:id/reassign', adminController.reassignAppointmentDoctor);

module.exports = router;
