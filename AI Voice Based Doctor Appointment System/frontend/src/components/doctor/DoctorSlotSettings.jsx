import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { BryntumCalendar } from '@bryntum/calendar-react';
import '@bryntum/calendar/fontawesome/css/fontawesome.css';
import '@bryntum/calendar/fontawesome/css/solid.css';
import '@bryntum/calendar/calendar.css';
import '@bryntum/calendar/stockholm-light.css';
import { CalendarClock, RefreshCcw, Save } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INTERVAL = 30;

const CONSULTATION_MODES = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'IN_PERSON', label: 'In Person' },
];

function toDateInputValue(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStart(dateLike) {
  const base = new Date(dateLike);
  if (Number.isNaN(base.getTime())) return new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - base.getDay());
  return base;
}

function getMinutesSinceMidnight(dateLike) {
  const date = new Date(dateLike);
  return date.getHours() * 60 + date.getMinutes();
}

function addMinutes(dateLike, minutes) {
  const date = new Date(dateLike);
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}

function startOfDay(dateLike) {
  const date = new Date(dateLike);
  date.setHours(0, 0, 0, 0);
  return date;
}

function snapMinutes(value, interval, mode = 'nearest') {
  if (mode === 'floor') return Math.floor(value / interval) * interval;
  if (mode === 'ceil') return Math.ceil(value / interval) * interval;
  return Math.round(value / interval) * interval;
}

function normalizeMode(mode) {
  const upper = String(mode || '').toUpperCase();
  return ['VIDEO', 'AUDIO', 'IN_PERSON'].includes(upper) ? upper : 'VIDEO';
}

function normalizeRange(startDate, endDate, intervalMinutes) {
  if (!startDate || !endDate) return null;

  const startDay = startOfDay(startDate);
  const endDay = startOfDay(endDate);
  if (startDay.getTime() !== endDay.getTime()) return null;

  let startMinutes = snapMinutes(getMinutesSinceMidnight(startDate), intervalMinutes, 'floor');
  let endMinutes = snapMinutes(getMinutesSinceMidnight(endDate), intervalMinutes, 'ceil');

  startMinutes = Math.max(0, Math.min(1439, startMinutes));
  endMinutes = Math.max(0, Math.min(1440, endMinutes));

  if (endMinutes <= startMinutes) {
    endMinutes = Math.min(1440, startMinutes + intervalMinutes);
  }
  if (endMinutes <= startMinutes) return null;

  const normalizedStart = new Date(startDay);
  normalizedStart.setMinutes(startMinutes, 0, 0);

  const normalizedEnd = new Date(startDay);
  normalizedEnd.setMinutes(endMinutes, 0, 0);

  return { startDate: normalizedStart, endDate: normalizedEnd };
}

function buildEditableEventsFromWorkingHours(workingHours = [], weekStart) {
  const events = [];

  for (const day of workingHours) {
    const dayOfWeek = Number(day?.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue;

    const activeSegments = (day?.segments || [])
      .filter((segment) => segment?.isActive && Number.isInteger(segment?.startMinutes) && Number.isInteger(segment?.endMinutes))
      .filter((segment) => segment.startMinutes < segment.endMinutes);

    activeSegments.forEach((segment, index) => {
      const start = new Date(weekStart);
      start.setDate(weekStart.getDate() + dayOfWeek);
      start.setMinutes(segment.startMinutes, 0, 0);

      const end = new Date(weekStart);
      end.setDate(weekStart.getDate() + dayOfWeek);
      end.setMinutes(segment.endMinutes, 0, 0);

      events.push({
        id: `slot-${dayOfWeek}-${index}-${segment.startMinutes}-${segment.endMinutes}`,
        name: 'Open slot',
        startDate: start,
        endDate: end,
        cls: 'doctor-open-slot-event',
        isOpenSlot: true,
      });
    });
  }

  return events;
}

function buildWorkingHoursPayloadFromEvents(openEvents, weekStart) {
  const byDay = new Map();
  for (let day = 0; day < 7; day += 1) byDay.set(day, []);

  for (const event of openEvents) {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) continue;

    const dayOffset = Math.round((startOfDay(startDate).getTime() - weekStart.getTime()) / DAY_MS);
    if (dayOffset < 0 || dayOffset > 6) continue;

    byDay.get(dayOffset).push({
      startMinutes: getMinutesSinceMidnight(startDate),
      endMinutes: getMinutesSinceMidnight(endDate),
      isActive: true,
    });
  }

  const workingHours = [];
  for (let day = 0; day < 7; day += 1) {
    const segments = byDay.get(day)
      .filter((segment) => segment.endMinutes > segment.startMinutes)
      .sort((a, b) => (a.startMinutes - b.startMinutes) || (a.endMinutes - b.endMinutes));

    for (let i = 1; i < segments.length; i += 1) {
      if (segments[i].startMinutes < segments[i - 1].endMinutes) {
        const err = new Error(`Slots overlap on day index ${day}.`);
        err.code = 'OVERLAP';
        throw err;
      }
    }

    workingHours.push({
      dayOfWeek: day,
      isActive: segments.length > 0,
      segments,
    });
  }

  return workingHours;
}

