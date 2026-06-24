const prisma = require('../models/prismaClient');
const bcrypt = require('bcryptjs');
const { ensureDefaultWorkingHours, CONSULTATION_MODES } = require('../utils/doctorAvailability');

const FINAL_APPOINTMENT_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);
const MAX_AUDIT_LOG_ENTRIES = 100;

function sanitizeReason(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 400);
}

function appendAdminAudit(aiSummary, entry) {
  const base = aiSummary && typeof aiSummary === 'object' && !Array.isArray(aiSummary)
    ? aiSummary
    : {};
  const existing = Array.isArray(base._adminAudit) ? base._adminAudit : [];
  return {
    ...base,
    _adminAudit: [entry, ...existing].slice(0, MAX_AUDIT_LOG_ENTRIES)
  };
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseDateBound(input, endOfDay = false) {
  if (!input) return null;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }
  return parsed;
}

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

    await Promise.all(CONSULTATION_MODES.map((mode) => ensureDefaultWorkingHours(prisma, user.id, mode)));

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
    const {
      status,
      mode,
      type,
      doctorId,
      patientId,
      dateFrom,
      dateTo,
      q,
      page,
      pageSize
    } = req.query || {};

    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (mode && mode !== 'ALL') where.consultationMode = mode;
    if (type && type !== 'ALL') where.type = type;
    if (doctorId && doctorId !== 'ALL') where.doctorId = doctorId;
    if (patientId && patientId !== 'ALL') where.patientId = patientId;

    const start = parseDateBound(dateFrom, false);
    const end = parseDateBound(dateTo, true);
    if (start || end) {
      const range = {};
      if (start) range.gte = start;
      if (end) range.lte = end;
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            {
              AND: [
                { scheduledFor: { not: null } },
                { scheduledFor: range }
              ]
            },
            {
              AND: [
                { scheduledFor: null },
                { createdAt: range }
              ]
            }
          ]
        }
      ];
    }

    if (q && String(q).trim()) {
      const needle = String(q).trim().toLowerCase();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { id: { contains: needle, mode: 'insensitive' } },
            { patient: { name: { contains: needle, mode: 'insensitive' } } },
            { patient: { email: { contains: needle, mode: 'insensitive' } } },
            { doctor: { name: { contains: needle, mode: 'insensitive' } } },
            { doctor: { email: { contains: needle, mode: 'insensitive' } } },
            { familyMember: { name: { contains: needle, mode: 'insensitive' } } }
          ]
        }
      ];
    }

    const pageNumber = parsePositiveInt(page, 1);
    const requestedPageSize = parsePositiveInt(pageSize, 20);
    const pageSizeNumber = Math.min(requestedPageSize, 100);
    const skip = (pageNumber - 1) * pageSizeNumber;

    const [appointments, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: { select: { id: true, name: true, email: true } },
          familyMember: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSizeNumber
      }),
      prisma.appointment.count({ where })
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSizeNumber));

    res.json({
      items: appointments,
      pagination: {
        page: pageNumber,
        pageSize: pageSizeNumber,
        total,
        totalPages,
        hasNext: pageNumber < totalPages,
        hasPrev: pageNumber > 1
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = sanitizeReason(req.body?.reason);

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true } },
        doctor: { select: { id: true } }
      }
    });

    if (!existingAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (FINAL_APPOINTMENT_STATUSES.has(existingAppointment.status)) {
      return res.status(400).json({ error: `Cannot cancel a ${existingAppointment.status.toLowerCase()} appointment.` });
    }

    const updatedAppointment = await prisma.$transaction(async (tx) => {
      const auditEntry = {
        action: 'CANCEL',
        at: new Date().toISOString(),
        byAdminId: req.user?.id || null,
        reason,
        fromStatus: existingAppointment.status,
        toStatus: 'CANCELLED'
      };

      const updated = await tx.appointment.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          ...(reason ? { declineReason: reason } : {}),
          aiSummary: appendAdminAudit(existingAppointment.aiSummary, auditEntry)
        },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: { select: { id: true, name: true, email: true } },
          familyMember: { select: { id: true, name: true } }
        }
      });

      if (existingAppointment.type === 'SCHEDULED') {
        await tx.doctorSlot.updateMany({
          where: { appointmentId: id },
          data: { appointmentId: null }
        });
      }

      return updated;
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${existingAppointment.patientId}`).emit('appointment:updated', updatedAppointment);
      io.to(`user:${existingAppointment.doctorId}`).emit('appointment:updated', updatedAppointment);
      io.emit('appointment:updated', updatedAppointment);
    }

    res.json(updatedAppointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
};

exports.reassignAppointmentDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorId } = req.body || {};
    const reason = sanitizeReason(req.body?.reason);

    if (!doctorId) {
      return res.status(400).json({ error: 'doctorId is required.' });
    }

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true } },
        doctor: { select: { id: true } }
      }
    });

    if (!existingAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (FINAL_APPOINTMENT_STATUSES.has(existingAppointment.status)) {
      return res.status(400).json({ error: `Cannot reassign a ${existingAppointment.status.toLowerCase()} appointment.` });
    }

    const targetDoctor = await prisma.user.findUnique({
      where: { id: doctorId },
      select: { id: true, role: true }
    });
    if (!targetDoctor || targetDoctor.role !== 'DOCTOR') {
      return res.status(400).json({ error: 'Target doctor is invalid.' });
    }

    if (existingAppointment.doctorId === doctorId) {
      const unchanged = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: { select: { id: true, name: true, email: true } },
          familyMember: { select: { id: true, name: true } }
        }
      });
      return res.json(unchanged);
    }

    const shouldResetToPending =
      existingAppointment.type === 'ON_DEMAND' && existingAppointment.status === 'ACCEPTED';

    const updatedAppointment = await prisma.$transaction(async (tx) => {
      if (existingAppointment.type === 'SCHEDULED' && existingAppointment.scheduledFor && existingAppointment.scheduledUntil) {
        await tx.doctorSlot.updateMany({
          where: { appointmentId: id },
          data: { appointmentId: null }
        });

        const conflictingSlot = await tx.doctorSlot.findFirst({
          where: {
            doctorId,
            startAt: existingAppointment.scheduledFor,
            appointmentId: { not: null }
          }
        });

        if (conflictingSlot && conflictingSlot.appointmentId !== id) {
          throw new Error('Selected doctor is not available for this scheduled slot.');
        }

        const reusableSlot = await tx.doctorSlot.findFirst({
          where: {
            doctorId,
            startAt: existingAppointment.scheduledFor,
            endAt: existingAppointment.scheduledUntil,
            appointmentId: null
          }
        });

        if (reusableSlot) {
          await tx.doctorSlot.update({
            where: { id: reusableSlot.id },
            data: { appointmentId: id }
          });
        } else {
          await tx.doctorSlot.create({
            data: {
              doctorId,
              startAt: existingAppointment.scheduledFor,
              endAt: existingAppointment.scheduledUntil,
              appointmentId: id
            }
          });
        }
      }

      return tx.appointment.update({
        where: { id },
        data: {
          doctorId,
          aiSummary: appendAdminAudit(existingAppointment.aiSummary, {
            action: 'REASSIGN',
            at: new Date().toISOString(),
            byAdminId: req.user?.id || null,
            reason,
            fromDoctorId: existingAppointment.doctorId,
            toDoctorId: doctorId,
            fromStatus: existingAppointment.status,
            toStatus: shouldResetToPending ? 'PENDING' : existingAppointment.status
          }),
          ...(shouldResetToPending ? { status: 'PENDING' } : {})
        },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: { select: { id: true, name: true, email: true } },
          familyMember: { select: { id: true, name: true } }
        }
      });
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${existingAppointment.patientId}`).emit('appointment:updated', updatedAppointment);
      io.to(`user:${existingAppointment.doctorId}`).emit('appointment:updated', updatedAppointment);
      io.to(`user:${doctorId}`).emit('appointment:updated', updatedAppointment);
      io.emit('appointment:updated', updatedAppointment);
    }

    res.json(updatedAppointment);
  } catch (error) {
    console.error(error);
    if (error.message === 'Selected doctor is not available for this scheduled slot.') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to reassign appointment' });
  }
};

exports.getAppointmentAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, aiSummary: true }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const entries = Array.isArray(appointment.aiSummary?._adminAudit)
      ? appointment.aiSummary._adminAudit
      : [];

    res.json({
      appointmentId: id,
      entries
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch appointment audit log' });
  }
};
