import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { TopHeader } from '../components/ui/top-header';
import { DoctorCard } from '../components/ui/doctor-card';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, CreditCard, ArrowRight,
  CheckCircle2, ShieldCheck, AlertCircle
} from 'lucide-react';


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
function SchedulePicker({ date, time, onDateChange, onTimeChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="overflow-hidden"
    >
      <div className="pt-3 flex gap-3">
        <div className="flex-1">
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
        <div className="flex-1">
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Time</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-health-500 pointer-events-none" size={14} />
            <input
              type="time"
              value={time}
              onChange={e => onTimeChange(e.target.value)}
              className="pl-9 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-health-500/40 outline-none transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Payment Summary Panel ── */
function PaymentSummary({ doctor, bookingType, scheduledDate, scheduledTime, processingId, onConfirm }) {
  const fee = parseFloat(doctor?.fee || 150);
  const isProcessing = processingId === doctor?.userId;

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
            <span className="text-amber-700 text-xs font-bold">Instant — connect within minutes</span>
          </div>
        ) : (
          scheduledDate && scheduledTime ? (
            <div className="bg-health-50 border border-health-200 rounded-xl px-3.5 py-2.5">
              <span className="text-health-700 text-xs font-bold">{scheduledDate} · {scheduledTime}</span>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
              <span className="text-slate-400 text-xs font-bold">Select date &amp; time above</span>
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
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [processingId, setProcessingId] = useState(null);
  // Which doctor card is selected for booking
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const specialization = searchParams.get('specialization') || '';
  const aiSummary = location.state?.aiSummary || {};

  const fetchDoctors = async () => {
    try {
      const { data } = await axios.get(
        `http://localhost:5000/api/appointments/doctors?specializationName=${specialization}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setDoctors(data);
      // Auto-select first doctor
      if (data.length > 0) setSelectedDoctor(data[0]);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoctors(); }, [specialization]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchDoctors();
    socket.on('doctors:updated', handleUpdate);
    return () => socket.off('doctors:updated', handleUpdate);
  }, [socket, specialization]);

  const confirmBooking = async () => {
    if (!selectedDoctor) return;
    if (bookingType === 'SCHEDULED' && (!scheduledDate || !scheduledTime)) {
      alert('Please select a date and time for your scheduled consultation.');
      return;
    }
    setProcessingId(selectedDoctor.userId);
    try {
      let scheduledFor = null;
      if (bookingType === 'SCHEDULED') {
        scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }
      let familyMemberId = null;
      if (aiSummary.selectedPatientId && aiSummary.selectedPatientId !== 'self') {
        familyMemberId = aiSummary.selectedPatientId;
      }
      const { data: appointment } = await axios.post(
        'http://localhost:5000/api/appointments',
        { doctorId: selectedDoctor.userId, aiSummary, type: bookingType, scheduledFor, familyMemberId },
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
      alert('Failed to initiate booking process.');
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
              {/* Mobile: horizontal scroll strip */}
              <div className="flex lg:hidden gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory">
                {doctors.map(doc => (
                  <div
                    key={doc.userId}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`cursor-pointer transition-all duration-200 shrink-0 w-[260px] snap-start ${
                      selectedDoctor.userId === doc.userId ? 'ring-2 ring-primary-500/60 rounded-3xl' : 'opacity-70 hover:opacity-90'
                    }`}
                  >
                    <DoctorCard
                      doctor={doc}
                      onBook={() => setSelectedDoctor(doc)}
                      enableAnimations={false}
                      hideBookButton={true}
                    />
                  </div>
                ))}
              </div>
              {/* Desktop: vertical stack */}
              <div className="hidden lg:flex flex-col space-y-3">
                {doctors.map(doc => (
                  <motion.div
                    key={doc.userId}
                    onClick={() => setSelectedDoctor(doc)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedDoctor.userId === doc.userId ? 'ring-2 ring-primary-500/60 rounded-3xl' : 'opacity-60 hover:opacity-80'
                    }`}
                  >
                    <DoctorCard
                      doctor={doc}
                      onBook={() => setSelectedDoctor(doc)}
                      enableAnimations={false}
                      hideBookButton={true}
                    />
                  </motion.div>
                ))}
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
              <BookingToggle value={bookingType} onChange={setBookingType} />

              {/* Schedule picker */}
              <AnimatePresence>
                {bookingType === 'SCHEDULED' && (
                  <SchedulePicker
                    date={scheduledDate}
                    time={scheduledTime}
                    onDateChange={setScheduledDate}
                    onTimeChange={setScheduledTime}
                  />
                )}
              </AnimatePresence>

              {/* Payment summary */}
              <AnimatePresence mode="wait">
                <PaymentSummary
                  key={selectedDoctor.userId}
                  doctor={selectedDoctor}
                  bookingType={bookingType}
                  scheduledDate={scheduledDate}
                  scheduledTime={scheduledTime}
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
