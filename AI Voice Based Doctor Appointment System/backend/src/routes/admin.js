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

module.exports = router;
