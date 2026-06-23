import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { TopHeader } from '../components/ui/top-header';
import { DoctorCard } from '../components/ui/doctor-card';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, CreditCard, ArrowRight,
  CheckCircle2, ShieldCheck, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';

const CONSULTATION_MODE_OPTIONS = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'IN_PERSON', label: 'In Person' },
];


/* ── Booking Toggle ── */
function BookingToggle({ value, onChange }) {
  const isOnDemand = value === 'ON_DEMAND';
  return (
    <div className="relative p-1.5 rounded-2xl border border-slate-200 bg-white inline-flex gap-1 w-full shadow-sm">
      <motion.div
        className="absolute inset-1.5 rounded-xl"
        style={{ width: 'calc(50% - 6px)' }}
        animate={{ x: isOnDemand ? 0 : 'calc(100% + 4px)' }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div className={`absolute inset-0 rounded-xl ${isOnDemand ? 'bg-gradient-to-r from-primary-600 to-primary-500' : 'bg-gradient-to-r from-health-600 to-health-500'}`} />
      </motion.div>
      <button
        onClick={() => onChange('ON_DEMAND')}
        className={`relative z-10 flex items-center justify-center gap-2 flex-1 py-3 rounded-xl font-heading font-bold text-sm transition-all cursor-pointer ${isOnDemand ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
      >
        Consult Now
      </button>
      <button
        onClick={() => onChange('SCHEDULED')}
        className={`relative z-10 flex items-center justify-center gap-2 flex-1 py-3 rounded-xl font-heading font-bold text-sm transition-all cursor-pointer ${!isOnDemand ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
      >
        Schedule Later
      </button>
    </div>
  );
}

/* ── Schedule Picker ── */
function SchedulePicker({
  date,
  slots,
  selectedSlotStart,
  manualTime,
  slotsLoading,
  slotsError,
  onDateChange,
  onSelectSlot,
  onManualTimeChange,
}) {
  const showManualTimeFallback = Boolean(slotsError) || slots.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="overflow-hidden"
    >
      <div className="pt-3 space-y-3">
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none" size={14} />
            <input
              type="date"
              value={date}
              onChange={e => onDateChange(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="pl-9 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-primary-500/40 outline-none transition-all cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Slots</label>
          {slotsLoading ? (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
              Loading available slots...
            </div>
          ) : slotsError ? (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-600">
              {slotsError}
            </div>
          ) : slots.length === 0 ? (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
              No slots available for the selected date.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {slots.map((slot) => {
                const isSelected = selectedSlotStart === slot.startAt;
                return (
                  <button
                    type="button"
                    key={slot.startAt}
                    disabled={!slot.available}
                    onClick={() => onSelectSlot(slot.startAt)}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all border ${
                      isSelected
                        ? 'border-health-500 bg-health-500 text-white'
                        : slot.available
                          ? 'border-slate-200 bg-white text-slate-700 hover:border-health-400'
                          : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {showManualTimeFallback && (
          <div>
            <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Manual Time</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-health-500 pointer-events-none" size={14} />
              <input
                type="time"
                value={manualTime}
                onChange={(e) => onManualTimeChange(e.target.value)}
                className="pl-9 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-health-500/40 outline-none transition-all cursor-pointer"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-semibold">
              Use manual time when auto slots are unavailable.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ConsultationModePicker({ value, onChange }) {
  return (
    <div>
      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Consultation Type</label>
      <div className="grid grid-cols-3 gap-2">
        {CONSULTATION_MODE_OPTIONS.map((mode) => {
          const isActive = value === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => onChange(mode.value)}
              className={`px-3 py-2 rounded-xl text-xs font-black border transition-all ${
                isActive
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Payment Summary Panel ── */
function PaymentSummary({ doctor, bookingType, consultationMode, scheduledDate, selectedTimeLabel, processingId, onConfirm }) {
  const fee = parseFloat(doctor?.fee || 150);
  const isProcessing = processingId === doctor?.userId;
  const consultationLabel = consultationMode === 'IN_PERSON'
    ? 'In Person'
    : consultationMode === 'AUDIO'
      ? 'Audio'
      : 'Video';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28, delay: 0.1 }}
      className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-primary-400/60 to-transparent" />

      <div className="p-5 space-y-4">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <CreditCard size={11} /> Payment Summary
        </p>

        {/* Booking type indicator */}
        {bookingType === 'ON_DEMAND' ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
            <span className="text-amber-700 text-xs font-bold">Instant {consultationLabel} consultation</span>
          </div>
        ) : (
          scheduledDate && selectedTimeLabel ? (
            <div className="bg-health-50 border border-health-200 rounded-xl px-3.5 py-2.5">
              <span className="text-health-700 text-xs font-bold">{scheduledDate} · {selectedTimeLabel}</span>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
              <span className="text-slate-400 text-xs font-bold">Select a slot above</span>
            </div>
          )
        )}

        {/* Price rows */}
        <div className="space-y-2.5 pt-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Consultation Fee</span>
            <span className="text-slate-900 font-bold">${fee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Platform Fee</span>
            <span className="text-health-600 font-bold">FREE</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <span className="text-slate-800 font-bold text-sm">Total Due</span>
            <span className="font-heading font-black text-2xl text-slate-900">${fee.toFixed(2)}</span>
          </div>
        </div>

        {/* Security */}
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-health-500 shrink-0" />
          <span className="text-slate-400 text-xs">256-bit encrypted · Secured by Stripe</span>
        </div>

        {/* CTA */}
        <motion.button
          onClick={onConfirm}
          disabled={isProcessing}
          whileHover={{ scale: isProcessing ? 1 : 1.01 }}
          whileTap={{ scale: isProcessing ? 1 : 0.98 }}
          className="w-full py-4 rounded-xl font-heading font-black text-white text-sm flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 relative overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #0891B2 0%, #059669 100%)',
            boxShadow: '0 8px 24px rgba(8,145,178,0.2)',
          }}
        >
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all" />
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              Proceed to Payment
              <ArrowRight size={15} />
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Main Page ── */
export default function Booking() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const socket = useSocket();

  const [bookingType, setBookingType] = useState('ON_DEMAND');
  const [consultationMode, setConsultationMode] = useState('VIDEO');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSlotStart, setSelectedSlotStart] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  // Which doctor card is selected for booking
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);

  const specialization = searchParams.get('specialization') || '';
  const aiSummary = location.state?.aiSummary || {};
  const preferredDoctorId =
    searchParams.get('doctorId') ||
    location.state?.selectedDoctorId ||
    aiSummary?.assigned_doctor_id ||
    '';

  const fetchDoctors = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `http://localhost:5000/api/appointments/doctors?specializationName=${specialization}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setDoctors(data);
      setSelectedDoctor((prev) => {
        if (!data.length) return null;
        if (preferredDoctorId) {
          const preferredDoctor = data.find((doc) => doc.userId === preferredDoctorId);
          if (preferredDoctor) return preferredDoctor;
        }
        if (prev && data.some((doc) => doc.userId === prev.userId)) return prev;
        return data[0];
      });
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  }, [specialization, preferredDoctorId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchDoctors();
    socket.on('doctors:updated', handleUpdate);
    return () => socket.off('doctors:updated', handleUpdate);
  }, [socket, fetchDoctors]);

  const handleBookingTypeChange = (nextType) => {
    setBookingType(nextType);
    setSelectedSlotStart('');
    setManualTime('');
  };

  const handleConsultationModeChange = (nextMode) => {
    setConsultationMode(nextMode);
    setSelectedSlotStart('');
    setManualTime('');
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlotStart('');
    setManualTime('');
    setShowDoctorPicker(false);
  };

  const handleDateChange = (nextDate) => {
    setScheduledDate(nextDate);
    setSelectedSlotStart('');
    setManualTime('');
  };

  useEffect(() => {
    const fetchSlots = async () => {
      if (bookingType !== 'SCHEDULED' || !selectedDoctor?.userId || !scheduledDate) {
        setAvailableSlots([]);
        setSlotsError('');
        return;
      }

      setSlotsLoading(true);
      setSlotsError('');

      try {
        const { data } = await axios.get(
          `http://localhost:5000/api/appointments/doctors/${selectedDoctor.userId}/slots?date=${scheduledDate}&mode=${encodeURIComponent(consultationMode)}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );

        setAvailableSlots(Array.isArray(data?.slots) ? data.slots : []);
      } catch (err) {
        console.error('Failed to fetch slots:', err);
        setAvailableSlots([]);
        setSlotsError(err?.response?.data?.error || 'Unable to load slots for selected date.');
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [bookingType, selectedDoctor?.userId, scheduledDate, consultationMode]);

  const selectedSlotLabel =
    availableSlots.find((slot) => slot.startAt === selectedSlotStart)?.label || '';
  const selectedTimeLabel = selectedSlotLabel || manualTime;
  const alternativeDoctors = doctors.filter((doc) => doc.userId !== selectedDoctor?.userId);

  const confirmBooking = async () => {
    if (!selectedDoctor) return;
    if (bookingType === 'SCHEDULED' && (!scheduledDate || (!selectedSlotStart && !manualTime))) {
      alert('Please select a slot or choose a manual time for your scheduled consultation.');
      return;
    }
    setProcessingId(selectedDoctor.userId);
    try {
      let scheduledFor = null;
      if (bookingType === 'SCHEDULED') {
        if (selectedSlotStart) {
          scheduledFor = selectedSlotStart;
        } else {
          const manualDateTime = new Date(`${scheduledDate}T${manualTime}`);
          if (Number.isNaN(manualDateTime.getTime())) {
            alert('Invalid manual date/time selected.');
            setProcessingId(null);
            return;
          }
          scheduledFor = manualDateTime.toISOString();
        }
      }
      let familyMemberId = null;
      if (aiSummary.selectedPatientId && aiSummary.selectedPatientId !== 'self') {
        familyMemberId = aiSummary.selectedPatientId;
      }
      const normalizedAiSummary = {
        ...(aiSummary || {}),
        assigned_doctor_id: selectedDoctor.userId,
        assigned_doctor_name: selectedDoctor.user?.name || '',
      };
      const { data: appointment } = await axios.post(
        'http://localhost:5000/api/appointments',
        {
          doctorId: selectedDoctor.userId,
          aiSummary: normalizedAiSummary,
          type: bookingType,
          consultationMode,
          scheduledFor,
          familyMemberId
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      const { data: session } = await axios.post(
        'http://localhost:5000/api/payments/create-checkout-session',
        { doctorId: selectedDoctor.userId, appointmentId: appointment.id, type: bookingType },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      window.location.href = session.url;
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || 'Failed to initiate booking process.');
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans relative overflow-x-hidden">
      <div className="relative z-40">
        <TopHeader />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-10">

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="w-full lg:w-[400px] shrink-0 h-[400px] rounded-3xl bg-slate-200 animate-pulse" />
            <div className="flex-1 space-y-4">
              <div className="h-14 rounded-2xl bg-slate-200 animate-pulse" />
              <div className="h-36 rounded-2xl bg-slate-200 animate-pulse" />
            </div>
          </div>
        )}

        {/* ── No doctors ── */}
        {!loading && doctors.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-5">
              <AlertCircle className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-heading font-black text-xl text-slate-800 mb-2">No Providers Available</h3>
            <p className="text-slate-400 text-sm max-w-xs">
              {specialization ? `No ${specialization} specialists online right now.` : 'No doctors available. Try again shortly.'}
            </p>
          </motion.div>
        )}

        {/* ── Main split layout ── */}
        {!loading && doctors.length > 0 && selectedDoctor && (
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

            {/* Left — Doctor selector: horizontal scroll on mobile, vertical on desktop */}
            <div className="w-full lg:w-[400px] shrink-0">
              <div className="space-y-3">
                <div className="ring-2 ring-primary-500/60 rounded-3xl">
                  <DoctorCard
                    doctor={selectedDoctor}
                    onBook={() => {}}
                    enableAnimations={false}
                    hideBookButton={true}
                  />
                </div>

                {alternativeDoctors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDoctorPicker((prev) => !prev)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                  >
                    {showDoctorPicker ? 'Hide Other Doctors' : `Change Doctor (${alternativeDoctors.length})`}
                    {showDoctorPicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}

                <AnimatePresence>
                  {showDoctorPicker && alternativeDoctors.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3 max-h-[360px] overflow-y-auto pr-1"
                    >
                      {alternativeDoctors.map((doc) => (
                        <motion.div
                          key={doc.userId}
                          onClick={() => handleDoctorSelect(doc)}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                          className="cursor-pointer opacity-85 hover:opacity-100 transition-opacity"
                        >
                          <DoctorCard
                            doctor={doc}
                            onBook={() => handleDoctorSelect(doc)}
                            enableAnimations={false}
                            hideBookButton={true}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right — Booking options + payment summary */}
            <motion.div
              className="flex-1 space-y-4 lg:sticky lg:top-24"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
            >
              {/* Toggle */}
              <BookingToggle value={bookingType} onChange={handleBookingTypeChange} />

              <ConsultationModePicker
                value={consultationMode}
                onChange={handleConsultationModeChange}
              />

              {/* Schedule picker */}
              <AnimatePresence>
                {bookingType === 'SCHEDULED' && (
                  <SchedulePicker
                    date={scheduledDate}
                    slots={availableSlots}
                    selectedSlotStart={selectedSlotStart}
                    manualTime={manualTime}
                    slotsLoading={slotsLoading}
                    slotsError={slotsError}
                    onDateChange={handleDateChange}
                    onSelectSlot={(startAt) => {
                      setSelectedSlotStart(startAt);
                      setManualTime('');
                    }}
                    onManualTimeChange={(timeValue) => {
                      setManualTime(timeValue);
                      setSelectedSlotStart('');
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Payment summary */}
              <AnimatePresence mode="wait">
                <PaymentSummary
                  key={selectedDoctor.userId}
                  doctor={selectedDoctor}
                  bookingType={bookingType}
                  consultationMode={consultationMode}
                  scheduledDate={scheduledDate}
                  selectedTimeLabel={selectedTimeLabel}
                  processingId={processingId}
                  onConfirm={confirmBooking}
                />
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
