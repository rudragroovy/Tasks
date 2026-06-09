// studentController.js — Request handlers for every student route
const studentModel = require('../models/studentModel');

// GET /api/students
const getAllStudents = async (req, res) => {
  try {
    const students = await studentModel.getAllStudents();
    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('getAllStudents error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/students/stats  ← must be registered BEFORE /:id in routes
const getStats = async (req, res) => {
  try {
    const stats = await studentModel.getStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('getStats error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/students/:id
const getStudentById = async (req, res) => {
  try {
    const student = await studentModel.getStudentById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    console.error('getStudentById error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/students
const createStudent = async (req, res) => {
  try {
    const newStudent = await studentModel.createStudent(req.body);
    res.status(201).json({ success: true, data: newStudent });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'Email already exists' });
    console.error('createStudent error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/students/bulk  ← CSV import
const bulkCreate = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0)
      return res.status(400).json({ success: false, message: 'No student data provided' });

    const results = await studentModel.bulkCreateStudents(students);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('bulkCreate error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/students/:id
const updateStudent = async (req, res) => {
  try {
    const updated = await studentModel.updateStudent(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Student not found' });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'Email already exists' });
    console.error('updateStudent error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/students/:id
const deleteStudent = async (req, res) => {
  try {
    const deleted = await studentModel.deleteStudent(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Student not found' });
    res.status(200).json({ success: true, message: 'Student deleted successfully', data: deleted });
  } catch (error) {
    console.error('deleteStudent error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getAllStudents, getStats, getStudentById, createStudent, bulkCreate, updateStudent, deleteStudent };
