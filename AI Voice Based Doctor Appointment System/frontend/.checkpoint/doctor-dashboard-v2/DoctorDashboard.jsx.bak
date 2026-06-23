import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users, Clock, CheckCircle, Video, Activity, LayoutDashboard,
  Calendar, Settings, LogOut, Check, X, CalendarClock, Download,
  MessageSquare, Bell, FileText, Zap, TrendingUp, Wifi, PhoneOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import SharedNavbar from '../components/SharedNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAptNotes, setSelectedAptNotes] = useState(null);
  const [selectedAptTab, setSelectedAptTab] = useState('summary');
  const [activeTab, setActiveTab] = useState('queue');
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [deferredInvites, setDeferredInvites] = useState(() => {
    try {
      const saved = localStorage.getItem('deferredInvites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('deferredInvites', JSON.stringify(deferredInvites));
  }, [deferredInvites]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/appointments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setAppointments(res.data);
      } catch (err) {
        console.error('Failed to fetch appointments', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refetch = () =>
      axios.get(`${API_URL}/api/appointments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(res => setAppointments(res.data));
    
    const handleInvite = (data) => {
      setIncomingInvite(data);
      playSuccessSound();
      refetch();
    };
    
    const handleIncomingCall = (data) => {
      setIncomingCall(data);
      setTimeLeft(30);
      playSuccessSound();
    };

    socket.on('appointment:new', refetch);
    socket.on('appointment:updated', refetch);
    socket.on('doctor:invited', handleInvite);
    socket.on('call:incoming', handleIncomingCall);
    
    return () => { 
      socket.off('appointment:new', refetch); 
      socket.off('appointment:updated', refetch); 
      socket.off('doctor:invited', handleInvite);
      socket.off('call:incoming', handleIncomingCall);
    };
  }, [socket]);

  useEffect(() => {
    if (incomingCall && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (incomingCall && timeLeft === 0) {
      setIncomingCall(null);
    }
  }, [incomingCall, timeLeft]);

  const toggleOnline = async () => {
    try {
      const next = !isOnline;
      await axios.put(`${API_URL}/api/doctors/me/online`, { isOnline: next }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsOnline(next);
    } catch (err) { console.error(err); }
  };

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } catch (_) { }
  };

  const updateStatus = async (id, status) => {
    try {
      playSuccessSound();
      await axios.put(`${API_URL}/api/appointments/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const res = await axios.get(`${API_URL}/api/appointments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAppointments(res.data);
      if (status === 'ACCEPTED') setActiveTab('queue');
    } catch (err) { console.error(err); }
  };

  const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;
  const acceptedCount = appointments.filter(a => a.status === 'ACCEPTED').length;

  const weeklyData = [
    { v: 4 }, { v: 7 }, { v: 3 }, { v: 9 }, { v: 5 },
    { v: appointments.length + 1 }, { v: appointments.length + 5 }
  ];

  const queueAppointments = appointments.filter(a =>
    (a.status === 'PENDING' && a.type === 'ON_DEMAND') || a.status === 'ACCEPTED'
  );
  const scheduledAppointments = appointments.filter(a =>
    a.type === 'SCHEDULED' && a.status !== 'COMPLETED' && a.status !== 'REJECTED' && a.status !== 'CANCELLED'
  );
  const historyAppointments = appointments.filter(a =>
    a.status === 'COMPLETED' || a.status === 'REJECTED' || a.status === 'CANCELLED'
  );

  const displayedAppointments =
    activeTab === 'queue' ? queueAppointments :
      activeTab === 'schedule' ? scheduledAppointments :
        historyAppointments;

  const doctorName = user?.name?.startsWith('Dr.') ? user.name : `Dr. ${user?.name || ''}`;

  const navItems = [
    { key: 'queue', icon: LayoutDashboard, label: 'Queue', badge: queueAppointments.length },
    { key: 'schedule', icon: Calendar, label: 'Schedule', badge: scheduledAppointments.length },
    { key: 'history', icon: Clock, label: 'History' },
  ];

  const tabLabels = {
    queue: { title: 'Consultation Queue', sub: 'Live & accepted appointments waiting to start' },
    schedule: { title: 'Scheduled Appointments', sub: 'Upcoming booked appointments' },
    history: { title: 'Patient History', sub: 'Completed and declined sessions' },
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">

      {/* ── Top Nav — matches patient TopHeader exactly ── */}
      <SharedNavbar
        user={user}
        onLogoClick={() => {}}
        navItems={navItems}
        activeTab={activeTab}
        onTabClick={setActiveTab}
        isOnline={isOnline}
        onToggleOnline={toggleOnline}
        pendingCount={pendingCount}
        doctorName={doctorName}
        onLogout={() => logout()}
        showMobileTabs={true}
      />

      {/* ── Main content ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Deferred Invites */}
          {deferredInvites.length > 0 && (
            <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-orange-900">Deferred Consultations</h3>
                  <p className="text-orange-700 text-sm">You told {deferredInvites.length} room(s) you would join shortly.</p>
                </div>
              </div>
              <div className="flex gap-2">
                {deferredInvites.map((invite, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      socket.emit('call:response', { appointmentId: invite.appointmentId, accepted: true });
                      setDeferredInvites(prev => prev.filter((_, idx) => idx !== i));
                      navigate(`/room/${invite.appointmentId}`);
                    }}
                    className="px-4 py-2 bg-white text-orange-700 font-bold text-sm rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors shadow-sm cursor-pointer"
                  >
                    Join {invite.doctorName}'s Room
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Page title — queue tab only */}
          {activeTab === 'queue' && (
            <div>
              <h1 className="text-2xl font-heading font-black text-slate-900">{tabLabels[activeTab].title}</h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">{tabLabels[activeTab].sub}</p>
            </div>
          )}


          {/* ── Stats row — queue tab only ─────────────── */}
          {activeTab === 'queue' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Appointments', value: appointments.length, icon: Users, color: '#0e7490', bg: 'rgba(14,116,144,0.1)', border: 'rgba(14,116,144,0.2)' },
                { label: 'In Queue', value: acceptedCount + queueAppointments.filter(a => a.status === 'PENDING').length, icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
                { label: 'Completed', value: completedCount, icon: CheckCircle, color: '#059669', bg: 'rgba(5,150,105,0.1)', border: 'rgba(5,150,105,0.2)' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, type: 'spring', stiffness: 120 }}
                  className="rounded-2xl p-5 relative overflow-hidden"
                  style={{ background: 'white', border: `1px solid ${stat.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
                >
                  {/* Recharts sparkline bg */}
                  <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyData}>
                        <Area type="monotone" dataKey="v" stroke={stat.color} fill={stat.color} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="relative z-10 flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>{stat.label}</p>
                      <p className="text-4xl font-heading font-black" style={{ color: '#0f172a' }}>{stat.value}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg }}>
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center gap-1 mt-3">
                    <TrendingUp className="w-3 h-3" style={{ color: stat.color }} />
                    <span className="text-[10px] font-bold" style={{ color: stat.color }}>Active this week</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Appointment list ──────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: 'spring' }}
            className="rounded-3xl overflow-hidden"
            style={{ background: 'white', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
          >
            {/* Table header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(248,250,252,0.8)' }}>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-slate-800 text-sm sm:text-base">
                  {activeTab === 'queue' && 'Active Requests'}
                  {activeTab === 'schedule' && 'Upcoming Scheduled'}
                  {activeTab === 'history' && 'Past Consultations'}
                </h2>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(14,116,144,0.1)', color: '#0e7490' }}>
                  {loading ? '…' : displayedAppointments.length}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold" style={{ color: isOnline ? '#059669' : '#94a3b8' }}>
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{isOnline ? 'Live updates on' : 'Offline'}</span>
              </div>
            </div>

            {/* Skeleton */}
            {loading && (
              <div className="p-6 space-y-5">
                {[1, 2].map(i => (
                  <div key={i} className="flex gap-4 items-center animate-pulse">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-slate-100 rounded w-1/3" />
                      <div className="h-2.5 bg-slate-100 rounded w-1/5" />
                    </div>
                    <div className="w-36 h-9 bg-slate-100 rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && displayedAppointments.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(0,0,0,0.04)' }}>
                  {activeTab === 'queue' && <Clock className="w-7 h-7 text-slate-300" />}
                  {activeTab === 'schedule' && <Calendar className="w-7 h-7 text-slate-300" />}
                  {activeTab === 'history' && <CheckCircle className="w-7 h-7 text-slate-300" />}
                </div>
                <h3 className="font-heading font-bold text-slate-600 mb-1">
                  {activeTab === 'queue' && 'Queue is empty'}
                  {activeTab === 'schedule' && 'No pending requests'}
                  {activeTab === 'history' && 'No history yet'}
                </h3>
                <p className="text-slate-400 text-sm font-medium max-w-xs">
                  {activeTab === 'queue' && 'No live or confirmed appointments waiting to start.'}
                  {activeTab === 'schedule' && 'No scheduled appointments awaiting your response.'}
                  {activeTab === 'history' && "You haven't completed any consultations yet."}
                </p>
              </motion.div>
            )}

            {/* List — queue & schedule: row layout; history: card grid */}
            {!loading && activeTab !== 'history' && (
              <AnimatePresence>
                {displayedAppointments.map((apt, idx) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.05, type: 'spring', stiffness: 120 }}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 transition-colors group"
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,116,144,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Patient info — always visible */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${apt.familyMember?.name || apt.patient.name}&backgroundColor=e2e8f0`} alt="Patient" className="w-full h-full" />
                        </div>
                        {apt.type === 'ON_DEMAND' && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white flex items-center justify-center" style={{ background: '#059669' }}>
                            <Activity className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-bold text-slate-900 text-sm sm:text-base truncate">{apt.familyMember?.name || apt.patient.name}</h3>
                        <div className="flex items-center flex-wrap gap-1 sm:gap-1.5 mt-1">
                          {/* Type badge */}
                          <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{
                              background: apt.type === 'ON_DEMAND' ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)',
                              color: apt.type === 'ON_DEMAND' ? '#7c3aed' : '#2563eb'
                            }}>
                            {apt.type === 'ON_DEMAND' ? <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> : <Calendar className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
                            {apt.type === 'ON_DEMAND' ? 'Live' : 'Scheduled'}
                          </span>
                          {/* Status badge */}
                          {apt.status === 'ACCEPTED' && (
                            <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                              <CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Confirmed
                            </span>
                          )}
                          {apt.status === 'COMPLETED' && (
                            <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                              <CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Completed
                            </span>
                          )}
                          {apt.doctorId !== user.id && (
                            <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(234,179,8,0.1)', color: '#ca8a04' }}>
                              <Users className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Invited
                            </span>
                          )}
                          {apt.status === 'REJECTED' && (
                            <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(234,67,53,0.1)', color: '#dc2626' }}>
                              <X className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Declined
                            </span>
                          )}
                          {/* Scheduled time — hide on very small screens */}
                          {apt.scheduledFor && (
                            <span className="hidden sm:flex text-[10px] font-bold items-center gap-1 text-slate-500">
                              <CalendarClock className="w-3 h-3" />
                              {new Date(apt.scheduledFor).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>
                        {/* AI Triage — shown inline under name on mobile, hidden on md+ (shown separately) */}
                        {apt.aiSummary?.suggested_specialization && (
                          <p className="md:hidden text-[10px] text-slate-400 font-medium mt-1 truncate">
                            {apt.aiSummary.suggested_specialization}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* AI Triage chip — only on md+ */}
                    <div className="hidden md:flex flex-col gap-1 px-4 lg:px-6 shrink-0 min-w-[140px] max-w-[200px]">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">AI Triage</p>
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {apt.aiSummary?.suggested_specialization || 'General'}
                      </p>
                      {apt.aiSummary?.summary && (
                        <button
                          onClick={() => setSelectedAptNotes(apt)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all hover:scale-[1.02] w-fit"
                          style={{ background: 'rgba(14,116,144,0.1)', color: '#0e7490', border: '1px solid rgba(14,116,144,0.2)' }}
                        >
                          <Activity className="w-2.5 h-2.5" /> View Notes
                        </button>
                      )}
                    </div>

                    {/* Action buttons — full width on mobile, auto on md+ */}
                    <div className="flex items-center gap-2 shrink-0 w-full md:w-auto flex-wrap">
                      {apt.status === 'PENDING' && apt.doctorId === user.id && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedAptNotes(apt)}
                          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white cursor-pointer transition-all w-full md:w-auto"
                          style={{ background: 'linear-gradient(135deg,#0e7490,#059669)', boxShadow: '0 4px 14px rgba(14,116,144,0.3)' }}
                        >
                          <Activity className="w-4 h-4" /> Review Request
                        </motion.button>
                      )}

                      {apt.status === 'ACCEPTED' && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate(`/room/${apt.id}`)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white cursor-pointer transition-all flex-1 md:flex-none"
                            style={{ background: 'linear-gradient(135deg,#059669,#0e7490)', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}
                          >
                            <Video className="w-4 h-4" /> Join Call
                          </motion.button>
                          {apt.doctorId === user.id && (
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => updateStatus(apt.id, 'COMPLETED')}
                              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all flex-1 md:flex-none"
                              style={{ background: 'rgba(0,0,0,0.05)', color: '#475569', border: '1px solid rgba(0,0,0,0.1)' }}
                            >
                              <CheckCircle className="w-4 h-4" /> <span className="hidden sm:inline">Complete</span>
                            </motion.button>
                          )}
                        </>
                      )}

                      {apt.status === 'COMPLETED' && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate(`/room/${apt.id}`)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all flex-1 md:flex-none"
                            style={{ background: 'rgba(14,116,144,0.08)', color: '#0e7490', border: '1px solid rgba(14,116,144,0.2)' }}
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> View Chat
                          </motion.button>
                          {apt.consultation?.prescriptionUrl && (
                            <motion.a
                              whileHover={{ scale: 1.03 }}
                              href={`${API_URL}${apt.consultation.prescriptionUrl}`}
                              target="_blank" rel="noreferrer"
                              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all flex-1 md:flex-none"
                              style={{ background: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}
                            >
                              <Download className="w-3.5 h-3.5" /> View Rx
                            </motion.a>
                          )}
                        </>
                      )}

                      {apt.status === 'REJECTED' && (
                        <span className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs w-full md:w-auto"
                          style={{ background: 'rgba(234,67,53,0.08)', color: '#dc2626', border: '1px solid rgba(234,67,53,0.15)' }}>
                          <X className="w-3.5 h-3.5" /> Declined
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {/* History tab — patient-style card grid */}
            {!loading && activeTab === 'history' && (
              <div className="p-3 sm:p-6">
                {displayedAppointments.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(0,0,0,0.04)' }}>
                      <CheckCircle className="w-7 h-7 text-slate-300" />
                    </div>
                    <h3 className="font-heading font-bold text-slate-600 mb-1">No history yet</h3>
                    <p className="text-slate-400 text-sm font-medium max-w-xs">Completed and declined consultations will appear here.</p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayedAppointments.map((apt, idx) => (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07, type: 'spring', stiffness: 140 }}
                        onClick={() => apt.aiSummary?.summary && setSelectedAptNotes(apt)}
                        className="group relative bg-white border border-slate-200 rounded-3xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                        style={{ cursor: apt.aiSummary?.summary ? 'pointer' : 'default' }}
                      >
                        {/* Left accent bar — green for completed, red for rejected */}
                        <div
                          className="absolute top-0 left-0 w-1.5 h-full rounded-l-3xl transition-colors duration-300"
                          style={{
                            background: apt.status === 'COMPLETED'
                              ? 'linear-gradient(180deg,#059669,#0e7490)'
                              : '#dc2626'
                          }}
                        />

                        {/* Header row */}
                        <div className="flex items-start justify-between pl-3 mb-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${apt.familyMember?.name || apt.patient.name}&backgroundColor=e2e8f0`}
                              alt={apt.familyMember?.name || apt.patient.name}
                              className="w-10 h-10 rounded-full border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate">{apt.familyMember?.name || apt.patient.name}</h4>
                              <p className="text-[11px] text-slate-400 font-medium">
                                {new Date(apt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          {/* Status + prescription icons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {apt.status === 'COMPLETED' ? (
                              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(5,150,105,0.1)' }}>
                                <CheckCircle className="w-3.5 h-3.5" style={{ color: '#059669' }} />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(234,67,53,0.08)' }}>
                                <X className="w-3.5 h-3.5" style={{ color: '#dc2626' }} />
                              </div>
                            )}
                            {apt.consultation?.prescriptionUrl && (
                              <a
                                href={`http://localhost:5000${apt.consultation.prescriptionUrl}`}
                                target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}
                                title="Download Prescription"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* AI Summary snippet */}
                        <div
                          className="ml-3 p-3 rounded-xl border transition-colors group-hover:border-primary-100 group-hover:bg-primary-50/30"
                          style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
                        >
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 font-medium">
                            {apt.aiSummary?.primary_symptom || apt.aiSummary?.summary || 'General consultation regarding health concerns.'}
                          </p>
                        </div>

                        {/* Type + triage badge row */}
                        <div className="flex items-center gap-2 mt-3 pl-3">
                          <span
                            className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{
                              background: apt.type === 'ON_DEMAND' ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)',
                              color: apt.type === 'ON_DEMAND' ? '#7c3aed' : '#2563eb'
                            }}
                          >
                            {apt.type === 'ON_DEMAND' ? <Zap className="w-2.5 h-2.5" /> : <Calendar className="w-2.5 h-2.5" />}
                            {apt.type === 'ON_DEMAND' ? 'Live' : 'Scheduled'}
                          </span>
                          {apt.aiSummary?.summary && (
                            <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: '#0e7490' }}>
                              <Activity className="w-3 h-3" /> Triage available
                            </span>
                          )}
                          {apt.doctorId !== user.id && (
                            <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: '#ca8a04' }}>
                              <Users className="w-3 h-3" /> Invited Consultation
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* ── AI Triage Modal ───────────────────────────────── */}
      <AnimatePresence>
        {selectedAptNotes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={e => { if (e.target === e.currentTarget) { setSelectedAptNotes(null); setSelectedAptTab('summary'); } }}
            onAnimationStart={() => console.log('DEBUG aiSummary:', selectedAptNotes?.aiSummary)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col"
              style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '85vh' }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5 shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(14,116,144,0.3), rgba(5,150,105,0.2))', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,116,144,0.3)', border: '1px solid rgba(14,116,144,0.4)' }}>
                    <Activity className="w-5 h-5 text-primary-300" />
                  </div>
                  <div>
                    <h2 className="font-heading font-black text-white text-lg">AI Triage Report</h2>
                    <p className="text-slate-400 text-xs font-medium">Patient: {selectedAptNotes.familyMember?.name || selectedAptNotes.patient.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedAptNotes(null); setSelectedAptTab('summary'); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal tabs */}
              <div className="flex shrink-0 px-4 pt-3 gap-1 overflow-x-auto"
                style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['summary', 'chat', 'live_chat'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSelectedAptTab(tab)}
                    className="px-4 py-2.5 rounded-t-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
                    style={{
                      color: selectedAptTab === tab ? '#67e8f9' : '#64748b',
                      borderBottom: selectedAptTab === tab ? '2px solid #0e7490' : '2px solid transparent',
                      marginBottom: '-1px'
                    }}
                  >
                    {tab === 'live_chat' ? 'Live Chat' : tab === 'chat' ? 'AI Triage' : 'Summary'}
                    {tab === 'chat' && selectedAptNotes.aiSummary?.chatHistory?.length > 0 && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(14,116,144,0.25)', color: '#67e8f9' }}>
                        {selectedAptNotes.aiSummary.chatHistory.length}
                      </span>
                    )}
                    {tab === 'live_chat' && selectedAptNotes.messages?.length > 0 && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(14,116,144,0.25)', color: '#67e8f9' }}>
                        {selectedAptNotes.messages.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                {selectedAptTab === 'summary' && (
                  <div className="p-6 space-y-4">
                    {/* Summary card */}
                    <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Activity className="w-3 h-3" /> Clinical Summary
                      </p>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {selectedAptNotes.aiSummary?.summary || 'No summary provided.'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl" style={{ background: 'rgba(14,116,144,0.1)', border: '1px solid rgba(14,116,144,0.2)' }}>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#67e8f9' }}>Specialization</p>
                        <p className="text-white font-bold text-sm">{selectedAptNotes.aiSummary?.suggested_specialization || '—'}</p>
                      </div>
                      <div className="p-4 rounded-2xl" style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-health-400">Assigned Doctor</p>
                        <p className="text-white font-bold text-sm">{selectedAptNotes.aiSummary?.assigned_doctor_name || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedAptTab === 'chat' && (
                  <div className="p-6">
                    {selectedAptNotes.aiSummary?.chatHistory?.length > 0 ? (
                      <div className="space-y-4">
                        {selectedAptNotes.aiSummary.chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 px-1">
                              {msg.role === 'user' ? (selectedAptNotes.familyMember?.name || selectedAptNotes.patient.name) : '🤖 Aria (AI)'}
                            </span>
                            <div
                              className="px-4 py-3 rounded-2xl max-w-[90%] sm:max-w-[85%] text-sm"
                              style={{
                                background: msg.role === 'user' ? 'rgba(14,116,144,0.2)' : 'rgba(255,255,255,0.05)',
                                border: msg.role === 'user' ? '1px solid rgba(14,116,144,0.3)' : '1px solid rgba(255,255,255,0.1)',
                                color: msg.role === 'user' ? '#e2e8f0' : '#94a3b8',
                                borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                                borderBottomLeftRadius: msg.role === 'model' ? '4px' : '16px'
                              }}
                            >
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 flex flex-col items-center text-center">
                        <MessageSquare className="w-12 h-12 text-slate-600 mb-4" />
                        <p className="text-slate-400 font-medium">No triage chat history available for this appointment.</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedAptTab === 'live_chat' && (
                  <div className="p-6">
                    {selectedAptNotes.messages?.length > 0 ? (
                      <div className="space-y-4">
                        {selectedAptNotes.messages.map((msg, idx) => {
                          const isMe = msg.senderId === user?.id;
                          return (
                            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 px-1">
                                {isMe ? 'You' : msg.senderName}
                              </span>
                              <div
                                className="px-4 py-3 rounded-2xl max-w-[90%] sm:max-w-[85%] text-sm"
                                style={{
                                  color: msg.senderRole === 'DOCTOR' ? 'white' : '#cbd5e1',
                                  border: msg.senderRole === 'DOCTOR' ? 'none' : '1px solid rgba(255,255,255,0.08)'
                                }}
                              >
                                {msg.text}
                              </div>
                              <span className={`text-[9px] opacity-50 px-1 ${msg.senderRole === 'DOCTOR' ? 'text-right' : 'text-left'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <MessageSquare className="w-7 h-7 text-slate-600" />
                        </div>
                        <p className="text-slate-400 font-bold text-sm mb-1">No live messages</p>
                        <p className="text-slate-600 text-xs">No text chat was used during this consultation.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal footer (Actions) */}
              {selectedAptNotes.status === 'PENDING' && (
                <div className="flex items-center gap-4 px-6 py-5 shrink-0" style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { updateStatus(selectedAptNotes.id, 'REJECTED'); setSelectedAptNotes(null); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm cursor-pointer transition-all"
                    style={{ background: 'rgba(234,67,53,0.1)', color: '#ef4444', border: '1px solid rgba(234,67,53,0.2)' }}
                  >
                    <X className="w-4 h-4" /> Decline
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { updateStatus(selectedAptNotes.id, 'ACCEPTED'); setSelectedAptNotes(null); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-white cursor-pointer transition-all"
                    style={{ background: 'linear-gradient(135deg,#0e7490,#059669)', boxShadow: '0 4px 14px rgba(14,116,144,0.3)' }}
                  >
                    <Check className="w-4 h-4" /> Accept Patient
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Incoming Invite Toast ─────────────────────────────── */}
      <AnimatePresence>
        {incomingInvite && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] bg-white p-6 rounded-3xl shadow-2xl border border-primary-100 max-w-sm w-full"
            style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 leading-tight">Meeting Invite</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Live Consultation</p>
              </div>
            </div>
            <p className="text-slate-600 mb-6 text-sm font-medium">You have been invited to join an ongoing consultation by another doctor.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setIncomingInvite(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setIncomingInvite(null);
                  navigate(`/room/${incomingInvite.appointmentId}`);
                }}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-transform hover:scale-105 shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #0e7490, #059669)' }}
              >
                <Check className="w-4 h-4" /> Accept & Join
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Call Incoming Toast ─────────────────────────────── */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] bg-white p-6 rounded-3xl shadow-2xl border border-primary-100 max-w-sm w-full"
            style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-health-600 animate-pulse" style={{ background: 'rgba(5,150,105,0.1)' }}>
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 leading-tight">Joining Request</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{incomingCall.doctorName} is waiting</p>
              </div>
            </div>
            <p className="text-slate-600 mb-6 text-sm font-medium">You have been requested to join the consultation.</p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: false });
                    setIncomingCall(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Decline
                </button>
                <button
                  onClick={() => {
                    socket.emit('call:tentative_join', { 
                      appointmentId: incomingCall.appointmentId, 
                      doctorName: user.name || 'Invited Doctor', 
                      delayMinutes: 5 
                    });
                    setDeferredInvites(prev => [...prev, incomingCall]);
                    setIncomingCall(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-orange-100 text-orange-600 font-bold text-sm hover:bg-orange-200 transition-colors cursor-pointer"
                >
                  +5 Mins
                </button>
              </div>
              <button
                onClick={() => {
                  socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: true });
                  navigate(`/room/${incomingCall.appointmentId}`);
                }}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-transform hover:scale-105 shadow-lg shadow-health-500/30 flex items-center justify-center gap-2 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #0e7490, #059669)' }}
              >
                <Check className="w-4 h-4" /> Join Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
