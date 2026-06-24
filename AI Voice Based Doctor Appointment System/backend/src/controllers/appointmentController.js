const prisma = require('../models/prismaClient');
const { generatePrescriptionPDF } = require('../services/pdfService');
const {
  DEFAULT_CONSULTATION_MODE,
  normalizeConsultationMode,
  getSlotDurationForMode,
  minutesToHHMM,
  getMinutesSinceMidnight,
  parseDateOnly,
  getWorkingHoursForDate,
} = require('../utils/doctorAvailability');
const { formatDoctorName } = require('../utils/doctorName');

const SLOT_FREE_STATUSES = new Set(['CANCELLED', 'REJECTED']);
const SCHEDULED_APPOINTMENT_TYPE = 'SCHEDULED';

function parseAiSummary(aiSummary) {
  return typeof aiSummary === 'object' ? aiSummary : JSON.parse(aiSummary || '{}');
}

function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function buildSlotDurationMap(doctor) {
  return {
    VIDEO: getSlotDurationForMode(doctor, 'VIDEO'),
    AUDIO: getSlotDurationForMode(doctor, 'AUDIO'),
    IN_PERSON: getSlotDurationForMode(doctor, 'IN_PERSON'),
  };
}

function getAppointmentEndAt(appointment, slotDurationByMode) {
  if (!appointment?.scheduledFor) return null;

  const start = new Date(appointment.scheduledFor);
  if (Number.isNaN(start.getTime())) return null;

  const storedEnd = appointment.scheduledUntil ? new Date(appointment.scheduledUntil) : null;
  if (storedEnd && !Number.isNaN(storedEnd.getTime()) && storedEnd > start) {
    return storedEnd;
  }

  const mode = normalizeConsultationMode(appointment.consultationMode || DEFAULT_CONSULTATION_MODE);
  const fallbackMinutes = slotDurationByMode?.[mode] || slotDurationByMode?.VIDEO || 30;
  return new Date(start.getTime() + fallbackMinutes * 60 * 1000);
}

function buildWorkingHoursPayload(workingHours) {
  const sortedWorkingHours = [...workingHours].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return a.endMinutes - b.endMinutes;
  });

  const firstWorkingHour = sortedWorkingHours[0];
  const lastWorkingHour = sortedWorkingHours[sortedWorkingHours.length - 1];

  return {
    start: minutesToHHMM(firstWorkingHour.startMinutes),
    end: minutesToHHMM(lastWorkingHour.endMinutes),
    source: sortedWorkingHours.some((hour) => hour.source === 'configured') ? 'configured' : 'default',
    segments: sortedWorkingHours.map((hour, index) => ({
      segmentIndex: Number.isInteger(hour.segmentIndex) ? hour.segmentIndex : index,
      start: minutesToHHMM(hour.startMinutes),
      end: minutesToHHMM(hour.endMinutes),
      startMinutes: hour.startMinutes,
      endMinutes: hour.endMinutes,
    })),
  };
}

async function releaseBookedSlot(tx, appointmentId) {
  await tx.doctorSlot.updateMany({
    where: { appointmentId },
    data: { appointmentId: null },
  });
}

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

