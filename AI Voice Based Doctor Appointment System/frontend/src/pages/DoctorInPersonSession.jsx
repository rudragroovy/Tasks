import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, CalendarClock, CheckCircle2, FileText, MessageSquare,
  Pill, Plus, Save, Send, UserRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { formatDoctorName } from '../utils/doctorName';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const emptyMedicine = { name: '', dosage: '', frequency: '', duration: '' };

export default function DoctorInPersonSession() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState([]);
  const [medInput, setMedInput] = useState(emptyMedicine);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const draftInitializedRef = useRef(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (user && user.role !== 'DOCTOR') {
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
          navigate(`/room/${appointmentId}`, { replace: true });
          return;
        }

        setAppointment(data);
        setMessages(Array.isArray(data.messages) ? data.messages : []);

        if (!draftInitializedRef.current) {
          setNotes(data?.consultation?.notes || '');
          setPrescription(Array.isArray(data?.consultation?.prescription) ? data.consultation.prescription : []);
          draftInitializedRef.current = true;
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load in-person session', err);
        setStatusMessage(err?.response?.data?.error || 'Failed to load appointment session.');
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
    const handleIncomingMessage = (msg) => setMessages((prev) => [...prev, msg]);
    socket.on('chat:message', handleIncomingMessage);
    return () => socket.off('chat:message', handleIncomingMessage);
  }, [appointmentId, socket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const patientName = useMemo(
    () => appointment?.familyMember?.name || appointment?.patient?.name || 'Patient',
    [appointment]
  );
  const doctorName = useMemo(
    () => formatDoctorName(appointment?.doctor?.name, appointment?.doctor?.name || 'Doctor'),
    [appointment]
  );
  const isPrimaryDoctor = appointment?.doctorId === user?.id;
  const isCompleted = appointment?.status === 'COMPLETED';

  const getMessageSenderName = (msg) => {
    if (msg?.senderName) return msg.senderName;
    if (msg?.senderId === user?.id) return 'You';
    if (msg?.senderRole === 'PATIENT') return patientName;
    if (msg?.senderRole === 'DOCTOR') return doctorName;
    return 'System';
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !appointment) return;
    socket.emit('chat:send', {
      appointmentId,
      senderId: user.id,
      senderRole: user.role,
      senderName: formatDoctorName(user.name, user.name),
      text: newMessage.trim()
    });
    setNewMessage('');
  };

  const addMedicine = () => {
    if (!medInput.name.trim()) return;
    setPrescription((prev) => [...prev, medInput]);
    setMedInput(emptyMedicine);
  };

  const saveDoctorNotes = async (silent = false) => {
    setSaving(true);
    setStatusMessage('');
    try {
      await axios.post(`${API_URL}/api/appointments/${appointmentId}/notes`,
        { notes, prescription },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (!silent) {
        setStatusMessage('Notes and prescription saved.');
      }
    } catch (err) {
      console.error('Failed to save doctor notes', err);
      setStatusMessage(err?.response?.data?.error || 'Failed to save notes.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteOrSubmit = async () => {
    setCompleting(true);
    setStatusMessage('');
    try {
      if (isPrimaryDoctor) {
        await axios.put(`${API_URL}/api/appointments/${appointmentId}/status`,
          { status: 'COMPLETED', notes, prescription },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
      } else {
        await saveDoctorNotes(true);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to complete in-person consultation', err);
      setStatusMessage(err?.response?.data?.error || 'Unable to complete this consultation right now.');
    } finally {
      setCompleting(false);
    }
  };

  const sessionTime = appointment?.scheduledFor || appointment?.createdAt;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-black text-slate-900">In-Person Session Desk</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Chat and prescription workspace for in-clinic appointments.</p>
            </div>
          </div>
          {appointment && (
            <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 border border-primary-200 w-fit">
              <MessageSquare className="w-3.5 h-3.5" /> In-Person
            </span>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
          {loading ? (
            <p className="text-sm text-slate-500 font-medium">Loading appointment details...</p>
          ) : appointment ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                <UserRound className="w-3.5 h-3.5" /> {patientName}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                <CalendarClock className="w-3.5 h-3.5" /> {new Date(sessionTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                <FileText className="w-3.5 h-3.5" /> {appointment.type === 'SCHEDULED' ? 'Scheduled' : 'Consult Now'}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${
                isCompleted
                  ? 'bg-health-50 text-health-700 border-health-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {isCompleted ? 'Completed' : 'Active'}
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
                <MessageSquare className="w-4 h-4 text-primary-700" /> Live Chat
              </h2>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{messages.length} Messages</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-slate-50/60">
              {messages.length === 0 && (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center">
                  <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-500">No messages yet</p>
                  <p className="text-xs text-slate-400">Start a chat with the patient from here.</p>
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
                        {isMine ? 'You' : getMessageSenderName(msg)}
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
                placeholder="Type a message for patient..."
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
                <FileText className="w-4 h-4 text-health-700" /> Notes & Prescription
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Clinical Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Write observations, diagnosis, and follow-up notes..."
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary-400 resize-y"
                  disabled={isCompleted}
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Prescription</label>
                {prescription.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {prescription.map((med, idx) => (
                      <div key={`${med.name}-${idx}`} className="rounded-xl border border-health-200 bg-health-50 px-3 py-2.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-health-700">{med.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {med.dosage && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-health-200 text-health-700">{med.dosage}</span>}
                            {med.frequency && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-health-200 text-health-700">{med.frequency}</span>}
                            {med.duration && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-health-200 text-health-700">{med.duration}</span>}
                          </div>
                        </div>
                        {!isCompleted && (
                          <button
                            onClick={() => setPrescription((prev) => prev.filter((_, i) => i !== idx))}
                            className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                            aria-label="Remove medicine"
                          >
                            <Plus className="w-4 h-4 rotate-45" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!isCompleted && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                    <input
                      value={medInput.name}
                      onChange={(e) => setMedInput((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Medicine name *"
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={medInput.dosage}
                        onChange={(e) => setMedInput((prev) => ({ ...prev, dosage: e.target.value }))}
                        placeholder="Dosage"
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary-400"
                      />
                      <input
                        value={medInput.frequency}
                        onChange={(e) => setMedInput((prev) => ({ ...prev, frequency: e.target.value }))}
                        placeholder="Frequency"
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary-400"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={medInput.duration}
                        onChange={(e) => setMedInput((prev) => ({ ...prev, duration: e.target.value }))}
                        placeholder="Duration"
                        className="flex-1 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary-400"
                      />
                      <button
                        onClick={addMedicine}
                        disabled={!medInput.name.trim()}
                        className="h-10 px-3 rounded-lg bg-health-600 text-white hover:bg-health-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Pill className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {appointment?.consultation?.prescriptionUrl && (
                <a
                  href={`${API_URL}${appointment.consultation.prescriptionUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                >
                  <FileText className="w-4 h-4" /> View Existing Prescription PDF
                </a>
              )}
            </div>

            <div className="border-t border-slate-100 px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row gap-2">
              {!isCompleted && (
                <button
                  onClick={() => saveDoctorNotes(false)}
                  disabled={saving || completing || loading || !appointment}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Draft'}
                </button>
              )}
              {!isCompleted && (
                <button
                  onClick={handleCompleteOrSubmit}
                  disabled={saving || completing || loading || !appointment}
                  className="h-11 px-4 rounded-xl bg-health-600 text-white hover:bg-health-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> {completing ? 'Processing...' : (isPrimaryDoctor ? 'Complete Appointment' : 'Submit & Leave')}
                </button>
              )}
              {isCompleted && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
