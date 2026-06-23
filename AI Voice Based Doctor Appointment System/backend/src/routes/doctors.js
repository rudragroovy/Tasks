const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const prisma = require('../models/prismaClient');
const {
  ensureDefaultWorkingHours,
  getDefaultWorkingHourForDay,
  minutesToHHMM,
  ALLOWED_SLOT_DURATIONS,
  CONSULTATION_MODES,
  DEFAULT_CONSULTATION_MODE,
  normalizeConsultationMode,
  normalizeSlotDurationMinutes,
  getSlotDurationForMode,
  parseDateOnly,
} = require('../utils/doctorAvailability');

const router = express.Router();
const DAY_COUNT = 7;
const MINUTES_PER_DAY = 24 * 60;

function getStartOfWeek(dateLike) {
  const date = new Date(dateLike);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function buildWorkingWeekResponse(configuredHours) {
  const byDay = new Map();
  for (const hour of configuredHours || []) {
    if (!byDay.has(hour.dayOfWeek)) {
      byDay.set(hour.dayOfWeek, []);
    }
    byDay.get(hour.dayOfWeek).push(hour);
  }

  const week = [];

  for (let dayOfWeek = 0; dayOfWeek < DAY_COUNT; dayOfWeek += 1) {
    const configuredSegments = (byDay.get(dayOfWeek) || []).sort((a, b) => {
      if (a.segmentIndex !== b.segmentIndex) return a.segmentIndex - b.segmentIndex;
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      return a.endMinutes - b.endMinutes;
    });
    const fallbackSegment = getDefaultWorkingHourForDay(dayOfWeek);
    const source = configuredSegments.length > 0 ? 'configured' : 'default';
    const baseSegments = configuredSegments.length > 0
      ? configuredSegments
      : (fallbackSegment ? [fallbackSegment] : []);

    const segments = baseSegments.map((segment, index) => ({
      segmentIndex: Number.isInteger(segment.segmentIndex) ? segment.segmentIndex : index,
      isActive: Boolean(segment.isActive),
      startMinutes: Number(segment.startMinutes) || 0,
      endMinutes: Number(segment.endMinutes) || 0,
      start: minutesToHHMM(Number(segment.startMinutes) || 0),
      end: minutesToHHMM(Number(segment.endMinutes) || 0),
      source,
    }));

    const activeSegments = segments.filter((segment) => segment.isActive && segment.startMinutes < segment.endMinutes);
    const startMinutes = activeSegments.length > 0
      ? Math.min(...activeSegments.map((segment) => segment.startMinutes))
      : 0;
    const endMinutes = activeSegments.length > 0
      ? Math.max(...activeSegments.map((segment) => segment.endMinutes))
      : 0;

    week.push({
      dayOfWeek,
      isActive: activeSegments.length > 0,
      startMinutes,
      endMinutes,
      start: minutesToHHMM(startMinutes),
      end: minutesToHHMM(endMinutes),
      source,
      segments,
    });
  }

  return week;
}

function normalizeIncomingSegments(dayOfWeek, dayIsActive, rawSegments) {
  if (!Array.isArray(rawSegments)) {
    return { error: `segments must be an array for day ${dayOfWeek}` };
  }

  if (dayIsActive && rawSegments.length === 0) {
    return { error: `At least one active segment is required for day ${dayOfWeek}` };
  }

  if (rawSegments.length === 0) {
    return {
      segments: [
        {
          startMinutes: 0,
          endMinutes: 0,
          isActive: false,
        },
      ],
    };
  }

  const normalizedSegments = [];
  for (let index = 0; index < rawSegments.length; index += 1) {
    const segment = rawSegments[index] || {};
    const startMinutes = Number(segment.startMinutes);
    const endMinutes = Number(segment.endMinutes);

    if (!Number.isInteger(startMinutes) || !Number.isInteger(endMinutes)) {
      // Ignore malformed segment rows coming from UI transient/internal records.
      continue;
    }

    if (startMinutes < 0 || endMinutes > MINUTES_PER_DAY || startMinutes > endMinutes) {
      continue;
    }

    const isActive = dayIsActive && segment.isActive !== false;
    if (isActive && startMinutes >= endMinutes) {
      continue;
    }

    normalizedSegments.push({
      startMinutes,
      endMinutes,
      isActive,
    });
  }

  if (normalizedSegments.length === 0) {
    if (dayIsActive) {
      return { error: `At least one active segment is required for day ${dayOfWeek}` };
    }
    return {
      segments: [
        {
          startMinutes: 0,
          endMinutes: 0,
          isActive: false,
        },
      ],
    };
  }

  const activeSegments = normalizedSegments
    .filter((segment) => segment.isActive)
    .sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      return a.endMinutes - b.endMinutes;
    });

  for (let index = 1; index < activeSegments.length; index += 1) {
    const previous = activeSegments[index - 1];
    const current = activeSegments[index];
    if (current.startMinutes < previous.endMinutes) {
      return { error: `Segments overlap for day ${dayOfWeek}` };
    }
  }

  if (dayIsActive && activeSegments.length === 0) {
    return { error: `At least one active segment is required for day ${dayOfWeek}` };
  }

  const sortedSegments = [...normalizedSegments].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return a.endMinutes - b.endMinutes;
  });

  return { segments: sortedSegments };
}

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
      fee: parseFloat(d.fee) || 150.00,
      slotDurationMinutes: getSlotDurationForMode(d, 'VIDEO'),
      slotDurationsByMode: {
        VIDEO: getSlotDurationForMode(d, 'VIDEO'),
        AUDIO: getSlotDurationForMode(d, 'AUDIO'),
        IN_PERSON: getSlotDurationForMode(d, 'IN_PERSON'),
      },
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

