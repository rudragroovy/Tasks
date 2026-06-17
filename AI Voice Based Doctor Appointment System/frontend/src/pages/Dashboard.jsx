import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import AIVoiceAssistant from '../components/AIVoiceAssistant';
import { useNavigate } from 'react-router-dom';
import DoctorDashboard from './DoctorDashboard';
import { useSocket } from '../context/SocketContext';
import { HistoryModal } from '../components/ui/history-modal';
import { TopHeader } from '../components/ui/top-header';
import { Home, Stethoscope, Mic, LogOut, FileText, Download, Activity, User, ChevronRight, Video, CalendarClock, X, MessageSquare, Phone, PhoneOff, Clock, LayoutDashboard, Settings, Bell, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistoryApt, setSelectedHistoryApt] = useState(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  
  // Call state
  const [incomingCall, setIncomingCall] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120);

  useEffect(() => {
    fetch('http://localhost:5000/api/appointments', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      if(Array.isArray(data)) setAppointments(data);
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleIncomingCall = (data) => {
      setIncomingCall(data);
      setTimeLeft(120);
    };

    socket.on('call:incoming', handleIncomingCall);
    return () => socket.off('call:incoming', handleIncomingCall);
  }, [socket]);

  useEffect(() => {
    let timer;
    if (incomingCall && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (incomingCall && timeLeft === 0) {
      handleDeclineCall();
    }
    return () => clearInterval(timer);
  }, [incomingCall, timeLeft]);

  const handleAcceptCall = () => {
    socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: true });
    navigate(`/room/${incomingCall.appointmentId}`);
  };

  const handleDeclineCall = () => {
    socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: false });
    setIncomingCall(null);
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

  const handleTriageComplete = async (data) => {
    playSuccessSound();
    setIsAIModalOpen(false);
    navigate(`/booking?specialization=${data.suggested_specialization}`, { state: { aiSummary: data } });
  };

  if (user?.role === 'DOCTOR') {
    return <DoctorDashboard />;
  }

  if (user?.role === 'ADMIN') {
    navigate('/admin');
    return null;
  }

  const activeAppointments = appointments.filter(a => a.status === 'PENDING' || a.status === 'ACCEPTED' || a.paymentStatus === 'PENDING_PAYMENT');
  const pastAppointments = appointments.filter(a => a.status === 'COMPLETED');
  const scheduledAppointments = appointments.filter(a => a.type === 'SCHEDULED' && a.status !== 'COMPLETED' && a.status !== 'CANCELLED');

  return (
    <div className="min-h-screen xl:h-screen bg-slate-50 font-sans flex flex-col xl:overflow-hidden">
      {/* Top Application Bar */}
      <TopHeader activeAppointmentsCount={activeAppointments.length} />

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 flex flex-col xl:flex-row gap-6">

        {/* Left Column: Stats + Active Sessions */}
        <div className="flex-1 flex flex-col gap-6 min-w-0 xl:min-h-0">
          
          {/* Dashboard Header Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="bg-white p-3 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 hover:shadow-md transition-shadow group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-health-50 text-health-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl sm:text-2xl font-heading font-black text-slate-900 leading-none mb-0.5 sm:mb-1">{activeAppointments.length}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Active</p>
              </div>
            </div>
            <div className="bg-white p-3 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 hover:shadow-md transition-shadow group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl sm:text-2xl font-heading font-black text-slate-900 leading-none mb-0.5 sm:mb-1">{scheduledAppointments.length}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Scheduled</p>
              </div>
            </div>
            <div className="bg-white p-3 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 hover:shadow-md transition-shadow group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl sm:text-2xl font-heading font-black text-slate-900 leading-none mb-0.5 sm:mb-1">{pastAppointments.length}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">History</p>
              </div>
            </div>
          </div>
            
          {/* Active Appointments Feed */}
          <div className="flex flex-col gap-4 flex-1 xl:overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                   Active Sessions
                </h2>
              </div>
              
              {loading ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 flex justify-center shadow-sm">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : activeAppointments.length === 0 ? (
                <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                     <CalendarClock className="w-8 h-8 text-slate-400" />
                   </div>
                   <p className="text-base font-bold text-slate-700">No active sessions</p>
                   <p className="text-sm text-slate-500 mt-1 max-w-xs">Use the AI triage or book directly to consult with a doctor.</p>
                </div>
              ) : (
                <div className="flex-1 xl:overflow-y-auto pr-2 pb-4 space-y-4 xl:custom-scrollbar">
                  {activeAppointments.map((apt, idx) => (
                    <motion.div 
                      key={apt.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 25 }}
                      className="group relative bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row gap-6 items-start sm:items-center overflow-hidden"
                    >
                      {/* Gradient background pulse for active calls */}
                      {apt.status === 'ACCEPTED' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-health-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      )}

                      {/* Status Indicator Bar (Left Side) */}
                      <div className="hidden sm:block w-1.5 h-full min-h-[60px] rounded-full self-stretch bg-slate-100 relative overflow-hidden">
                        <div className={`absolute bottom-0 w-full rounded-full transition-all duration-1000 ${
                           apt.status === 'ACCEPTED' ? 'h-full bg-health-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                           apt.paymentStatus === 'PENDING_PAYMENT' ? 'h-1/2 bg-amber-500' : 'h-1/4 bg-primary-500'
                        }`}></div>
                      </div>

                      <div className="flex items-center gap-5 flex-1 z-10 min-w-0">
                        <div className="relative shrink-0">
                          <div className={`absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity ${
                            apt.status === 'ACCEPTED' ? 'bg-health-400' : 'bg-primary-200'
                          }`}></div>
                          <img 
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${apt.doctor?.name || 'Doctor'}&backgroundColor=f8fafc`} 
                            alt="Doctor" 
                            className="relative w-16 h-16 rounded-full border-4 border-white shadow-sm object-cover bg-slate-50"
                          />
                          {apt.status === 'ACCEPTED' && (
                            <span className="absolute bottom-0 right-0 w-4 h-4 bg-health-500 border-2 border-white rounded-full flex items-center justify-center">
                               <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                            </span>
                          )}
                        </div>
                        
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-black text-slate-900 text-lg tracking-tight truncate">
                              {apt.doctor?.name?.startsWith('Dr.') ? apt.doctor?.name : `Dr. ${apt.doctor?.name}`}
                            </h4>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shrink-0 ${
                               apt.status === 'ACCEPTED' ? 'bg-health-100 text-health-700 border border-health-200' :
                               apt.paymentStatus === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                               'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {apt.status === 'ACCEPTED' ? 'Ready' : apt.paymentStatus === 'PENDING_PAYMENT' ? 'Payment Due' : 'Matching'}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-500 truncate">
                            {apt.doctor?.doctorProfile?.specialization?.name || apt.doctor?.specialization?.name || 'Specialist'}
                            {apt.familyMember && <span className="ml-2 text-primary-600 text-[10px] uppercase tracking-widest bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100 hidden sm:inline-block">For {apt.familyMember.name}</span>}
                          </p>
                          <p className="sm:hidden text-xs font-medium text-slate-400 mt-1 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Requested {new Date(apt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="hidden sm:flex flex-col items-center justify-center px-4 xl:px-8 z-10 shrink-0 border-l border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{new Date(apt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Requested</span>
                      </div>
                      
                      <div className="w-full sm:w-auto shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-5 sm:pt-0 sm:pl-6 z-10">
                        {apt.paymentStatus === 'PENDING_PAYMENT' ? (
                          <button 
                            onClick={() => navigate(`/checkout/${apt.id}`)}
                            className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-health-600 shadow-md hover:shadow-health-600/20 text-sm font-bold transition-all cursor-pointer transform-gpu active:scale-95"
                          >
                            Pay Now
                          </button>
                        ) : (
                          <button 
                            onClick={() => { playSuccessSound(); navigate(`/waiting-room?id=${apt.id}`); }}
                            className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 transform-gpu active:scale-95 ${
                              apt.status === 'ACCEPTED' 
                                ? 'bg-health-500 text-white hover:bg-health-600 shadow-lg shadow-health-500/30' 
                                : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                            }`}
                          >
                            <Video className={`w-4 h-4 ${apt.status === 'ACCEPTED' ? 'animate-pulse' : ''}`} />
                            {apt.status === 'ACCEPTED' ? 'Join Call' : 'Waiting Room'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

        </div>

        {/* Right Column: Past History Sidebar */}
        <div className="w-full xl:w-[400px] 2xl:w-[450px] shrink-0 flex flex-col gap-4 xl:overflow-hidden">
               <div className="flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-slate-900">Medical History</h2>
                <button 
                  onClick={() => navigate('/medical-history')}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors"
                >
                  View All
                </button>
              </div>

              <div className="flex flex-col gap-3 xl:h-full xl:min-h-0 overflow-x-hidden">
                {loading ? (
                  <div className="flex-1 flex justify-center items-center">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : pastAppointments.length === 0 ? (
                  <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-10 text-center flex flex-col items-center shadow-sm">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">No medical history</p>
                    <p className="text-xs text-slate-500 mt-1">Past consultations will appear here.</p>
                  </div>
                ) : (
                  <div className="flex-1 xl:overflow-y-auto overflow-x-hidden pr-2 pb-4 space-y-3 xl:custom-scrollbar">
                    {pastAppointments.slice(0, 5).map((apt, idx) => (
                      <motion.div 
                        key={apt.id} 
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 25 }}
                        onClick={() => setSelectedHistoryApt(apt)}
                        className="group bg-white border border-slate-200 rounded-3xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                      >
                         <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-100 group-hover:bg-primary-400 transition-colors duration-300"></div>
                         
                         <div className="flex justify-between items-start mb-3 pl-2">
                           <div className="flex items-center gap-3">
                             <div className="relative">
                               <img 
                                  src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${apt.doctor?.name || 'Doctor'}&backgroundColor=f1f5f9`} 
                                  alt="Doctor" 
                                  className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                               />
                             </div>
                             <div>
                               <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                                 {apt.doctor?.name?.startsWith('Dr.') ? apt.doctor?.name : `Dr. ${apt.doctor?.name}`}
                               </h4>
                                <p className="text-xs font-medium text-slate-500">
                                  {new Date(apt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  {apt.familyMember && <span className="ml-1.5 text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">For {apt.familyMember.name}</span>}
                                </p>
                             </div>
                           </div>
                           
                           {apt.consultation?.prescriptionUrl && (
                             <div 
                               className="shrink-0 w-8 h-8 rounded-full bg-health-50 text-health-600 flex items-center justify-center transition-colors shadow-sm"
                               title="Prescription Attached"
                             >
                               <FileText className="w-3.5 h-3.5" />
                             </div>
                           )}
                         </div>
                         
                         <div className="ml-2 bg-slate-50 group-hover:bg-primary-50/50 p-2.5 rounded-xl border border-slate-100 transition-colors">
                            <p className="text-xs text-slate-600 line-clamp-2 font-medium leading-relaxed">
                              {apt.aiSummary?.primary_symptom || 'General consultation regarding health concerns.'}
                            </p>
                         </div>
                      </motion.div>
                    ))}

                    {pastAppointments.length > 5 && (
                      <button 
                        onClick={() => navigate('/medical-history')}
                        className="w-full py-4 mt-2 border-2 border-slate-100 rounded-2xl text-slate-500 font-bold text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
                      >
                        View More Records
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
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

           <h2 className="text-white font-heading font-black text-3xl mb-2 text-center animate-pulse">
             Incoming Video Call...
           </h2>
           <p className="text-slate-300 font-medium text-lg text-center mb-10">
             {incomingCall.doctorName?.startsWith('Dr.') ? incomingCall.doctorName : `Dr. ${incomingCall.doctorName}`} is calling you
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

      {/* AI Voice Modal - for mobile bottom nav */}
      <AnimatePresence>
        {isAIModalOpen && (
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
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
            >
              <div className="bg-primary-900 p-6 flex items-center justify-between relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-health-500 rounded-full blur-[50px] opacity-30 pointer-events-none"></div>
                 <div className="flex items-center gap-3 relative z-10">
                   <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-sm">
                      <Activity className="w-5 h-5 text-health-400" />
                   </div>
                   <div>
                     <h2 className="font-heading font-black text-xl text-white">AI Voice Triage</h2>
                     <p className="text-primary-200 text-xs font-medium mt-0.5">Speak naturally about your symptoms</p>
                   </div>
                 </div>
                 <button 
                   onClick={() => setIsAIModalOpen(false)}
                   className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors relative z-10 cursor-pointer"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-8 flex-1 bg-white relative z-10 flex flex-col items-center justify-center min-h-[300px]">
                <AIVoiceAssistant onComplete={handleTriageComplete} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
