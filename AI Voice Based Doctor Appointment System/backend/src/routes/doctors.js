const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const prisma = require('../models/prismaClient');

const router = express.Router();

router.put('/me/online', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Only doctors can toggle online status' });
    }

    const { isOnline } = req.body;
    
    const doctor = await prisma.doctor.update({
      where: { userId: req.user.id },
      data: { isOnline }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('doctors:updated');
    }

    res.json(doctor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to toggle online status' });
  }
});

module.exports = router;
