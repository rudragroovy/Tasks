const gradeModel = require('../models/gradeModel');

const getGrades = async (req, res) => {
  try {
    const records = await gradeModel.getGradesByStudentId(req.params.id);
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('getGrades error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const addGrade = async (req, res) => {
  try {
    const record = await gradeModel.addGrade(req.params.id, req.body);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('addGrade error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteGrade = async (req, res) => {
  try {
    const deleted = await gradeModel.deleteGrade(req.params.gradeId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Record not found' });
    res.status(200).json({ success: true, data: deleted });
  } catch (error) {
    console.error('deleteGrade error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getGrades, addGrade, deleteGrade };
