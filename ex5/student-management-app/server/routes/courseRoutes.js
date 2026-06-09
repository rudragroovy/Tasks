const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

// All course routes
router.get('/', courseController.getCourses);
router.post('/', courseController.createCourse);
router.put('/:id', courseController.updateCourse);
// Need to pass name in body for checking students
router.delete('/:id', courseController.deleteCourse);

module.exports = router;