router.get('/me/slot-duration', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Only doctors can view slot settings' });
    }

    const consultationMode = normalizeConsultationMode(req.query?.mode || DEFAULT_CONSULTATION_MODE);
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.id },
      select: {
        slotDurationMinutesVideo: true,
        slotDurationMinutesAudio: true,
        slotDurationMinutesInPerson: true,
      },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    const slotDurationMinutes = getSlotDurationForMode(doctor, consultationMode);
    res.json({
      consultationMode,
      slotDurationMinutes,
      allowedSlotDurations: ALLOWED_SLOT_DURATIONS,
      slotDurationsByMode: {
        VIDEO: getSlotDurationForMode(doctor, 'VIDEO'),
        AUDIO: getSlotDurationForMode(doctor, 'AUDIO'),
        IN_PERSON: getSlotDurationForMode(doctor, 'IN_PERSON'),
      },
      consultationModes: CONSULTATION_MODES,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch slot settings' });
  }
});

router.put('/me/slot-duration', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Only doctors can update slot settings' });
    }

    const consultationMode = normalizeConsultationMode(req.body?.mode || DEFAULT_CONSULTATION_MODE);
    const rawDuration = req.body?.slotDurationMinutes;
    if (!Number.isInteger(rawDuration) || !ALLOWED_SLOT_DURATIONS.includes(rawDuration)) {
      return res.status(400).json({
        error: `slotDurationMinutes must be one of: ${ALLOWED_SLOT_DURATIONS.join(', ')}`
      });
    }

    const durationField = consultationMode === 'AUDIO'
      ? 'slotDurationMinutesAudio'
      : consultationMode === 'IN_PERSON'
        ? 'slotDurationMinutesInPerson'
        : 'slotDurationMinutesVideo';

    const updatedDoctor = await prisma.doctor.update({
      where: { userId: req.user.id },
      data: { [durationField]: rawDuration },
      select: {
        slotDurationMinutesVideo: true,
        slotDurationMinutesAudio: true,
        slotDurationMinutesInPerson: true,
      },
    });

    res.json({
      consultationMode,
      slotDurationMinutes: getSlotDurationForMode(updatedDoctor, consultationMode),
      allowedSlotDurations: ALLOWED_SLOT_DURATIONS,
      slotDurationsByMode: {
        VIDEO: getSlotDurationForMode(updatedDoctor, 'VIDEO'),
        AUDIO: getSlotDurationForMode(updatedDoctor, 'AUDIO'),
        IN_PERSON: getSlotDurationForMode(updatedDoctor, 'IN_PERSON'),
      },
      consultationModes: CONSULTATION_MODES,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update slot settings' });
  }
});

router.get('/me/working-hours', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Only doctors can view working hours' });
    }
    const consultationMode = normalizeConsultationMode(req.query?.mode || DEFAULT_CONSULTATION_MODE);
    const requestedDate = req.query?.date ? parseDateOnly(req.query.date) : null;

    if (!req.query?.date) {
      const configuredHours = await prisma.doctorWorkingHour.findMany({
        where: { doctorId: req.user.id, consultationMode },
        orderBy: [{ dayOfWeek: 'asc' }, { segmentIndex: 'asc' }],
      });
      return res.json(buildWorkingWeekResponse(configuredHours));
    }

    if (!requestedDate) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const weekStart = getStartOfWeek(requestedDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + DAY_COUNT);

    const recurring = await prisma.doctorWorkingHour.findMany({
      where: { doctorId: req.user.id, consultationMode },
      orderBy: [{ dayOfWeek: 'asc' }, { segmentIndex: 'asc' }],
    });

    const overrides = await prisma.doctorWorkingHourOverride.findMany({
      where: {
        doctorId: req.user.id,
        consultationMode,
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      orderBy: [{ date: 'asc' }, { segmentIndex: 'asc' }],
    });

    const recurringByDay = new Map();
    for (const row of recurring) {
      if (!recurringByDay.has(row.dayOfWeek)) recurringByDay.set(row.dayOfWeek, []);
      recurringByDay.get(row.dayOfWeek).push(row);
    }

    const overridesByDay = new Map();
    for (const row of overrides) {
      const dayOfWeek = new Date(row.date).getDay();
      if (!overridesByDay.has(dayOfWeek)) overridesByDay.set(dayOfWeek, []);
      overridesByDay.get(dayOfWeek).push({ ...row, dayOfWeek });
    }

    const merged = [];
    for (let dayOfWeek = 0; dayOfWeek < DAY_COUNT; dayOfWeek += 1) {
      const selected = overridesByDay.get(dayOfWeek) || recurringByDay.get(dayOfWeek) || [];
      merged.push(...selected.map((row, segmentIndex) => ({
        ...row,
        dayOfWeek,
        segmentIndex: Number.isInteger(row.segmentIndex) ? row.segmentIndex : segmentIndex,
      })));
    }

    return res.json(buildWorkingWeekResponse(merged));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch working hours' });
  }
});

