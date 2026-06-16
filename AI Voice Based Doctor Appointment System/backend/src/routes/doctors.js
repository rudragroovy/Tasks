const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const prisma = require('../models/prismaClient');

const router = express.Router();

router.get('/specializations', async (req, res) => {
  try {
    const specs = await prisma.specialization.findMany();
    res.json(specs);
  } catch (err) {
    console.error("Error fetching specializations:", err);
    res.status(500).json({ error: 'Failed to fetch specializations' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { specialization } = req.query;
    
    let whereClause = {};
    if (specialization) {
      whereClause.specialization = { name: { equals: specialization, mode: 'insensitive' } };
    }

    const doctors = await prisma.doctor.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true } },
        specialization: { select: { name: true } }
      }
    });

    const formattedDoctors = doctors.map(d => ({
      userId: d.userId,
      user: { name: d.user.name },
      specialization: { name: d.specialization.name },
      isOnline: d.isOnline,
      fee: parseFloat(d.fee) || 150.00
    }));

    res.json(formattedDoctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

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
