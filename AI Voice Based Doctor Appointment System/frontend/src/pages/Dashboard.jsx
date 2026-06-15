import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import AIVoiceAssistant from '../components/AIVoiceAssistant';
import { useNavigate } from 'react-router-dom';
import DoctorDashboard from './DoctorDashboard';
import { FileText, Download, Activity, User, LogOut, ChevronRight, Stethoscope, Video, CalendarClock, Mic, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

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

  const activeAppointments = appointments.filter(a => a.status === 'PENDING' || a.status === 'ACCEPTED' || a.paymentStatus === 'PENDING_PAYMENT');
  const pastAppointments = appointments.filter(a => a.status === 'COMPLETED');

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-200 blur-[150px] pointer-events-none opacity-40"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-health-200 blur-[150px] pointer-events-none opacity-40"></div>

      {/* Navigation */}
      <nav className="relative z-10 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-primary-900 rounded-md flex items-center justify-center relative overflow-hidden shadow-sm">
               <div className="absolute w-4 h-4 bg-white top-0 left-0 rounded-br-md" />
               <div className="absolute w-4 h-4 bg-health-500 bottom-0 right-0 rounded-tl-md" />
            </div>
            <span className="font-heading font-black text-primary-900 text-xl tracking-tight">MyDrScripts</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            {/* AI Assistant Navbar Trigger */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAIModalOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-primary-900 to-primary-800 text-white px-5 py-2.5 rounded-full font-bold shadow-md shadow-primary-900/20 hover:shadow-lg transition-all"
            >
              <Mic className="w-4 h-4" /> Ask AI Triage
            </motion.button>

            <div className="hidden sm:flex items-center gap-2 bg-slate-100/80 px-4 py-2.5 rounded-full border border-slate-200/50">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-bold text-slate-700">{user?.name}</span>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:text-red-600 transition-colors shadow-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign Out</span>
            </motion.button>
          </motion.div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 lg:py-12">
        {/* Welcome Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-black text-slate-900 tracking-tight mb-2">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 font-medium text-lg">Your personal telehealth hub. Click "Ask AI Triage" to find a specialist.</p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAIModalOpen(true)}
            className="sm:hidden flex items-center justify-center gap-2 bg-gradient-to-r from-primary-900 to-primary-800 text-white px-5 py-3 rounded-full font-bold shadow-md shadow-primary-900/20 w-full"
          >
            <Mic className="w-5 h-5" /> Ask AI Triage
          </motion.button>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Active Consultations (Expanded) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                     <Video className="w-5 h-5" />
                   </div>
                   <h3 className="font-heading font-bold text-slate-800 text-xl">Active Requests</h3>
                 </div>
                 <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200">
                   {loading ? '...' : activeAppointments.length} Active
                 </span>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="flex gap-4 items-center animate-pulse border border-slate-100 p-5 rounded-2xl">
                        <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                          <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                        </div>
                        <div className="w-32 h-10 bg-slate-200 rounded-xl"></div>
                      </div>
                    ))}
                  </div>
                ) : activeAppointments.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full min-h-[200px] text-center"
                  >
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                       <Stethoscope className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-800 font-bold font-heading text-lg mb-1">No active consultations</p>
                    <p className="text-slate-500 text-sm font-medium">Use the AI Triage above to request a doctor.</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-4"
                  >
                    <AnimatePresence>
                      {activeAppointments.map(apt => (
                        <motion.div 
                          variants={itemVariants}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={apt.id} 
                          className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border border-slate-100 rounded-2xl hover:border-primary-200 hover:shadow-md transition-colors bg-white gap-4 group"
                        >
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                               <img src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${apt.doctor.name}`} alt="Doctor" />
                             </div>
                             <div>
                               <p className="font-heading font-bold text-lg text-slate-900">Dr. {apt.doctor.name}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                    apt.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {apt.status === 'PENDING' && apt.paymentStatus === 'PENDING_PAYMENT' ? 'AWAITING PAYMENT' : apt.status}
                                  </span>
                                  {apt.type === 'SCHEDULED' && (
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                      <CalendarClock className="w-3 h-3" /> Scheduled
                                    </span>
                                  )}
                               </div>
                             </div>
                          </div>
                          
                          {apt.paymentStatus === 'PENDING_PAYMENT' ? (
                            <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => navigate(`/mock-checkout?session_id=${apt.stripeSessionId}&appointmentId=${apt.id}&type=${apt.type}`)}
                              className="w-full sm:w-auto px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-bold shadow-sm cursor-pointer flex items-center justify-center gap-2"
                            >
                              Complete Payment <ChevronRight className="w-4 h-4" />
                            </motion.button>
                          ) : (
                            <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => { playSuccessSound(); navigate(`/waiting-room?id=${apt.id}`); }}
                              className="w-full sm:w-auto px-6 py-3 bg-primary-900 text-white rounded-xl hover:bg-primary-800 font-bold shadow-sm shadow-primary-900/20 cursor-pointer flex items-center justify-center gap-2"
                            >
                              View Room <ChevronRight className="w-4 h-4" />
                            </motion.button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Past Consultations (Expanded) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                 <div className="w-10 h-10 bg-health-100 rounded-xl flex items-center justify-center text-health-600">
                   <FileText className="w-5 h-5" />
                 </div>
                 <h3 className="font-heading font-bold text-slate-800 text-xl">Medical History</h3>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex justify-between items-center animate-pulse border border-slate-100 p-5 rounded-2xl">
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-32"></div>
                          <div className="h-3 bg-slate-100 rounded w-48"></div>
                        </div>
                        <div className="w-24 h-8 bg-slate-200 rounded-xl"></div>
                      </div>
                    ))}
                  </div>
                ) : pastAppointments.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center"
                  >
                    <p className="text-slate-500 font-medium text-sm">Your consultation history will appear here.</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-4"
                  >
                    {pastAppointments.map(apt => (
                      <motion.div 
                        variants={itemVariants}
                        key={apt.id} 
                        className="flex flex-col md:flex-row justify-between md:items-center p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors gap-4"
                      >
                        <div>
                          <p className="font-heading font-bold text-slate-900 text-lg">Dr. {apt.doctor.name}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1 font-medium">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-xs font-bold text-slate-600">
                              {new Date(apt.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{apt.aiSummary?.primary_symptom || 'General Consultation'}</span>
                          </div>
                        </div>
                        {apt.consultation?.prescriptionUrl ? (
                          <motion.a 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            href={`http://localhost:5000${apt.consultation.prescriptionUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-health-100 text-health-700 rounded-xl hover:bg-health-50 hover:border-health-200 transition-colors text-sm font-bold shadow-sm cursor-pointer shrink-0"
                          >
                            <Download className="w-4 h-4" /> Prescription
                          </motion.a>
                        ) : (
                          <span className="text-sm font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shrink-0 text-center">
                            No files
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
        </div>
      </main>

      {/* AI Assistant Modal Overlay */}
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
              {/* Modal Header */}
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

              {/* Modal Body with AI Voice Assistant */}
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