router.put('/me/working-hours', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Only doctors can update working hours' });
    }

    const consultationMode = normalizeConsultationMode(req.body?.mode || DEFAULT_CONSULTATION_MODE);
    const { workingHours, applyScope = 'weekly', effectiveDate } = req.body;
    if (!Array.isArray(workingHours) || workingHours.length !== DAY_COUNT) {
      return res.status(400).json({ error: 'workingHours must include all 7 days' });
    }
    if (!['weekly', 'selected_week'].includes(applyScope)) {
      return res.status(400).json({ error: 'applyScope must be weekly or selected_week' });
    }

    const seenDays = new Set();
    const nextRows = [];

    for (const hour of workingHours) {
      const { dayOfWeek, isActive } = hour || {};

      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(400).json({ error: `Invalid dayOfWeek: ${dayOfWeek}` });
      }
      if (seenDays.has(dayOfWeek)) {
        return res.status(400).json({ error: `Duplicate dayOfWeek: ${dayOfWeek}` });
      }
      seenDays.add(dayOfWeek);

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: `isActive must be boolean for day ${dayOfWeek}` });
      }

      const legacySegments = (
        Number.isInteger(hour?.startMinutes) && Number.isInteger(hour?.endMinutes)
      )
        ? [{ startMinutes: hour.startMinutes, endMinutes: hour.endMinutes, isActive }]
        : [];

      const { segments, error } = normalizeIncomingSegments(
        dayOfWeek,
        isActive,
        Array.isArray(hour?.segments) ? hour.segments : legacySegments
      );
      if (error) {
        return res.status(400).json({ error });
      }

      for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
        const segment = segments[segmentIndex];
        nextRows.push({
          doctorId: req.user.id,
          consultationMode,
          dayOfWeek,
          segmentIndex,
          startMinutes: segment.startMinutes,
          endMinutes: segment.endMinutes,
          isActive: segment.isActive,
        });
      }
    }

    if (seenDays.size !== DAY_COUNT) {
      return res.status(400).json({ error: 'workingHours must include each day exactly once' });
    }

    if (applyScope === 'selected_week') {
      const parsedDate = parseDateOnly(effectiveDate);
      if (!parsedDate) {
        return res.status(400).json({ error: 'effectiveDate is required for selected_week (YYYY-MM-DD)' });
      }

      const weekStart = getStartOfWeek(parsedDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + DAY_COUNT);

      const overrideRows = [];
      for (const row of nextRows) {
        const rowDate = new Date(weekStart);
        rowDate.setDate(weekStart.getDate() + row.dayOfWeek);
        overrideRows.push({
          doctorId: row.doctorId,
          consultationMode,
          date: rowDate,
          segmentIndex: row.segmentIndex,
          startMinutes: row.startMinutes,
          endMinutes: row.endMinutes,
          isActive: row.isActive,
        });
      }

      await prisma.$transaction([
        prisma.doctorWorkingHourOverride.deleteMany({
          where: {
            doctorId: req.user.id,
            consultationMode,
            date: {
              gte: weekStart,
              lt: weekEnd,
            },
          },
        }),
        prisma.doctorWorkingHourOverride.createMany({
          data: overrideRows,
        }),
      ]);

      return res.json(buildWorkingWeekResponse(nextRows));
    }

    await prisma.$transaction([
      prisma.doctorWorkingHour.deleteMany({
        where: { doctorId: req.user.id, consultationMode },
      }),
      prisma.doctorWorkingHour.createMany({
        data: nextRows,
      }),
    ]);

    const refreshed = await prisma.doctorWorkingHour.findMany({
      where: { doctorId: req.user.id, consultationMode },
      orderBy: [{ dayOfWeek: 'asc' }, { segmentIndex: 'asc' }],
    });

    res.json(buildWorkingWeekResponse(refreshed));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update working hours' });
  }
});

router.post('/me/working-hours/defaults', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Only doctors can reset working hours' });
    }

    const consultationMode = normalizeConsultationMode(req.body?.mode || req.query?.mode || DEFAULT_CONSULTATION_MODE);
    await ensureDefaultWorkingHours(prisma, req.user.id, consultationMode);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to apply default working hours' });
  }
});

module.exports = router;
