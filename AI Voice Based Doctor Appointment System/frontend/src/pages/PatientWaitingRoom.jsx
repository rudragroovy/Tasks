import React, { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { TopHeader } from '../components/ui/top-header';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDoctorName } from '../utils/doctorName';
import {
  ArrowLeft, Stethoscope, Video, Phone, PhoneOff,
  ShieldCheck, Wifi, CheckCircle2, Loader2, CalendarClock, MessageSquare
} from 'lucide-react';

/* ── Animated pulsing ring ── */
function PulseRing({ color = 'border-health-400' }) {
  return <div className={`absolute inset-0 rounded-full border-2 opacity-40 ${color}`} />;
}

/* ── Step indicator ── */
function StepRow({ icon: Icon, label, sub, active, done }) {
  return (
    <div className={`flex items-center gap-3 p-3 sm:p-4 rounded-2xl transition-all duration-500 ${active ? 'bg-primary-50 border border-primary-100' :
        done ? 'bg-health-50 border border-health-100' :
          'bg-slate-50 border border-slate-100'
      }`}>
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${active ? 'bg-primary-100 text-primary-600' :
          done ? 'bg-health-100 text-health-600' :
            'bg-slate-100 text-slate-400'
        }`}>
        {done ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> :
          active ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5" /> :
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
      </div>
      <div className="min-w-0">
        <p className={`text-xs sm:text-sm font-bold transition-colors duration-300 ${active ? 'text-primary-700' : done ? 'text-health-700' : 'text-slate-400'
          }`}>{label}</p>
        <p className={`text-[10px] sm:text-xs font-medium transition-colors duration-300 ${active ? 'text-primary-500' : done ? 'text-health-500' : 'text-slate-300'
          }`}>{sub}</p>
      </div>
      {active && <div className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-500" />}
      {done && <div className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-health-500" />}
    </div>
  );
}

export default function PatientWaitingRoom() {
  const socket = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('id');

  const [appointment, setAppointment] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [step, setStep] = useState(0); // 0=payment done, 1=assigned, 2=call ready
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelErrorMessage, setCancelErrorMessage] = useState('');
  const consultationMode = appointment?.consultationMode || 'VIDEO';
  const isScheduledAppointment = appointment?.type === 'SCHEDULED';
  const consultationLabel = consultationMode === 'IN_PERSON'
    ? 'In-Person'
    : consultationMode === 'AUDIO'
      ? 'Audio'
      : 'Video';
  const consultationIcon = consultationMode === 'AUDIO'
    ? Phone
    : consultationMode === 'IN_PERSON'
      ? MessageSquare
      : Video;
  const isAppointmentReadyByRule = useCallback((appt) =>
    appt?.status === 'ACCEPTED' ||
    (appt?.type === 'SCHEDULED' && appt?.consultationMode === 'IN_PERSON' && appt?.paymentStatus === 'PAID'), []);

  const handleDecline = useCallback(() => {
    socket.emit('call:response', { appointmentId, doctorId: appointment?.doctorId, accepted: false });
    navigate('/dashboard');
  }, [socket, appointmentId, appointment?.doctorId, navigate]);

  useEffect(() => {
    if (!appointmentId) return;
    const fetchAppointment = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/appointments`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const appt = res.data.find(a => a.id === appointmentId);
        if (appt) {
          setAppointment(appt);
          setStep(isAppointmentReadyByRule(appt) ? 2 : 1);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAppointment();
  }, [appointmentId, isAppointmentReadyByRule]);

  useEffect(() => {
    if (!socket || !appointmentId) return;

    const handleUpdate = (updatedAppt) => {
      if (updatedAppt.id === appointmentId) {
        setAppointment(updatedAppt);
        setStep(isAppointmentReadyByRule(updatedAppt) ? 2 : 1);
        if (updatedAppt.status === 'REJECTED' || updatedAppt.status === 'CANCELLED') {
          navigate('/dashboard');
        }
      }
    };

    const handleIncomingCall = (data) => {
      if (data.appointmentId === appointmentId) {
        setIncomingCall(data);
        setTimeLeft(120);
      }
    };

    socket.on('appointment:updated', handleUpdate);
    socket.on('call:incoming', handleIncomingCall);
    return () => {
      socket.off('appointment:updated', handleUpdate);
      socket.off('call:incoming', handleIncomingCall);
    };
  }, [socket, appointmentId, navigate, isAppointmentReadyByRule]);

  useEffect(() => {
    let timer;
    if (incomingCall && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (incomingCall && timeLeft === 0) {
      handleDecline();
    }
    return () => clearInterval(timer);
  }, [incomingCall, timeLeft, handleDecline]);

  useEffect(() => {
    if (!incomingCall) return undefined;
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      handleDecline();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [incomingCall, handleDecline]);

  const readySessionRoute = consultationMode === 'IN_PERSON'
    ? `/patient/in-person/${appointmentId}`
    : `/room/${appointmentId}`;

  const handleAccept = () => {
    socket.emit('call:response', { appointmentId, doctorId: appointment?.doctorId, accepted: true });
    navigate(readySessionRoute);
  };

  const handleCancelScheduledCall = async () => {
    setIsCancelling(true);
    try {
      const { data } = await axios.put(
        `http://localhost:5000/api/appointments/${appointmentId}/status`,
        { status: 'CANCELLED' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setAppointment(data);
      setShowCancelConfirm(false);
      navigate('/dashboard');
    } catch (err) {
      setShowCancelConfirm(false);
      setCancelErrorMessage(err?.response?.data?.error || 'Failed to cancel scheduled call.');
    } finally {
      setIsCancelling(false);
    }
  };

  const doctorName = formatDoctorName(appointment?.doctor?.name, 'Your Doctor');

  const canCancelScheduledCall =
    appointment?.type === 'SCHEDULED' &&
    appointment?.status !== 'CANCELLED' &&
    appointment?.status !== 'COMPLETED' &&
    appointment?.status !== 'REJECTED';

  const timerPct = (timeLeft / 120) * 100;

  return (
    <div className="bg-slate-50 font-sans flex flex-col relative overflow-hidden" style={{ height: '100dvh' }}>
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary-300 blur-[120px] opacity-20" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-health-300 blur-[120px] opacity-20" />
      </div>

      {/* Header */}
      <div className="relative z-40">
        <TopHeader />
      </div>

      {/* Main — fills remaining dvh height, card scrollable on mobile */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-3 py-3 sm:px-4 sm:py-4 lg:px-8 xl:px-16 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="w-full max-w-md lg:max-w-5xl xl:max-w-6xl flex flex-col min-h-0 flex-1"
          style={{ maxHeight: 'calc(100dvh - 80px)' }}
        >
          {/* ── Outer card shell — vertical on mobile, horizontal on lg+ ── */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden flex flex-col lg:flex-row flex-1 min-h-0">

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                LEFT PANEL  dark / decorative
                mobile: compact top banner strip
                desktop: full left column ~45%
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="relative bg-primary-900 overflow-hidden px-5 sm:px-8 py-4 sm:py-5 lg:w-[45%] lg:shrink-0 lg:flex lg:flex-col lg:p-8 lg:overflow-hidden">
              {/* Glow orbs */}
              <div className="absolute -top-12 -right-12 w-56 h-56 bg-health-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
              <div className="absolute -bottom-14 -left-8 w-48 h-48 bg-primary-500 rounded-full blur-[70px] opacity-25 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-700 rounded-full blur-[100px] opacity-30 pointer-events-none" />

              {/* Top: eyebrow + title + doctor info */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-primary-300 text-xs font-black uppercase tracking-widest">{isScheduledAppointment ? 'Scheduled Appointment' : 'Virtual Waiting Room'}</p>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5 text-health-400" />
                  </div>
                </div>

                {/* Doctor name as primary heading — always visible */}
                <div className="flex items-center gap-3 mt-3">
                  <img
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${appointment?.doctor?.name || 'Doctor'}&backgroundColor=164E63`}
                    alt="Doctor"
                    className="w-10 h-10 rounded-full border-2 border-white/20 object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-heading font-black text-base sm:text-lg lg:text-xl truncate leading-tight">{doctorName}</p>
                    <p className="text-primary-300 text-xs font-medium truncate">{appointment?.doctor?.specialization || 'Specialist'}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${step >= 2
                      ? 'bg-health-500/20 text-health-300 border border-health-500/30'
                      : 'bg-primary-500/20 text-primary-200 border border-primary-400/20'
                    }`}>
                    {step >= 2 ? (isScheduledAppointment ? 'Scheduled' : 'Ready') : 'Pending'}
                  </span>
                </div>

                <div className="mt-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Status line — mobile only */}
                <p className="mt-3 text-primary-200 text-xs sm:text-sm font-medium lg:hidden">
                  {step >= 2
                    ? (isScheduledAppointment
                      ? 'Appointment confirmed and added to doctor schedule.'
                      : 'Doctor accepted, you can join the call.')
                    : 'Reviewing your triage notes...'}
                </p>
              </div>

              {/* Large animated avatar — desktop only */}
              <div className="hidden lg:flex flex-col items-center justify-center flex-1 py-4 relative z-10">
                <div className="relative w-36 h-36">
                  <PulseRing color="border-primary-400" delay={0} />
                  <PulseRing color="border-primary-300" delay={0.7} />
                  <PulseRing color="border-primary-200" delay={1.4} />
                  <div className="absolute inset-5 rounded-full bg-white border-4 border-white/30 shadow-2xl overflow-hidden z-10">
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${appointment?.doctor?.name || 'Doctor'}&backgroundColor=164E63`}
                      alt="Doctor"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div
                    className={`absolute bottom-1 right-1 w-10 h-10 rounded-full border-4 border-primary-900 flex items-center justify-center z-20 shadow-lg ${step >= 2 ? 'bg-health-500' : 'bg-primary-600'
                      }`}
                  >
                    <Video className="w-4 h-4 text-white" />
                  </div>
                </div>

                <p className="mt-4 text-white font-heading font-black text-xl text-center">
                  {doctorName}
                </p>
                <p className="mt-1 text-primary-300 text-xs font-medium text-center max-w-[240px] leading-relaxed">
                  {step >= 2
                    ? (isScheduledAppointment ? 'Confirmed and scheduled' : 'Accepted and ready to join')
                    : 'Reviewing your triage notes...'}
                </p>
              </div>

              {/* Desktop bottom trust note */}
              <div className="hidden lg:flex relative z-10 items-center gap-2 text-primary-400 text-xs font-medium">
                <Wifi className="w-3.5 h-3.5" />
                End-to-end encrypted telemedicine session
              </div>
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                RIGHT PANEL  white / actions
                mobile: body below banner
                desktop: right column (flex-1)
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="flex-1 flex flex-col px-5 sm:px-8 py-4 sm:py-5 lg:p-8 space-y-3 sm:space-y-4 lg:overflow-y-auto min-h-0">

              {/* Mobile avatar — hidden on xs phones, show from sm upward */}
              <div className="hidden sm:flex justify-center lg:hidden">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                  <PulseRing color="border-primary-200" delay={0} />
                  <PulseRing color="border-primary-300" delay={0.7} />
                  <PulseRing color="border-primary-400" delay={1.4} />
                  <div className="absolute inset-4 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden z-10">
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${appointment?.doctor?.name || 'Doctor'}&backgroundColor=f8fafc`}
                      alt="Doctor"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div
                    className={`absolute bottom-1 right-1 w-9 h-9 rounded-full border-4 border-white flex items-center justify-center z-20 shadow-md ${step >= 2 ? 'bg-health-500' : 'bg-primary-600'
                      }`}
                  >
                    <Video className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Desktop section label */}
              <div className="hidden lg:block">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Session Progress</p>
                <h2 className="font-heading font-black text-2xl text-slate-900">Consultation Steps</h2>
              </div>

              {/* Progress steps */}
              <div className="space-y-2.5 lg:flex-1">
                <StepRow
                  icon={ShieldCheck}
                  label="Payment Confirmed"
                  sub="Your appointment is booked"
                  active={false}
                  done={true}
                />
                <StepRow
                  icon={Stethoscope}
                  label={isScheduledAppointment ? 'Appointment Confirmed' : 'Doctor Reviewing Triage'}
                  sub={isScheduledAppointment ? 'Added directly to doctor schedule' : 'Matching with your specialist'}
                  active={!isScheduledAppointment && step < 2}
                  done={step >= 2}
                />
                <StepRow
                  icon={consultationMode === 'AUDIO' ? Phone : (consultationMode === 'IN_PERSON' ? Stethoscope : Video)}
                  label={`${consultationLabel} Session Ready`}
                  sub={isScheduledAppointment ? 'Join at your scheduled time' : 'Join when the doctor accepts'}
                  active={step >= 2}
                  done={false}
                />
              </div>

              {/* CTAs */}
              <div className="space-y-2 sm:space-y-3 lg:mt-auto">
                <AnimatePresence>
                  {step >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    >
                      <button type="button"
                        onClick={() => navigate(readySessionRoute)}
                        className="w-full py-3 sm:py-4 rounded-2xl font-heading font-black text-white text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-lg shadow-health-500/25 hover:shadow-health-500/40 hover:scale-[1.01] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #059669 0%, #06B6D4 100%)' }}
                      >
                        {consultationMode === 'AUDIO'
                          ? <Phone className="w-4 h-4" />
                          : (consultationMode === 'IN_PERSON'
                            ? <MessageSquare className="w-4 h-4" />
                            : <Video className="w-4 h-4" />)}
                        {consultationMode === 'IN_PERSON'
                          ? 'Open In-Person Chat'
                          : `${isScheduledAppointment ? 'Open' : 'Join'} ${consultationLabel} Session`}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl border-2 border-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-50 hover:text-slate-700 hover:border-slate-200 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </button>

                {canCancelScheduledCall && (
                  <button type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={isCancelling}
                    className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl border-2 border-red-100 bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 hover:border-red-200 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isCancelling ? 'Cancelling...' : 'Cancel Scheduled Call'}
                  </button>
                )}
              </div>

              {/* Mobile security note — hidden on very small screens */}
              <div className="hidden sm:flex items-center justify-center gap-2 text-xs font-medium text-slate-400 lg:hidden pb-1">
                <Wifi className="w-3.5 h-3.5" />
                End-to-end encrypted
              </div>
            </div>
          </div>

          {/* Trust badges — mobile only, desktop has them inside left panel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-3 flex lg:hidden items-center justify-center gap-4"
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-health-500" />
              HIPAA Compliant
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Video className="w-3.5 h-3.5 text-primary-500" />
              HD Video Ready
            </div>
          </motion.div>
        </motion.div>
      </main>

      <ConfirmDialog
        open={showCancelConfirm}
        title="Cancel Scheduled Call?"
        message="This will cancel your scheduled appointment and release the reserved slot."
        confirmText="Yes, Cancel"
        cancelText="Keep Appointment"
        confirmVariant="danger"
        isLoading={isCancelling}
        onConfirm={handleCancelScheduledCall}
        onCancel={() => {
          if (!isCancelling) setShowCancelConfirm(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(cancelErrorMessage)}
        title="Unable to Cancel Appointment"
        message={cancelErrorMessage}
        confirmText="OK"
        confirmVariant="primary"
        hideCancel
        onConfirm={() => setCancelErrorMessage('')}
        onCancel={() => setCancelErrorMessage('')}
      />


      {/* ══ Incoming Call Modal ══ */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
            style={{ background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(16px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Incoming consultation call"
          >
            {/* Card-style call UI */}
            <motion.div
              initial={{ scale: 0.85, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center backdrop-blur-sm shadow-2xl"
            >
              {/* Avatar with pulse rings */}
              <div className="relative w-32 h-32 mb-8">
                <PulseRing color="border-health-400" delay={0} />
                <PulseRing color="border-health-300" delay={0.6} />
                <div className="absolute inset-4 rounded-full bg-slate-100 border-4 border-white shadow-xl overflow-hidden z-10">
                  <img
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${incomingCall.doctorName || 'Doctor'}`}
                    alt="Doctor"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-1 right-1 w-8 h-8 bg-health-500 rounded-full border-4 border-slate-900/80 flex items-center justify-center z-20">
                  {React.createElement(consultationIcon, { className: 'w-3.5 h-3.5 text-white' })}
                </div>
              </div>

              {/* Call info */}
              <p className="text-health-400 text-xs font-black uppercase tracking-widest mb-3">
                Incoming {consultationLabel} Call
              </p>
              <h2 className="text-white font-heading font-black text-2xl sm:text-3xl text-center mb-1">
                {formatDoctorName(incomingCall.doctorName, incomingCall.doctorName)}
              </h2>
              <p className="text-slate-400 font-medium text-sm text-center mb-8">
                is calling you for your appointment
              </p>

              {/* Timer arc */}
              <div className="mb-8 flex flex-col items-center gap-2">
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
                    <circle
                      cx="32" cy="32" r="28" fill="none"
                      stroke="#06B6D4"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - timerPct / 100)}`}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-heading font-black text-sm">
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <p className="text-white/40 text-xs font-medium">Auto-declining in</p>
              </div>

              {/* Accept / Decline */}
              <div className="flex items-center gap-8 sm:gap-12">
                <button type="button"
                  onClick={handleDecline}
                  className="flex flex-col items-center gap-3 group cursor-pointer"
                >
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:bg-red-600 transition-colors">
                    <PhoneOff className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white/60 font-bold tracking-wider uppercase text-xs">Decline</span>
                </button>

                <button type="button"
                  onClick={handleAccept}
                  className="flex flex-col items-center gap-3 group cursor-pointer"
                >
                  <div className="w-16 h-16 bg-health-500 rounded-full flex items-center justify-center shadow-lg shadow-health-500/30 group-hover:bg-health-600 transition-colors">
                    <Phone className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white font-bold tracking-wider uppercase text-xs">Accept</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