exports.getDoctorAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    const consultationMode = normalizeConsultationMode(req.query?.mode || DEFAULT_CONSULTATION_MODE);

    if (!date) {
      return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });
    }

    const dayStart = parseDateOnly(date);
    if (!dayStart) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { userId: doctorId },
      select: {
        userId: true,
        slotDurationMinutesVideo: true,
        slotDurationMinutesAudio: true,
        slotDurationMinutesInPerson: true,
      },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const slotDurationByMode = buildSlotDurationMap(doctor);
    const slotDurationMinutes = slotDurationByMode[consultationMode];
    const workingHours = await getWorkingHoursForDate(prisma, doctorId, dayStart, consultationMode);

    if (!workingHours || workingHours.length === 0) {
      return res.json({
        date,
        consultationMode,
        slotDurationMinutes,
        slotDurationsByMode: slotDurationByMode,
        workingHours: null,
        slots: [],
      });
    }

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        type: SCHEDULED_APPOINTMENT_TYPE,
        status: { notIn: Array.from(SLOT_FREE_STATUSES) },
        scheduledFor: { lt: dayEnd },
        OR: [
          { scheduledUntil: { gt: dayStart } },
          { scheduledUntil: null },
        ],
      },
      select: {
        id: true,
        consultationMode: true,
        scheduledFor: true,
        scheduledUntil: true,
      },
    });

    const busyIntervals = bookedAppointments
      .map((appointment) => {
        const startAt = new Date(appointment.scheduledFor);
        const endAt = getAppointmentEndAt(appointment, slotDurationByMode);
        if (!endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return null;
        return { startAt, endAt };
      })
      .filter(Boolean);

    const now = new Date();
    const slots = [];
    const seenSlotKeys = new Set();

    for (const workingHour of workingHours) {
      for (
        let minutes = workingHour.startMinutes;
        minutes + slotDurationMinutes <= workingHour.endMinutes;
        minutes += slotDurationMinutes
      ) {
        const slotStart = new Date(dayStart);
        slotStart.setMinutes(minutes, 0, 0);

        if (slotStart < now) continue;

        const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60 * 1000);
        const slotKey = slotStart.toISOString();
        if (seenSlotKeys.has(slotKey)) continue;
        seenSlotKeys.add(slotKey);
        const isBooked = busyIntervals.some(({ startAt, endAt }) =>
          intervalsOverlap(startAt, endAt, slotStart, slotEnd)
        );

        slots.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          label: minutesToHHMM(minutes),
          available: !isBooked,
        });
      }
    }

    res.json({
      date,
      consultationMode,
      slotDurationMinutes,
      slotDurationsByMode: slotDurationByMode,
      workingHours: buildWorkingHoursPayload(workingHours),
      slots,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, aiSummary, type, scheduledFor, familyMemberId } = req.body;
    const patientId = req.user.id; // from authMiddleware
    const normalizedType = type || 'ON_DEMAND';
    const consultationMode = normalizeConsultationMode(
      req.body?.consultationMode || req.body?.mode || DEFAULT_CONSULTATION_MODE
    );
    const doctorProfile = await prisma.doctor.findUnique({
      where: { userId: doctorId },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!doctorProfile) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    const slotDurationByMode = buildSlotDurationMap(doctorProfile);
    const slotDurationMinutes = slotDurationByMode[consultationMode];

    const normalizedAiSummary = parseAiSummary(aiSummary);
    if (normalizedAiSummary && typeof normalizedAiSummary === 'object') {
      normalizedAiSummary.assigned_doctor_id = doctorId;
      if (doctorProfile.user?.name) {
        normalizedAiSummary.assigned_doctor_name = formatDoctorName(
          doctorProfile.user.name,
          doctorProfile.user.name
        );
      }
    }

    let appointment;

    if (normalizedType === SCHEDULED_APPOINTMENT_TYPE) {
      if (!scheduledFor) {
        return res.status(400).json({ error: 'scheduledFor is required for scheduled appointments' });
      }

      const slotStart = new Date(scheduledFor);
      if (Number.isNaN(slotStart.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduledFor datetime' });
      }

      slotStart.setSeconds(0, 0);

      if (slotStart < new Date()) {
        return res.status(400).json({ error: 'Selected slot is in the past' });
      }

      const workingHours = await getWorkingHoursForDate(prisma, doctorId, slotStart, consultationMode);
      if (!workingHours || workingHours.length === 0) {
        return res.status(400).json({ error: 'Doctor is not available on this day' });
      }

      const slotStartMinutes = getMinutesSinceMidnight(slotStart);
      const matchingWorkingHour = workingHours.find((workingHour) => {
        const isInsideWorkingWindow =
          slotStartMinutes >= workingHour.startMinutes &&
          slotStartMinutes + slotDurationMinutes <= workingHour.endMinutes;
        if (!isInsideWorkingWindow) return false;
        return (slotStartMinutes - workingHour.startMinutes) % slotDurationMinutes === 0;
      });

      if (!matchingWorkingHour) {
        return res.status(400).json({ error: 'Selected time is outside doctor working hours' });
      }

      const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60 * 1000);

      appointment = await prisma.$transaction(async (tx) => {
        const potentiallyConflictingAppointments = await tx.appointment.findMany({
          where: {
            doctorId,
            type: SCHEDULED_APPOINTMENT_TYPE,
            status: { notIn: Array.from(SLOT_FREE_STATUSES) },
            scheduledFor: { lt: slotEnd },
            OR: [
              { scheduledUntil: { gt: slotStart } },
              { scheduledUntil: null },
            ],
          },
          select: {
            id: true,
            consultationMode: true,
            scheduledFor: true,
            scheduledUntil: true,
          },
        });

        const hasConflict = potentiallyConflictingAppointments.some((existingAppointment) => {
          const existingStart = new Date(existingAppointment.scheduledFor);
          const existingEnd = getAppointmentEndAt(existingAppointment, slotDurationByMode);
          if (!existingEnd) return false;
          return intervalsOverlap(existingStart, existingEnd, slotStart, slotEnd);
        });

        if (hasConflict) {
          const conflictError = new Error('Slot is already booked');
          conflictError.code = 'SLOT_TAKEN';
          throw conflictError;
        }

        return tx.appointment.create({
          data: {
            patientId,
            doctorId,
            familyMemberId: familyMemberId || null,
            aiSummary: normalizedAiSummary,
            status: 'PENDING',
            type: normalizedType,
            consultationMode,
            scheduledFor: slotStart,
            scheduledUntil: slotEnd,
            paymentStatus: 'PENDING_PAYMENT',
          },
        });
      });
    } else {
      appointment = await prisma.appointment.create({
        data: {
          patientId,
          doctorId,
          familyMemberId: familyMemberId || null,
          aiSummary: normalizedAiSummary,
          status: 'PENDING',
          type: normalizedType,
          consultationMode,
          scheduledFor: null,
          scheduledUntil: null,
          paymentStatus: 'PENDING_PAYMENT'
        }
      });
    }

    // We don't emit 'appointment:new' to doctor yet, because payment is pending!
    // We will emit it in the payments/confirm route.

    res.status(201).json(appointment);
  } catch (error) {
    if (error?.code === 'SLOT_TAKEN') {
      return res.status(409).json({ error: 'This slot was just booked by another patient. Please pick another slot.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, prescription, declineReason } = req.body;
    
    const appointmentCheck = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointmentCheck) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const isPrimaryDoctor = appointmentCheck.doctorId === req.user.id;
    const isPatient = appointmentCheck.patientId === req.user.id;

    if (!isPrimaryDoctor && ['ACCEPTED', 'REJECTED', 'COMPLETED'].includes(status)) {
      return res.status(403).json({ error: 'Not authorized to change status' });
    }

    if (status === 'CANCELLED' && !isPrimaryDoctor && !isPatient) {
      return res.status(403).json({ error: 'Not authorized to cancel this appointment' });
    }

    const dataToUpdate = { status };

    if (status === 'REJECTED') {
      const normalizedReason = typeof declineReason === 'string' ? declineReason.trim() : '';
      if (!normalizedReason) {
        return res.status(400).json({ error: 'Decline reason is required.' });
      }
      if (normalizedReason.length < 5) {
        return res.status(400).json({ error: 'Decline reason must be at least 5 characters long.' });
      }
      dataToUpdate.declineReason = normalizedReason;
    }

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

      let aggregatedNotes = `- Primary Doctor: ${formatDoctorName(fullAppt.doctor.name, fullAppt.doctor.name)}\n`;
      aggregatedNotes += `  Notes: ${primaryNotes || 'None'}\n`;
      aggregatedNotes += `  Prescription: ${formatRx(primaryPrescription)}\n`;

      let aggregatedPrescription = Array.isArray(primaryPrescription) ? [...primaryPrescription] : [];

      if (fullAppt.doctorNotes && fullAppt.doctorNotes.length > 0) {
        fullAppt.doctorNotes.forEach(dn => {
          if (dn.doctorId !== fullAppt.doctorId) {
            aggregatedNotes += `\n- Invited Doctor: ${formatDoctorName(dn.doctor.name, dn.doctor.name)}\n`;
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

    const shouldReleaseSlot = appointmentCheck.type === 'SCHEDULED' && ['CANCELLED', 'REJECTED'].includes(status);

    const appointment = await prisma.$transaction(async (tx) => {
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: dataToUpdate,
      });

      if (shouldReleaseSlot) {
        await releaseBookedSlot(tx, id);
      }

      return updatedAppointment;
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${appointment.patientId}`).to(`user:${appointment.doctorId}`).emit('appointment:updated', appointment);
    }

    res.json(appointment);
  } catch (error) {
    console.error(error);

    if (error?.name === 'PrismaClientValidationError' && String(error?.message || '').includes('declineReason')) {
      return res.status(500).json({
        error: 'Server Prisma client is outdated for declineReason. Run `npx prisma generate` and restart backend.'
      });
    }

    if (error?.code === 'P2022' && String(error?.meta?.column || '').includes('declineReason')) {
      return res.status(500).json({
        error: 'Database schema is missing declineReason column. Run Prisma migration and restart backend.'
      });
    }

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
        doctor: { select: { id: true, name: true, email: true, doctorProfile: { include: { specialization: true } } } },
        patient: { select: { id: true, name: true, email: true } },
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
        doctor: { select: { id: true, name: true, email: true, doctorProfile: { include: { specialization: true } } } },
        patient: { select: { id: true, name: true, email: true } },
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
