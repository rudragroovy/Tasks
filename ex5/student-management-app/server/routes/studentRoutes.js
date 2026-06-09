// studentRoutes.js — REST routes for students
// IMPORTANT: /stats and /bulk must be registered BEFORE /:id to avoid conflict
const express   = require('express');
const router    = express.Router();
const validate  = require('../middleware/validateStudent');
const {
  getAllStudents, getStats, getStudentById,
  createStudent, bulkCreate, updateStudent, deleteStudent,
} = require('../controllers/studentController');

router.get('/',         getAllStudents);    // GET    /api/students
router.get('/stats',    getStats);          // GET    /api/students/stats
router.get('/:id',      getStudentById);   // GET    /api/students/:id
router.post('/',        validate, createStudent);  // POST   /api/students
router.post('/bulk',    bulkCreate);        // POST   /api/students/bulk
router.put('/:id',      validate, updateStudent);  // PUT    /api/students/:id
router.delete('/:id',   deleteStudent);    // DELETE /api/students/:id

module.exports = router;
