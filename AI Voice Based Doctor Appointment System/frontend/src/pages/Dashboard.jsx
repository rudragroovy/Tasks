import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { HistoryModal } from '../components/ui/history-modal';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { TopHeader } from '../components/ui/top-header';
import { Stethoscope, Mic, FileText, Video, CalendarClock, X, MessageSquare, Phone, PhoneOff, Clock, LayoutDashboard, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDoctorName } from '../utils/doctorName';

const AIVoiceAssistant = lazy(() => import('../components/AIVoiceAssistant'));
const DoctorDashboard = lazy(() => import('./DoctorDashboard'));

export default function Dashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistoryApt, setSelectedHistoryApt] = useState(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [cancelingAppointmentId, setCancelingAppointmentId] = useState(null);
  const [cancelTargetAppointmentId, setCancelTargetAppointmentId] = useState(null);
  const [cancelErrorMessage, setCancelErrorMessage] = useState('');
  const [, setDismissedDeclineRevision] = useState(0);
  const [payingAppointmentId, setPayingAppointmentId] = useState(null);
  
  // Call state
  const [incomingCall, setIncomingCall] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const declineDismissStorageKey = `patient:dismissed_decline_notice:${user?.id || 'anonymous'}`;

  const createDeclineNotice = useCallback((appointment, fallbackDoctorName) => {
    if (!appointment || appointment.status !== 'REJECTED') return null;
    const reason = typeof appointment.declineReason === 'string' ? appointment.declineReason.trim() : '';
    if (!reason) return null;
    return {
      appointmentId: appointment.id,
      doctorName: formatDoctorName(appointment?.doctor?.name || fallbackDoctorName, 'Your doctor'),
      reason
    };
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/api/appointments', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      if(Array.isArray(data)) {
        setAppointments(data);
      }
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
  }, []);

  const dismissedDeclineAppointmentIds = (() => {
    if (!user?.id) return [];
    try {
      const saved = localStorage.getItem(declineDismissStorageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const declineNotice = useMemo(() => {
    if (appointments.length === 0) return null;
    const latestRejected = appointments
      .filter((apt) =>
        apt.status === 'REJECTED' &&
        typeof apt.declineReason === 'string' &&
        apt.declineReason.trim().length > 0 &&
        !dismissedDeclineAppointmentIds.includes(apt.id)
      )
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0];
    return latestRejected ? createDeclineNotice(latestRejected) : null;
  }, [appointments, dismissedDeclineAppointmentIds, createDeclineNotice]);

  useEffect(() => {
    if (!socket) return;
    
    const handleIncomingCall = (data) => {
      setIncomingCall(data);
      setTimeLeft(120);
    };

    const handleAppointmentUpdate = (updatedAppointment) => {
      setAppointments((prev) => {
        const exists = prev.some((apt) => apt.id === updatedAppointment.id);
        if (exists) {
          return prev.map((apt) => (apt.id === updatedAppointment.id ? { ...apt, ...updatedAppointment } : apt));
        }
        return [updatedAppointment, ...prev];
      });
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('appointment:updated', handleAppointmentUpdate);
    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('appointment:updated', handleAppointmentUpdate);
    };
  }, [socket]);

  const handleDeclineCall = useCallback(() => {
    if (!incomingCall) return;
    socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: false });
    setIncomingCall(null);
  }, [incomingCall, socket]);

  useEffect(() => {
    if (!incomingCall) return undefined;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: false });
          setIncomingCall(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [incomingCall, socket]);

  const handleAcceptCall = () => {
    const incomingAppointment = appointments.find((apt) => apt.id === incomingCall?.appointmentId);
    const incomingMode = incomingAppointment?.consultationMode === 'AUDIO' || incomingAppointment?.consultationMode === 'IN_PERSON' || incomingAppointment?.consultationMode === 'VIDEO'
      ? incomingAppointment.consultationMode
      : 'VIDEO';
    socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: true });
    if (incomingMode === 'IN_PERSON') {
      navigate(`/patient/in-person/${incomingCall.appointmentId}`);
      return;
    }
    navigate(`/room/${incomingCall.appointmentId}`);
  };

  const playSuccessSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio context might be blocked, fail silently
    }
  };

  const handleTriageComplete = async (data) => {
    playSuccessSound();
    setIsAIModalOpen(false);
    navigate(`/booking?specialization=${data.suggested_specialization}`, { state: { aiSummary: data } });
  };

  const handleCancelScheduledCall = async (appointmentId) => {
    if (!appointmentId) return;
    setCancelingAppointmentId(appointmentId);
    try {
      const res = await fetch(`http://localhost:5000/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to cancel scheduled call.');
      }

      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, ...payload, status: 'CANCELLED' } : apt
        )
      );
    } catch (err) {
      setCancelErrorMessage(err.message || 'Failed to cancel scheduled call.');
    } finally {
      setCancelingAppointmentId(null);
      setCancelTargetAppointmentId(null);
    }
  };

  const handlePayNow = async (appointment) => {
    const appointmentId = appointment?.id;
    const doctorId = appointment?.doctorId;

    if (!appointmentId || !doctorId) {
      setCancelErrorMessage('Unable to initiate payment for this appointment.');
      return;
    }

    setPayingAppointmentId(appointmentId);

    try {
      const res = await fetch('http://localhost:5000/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          doctorId,
          appointmentId,
          type: appointment?.type || 'ON_DEMAND'
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to create payment session.');
      }
      if (!payload?.url) {
        throw new Error('Payment gateway URL not received.');
      }

      window.location.assign(payload.url);
    } catch (err) {
      setCancelErrorMessage(err.message || 'Failed to start payment.');
      setPayingAppointmentId(null);
    }
  };

  const handleDismissDeclineNotice = () => {
    if (declineNotice?.appointmentId) {
      try {
        const saved = localStorage.getItem(declineDismissStorageKey);
        const parsed = saved ? JSON.parse(saved) : [];
        const existingIds = Array.isArray(parsed) ? parsed : [];
        const nextIds = existingIds.includes(declineNotice.appointmentId)
          ? existingIds
          : [...existingIds, declineNotice.appointmentId];
        localStorage.setItem(declineDismissStorageKey, JSON.stringify(nextIds));
      } catch {
        // Ignore localStorage errors and just refresh derived state
      }
      setDismissedDeclineRevision((prev) => prev + 1);
    }
  };

  if (user?.role === 'DOCTOR') {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm font-semibold text-slate-500">Loading dashboard...</div>}>
        <DoctorDashboard />
      </Suspense>
    );
  }

  if (user?.role === 'ADMIN') {
    navigate('/admin');
    return null;
  }

  const activeAppointments = appointments.filter(a =>
    (a.status === 'PENDING' || a.status === 'ACCEPTED' || a.paymentStatus === 'PENDING_PAYMENT') &&
    a.status !== 'CANCELLED' &&
    a.status !== 'REJECTED' &&
    a.status !== 'COMPLETED'
  );
  const getConsultationMode = (mode) => {
    if (mode === 'AUDIO' || mode === 'IN_PERSON' || mode === 'VIDEO') return mode;
    return 'VIDEO';
  };
  const getConsultationLabel = (mode) => {
    if (mode === 'AUDIO') return 'Audio';
    if (mode === 'IN_PERSON') return 'In-Person';
    return 'Video';
  };
  const getConsultationIcon = (mode) => {
    if (mode === 'AUDIO') return Phone;
    if (mode === 'IN_PERSON') return CalendarClock;
    return Video;
  };
  const isInPersonScheduledConfirmed = (appointment) =>
    getConsultationMode(appointment?.consultationMode) === 'IN_PERSON' &&
    appointment?.type === 'SCHEDULED' &&
    appointment?.paymentStatus === 'PAID';
  const isAppointmentReady = (appointment) =>
    appointment?.status === 'ACCEPTED' || isInPersonScheduledConfirmed(appointment);
  const getWaitingRoomActionText = (mode, status, type, appointment) => {
    if (isInPersonScheduledConfirmed(appointment)) return 'Open In-Person Session';
    if (status !== 'ACCEPTED') {
      if (mode === 'IN_PERSON' && type === 'SCHEDULED') return 'Scheduled Appointment';
      if (mode === 'IN_PERSON') return 'Appointment Details';
      return type === 'SCHEDULED' ? 'Scheduled Appointment' : 'Waiting Room';
    }
    if (type === 'SCHEDULED') return 'Open Scheduled Appointment';
    if (mode === 'AUDIO') return 'Join Audio Call';
    if (mode === 'IN_PERSON') return 'Open In-Person Session';
    return 'Join Video Call';
  };
  const getAppointmentEntryRoute = (appointment) =>
    getConsultationMode(appointment?.consultationMode) === 'IN_PERSON'
      ? `/patient/in-person/${appointment.id}`
      : `/waiting-room?id=${appointment.id}`;
  const incomingCallMode = getConsultationMode(
    appointments.find((apt) => apt.id === incomingCall?.appointmentId)?.consultationMode
  );
  const incomingCallLabel = getConsultationLabel(incomingCallMode);
  const pastAppointments = appointments.filter(a => a.status === 'COMPLETED');
  const scheduledAppointments = appointments.filter(a =>
    a.type === 'SCHEDULED' &&
    a.status !== 'COMPLETED' &&
    a.status !== 'CANCELLED' &&
    a.status !== 'REJECTED'
  );
  const summaryCards = [
    {
      key: 'active',
      label: 'Active Sessions',
      value: activeAppointments.length,
      icon: Activity,
      iconWrap: 'bg-health-50 text-health-700 border-health-100',
      accent: 'from-health-500/15 to-transparent',
    },
    {
      key: 'scheduled',
      label: 'Scheduled',
      value: scheduledAppointments.length,
      icon: CalendarClock,
      iconWrap: 'bg-amber-50 text-amber-700 border-amber-100',
      accent: 'from-amber-500/15 to-transparent',
    },
    {
      key: 'history',
      label: 'Completed',
      value: pastAppointments.length,
      icon: FileText,
      iconWrap: 'bg-primary-50 text-primary-700 border-primary-100',
      accent: 'from-primary-500/15 to-transparent',
    },
  ];

  return (
    <div className="patient-dashboard app-shell min-h-screen xl:h-screen bg-transparent font-sans flex flex-col xl:overflow-hidden">
      {/* Top Application Bar */}
      <TopHeader activeAppointmentsCount={activeAppointments.length} />

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 flex flex-col xl:flex-row gap-6">
        {/* Left Column: Stats + Active Sessions */}
        <div className="flex-1 flex flex-col gap-6 min-w-0 xl:min-h-0">
          
          {/* Dashboard Header Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 shrink-0">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className="app-panel relative overflow-hidden bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm min-h-[94px] sm:min-h-[108px] flex items-center gap-3 sm:gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group"
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r ${card.accent}`} />
                  <div className={`relative z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center shrink-0 ${card.iconWrap}`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="relative z-10 min-w-0">
                    <p className="text-[11px] sm:text-xs text-slate-500 font-black uppercase tracking-wider">{card.label}</p>
                    <p className="text-2xl sm:text-3xl font-heading font-black text-slate-900 leading-none mt-1.5">{card.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {declineNotice && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="app-panel bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-widest text-red-700 mb-1">Appointment Declined</p>
                  <p className="text-sm sm:text-base font-bold text-red-900">
                    {declineNotice.doctorName} declined your consultation request.
                  </p>
                  <p className="text-sm text-red-800 mt-2 break-words">
                    Reason: {declineNotice.reason}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      handleDismissDeclineNotice();
                      navigate('/booking');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    Book Another Doctor
                  </button>
                  <button
                    onClick={handleDismissDeclineNotice}
                    className="w-10 h-10 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center cursor-pointer"
                    aria-label="Dismiss decline notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
             
          {/* Active Appointments Feed */}
          <div className="flex flex-col gap-4 flex-1 xl:overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                   Active Sessions
                </h2>
              </div>
              
              {loading ? (
                <div className="app-panel bg-white border border-slate-200 rounded-3xl p-10 flex justify-center shadow-sm">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : activeAppointments.length === 0 ? (
                <div className="app-panel bg-white border border-slate-200 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                     <CalendarClock className="w-8 h-8 text-slate-400" />
                   </div>
                   <p className="text-base font-bold text-slate-700">No active sessions</p>
                   <p className="text-sm text-slate-500 mt-1 max-w-xs">Use the AI triage or book directly to consult with a doctor.</p>
                </div>
              ) : (
                <div className="flex-1 xl:overflow-y-auto pr-2 pb-4 space-y-4 xl:custom-scrollbar">
                  {activeAppointments.map((apt, idx) => {
                    const mode = getConsultationMode(apt.consultationMode);
                    const ConsultationIcon = getConsultationIcon(mode);
                    const isReady = isAppointmentReady(apt);
                    const requestedTime = new Date(apt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const stateClass = isReady
                      ? (apt.type === 'SCHEDULED'
                        ? 'bg-primary-100 text-primary-700 border border-primary-200'
                        : 'bg-health-100 text-health-700 border border-health-200')
                      : apt.paymentStatus === 'PENDING_PAYMENT'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200';
                    const stateLabel = isReady
                      ? (apt.type === 'SCHEDULED' ? 'Scheduled' : 'Ready')
                      : apt.paymentStatus === 'PENDING_PAYMENT'
                        ? 'Payment Due'
                        : (apt.type === 'SCHEDULED' ? 'Pending' : 'Matching');

                    return (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 25 }}
                        className="group app-panel relative bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_188px_320px] md:min-h-[138px] md:items-center gap-4 md:gap-5 overflow-hidden"
                      >
                        {isReady && apt.type !== 'SCHEDULED' && (
                          <div className="absolute inset-0 bg-gradient-to-r from-health-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}

                        {/* Left: identity block */}
                        <div className="z-10 flex items-start gap-4 min-w-0">
                          <div className="hidden md:block w-1.5 min-h-[70px] self-stretch rounded-full bg-slate-100 relative overflow-hidden shrink-0">
                            <div className={`absolute bottom-0 w-full rounded-full transition-all duration-1000 ${
                              isReady
                                ? (apt.type === 'SCHEDULED'
                                  ? 'h-full bg-primary-500 shadow-[0_0_10px_rgba(14,116,144,0.45)]'
                                  : 'h-full bg-health-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]')
                                : apt.paymentStatus === 'PENDING_PAYMENT'
                                  ? 'h-1/2 bg-amber-500'
                                  : 'h-1/4 bg-primary-500'
                            }`} />
                          </div>

                          <div className="relative shrink-0">
                            <div className={`absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity ${
                              isReady && apt.type !== 'SCHEDULED' ? 'bg-health-400' : 'bg-primary-200'
                            }`} />
                            <img
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${apt.doctor?.name || 'Doctor'}&backgroundColor=0e7490`}
                              alt="Doctor"
                              className="relative w-14 h-14 rounded-full border-4 border-white shadow-sm object-cover bg-slate-50"
                            />
                            {isReady && apt.type !== 'SCHEDULED' && (
                              <span className="absolute bottom-0 right-0 w-4 h-4 bg-health-500 border-2 border-white rounded-full flex items-center justify-center">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-black text-slate-900 text-base sm:text-lg tracking-tight truncate">
                              {formatDoctorName(apt.doctor?.name, apt.doctor?.name)}
                            </h4>
                            <p className="text-sm font-bold text-slate-500 truncate mt-0.5">
                              {apt.doctor?.doctorProfile?.specialization?.name || apt.doctor?.specialization?.name || 'Specialist'}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">
                                {getConsultationLabel(mode)} / {apt.type === 'SCHEDULED' ? 'Scheduled' : 'Consult'}
                              </span>
                              {apt.familyMember && (
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary-600 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-md">
                                  For {apt.familyMember.name}
                                </span>
                              )}
                            </div>

                            <div className="mt-2 md:hidden flex items-center gap-2">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${stateClass}`}>
                                {stateLabel}
                              </span>
                              <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {requestedTime}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: timing/status block */}
                        <div className="hidden md:flex z-10 flex-col justify-center gap-1 border-l border-slate-100 pl-4 w-[188px]">
                          <p className="text-3xl font-heading font-black text-slate-800 leading-none tabular-nums">{requestedTime}</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Requested</p>
                          <span className={`w-fit mt-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${stateClass}`}>
                            {stateLabel}
                          </span>
                        </div>

                        {/* Right: action rail */}
                        <div className="z-10 w-full md:w-[320px] border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5 md:h-full md:flex md:items-center">
                          <div className="flex flex-col gap-2 w-full">
                            {apt.paymentStatus === 'PENDING_PAYMENT' ? (
                              <button
                                onClick={() => handlePayNow(apt)}
                                disabled={payingAppointmentId === apt.id}
                                className="w-full h-11 px-6 bg-slate-900 text-white rounded-xl hover:bg-health-600 shadow-md hover:shadow-health-600/20 text-sm font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {payingAppointmentId === apt.id ? 'Redirecting...' : 'Pay Now'}
                              </button>
                            ) : (
                              <button
                                onClick={() => { playSuccessSound(); navigate(getAppointmentEntryRoute(apt)); }}
                                className={`w-full h-11 px-6 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                                  isReady
                                    ? (apt.type === 'SCHEDULED'
                                      ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/25'
                                      : 'bg-health-500 text-white hover:bg-health-600 shadow-lg shadow-health-500/30')
                                    : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                                }`}
                              >
                                <ConsultationIcon className={`w-4 h-4 ${isReady && apt.type !== 'SCHEDULED' ? 'animate-pulse' : ''}`} />
                                {getWaitingRoomActionText(mode, apt.status, apt.type, apt)}
                              </button>
                            )}

                            {apt.type === 'SCHEDULED' && (
                              <button
                                onClick={() => setCancelTargetAppointmentId(apt.id)}
                                disabled={cancelingAppointmentId === apt.id}
                                className="w-full h-11 px-6 rounded-xl text-sm font-bold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {cancelingAppointmentId === apt.id ? 'Cancelling...' : 'Cancel Scheduled Call'}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

        </div>

        {/* Right Column: Past History Sidebar */}
        <aside className="w-full xl:w-[370px] 2xl:w-[410px] shrink-0 xl:overflow-hidden">
          <div className="app-panel bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 xl:p-6 h-full flex flex-col gap-4 xl:min-h-0">
            <div className="flex items-start justify-between gap-3 shrink-0">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Medical History</h2>
                <p className="text-xs text-slate-500 mt-1">Recent consultations and prescriptions</p>
              </div>
              <button
                onClick={() => navigate('/medical-history')}
                className="px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 text-[11px] font-black uppercase tracking-wide transition-colors shrink-0 cursor-pointer"
              >
                View All
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex justify-center items-center min-h-[180px]">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : pastAppointments.length === 0 ? (
              <div className="flex-1 min-h-[220px] border border-slate-200 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center bg-slate-50/50">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 border border-slate-200">
                  <FileText className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-700">No medical history</p>
                <p className="text-xs text-slate-500 mt-1">Past consultations will appear here.</p>
              </div>
            ) : (
              <div className="flex-1 xl:overflow-y-auto overflow-x-hidden pr-1 pb-1 space-y-3 xl:custom-scrollbar xl:min-h-0">
                {pastAppointments.slice(0, 5).map((apt, idx) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 25 }}
                    onClick={() => setSelectedHistoryApt(apt)}
                    className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-primary-200 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300 cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200 group-hover:bg-primary-500 transition-colors duration-300"></div>

                    <div className="flex justify-between items-start mb-3 pl-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${apt.doctor?.name || 'Doctor'}&backgroundColor=f1f5f9`}
                          alt="Doctor"
                          className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                            {formatDoctorName(apt.doctor?.name, apt.doctor?.name)}
                          </h4>
                          <p className="text-xs font-medium text-slate-500 truncate">
                            {new Date(apt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            {apt.familyMember && <span className="ml-1.5 text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">For {apt.familyMember.name}</span>}
                          </p>
                        </div>
                      </div>

                      {apt.consultation?.prescriptionUrl && (
                        <div
                          className="shrink-0 w-8 h-8 rounded-full bg-health-50 text-health-600 flex items-center justify-center transition-colors"
                          title="Prescription Attached"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="ml-2 bg-slate-50 group-hover:bg-primary-50/50 p-3 rounded-xl border border-slate-100 transition-colors">
                      <p className="text-xs text-slate-600 line-clamp-2 font-medium leading-relaxed">
                        {apt.aiSummary?.primary_symptom || 'General consultation regarding health concerns.'}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {pastAppointments.length > 5 && (
                  <button
                    onClick={() => navigate('/medical-history')}
                    className="w-full py-3 mt-1 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    View More Records
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex justify-around items-end p-3 pb-5 z-40 shadow-lg">
         <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-primary-600 cursor-pointer">
           <LayoutDashboard className="w-5 h-5" />
           <span className="text-[10px] font-bold">Home</span>
         </button>
         <button onClick={() => setIsAIModalOpen(true)} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 relative -top-5 cursor-pointer">
           <div className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white">
             <Mic className="w-6 h-6" />
           </div>
           <span className="text-[10px] font-bold text-slate-500 mt-1">AI Triage</span>
         </button>
         <button onClick={() => navigate('/booking')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 cursor-pointer">
           <Stethoscope className="w-5 h-5" />
           <span className="text-[10px] font-bold">Book</span>
         </button>
      </div>



      {/* Call Incoming Modal */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
           {/* Pulsing avatar */}
           <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-health-400 animate-ping opacity-75"></div>
              <div className="absolute inset-2 rounded-full border-4 border-health-500 animate-pulse"></div>
              
              <div className="absolute inset-4 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden z-10">
                 <img 
                   src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${incomingCall.doctorName || 'Loading'}`} 
                   alt="Doctor" 
                   className="w-full h-full object-cover"
                 />
              </div>
           </div>

           <h2 className="text-white font-heading font-black text-3xl mb-2 text-center animate-pulse flex items-center justify-center gap-2">
             {incomingCallMode === 'AUDIO' ? (
               <Phone className="w-7 h-7" />
             ) : incomingCallMode === 'IN_PERSON' ? (
               <MessageSquare className="w-7 h-7" />
             ) : (
               <Video className="w-7 h-7" />
             )}
             Incoming {incomingCallLabel} Call...
           </h2>
           <p className="text-slate-300 font-medium text-lg text-center mb-10">
             {formatDoctorName(incomingCall.doctorName, incomingCall.doctorName)} is calling you
           </p>

           <div className="flex items-center gap-10">
              <button 
                onClick={handleDeclineCall}
                className="flex flex-col items-center gap-3 group cursor-pointer"
              >
                 <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 group-hover:bg-red-600 transition-colors">
                    <PhoneOff className="w-7 h-7 text-white" />
                 </div>
                 <span className="text-white font-bold tracking-wider uppercase text-xs">Decline</span>
              </button>

              <button 
                onClick={handleAcceptCall}
                className="flex flex-col items-center gap-3 group cursor-pointer"
              >
                 <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/40 group-hover:bg-green-600 transition-colors animate-bounce">
                    <Phone className="w-7 h-7 text-white" />
                 </div>
                 <span className="text-white font-bold tracking-wider uppercase text-xs">Accept</span>
              </button>
           </div>

           {/* Timer */}
           <div className="mt-12 flex items-center gap-2 text-white/50 font-medium">
              <Clock className="w-4 h-4" />
              <span>Auto-declining in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
           </div>
        </div>
      )}

      {selectedHistoryApt && (
        <HistoryModal 
          apt={selectedHistoryApt} 
          onClose={() => setSelectedHistoryApt(null)} 
        />
      )}

      <ConfirmDialog
        open={Boolean(cancelTargetAppointmentId)}
        title="Cancel Scheduled Call?"
        message="This will cancel your scheduled appointment and release the reserved slot."
        confirmText="Yes, Cancel"
        cancelText="Keep Appointment"
        confirmVariant="danger"
        isLoading={cancelingAppointmentId === cancelTargetAppointmentId}
        onConfirm={() => handleCancelScheduledCall(cancelTargetAppointmentId)}
        onCancel={() => {
          if (!cancelingAppointmentId) setCancelTargetAppointmentId(null);
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

      {/* AI Voice Modal - for mobile bottom nav */}
      <AnimatePresence>
        {isAIModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">Loading AI triage...</div>}>
                <AIVoiceAssistant
                  onComplete={handleTriageComplete}
                  onClose={() => setIsAIModalOpen(false)}
                />
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
