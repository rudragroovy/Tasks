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
    const { doctorId, aiSummary, type, scheduledFor, familyMemberId } = req.body;
    const patientId = req.user.id; // from authMiddleware

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        familyMemberId: familyMemberId || null,
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
    
    const appointmentCheck = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointmentCheck) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointmentCheck.doctorId !== req.user.id && ['ACCEPTED', 'REJECTED', 'COMPLETED'].includes(status)) {
      return res.status(403).json({ error: 'Not authorized to change status' });
    }

    const dataToUpdate = { status };

    if (status === 'COMPLETED') {
      // Fetch full appointment for PDF generation
      const fullAppt = await prisma.appointment.findUnique({
        where: { id },
        include: { 
          doctor: true, 
          patient: true,
          invitedDoctors: true,
          doctorNotes: {
            include: { doctor: true }
          }
        }
      });

      if (!fullAppt) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      if (fullAppt.status === 'COMPLETED') {
        return res.json(fullAppt);
      }

      // Only block if there are invited doctors who were ACCEPTED but haven't submitted notes yet
      const incompleteInvites = fullAppt.invitedDoctors.filter(
        invite => invite.status === 'ACCEPTED' || invite.status === 'JOINED'
      );
      if (incompleteInvites.length > 0) {
        return res.status(400).json({ error: 'Cannot complete appointment until all invited doctors have submitted their notes.' });
      }

      const formatRx = (rx) => {
        if (!rx || !Array.isArray(rx) || rx.length === 0) return 'None';
        return rx.map(m => `${m.name} (${m.dosage}, ${m.frequency}, ${m.duration})`).join('; ');
      };

      let primaryNotes = notes;
      let primaryPrescription = prescription;

      const primaryDoctorNoteRecord = fullAppt.doctorNotes.find(dn => dn.doctorId === fullAppt.doctorId);
      
      if (!primaryNotes && primaryDoctorNoteRecord) {
        primaryNotes = primaryDoctorNoteRecord.notes;
      }
      if (!primaryPrescription && primaryDoctorNoteRecord) {
        primaryPrescription = primaryDoctorNoteRecord.prescription;
      }

      let aggregatedNotes = `- Primary Doctor: Dr. ${fullAppt.doctor.name}\n`;
      aggregatedNotes += `  Notes: ${primaryNotes || 'None'}\n`;
      aggregatedNotes += `  Prescription: ${formatRx(primaryPrescription)}\n`;

      let aggregatedPrescription = Array.isArray(primaryPrescription) ? [...primaryPrescription] : [];

      if (fullAppt.doctorNotes && fullAppt.doctorNotes.length > 0) {
        fullAppt.doctorNotes.forEach(dn => {
          if (dn.doctorId !== fullAppt.doctorId) {
            aggregatedNotes += `\n- Invited Doctor: Dr. ${dn.doctor.name}\n`;
            aggregatedNotes += `  Notes: ${dn.notes || 'None'}\n`;
            aggregatedNotes += `  Prescription: ${formatRx(dn.prescription)}\n`;
            
            if (dn.prescription && Array.isArray(dn.prescription)) {
              aggregatedPrescription.push(...dn.prescription);
            }
          }
        });
      }

      const pdfUrl = await generatePrescriptionPDF(fullAppt, { notes: aggregatedNotes, prescription: aggregatedPrescription });

      dataToUpdate.consultation = {
        create: {
          notes: aggregatedNotes,
          prescription: aggregatedPrescription,
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
      whereClause = {
        OR: [
          { doctorId: userId },
          { invitedDoctors: { some: { doctorId: userId, status: { not: 'REJECTED' } } } }
        ]
      };
    } else {
      whereClause.patientId = userId;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        doctor: { select: { name: true, email: true, doctorProfile: { include: { specialization: true } } } },
        patient: { select: { name: true, email: true } },
        familyMember: true,
        consultation: true,
        invitedDoctors: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

exports.inviteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorId } = req.body;
    const userId = req.user.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.doctorId !== userId) {
      return res.status(403).json({ error: 'Only the primary doctor can invite others' });
    }

    if (doctorId === userId) {
      return res.status(400).json({ error: 'Cannot invite yourself' });
    }

    const validDoctor = await prisma.user.findUnique({
      where: { id: doctorId }
    });

    if (!validDoctor || validDoctor.role !== 'DOCTOR') {
      return res.status(400).json({ error: 'Invalid doctor ID' });
    }

    const existingInvite = await prisma.invitedDoctor.findUnique({
      where: {
        appointmentId_doctorId: {
          appointmentId: id,
          doctorId: doctorId
        }
      }
    });

    if (existingInvite) {
      return res.status(400).json({ error: 'Doctor already invited' });
    }

    const invitedDoctor = await prisma.invitedDoctor.create({
      data: {
        appointmentId: id,
        doctorId: doctorId,
        status: 'PENDING'
      }
    });

    const inviter = await prisma.user.findUnique({ where: { id: userId } });

    const io = req.app.get('io');
    if (io && inviter) {
      io.to(`user:${doctorId}`).emit('call:incoming', {
        appointmentId: id,
        doctorName: inviter.name
      });
    }

    res.status(201).json(invitedDoctor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to invite doctor' });
  }
};

exports.submitDoctorNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, prescription } = req.body;
    const doctorId = req.user.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        invitedDoctors: true
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const isPrimaryDoctor = appointment.doctorId === doctorId;
    const isInvitedDoctor = appointment.invitedDoctors.some(invite => invite.doctorId === doctorId);

    if (!isPrimaryDoctor && !isInvitedDoctor) {
      return res.status(403).json({ error: 'Not authorized to submit notes for this appointment' });
    }

    const safePrescription = Array.isArray(prescription) ? prescription : [];

    const doctorNote = await prisma.doctorNote.upsert({
      where: {
        appointmentId_doctorId: {
          appointmentId: id,
          doctorId: doctorId
        }
      },
      update: {
        notes,
        prescription: safePrescription
      },
      create: {
        appointmentId: id,
        doctorId: doctorId,
        notes: notes || '',
        prescription: safePrescription
      }
    });

    await prisma.invitedDoctor.updateMany({
      where: {
        appointmentId: id,
        doctorId: doctorId,
        status: { not: 'COMPLETED' }
      },
      data: {
        status: 'COMPLETED'
      }
    });

    res.json(doctorNote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit doctor note' });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: { select: { name: true, email: true, doctorProfile: { include: { specialization: true } } } },
        patient: { select: { name: true, email: true } },
        familyMember: true,
        consultation: true,
        invitedDoctors: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
};
