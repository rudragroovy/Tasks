import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, Clock, CheckCircle, Video, Activity, LayoutDashboard, Calendar, Settings, LogOut, Check, X, CalendarClock, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  
  const [isOnline, setIsOnline] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAptNotes, setSelectedAptNotes] = useState(null);
  const [selectedAptTab, setSelectedAptTab] = useState('summary'); // 'summary' | 'chat'

  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'schedule', 'history'

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/appointments', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setAppointments(res.data);
      } catch (err) {
        console.error("Failed to fetch appointments", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('appointment:new', (newAppt) => {
      axios.get('http://localhost:5000/api/appointments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => setAppointments(res.data));
    });
    socket.on('appointment:updated', (updatedAppt) => {
       axios.get('http://localhost:5000/api/appointments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => setAppointments(res.data));
    });
    return () => {
      socket.off('appointment:new');
      socket.off('appointment:updated');
    };
  }, [socket]);

  const toggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      await axios.put('http://localhost:5000/api/doctors/me/online', { isOnline: newStatus }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setIsOnline(newStatus);
    } catch (err) {
      console.error("Failed to toggle online status", err);
    }
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
    } catch (e) {
      // Audio context might be blocked, fail silently
    }
  };

  const updateStatus = async (id, status, aptType) => {
    try {
      playSuccessSound();
      await axios.put(`http://localhost:5000/api/appointments/${id}/status`, { status }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      // Re-fetch so UI reflects the new status immediately
      const res = await axios.get('http://localhost:5000/api/appointments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setAppointments(res.data);
      // For ACCEPTED appointments: move to Queue tab so doctor can join when ready
      if (status === 'ACCEPTED') {
        setActiveTab('queue');
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;

  const stats = [
    { label: 'Total Consultations', value: appointments.length.toString(), icon: Users, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-100' },
    { label: 'Pending Requests', value: pendingCount.toString(), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'Completed', value: completedCount.toString(), icon: CheckCircle, color: 'text-health-600', bg: 'bg-health-50', border: 'border-health-100' },
  ];

  const weeklyData = [
    { name: 'Mon', val: 4 },
    { name: 'Tue', val: 7 },
    { name: 'Wed', val: 3 },
    { name: 'Thu', val: 9 },
    { name: 'Fri', val: 5 },
    { name: 'Sat', val: appointments.length + 1 },
    { name: 'Sun', val: appointments.length + 5 },
  ];

  // ─── Tab filters ────────────────────────────────────────────────────────────
  // Queue: live ON_DEMAND requests (pending) + ALL accepted appointments waiting to start
  const queueAppointments = appointments.filter(a =>
    (a.status === 'PENDING' && a.type === 'ON_DEMAND') ||
    a.status === 'ACCEPTED'
  );
  // Schedule: only PENDING scheduled appointments awaiting accept/decline
  const scheduledAppointments = appointments.filter(a =>
    a.type === 'SCHEDULED' && a.status === 'PENDING'
  );
  const historyAppointments = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'REJECTED');

  const getDisplayedAppointments = () => {
    if (activeTab === 'queue') return queueAppointments;
    if (activeTab === 'schedule') return scheduledAppointments;
    if (activeTab === 'history') return historyAppointments;
    return [];
  };

  const displayedAppointments = getDisplayedAppointments();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-primary-900 text-white flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          <div className="p-6">
             <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center relative overflow-hidden">
                   <div className="absolute w-4 h-4 bg-primary-900 top-0 left-0 rounded-br-md" />
                   <div className="absolute w-4 h-4 bg-health-500 bottom-0 right-0 rounded-tl-md" />
                </div>
                <span className="font-heading font-black text-white text-xl tracking-tight">MyDrScripts</span>
             </div>
             <p className="text-primary-300 text-xs font-medium uppercase tracking-wider ml-10">Provider Portal</p>
          </div>

          <nav className="mt-8 px-4 space-y-2">
            <button 
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors cursor-pointer ${activeTab === 'queue' ? 'bg-white/10 text-white' : 'text-primary-200 hover:text-white hover:bg-white/5'}`}
            >
               <LayoutDashboard className="w-5 h-5" /> Queue
            </button>
            <button 
              onClick={() => setActiveTab('schedule')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors cursor-pointer ${activeTab === 'schedule' ? 'bg-white/10 text-white' : 'text-primary-200 hover:text-white hover:bg-white/5'}`}
            >
               <Calendar className="w-5 h-5" /> Schedule
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors cursor-pointer ${activeTab === 'history' ? 'bg-white/10 text-white' : 'text-primary-200 hover:text-white hover:bg-white/5'}`}
            >
               <Clock className="w-5 h-5" /> Patient History
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-primary-200 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors cursor-pointer">
               <Settings className="w-5 h-5" /> Settings
            </button>
          </nav>
        </div>

        <div className="p-4">
          <div className="bg-primary-800 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-16 h-16 bg-health-500 rounded-full blur-[30px] opacity-20"></div>
             <div className="flex items-center gap-3 relative z-10">
               <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=100&auto=format&fit=crop" alt="Dr" className="w-10 h-10 rounded-full object-cover border-2 border-white/20" />
               <div className="overflow-hidden">
                 <p className="text-sm font-bold font-heading truncate text-white">
                   {user?.name?.startsWith('Dr.') ? user?.name : `Dr. ${user?.name || ''}`}
                 </p>
                 <p className="text-xs text-primary-300 truncate">Specialist</p>
               </div>
             </div>
             <button onClick={logout} className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
               <LogOut className="w-4 h-4" /> Sign Out
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-primary-200 blur-[120px] pointer-events-none opacity-20"></div>

        <header className="bg-white/70 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex items-center justify-between z-10 shrink-0">
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-800">
              {activeTab === 'queue' && 'Consultation Queue'}
              {activeTab === 'schedule' && 'Scheduled Appointments'}
              {activeTab === 'history' && 'Patient History'}
            </h1>
            <p className="text-sm text-slate-500 font-medium">Manage your active and upcoming appointments</p>
          </div>
          
          <div className="flex items-center gap-4">
             <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleOnline}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors duration-300 cursor-pointer border shadow-sm ${
                  isOnline 
                    ? 'bg-health-50 border-health-200 text-health-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="relative flex items-center justify-center w-2 h-2">
                   {isOnline && <span className="absolute inline-flex h-full w-full rounded-full bg-health-500 opacity-75 animate-ping"></span>}
                   <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-health-500' : 'bg-slate-400'}`}></span>
                </div>
                {isOnline ? 'ACCEPTING PATIENTS' : 'OFFLINE'}
              </motion.button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 z-10">
          
          {/* Stats Cards with Recharts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
                key={index} 
                className={`bg-white rounded-3xl p-6 border shadow-sm flex flex-col relative overflow-hidden group cursor-default ${stat.border}`}
              >
                {/* Recharts Background Mini Graph */}
                <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 pointer-events-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <Area type="monotone" dataKey="val" stroke="#0891B2" fill="#0891B2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                </div>
                <p className="text-4xl font-heading font-black text-slate-800 relative z-10">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Queue List */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <h2 className="text-lg font-heading font-bold text-slate-800">
                 {activeTab === 'queue' && 'Active Requests'}
                 {activeTab === 'schedule' && 'Upcoming Scheduled'}
                 {activeTab === 'history' && 'Past Consultations'}
               </h2>
               <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-1 rounded-md">
                 {loading ? '...' : displayedAppointments.length} records
               </span>
            </div>
            
            <div className="divide-y divide-slate-100 relative">
              
              {/* Skeleton Loader */}
              {loading && (
                <div className="p-6 space-y-6">
                  {[1, 2].map(i => (
                    <div key={i} className="flex gap-4 items-center animate-pulse">
                      <div className="w-14 h-14 bg-slate-200 rounded-2xl"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-3 bg-slate-100 rounded w-1/6"></div>
                      </div>
                      <div className="w-32 h-10 bg-slate-200 rounded-xl"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Animated List */}
              {!loading && (
                <AnimatePresence>
                  {displayedAppointments.map(apt => (
                    <motion.div 
                      key={apt.id} 
                      initial={{ opacity: 0, height: 0, backgroundColor: "#F0FDFA" }}
                      animate={{ opacity: 1, height: "auto", backgroundColor: "#ffffff" }}
                      exit={{ opacity: 0, scale: 0.95, x: -20 }}
                      transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
                      className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row items-center justify-between gap-6 group origin-left"
                    >
                       <div className="flex items-center gap-4 w-full md:w-auto">
                         <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                               <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${apt.patient.name}`} alt="Patient" />
                            </div>
                            {apt.type === 'ON_DEMAND' && (
                               <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-health-500 border-2 border-white rounded-full flex items-center justify-center">
                                  <Activity className="w-3 h-3 text-white" />
                               </div>
                            )}
                         </div>
                         <div>
                           <h3 className="font-heading font-bold text-slate-900 text-lg">{apt.patient.name}</h3>
                           <div className="flex items-center gap-2 mt-1">
                               {apt.status === 'ACCEPTED' && apt.type === 'SCHEDULED' ? (
                                 <>
                                   <span className="flex items-center gap-1 text-xs font-bold text-health-700 bg-health-50 px-2 py-1 rounded-md border border-health-200">
                                     <CheckCircle className="w-3 h-3" /> Confirmed
                                   </span>
                                   <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                     <CalendarClock className="w-3 h-3" /> {new Date(apt.scheduledFor).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                   </span>
                                 </>
                               ) : apt.type === 'SCHEDULED' ? (
                                 <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                   <CalendarClock className="w-3 h-3" /> {new Date(apt.scheduledFor).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                 </span>
                               ) : (
                                 <span className="flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                                   <Activity className="w-3 h-3" /> LIVE REQUEST
                                 </span>
                               )}
                           </div>
                         </div>
                       </div>

                       <div className="flex-1 w-full md:w-auto md:px-8">
                         <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 inline-block w-full">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">AI Triage Match</p>
                            <p className="text-sm font-medium text-slate-700 mb-3">
                              {apt.aiSummary?.suggested_specialization || 'General Consultation Recommended'}
                            </p>
                            {apt.aiSummary?.summary && (
                              <button 
                                onClick={() => setSelectedAptNotes(apt)}
                                className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 transition-colors flex items-center gap-1.5"
                              >
                                <Activity className="w-3 h-3" /> View AI Triage Notes
                              </button>
                            )}
                         </div>
                       </div>

                       <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                         {apt.status === 'PENDING' && (
                            <>
                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => updateStatus(apt.id, 'REJECTED')} 
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 rounded-xl font-bold text-sm transition-all cursor-pointer"
                              >
                                <X className="w-4 h-4" /> Decline
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => updateStatus(apt.id, 'ACCEPTED')} 
                                className="flex items-center gap-2 px-6 py-2.5 bg-primary-900 hover:bg-primary-800 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-primary-900/20 cursor-pointer"
                              >
                                <Check className="w-4 h-4" /> Accept Patient
                              </motion.button>
                            </>
                         )}
                         {apt.status === 'ACCEPTED' && (
                            <>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(`/room/${apt.id}`)} 
                                className="flex items-center gap-2 px-6 py-3 bg-health-600 hover:bg-health-700 text-white rounded-xl font-bold transition-all shadow-md shadow-health-600/20 cursor-pointer w-full md:w-auto justify-center"
                              >
                                <Video className="w-5 h-5" /> Join Video Call
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => updateStatus(apt.id, 'COMPLETED')} 
                                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all shadow-md shadow-slate-800/20 cursor-pointer w-full md:w-auto justify-center"
                              >
                                <CheckCircle className="w-5 h-5" /> Mark Completed
                              </motion.button>
                            </>
                         )}
                         {apt.status === 'COMPLETED' && (
                           <>
                             {apt.consultation?.prescriptionUrl && (
                               <motion.a 
                                 whileHover={{ scale: 1.05 }}
                                 whileTap={{ scale: 0.95 }}
                                 href={`http://localhost:5000${apt.consultation.prescriptionUrl}`}
                                 target="_blank"
                                 rel="noreferrer"
                                 className="flex items-center gap-2 px-4 py-2 bg-white border border-health-200 text-health-700 hover:bg-health-50 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer"
                               >
                                 <Download className="w-4 h-4" /> View Rx
                               </motion.a>
                             )}
                             <span className="px-4 py-2 bg-health-50 text-health-600 font-bold text-sm rounded-xl flex items-center gap-2 border border-health-100">
                               <CheckCircle className="w-4 h-4" /> Completed
                             </span>
                           </>
                         )}
                         {apt.status === 'REJECTED' && (
                             <span className="px-4 py-2 bg-red-50 text-red-600 font-bold text-sm rounded-xl flex items-center gap-2 border border-red-100">
                               <X className="w-4 h-4" /> Declined
                             </span>
                         )}
                       </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              
              {!loading && displayedAppointments.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-12 flex flex-col items-center justify-center text-center"
                >
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      {activeTab === 'queue' && <Clock className="w-8 h-8 text-slate-300" />}
                      {activeTab === 'schedule' && <Calendar className="w-8 h-8 text-slate-300" />}
                      {activeTab === 'history' && <CheckCircle className="w-8 h-8 text-slate-300" />}
                   </div>
                   <h3 className="text-lg font-heading font-bold text-slate-700 mb-1">
                     {activeTab === 'queue' && 'Queue is empty'}
                     {activeTab === 'schedule' && 'No pending requests'}
                     {activeTab === 'history' && 'No past consultations'}
                   </h3>
                   <p className="text-slate-500 font-medium">
                     {activeTab === 'queue' && 'No live or confirmed appointments are waiting to start.'}
                     {activeTab === 'schedule' && 'No scheduled appointments are waiting for your response.'}
                     {activeTab === 'history' && 'You haven\'t completed any consultations yet.'}
                   </p>
                </motion.div>
              )}
            </div>
          </motion.div>

        </div>
      </main>

      {/* AI Triage Notes Modal */}
      <AnimatePresence>
        {selectedAptNotes && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="bg-primary-900 p-6 flex items-center justify-between relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-health-500 rounded-full blur-[50px] opacity-30 pointer-events-none"></div>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                     <Activity className="w-5 h-5 text-health-400" />
                  </div>
                  <div>
                    <h2 className="font-heading font-black text-xl text-white">AI Triage Report</h2>
                    <p className="text-primary-200 text-xs font-medium mt-0.5">Patient: {selectedAptNotes.patient.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedAptNotes(null); setSelectedAptTab('summary'); }}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors relative z-10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 px-5 pt-4 bg-white border-b border-slate-100 shrink-0">
                <button
                  onClick={() => setSelectedAptTab('summary')}
                  className={`px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all cursor-pointer border-b-2 -mb-px ${
                    selectedAptTab === 'summary'
                      ? 'border-primary-700 text-primary-800 bg-primary-50'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  AI Summary
                </button>
                <button
                  onClick={() => setSelectedAptTab('chat')}
                  className={`px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all cursor-pointer border-b-2 -mb-px flex items-center gap-2 ${
                    selectedAptTab === 'chat'
                      ? 'border-health-600 text-health-700 bg-health-50'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Conversation
                  {selectedAptNotes.aiSummary?.chatHistory?.length > 0 && (
                    <span className="bg-health-100 text-health-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {selectedAptNotes.aiSummary.chatHistory.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Body */}
              <div className="flex-1 overflow-y-auto bg-slate-50">

                {/* Summary Tab */}
                {selectedAptTab === 'summary' && (
                  <div className="p-6 space-y-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Clinical Summary</h3>
                      <p className="text-slate-700 font-medium leading-relaxed">
                        {selectedAptNotes.aiSummary?.summary || 'No summary provided.'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Specialization</p>
                        <p className="text-sm font-bold text-primary-700">{selectedAptNotes.aiSummary?.suggested_specialization || '—'}</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Doctor</p>
                        <p className="text-sm font-bold text-slate-700">{selectedAptNotes.aiSummary?.assigned_doctor_name || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conversation Tab */}
                {selectedAptTab === 'chat' && (
                  <div className="p-6">
                    {selectedAptNotes.aiSummary?.chatHistory?.length > 0 ? (
                      <div className="space-y-4">
                        {selectedAptNotes.aiSummary.chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                              {msg.role === 'user' ? selectedAptNotes.patient.name : 'Aria (AI)'}
                            </span>
                            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                              msg.role === 'user'
                                ? 'bg-gradient-to-br from-primary-800 to-primary-900 text-white rounded-tr-sm font-medium'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border border-slate-200">
                          <Activity className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-600 font-bold mb-1">No conversation recorded</p>
                        <p className="text-slate-400 text-sm">The patient used text triage or no history was saved.</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
