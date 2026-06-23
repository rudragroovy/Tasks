const attendanceModel = require('../models/attendanceModel');

const getAttendance = async (req, res) => {
  try {
    const records = await attendanceModel.getAttendanceByStudentId(req.params.id);
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('getAttendance error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const addAttendance = async (req, res) => {
  try {
    const record = await attendanceModel.addAttendance(req.params.id, req.body);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('addAttendance error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteAttendance = async (req, res) => {
  try {
    const deleted = await attendanceModel.deleteAttendance(req.params.attendanceId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Record not found' });
    res.status(200).json({ success: true, data: deleted });
  } catch (error) {
    console.error('deleteAttendance error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getAttendance, addAttendance, deleteAttendance };
