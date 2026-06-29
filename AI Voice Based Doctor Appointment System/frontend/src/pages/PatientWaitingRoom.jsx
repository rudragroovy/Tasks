import React, { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import LandingNavbar from '../components/LandingNavbar';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDoctorName } from '../utils/doctorName';
import { getPractitionerTypeLabel } from '../utils/doctorConsultation';
import {
  ArrowLeft, Stethoscope, Video, Phone, PhoneOff,
  ShieldCheck, Wifi, CheckCircle2, Loader2, CalendarClock, MessageSquare
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GENERAL_QUEUE_WAIT_MINUTES = 30;
const PATIENT_APPOINTMENTS_ROUTE = '/patient/account?tab=medical-history';

function parseAppointmentAiSummary(appointment) {
  const raw = appointment?.aiSummary;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getQueueType(appointment) {
  const summary = parseAppointmentAiSummary(appointment);
  return String(summary?.queueType || '').trim().toUpperCase() || 'DOCTOR_SPECIFIC';
}

function isAutoGeneralEligible(appointment) {
  if (!appointment) return false;
  if (appointment.type !== 'ON_DEMAND') return false;
  if (appointment.status !== 'PENDING') return false;
  if (appointment.paymentStatus !== 'PAID') return false;
  const createdAt = new Date(appointment.createdAt || 0);
  if (Number.isNaN(createdAt.getTime())) return false;
  const threshold = Date.now() - GENERAL_QUEUE_WAIT_MINUTES * 60 * 1000;
  return createdAt.getTime() <= threshold;
}

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
  const [isMovingToGeneral, setIsMovingToGeneral] = useState(false);
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
  const queueType = getQueueType(appointment);
  const isGeneralQueue = queueType === 'GENERAL' || isAutoGeneralEligible(appointment);
  const isAppointmentReadyByRule = useCallback((appt) =>
    appt?.status === 'ACCEPTED' ||
    (appt?.type === 'SCHEDULED' && appt?.consultationMode === 'IN_PERSON' && appt?.paymentStatus === 'PAID'), []);

  const handleDecline = useCallback(() => {
    socket.emit('call:response', { appointmentId, doctorId: appointment?.doctorId, accepted: false });
    navigate(PATIENT_APPOINTMENTS_ROUTE);
  }, [socket, appointmentId, appointment?.doctorId, navigate]);

  useEffect(() => {
    if (!appointmentId) return;
    const fetchAppointment = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/appointments`, {
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
          navigate(PATIENT_APPOINTMENTS_ROUTE);
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
        `${API_URL}/api/appointments/${appointmentId}/status`,
        { status: 'CANCELLED' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setAppointment(data);
      setShowCancelConfirm(false);
      navigate(PATIENT_APPOINTMENTS_ROUTE);
    } catch (err) {
      setShowCancelConfirm(false);
      setCancelErrorMessage(err?.response?.data?.error || 'Failed to cancel scheduled call.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleMoveToGeneralQueue = async ({ silent = false } = {}) => {
    if (!appointmentId || isMovingToGeneral) return;
    setIsMovingToGeneral(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/appointments/${appointmentId}/move-to-general`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setAppointment(data);
    } catch (err) {
      if (!silent) {
        setCancelErrorMessage(err?.response?.data?.error || 'Failed to move request to general waiting room.');
      }
    } finally {
      setIsMovingToGeneral(false);
    }
  };

  const doctorName = formatDoctorName(appointment?.doctor?.name, 'Your Doctor');

  const canCancelRequest =
    appointment?.status !== 'CANCELLED' &&
    appointment?.status !== 'COMPLETED' &&
    appointment?.status !== 'REJECTED';

  const canMoveToGeneralQueue =
    appointment?.type === 'ON_DEMAND' &&
    appointment?.status === 'PENDING' &&
    appointment?.paymentStatus === 'PAID' &&
    !isGeneralQueue;

  useEffect(() => {
    if (!appointment) return;
    if (getQueueType(appointment) === 'GENERAL') return;
    if (!isAutoGeneralEligible(appointment)) return;
    handleMoveToGeneralQueue({ silent: true });
  }, [appointment?.id, appointment?.status, appointment?.paymentStatus, appointment?.createdAt]);

  const timerPct = (timeLeft / 120) * 100;

  return (
    <div className="bg-white font-sans flex flex-col relative overflow-hidden" style={{ height: '100dvh' }}>

      {/* Header */}
      <div className="relative z-40">
        <LandingNavbar />
      </div>

      {/* Main — fills remaining dvh height, card scrollable on mobile */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 pb-6 pt-24 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="mx-auto w-full max-w-6xl"
        >
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-8 sm:py-8">
            <div className="mx-auto mb-8 flex w-fit max-w-full items-center gap-2 rounded-lg bg-primary-900 px-3 py-2 text-xs font-semibold text-white">
              <CalendarClock className="h-3.5 w-3.5 text-cyan-300" />
              <span>
                {isGeneralQueue
                  ? "You're in general queue and will be seen shortly. You'll be notified when any doctor is ready."
                  : "You're in queue and will be seen shortly. You'll be notified when doctor is ready."}
              </span>
            </div>

            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="relative h-28 w-28">
                <PulseRing color="border-primary-300" />
                <div className="absolute inset-[10px] overflow-hidden rounded-full border-[3px] border-primary-200 bg-white shadow-md">
                  <img
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${appointment?.doctor?.name || 'Doctor'}&backgroundColor=eff6ff`}
                    alt="Doctor"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <h2 className="mt-4 text-3xl font-black leading-tight text-slate-900">
                {step >= 2 ? 'Session Ready' : 'Waiting For Doctor...'}
              </h2>
              <p className="mt-1 text-base font-bold text-primary-700">
                {doctorName} {step >= 2 ? 'is ready to consult now' : 'is currently online'}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {consultationLabel} consultation {isScheduledAppointment ? '(Scheduled)' : '(On demand)'}
              </p>
            </div>

            <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-3">
              {canCancelRequest && (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={isCancelling}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Request'}
                </button>
              )}

              {canMoveToGeneralQueue && (
                <button
                  type="button"
                  onClick={() => handleMoveToGeneralQueue()}
                  disabled={isMovingToGeneral}
                  className="rounded-xl bg-primary-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isMovingToGeneral ? 'Moving...' : 'Move to General Waiting Room'}
                </button>
              )}

              {step >= 2 && (
                <button
                  type="button"
                  onClick={() => navigate(readySessionRoute)}
                  className="rounded-xl bg-gradient-to-r from-health-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-cyan-500/20 transition hover:brightness-105"
                >
                  {consultationMode === 'IN_PERSON'
                    ? 'Open In-Person Chat'
                    : `${isScheduledAppointment ? 'Open' : 'Join'} ${consultationLabel} Session`}
                </button>
              )}
            </div>

            <div className="mx-auto mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => navigate(PATIENT_APPOINTMENTS_ROUTE)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to My Appointments
              </button>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  icon: CheckCircle2,
                  iconClass: 'text-amber-500',
                  title: 'Request Acceptance',
                  description: `${doctorName} will join you shortly.`,
                },
                {
                  icon: Stethoscope,
                  iconClass: 'text-cyan-600',
                  title: 'Consultation',
                  description: 'Your doctor will conduct your consultation session.',
                },
                {
                  icon: Video,
                  iconClass: 'text-blue-600',
                  title: 'Telehealth Session',
                  description: 'Connect with your doctor online to discuss your concerns.',
                },
                {
                  icon: CalendarClock,
                  iconClass: 'text-primary-700',
                  title: 'Reassign to Available Doctor',
                  description: "If there's no response in 30 minutes, we move your request to available doctors.",
                },
                {
                  icon: ShieldCheck,
                  iconClass: 'text-emerald-600',
                  title: 'Cancellation & Refund',
                  description: 'If no doctor is available, your request can be cancelled with refund support.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                    <item.icon className={`h-3.5 w-3.5 ${item.iconClass}`} />
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-5 text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      <ConfirmDialog
        open={showCancelConfirm}
        title="Cancel Request?"
        message={isScheduledAppointment
          ? 'This will cancel your scheduled appointment and release the reserved slot.'
          : 'This will cancel your consultation request.'}
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
