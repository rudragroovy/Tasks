import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, CalendarClock, CheckCircle2, Clock, FileText, MessageSquare, Send, UserRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { formatDoctorName } from '../utils/doctorName';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PATIENT_APPOINTMENTS_ROUTE = '/patient/account?tab=medical-history';

export default function PatientInPersonSession() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [appointment, setAppointment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (user && user.role !== 'PATIENT') {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user]);

  useEffect(() => {
    let cancelled = false;

    const loadAppointment = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/appointments/${appointmentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        if (cancelled) return;

        if (data?.consultationMode !== 'IN_PERSON') {
          navigate(`/waiting-room?id=${appointmentId}`, { replace: true });
          return;
        }

        setAppointment(data);
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load in-person appointment', err);
        setStatusMessage(err?.response?.data?.error || 'Unable to load in-person appointment.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAppointment();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, navigate]);

  useEffect(() => {
    if (!socket || !appointmentId) return;
    socket.emit('join_appointment', appointmentId);

    const handleIncomingMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };
    const handleAppointmentUpdate = (updatedAppointment) => {
      if (updatedAppointment.id === appointmentId) {
        setAppointment((prev) => ({ ...(prev || {}), ...updatedAppointment }));
      }
    };

    socket.on('chat:message', handleIncomingMessage);
    socket.on('appointment:updated', handleAppointmentUpdate);
    return () => {
      socket.off('chat:message', handleIncomingMessage);
      socket.off('appointment:updated', handleAppointmentUpdate);
    };
  }, [appointmentId, socket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const doctorName = useMemo(
    () => formatDoctorName(appointment?.doctor?.name, appointment?.doctor?.name || 'Doctor'),
    [appointment]
  );
  const appointmentTime = useMemo(
    () => appointment?.scheduledFor || appointment?.createdAt,
    [appointment]
  );
  const appointmentStatus = useMemo(() => {
    if (appointment?.status === 'COMPLETED') return 'Completed';
    if (appointment?.status === 'ACCEPTED') return 'Active';
    return 'Pending';
  }, [appointment]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    socket.emit('chat:send', {
      appointmentId,
      senderId: user.id,
      senderRole: user.role,
      senderName: user.name,
      text: newMessage.trim()
    });
    setNewMessage('');
  };

  const getSenderLabel = (message) => {
    if (message?.senderId === user?.id) return 'You';
    if (message?.senderRole === 'DOCTOR') return doctorName;
    if (message?.senderRole === 'PATIENT') return 'Patient';
    return message?.senderName || 'System';
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(PATIENT_APPOINTMENTS_ROUTE)}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Back to appointments"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-black text-slate-900">In-Person Appointment</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Chat with your doctor and track prescription updates.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 border border-primary-200 w-fit">
            <MessageSquare className="w-3.5 h-3.5" /> In-Person
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
          {loading ? (
            <p className="text-sm text-slate-500 font-medium">Loading session details...</p>
          ) : appointment ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                <UserRound className="w-3.5 h-3.5" /> {doctorName}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                <CalendarClock className="w-3.5 h-3.5" /> {appointmentTime ? new Date(appointmentTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5" /> {appointment?.type === 'SCHEDULED' ? 'Scheduled' : 'Consult Now'}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${
                appointmentStatus === 'Completed'
                  ? 'bg-health-50 text-health-700 border-health-200'
                  : appointmentStatus === 'Active'
                    ? 'bg-primary-50 text-primary-700 border-primary-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {appointmentStatus}
              </span>
            </div>
          ) : (
            <p className="text-sm text-red-600 font-medium">Appointment not found.</p>
          )}
        </div>

        {statusMessage && (
          <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-4">
          <section className="rounded-2xl border border-slate-200 bg-white flex flex-col min-h-[58vh]">
            <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-heading font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary-700" /> Session Chat
              </h2>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{messages.length} Messages</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-slate-50/60">
              {messages.length === 0 && (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center">
                  <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-500">No messages yet</p>
                  <p className="text-xs text-slate-400">You can chat with your doctor from here.</p>
                </div>
              )}
              {messages.map((msg, idx) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div key={`${msg.id || idx}-${idx}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 border ${
                      isMine
                        ? 'bg-primary-700 text-white border-primary-700 rounded-br-md'
                        : 'bg-white text-slate-700 border-slate-200 rounded-bl-md'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isMine ? 'text-primary-100' : 'text-slate-400'}`}>
                        {getSenderLabel(msg)}
                      </p>
                      <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="border-t border-slate-100 p-3 sm:p-4 flex items-center gap-2 bg-white">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-primary-400"
                disabled={loading || !appointment}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || loading || !appointment}
                className="h-11 px-4 rounded-xl bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white flex flex-col min-h-[58vh]">
            <div className="px-4 sm:px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm sm:text-base font-heading font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-health-700" /> Prescription
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
              {appointment?.consultation?.prescriptionUrl ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-600">
                    Your doctor has shared a prescription for this appointment.
                  </p>
                  <a
                    href={`${API_URL}${appointment.consultation.prescriptionUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Open Prescription PDF
                  </a>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-bold text-slate-600">Prescription not available yet.</p>
                  <p className="text-xs text-slate-500 mt-1">You will see it here once your doctor issues it.</p>
                </div>
              )}

              {appointment?.consultation?.notes && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Consultation Notes</p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">
                    {appointment.consultation.notes}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
