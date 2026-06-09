const courseModel = require('../models/courseModel');

const getCourses = async (req, res) => {
  try {
    const courses = await courseModel.getAllCourses();
    res.json({ success: true, data: courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, message: 'Server error fetching courses' });
  }
};

const createCourse = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Course name is required' });
  
  try {
    const newCourse = await courseModel.createCourse(name);
    res.status(201).json({ success: true, data: newCourse });
  } catch (error) {
    console.error('Error creating course:', error);
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ success: false, message: 'Course name already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error creating course' });
  }
};

const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { oldName, newName } = req.body;
  
  if (!newName) return res.status(400).json({ success: false, message: 'New course name is required' });
  
  try {
    const updatedCourse = await courseModel.updateCourse(id, oldName, newName);
    if (!updatedCourse) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: updatedCourse });
  } catch (error) {
    console.error('Error updating course:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Course name already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error updating course' });
  }
};

const deleteCourse = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  try {
    const deletedCourse = await courseModel.deleteCourse(id, name);
    if (!deletedCourse) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: deletedCourse });
  } catch (error) {
    console.error('Error deleting course:', error);
    if (error.message && error.message.includes('students are currently enrolled')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Server error deleting course' });
  }
};

module.exports = { getCourses, createCourse, updateCourse, deleteCourse };
