const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireRole } = require('../middleware/authMiddleware');

router.get('/teachers', requireRole(['Admin']), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username FROM users WHERE role = $1', ['Teacher']);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