export default function DoctorSlotSettings({ scheduledAppointments = [] }) {
  const [consultationMode, setConsultationMode] = useState('VIDEO');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(DEFAULT_INTERVAL);
  const [allowedDurations, setAllowedDurations] = useState([10, 15, 20, 30, 45, 60]);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [openSlotEvents, setOpenSlotEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [savingWeekOverride, setSavingWeekOverride] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMobileViewport, setIsMobileViewport] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false
  ));
  const idCounter = useRef(1);
  const hasLoadedOnceRef = useRef(false);

  const headers = useMemo(() => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  }), []);

  const weekStart = useMemo(() => getWeekStart(calendarDate), [calendarDate]);
  const weekEnd = useMemo(() => addMinutes(new Date(weekStart.getTime() + 7 * DAY_MS), -1), [weekStart]);
  const weekAnchorDate = useMemo(() => toDateInputValue(weekStart), [weekStart]);
  const calendarMode = isMobileViewport ? 'day' : 'week';

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const syncViewport = (event) => {
      setIsMobileViewport(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  const loadSettings = useCallback(async () => {
    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }
    setError('');
    setSuccess('');

    try {
      const [durationRes, hoursRes] = await Promise.all([
        axios.get(`${API_URL}/api/doctors/me/slot-duration?mode=${consultationMode}`, { headers }),
        axios.get(`${API_URL}/api/doctors/me/working-hours?mode=${consultationMode}&date=${weekAnchorDate}`, { headers }),
      ]);

      setSlotDurationMinutes(durationRes.data?.slotDurationMinutes || DEFAULT_INTERVAL);
      setAllowedDurations(durationRes.data?.allowedSlotDurations || [10, 15, 20, 30, 45, 60]);
      setOpenSlotEvents(buildEditableEventsFromWorkingHours(hoursRes.data, weekStart));
      idCounter.current = 1;
    } catch (err) {
      console.error('Failed to load doctor slot settings', err);
      setError(err?.response?.data?.error || 'Failed to load slot settings.');
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
    }
  }, [consultationMode, headers, weekAnchorDate, weekStart]);

  useEffect(() => {
    const init = setTimeout(() => {
      loadSettings();
    }, 0);
    return () => clearTimeout(init);
  }, [loadSettings]);

  const bookedEvents = useMemo(() => (
    (scheduledAppointments || [])
      .filter((apt) => apt?.type === 'SCHEDULED')
      .filter((apt) => !['CANCELLED', 'REJECTED'].includes(apt?.status))
      .filter((apt) => {
        const mode = normalizeMode(apt?.consultationMode || 'VIDEO');
        return mode === consultationMode;
      })
      .map((apt) => {
        const start = new Date(apt.scheduledFor);
        const end = apt.scheduledUntil ? new Date(apt.scheduledUntil) : addMinutes(start, slotDurationMinutes || DEFAULT_INTERVAL);
        const patientName = apt?.familyMember?.name || apt?.patient?.name || 'Booked';
        return {
          id: `booked-${apt.id}`,
          name: `Booked: ${patientName}`,
          startDate: start,
          endDate: end,
          cls: 'doctor-booked-event',
          readOnly: true,
          isBooked: true,
        };
      })
      .filter((event) => event.startDate <= weekEnd && event.endDate >= weekStart)
  ), [consultationMode, scheduledAppointments, slotDurationMinutes, weekEnd, weekStart]);

  const calendarEvents = useMemo(
    () => [...openSlotEvents, ...bookedEvents],
    [bookedEvents, openSlotEvents]
  );

  const upsertOpenSlot = useCallback((rawEvent, existingId = null) => {
    const rawStart = new Date(rawEvent?.startDate);
    const rawEnd = new Date(rawEvent?.endDate);
    const normalized = normalizeRange(rawStart, rawEnd, Number(slotDurationMinutes) || DEFAULT_INTERVAL);

    if (!normalized) return;
    const eventId = existingId || `slot-user-${Date.now()}-${idCounter.current++}`;

    setOpenSlotEvents((prev) => {
      const next = prev.filter((event) => event.id !== eventId);
      next.push({
        id: eventId,
        name: 'Open slot',
        startDate: normalized.startDate,
        endDate: normalized.endDate,
        cls: 'doctor-open-slot-event',
        isOpenSlot: true,
      });
      return next;
    });
  }, [slotDurationMinutes]);

  const deleteOpenSlot = useCallback((slotId) => {
    setOpenSlotEvents((prev) => prev.filter((event) => event.id !== slotId));
  }, []);

  const saveSlotDuration = async () => {
    await axios.put(
      `${API_URL}/api/doctors/me/slot-duration`,
      { mode: consultationMode, slotDurationMinutes: Number(slotDurationMinutes) },
      { headers }
    );
  };

  const saveWorkingHours = async (applyScope) => {
    const workingHours = buildWorkingHoursPayloadFromEvents(openSlotEvents, weekStart);
    await axios.put(
      `${API_URL}/api/doctors/me/working-hours`,
      {
        mode: consultationMode,
        applyScope,
        effectiveDate: weekAnchorDate,
        workingHours,
      },
      { headers }
    );
  };

  const handleSaveWeekly = async () => {
    setSavingWeekly(true);
    setError('');
    setSuccess('');

    try {
      await Promise.all([saveSlotDuration(), saveWorkingHours('weekly')]);
      setSuccess('Weekly slot settings saved.');
      await loadSettings();
    } catch (err) {
      console.error('Failed to save weekly slot settings', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to save weekly slot settings.');
    } finally {
      setSavingWeekly(false);
    }
  };

  const handleSaveCurrentWeek = async () => {
    setSavingWeekOverride(true);
    setError('');
    setSuccess('');

    try {
      await Promise.all([saveSlotDuration(), saveWorkingHours('selected_week')]);
      setSuccess('Selected week slot settings saved.');
      await loadSettings();
    } catch (err) {
      console.error('Failed to save selected week slot settings', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to save selected week slot settings.');
    } finally {
      setSavingWeekOverride(false);
    }
  };

  const handleResetDefaults = async () => {
    setResetting(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(
        `${API_URL}/api/doctors/me/working-hours/defaults`,
        { mode: consultationMode },
        { headers }
      );
      setSuccess('Default working hours restored.');
      await loadSettings();
    } catch (err) {
      console.error('Failed to reset working hours', err);
      setError(err?.response?.data?.error || 'Failed to reset default working hours.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8">
        <p className="text-sm font-semibold text-slate-500">Loading slot settings...</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
      <div>
        <h2 className="text-lg font-heading font-bold text-slate-900 mb-2">Doctor Slot Settings</h2>
        <p className="text-sm text-slate-600">
          Select mode and slot interval, then set availability directly on the calendar.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Consultation Mode</label>
          <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1">
            {CONSULTATION_MODES.map((mode) => {
              const isActive = consultationMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setConsultationMode(mode.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                    isActive
                      ? 'bg-primary-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Slot Interval</label>
          <select
            value={slotDurationMinutes}
            onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800"
          >
            {allowedDurations.map((minutes) => (
              <option key={minutes} value={minutes}>{minutes} minutes</option>
            ))}
          </select>
        </div>
      </div>

      <div className="doctor-schedule-calendar rounded-2xl border border-slate-200 overflow-hidden">
        <BryntumCalendar
          className="doctor-schedule-calendar"
          date={calendarDate}
          mode={calendarMode}
          events={calendarEvents}
          autoCreate
          enableDeleteKey
          eventEditFeature={false}
          eventTooltipFeature
          dragFeature
          onDragCreateEnd={({ eventRecord }) => {
            if (!eventRecord) return;
            upsertOpenSlot(eventRecord);
          }}
          onDragMoveEnd={({ eventRecord }) => {
            if (!eventRecord?.id) return;
            const existing = openSlotEvents.find((event) => event.id === eventRecord.id);
            if (!existing) return;
            upsertOpenSlot(eventRecord, eventRecord.id);
          }}
          onDragResizeEnd={({ eventRecord }) => {
            if (!eventRecord?.id) return;
            const existing = openSlotEvents.find((event) => event.id === eventRecord.id);
            if (!existing) return;
            upsertOpenSlot(eventRecord, eventRecord.id);
          }}
          onEventDblClick={({ eventRecord }) => {
            if (!eventRecord?.id) return;
            const existing = openSlotEvents.find((event) => event.id === eventRecord.id);
            if (!existing) return;
            deleteOpenSlot(eventRecord.id);
          }}
          onBeforeEventDelete={({ eventRecords }) => {
            const removable = (eventRecords || []).filter((record) => openSlotEvents.some((event) => event.id === record.id));
            removable.forEach((record) => deleteOpenSlot(record.id));
            return false;
          }}
          onDateChange={({ date }) => {
            if (date && !Number.isNaN(new Date(date).getTime())) {
              setCalendarDate(new Date(date));
            }
          }}
          height="620px"
        />
      </div>

      <p className="text-xs text-slate-500 font-semibold">
        Drag on calendar to create slots. Drag/resize to adjust. Double-click an open slot to remove.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <button
          type="button"
          onClick={handleSaveWeekly}
          disabled={savingWeekly || savingWeekOverride || resetting}
          className="px-4 py-3 rounded-xl text-sm font-bold text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {savingWeekly ? 'Saving...' : 'Save as Weekly Default'}
        </button>

        <button
          type="button"
          onClick={handleSaveCurrentWeek}
          disabled={savingWeekly || savingWeekOverride || resetting}
          className="px-4 py-3 rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <CalendarClock className="w-4 h-4" />
          {savingWeekOverride ? 'Saving...' : 'Save for Selected Week'}
        </button>
      </div>

      <button
        type="button"
        onClick={handleResetDefaults}
        disabled={savingWeekly || savingWeekOverride || resetting}
        className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 flex items-center gap-2"
      >
        <RefreshCcw className="w-4 h-4" />
        {resetting ? 'Resetting...' : 'Reset Defaults'}
      </button>
    </div>
  );
}
