const auditModel = require('../models/auditModel');

const getLogs = async (req, res) => {
  try {
    const logs = await auditModel.getLogs();
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error('getLogs error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getLogs };
