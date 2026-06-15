const prisma = require('../models/prismaClient');
const { generatePrescriptionPDF } = require('../services/pdfService');

exports.getDoctors = async (req, res) => {
  try {
    const { specializationName } = req.query;

    const doctors = await prisma.doctor.findMany({
      where: specializationName ? {
        specialization: { name: { contains: specializationName, mode: 'insensitive' } },
        isOnline: true
      } : { isOnline: true },
      include: {
        user: { select: { name: true, email: true } },
        specialization: true
      }
    });

    res.json(doctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, aiSummary, type, scheduledFor } = req.body;
    const patientId = req.user.id; // from authMiddleware

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        aiSummary: typeof aiSummary === 'object' ? aiSummary : JSON.parse(aiSummary || '{}'),
        status: 'PENDING',
        type: type || 'ON_DEMAND',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        paymentStatus: 'PENDING_PAYMENT'
      }
    });

    // We don't emit 'appointment:new' to doctor yet, because payment is pending!
    // We will emit it in the payments/confirm route.

    res.status(201).json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, prescription } = req.body;
    
    const dataToUpdate = { status };

    if (status === 'COMPLETED') {
      // Fetch full appointment for PDF generation
      const fullAppt = await prisma.appointment.findUnique({
        where: { id },
        include: { doctor: true, patient: true }
      });

      const pdfUrl = await generatePrescriptionPDF(fullAppt, { notes, prescription });

      dataToUpdate.consultation = {
        create: {
          notes: notes || '',
          prescription: prescription || [],
          prescriptionUrl: pdfUrl
        }
      };
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: dataToUpdate
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${appointment.patientId}`).to(`user:${appointment.doctorId}`).emit('appointment:updated', appointment);
    }

    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

exports.getUserAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    let whereClause = {};

    if (role === 'DOCTOR') {
      whereClause.doctorId = userId;
    } else {
      whereClause.patientId = userId;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        doctor: { select: { name: true, email: true, doctorProfile: { include: { specialization: true } } } },
        patient: { select: { name: true, email: true } },
        consultation: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};
