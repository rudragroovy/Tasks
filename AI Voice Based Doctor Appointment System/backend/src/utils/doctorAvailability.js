const SLOT_DURATION_MINUTES = 30;
const ALLOWED_SLOT_DURATIONS = [10, 15, 20, 30, 45, 60];
const CONSULTATION_MODES = ['VIDEO', 'AUDIO', 'IN_PERSON'];
const DEFAULT_CONSULTATION_MODE = 'VIDEO';

const DEFAULT_WORKING_HOURS_BY_MODE_AND_DAY = {
  VIDEO: {
    1: { startMinutes: 9 * 60, endMinutes: 12 * 60 }, // Monday
    2: { startMinutes: 9 * 60, endMinutes: 12 * 60 }, // Tuesday
    3: { startMinutes: 9 * 60, endMinutes: 12 * 60 }, // Wednesday
    4: { startMinutes: 9 * 60, endMinutes: 12 * 60 }, // Thursday
    5: { startMinutes: 9 * 60, endMinutes: 12 * 60 }, // Friday
  },
  AUDIO: {
    1: { startMinutes: 13 * 60, endMinutes: 15 * 60 }, // Monday
    2: { startMinutes: 13 * 60, endMinutes: 15 * 60 }, // Tuesday
    3: { startMinutes: 13 * 60, endMinutes: 15 * 60 }, // Wednesday
    4: { startMinutes: 13 * 60, endMinutes: 15 * 60 }, // Thursday
    5: { startMinutes: 13 * 60, endMinutes: 15 * 60 }, // Friday
  },
  IN_PERSON: {
    1: { startMinutes: 15 * 60, endMinutes: 17 * 60 }, // Monday
    2: { startMinutes: 15 * 60, endMinutes: 17 * 60 }, // Tuesday
    3: { startMinutes: 15 * 60, endMinutes: 17 * 60 }, // Wednesday
    4: { startMinutes: 15 * 60, endMinutes: 17 * 60 }, // Thursday
    5: { startMinutes: 15 * 60, endMinutes: 17 * 60 }, // Friday
  },
};

function minutesToHHMM(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function getMinutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function parseDateOnly(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString || ''))) {
    return null;
  }

  const parsed = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeConsultationMode(mode) {
  if (!mode) return DEFAULT_CONSULTATION_MODE;
  const normalized = String(mode).toUpperCase();
  return CONSULTATION_MODES.includes(normalized) ? normalized : DEFAULT_CONSULTATION_MODE;
}

function normalizeSlotDurationMinutes(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return SLOT_DURATION_MINUTES;
  if (!ALLOWED_SLOT_DURATIONS.includes(parsed)) return SLOT_DURATION_MINUTES;
  return parsed;
}

function getSlotDurationForMode(doctorRecord, consultationMode) {
  const mode = normalizeConsultationMode(consultationMode);
  if (!doctorRecord) return SLOT_DURATION_MINUTES;

  if (mode === 'AUDIO') {
    return normalizeSlotDurationMinutes(doctorRecord.slotDurationMinutesAudio);
  }
  if (mode === 'IN_PERSON') {
    return normalizeSlotDurationMinutes(doctorRecord.slotDurationMinutesInPerson);
  }
  return normalizeSlotDurationMinutes(doctorRecord.slotDurationMinutesVideo);
}

function getDefaultWorkingHourForDay(dayOfWeek, consultationMode = DEFAULT_CONSULTATION_MODE) {
  const mode = normalizeConsultationMode(consultationMode);
  const modeDefaults = DEFAULT_WORKING_HOURS_BY_MODE_AND_DAY[mode] || {};
  const fallback = modeDefaults[dayOfWeek];
  if (!fallback) return null;
  return {
    dayOfWeek,
    segmentIndex: 0,
    startMinutes: fallback.startMinutes,
    endMinutes: fallback.endMinutes,
    isActive: true,
    source: 'default',
  };
}

function getDefaultWorkingHoursForDay(dayOfWeek, consultationMode = DEFAULT_CONSULTATION_MODE) {
  const fallback = getDefaultWorkingHourForDay(dayOfWeek, consultationMode);
  return fallback ? [fallback] : [];
}

async function getWorkingHoursForDay(prismaClient, doctorId, dayOfWeek, consultationMode = DEFAULT_CONSULTATION_MODE) {
  const mode = normalizeConsultationMode(consultationMode);
  const configured = await prismaClient.doctorWorkingHour.findMany({
    where: { doctorId, dayOfWeek, consultationMode: mode },
    orderBy: [{ segmentIndex: 'asc' }, { startMinutes: 'asc' }],
  });

  if (configured.length > 0) {
    return configured
      .filter((segment) => segment.isActive && segment.startMinutes < segment.endMinutes)
      .map((segment) => ({ ...segment, source: 'configured' }));
  }

  return getDefaultWorkingHoursForDay(dayOfWeek, mode);
}

function getDayRange(dateLike) {
  const dayStart = new Date(dateLike);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
}

async function getWorkingHoursForDate(prismaClient, doctorId, dateLike, consultationMode = DEFAULT_CONSULTATION_MODE) {
  const mode = normalizeConsultationMode(consultationMode);
  const { dayStart, dayEnd } = getDayRange(dateLike);

  const overrides = await prismaClient.doctorWorkingHourOverride.findMany({
    where: {
      doctorId,
      consultationMode: mode,
      date: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    orderBy: [{ segmentIndex: 'asc' }, { startMinutes: 'asc' }],
  });

  if (overrides.length > 0) {
    return overrides
      .filter((segment) => segment.isActive && segment.startMinutes < segment.endMinutes)
      .map((segment) => ({ ...segment, source: 'override' }));
  }

  return getWorkingHoursForDay(prismaClient, doctorId, dayStart.getDay(), mode);
}

async function ensureDefaultWorkingHours(prismaClient, doctorId, consultationMode = DEFAULT_CONSULTATION_MODE) {
  const mode = normalizeConsultationMode(consultationMode);
  const defaults = [];

  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    const defaultHour = getDefaultWorkingHourForDay(dayOfWeek, mode);
    defaults.push(
      defaultHour
        ? {
            doctorId,
            consultationMode: mode,
            dayOfWeek,
            segmentIndex: 0,
            startMinutes: defaultHour.startMinutes,
            endMinutes: defaultHour.endMinutes,
            isActive: true,
          }
        : {
            doctorId,
            consultationMode: mode,
            dayOfWeek,
            segmentIndex: 0,
            startMinutes: 0,
            endMinutes: 0,
            isActive: false,
          }
    );
  }

  await prismaClient.$transaction([
    prismaClient.doctorWorkingHour.deleteMany({ where: { doctorId, consultationMode: mode } }),
    prismaClient.doctorWorkingHour.createMany({ data: defaults }),
  ]);
}

module.exports = {
  SLOT_DURATION_MINUTES,
  ALLOWED_SLOT_DURATIONS,
  CONSULTATION_MODES,
  DEFAULT_CONSULTATION_MODE,
  normalizeConsultationMode,
  normalizeSlotDurationMinutes,
  getSlotDurationForMode,
  minutesToHHMM,
  getMinutesSinceMidnight,
  parseDateOnly,
  getDefaultWorkingHourForDay,
  getDefaultWorkingHoursForDay,
  getWorkingHoursForDay,
  getWorkingHoursForDate,
  ensureDefaultWorkingHours,
};
