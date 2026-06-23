const prisma = require('../models/prismaClient');
const bcrypt = require('bcryptjs');
const { ensureDefaultWorkingHours } = require('../utils/doctorAvailability');

exports.getDashboardStats = async (req, res) => {
  try {
    const totalDoctors = await prisma.doctor.count();
    const totalPatients = await prisma.user.count({ where: { role: 'PATIENT' } });
    const totalAppointments = await prisma.appointment.count();
    
    res.json({ totalDoctors, totalPatients, totalAppointments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
        specialization: true
      }
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};

exports.addDoctor = async (req, res) => {
  try {
    const { name, email, password, specializationId, fee } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'DOCTOR' }
    });

    const doctor = await prisma.doctor.create({
      data: {
        userId: user.id,
        specializationId,
        fee: parseFloat(fee)
      }
    });

    await ensureDefaultWorkingHours(prisma, user.id);

    res.status(201).json({ message: 'Doctor added successfully', doctor });
  } catch (error) {
    console.error('Error adding doctor:', error);
    res.status(500).json({ error: 'Failed to add doctor' });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const patients = await prisma.user.findMany({
      where: { role: 'PATIENT' },
      select: { id: true, name: true, email: true, createdAt: true }
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
};

exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};
