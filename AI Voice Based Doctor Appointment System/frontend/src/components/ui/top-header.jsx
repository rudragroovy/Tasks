import { useState, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, User, Mic, Bell, LogOut, Activity, X, Menu, History, Users, ChevronRight, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import AppIcon from '../branding/AppIcon';

const AIVoiceAssistant = lazy(() => import('../AIVoiceAssistant'));

export function TopHeader({ activeAppointmentsCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMedicalHistoryTabActive =
    (location.pathname === '/patient/account' || location.pathname === '/account') &&
    new URLSearchParams(location.search).get('tab') === 'medical-history';
  const isFamilyTabActive =
    (location.pathname === '/patient/account' || location.pathname === '/account') &&
    new URLSearchParams(location.search).get('tab') === 'family';

  // Triage state
  const [triageStep, setTriageStep] = useState('select_patient');
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('self');
  const [loadingMembers, setLoadingMembers] = useState(false);

  const handleOpenTriage = async () => {
    setIsAIModalOpen(true);
    setTriageStep('select_patient');
    setLoadingMembers(true);
    try {
      const { data } = await axios.get('http://localhost:5000/api/family-members', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFamilyMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleTriageComplete = (data) => {
    setIsAIModalOpen(false);
    // Include selected patient in summary
    const aiSummaryWithPatient = { ...data, selectedPatientId };
    const practitionerType = data?.suggested_practitioner_type || 'General Practitioner (GP)';
    navigate(`/booking?practitionerType=${encodeURIComponent(practitionerType)}`, { state: { aiSummary: aiSummaryWithPatient } });
  };

  return (
    <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <button
            type="button"
            className="flex min-h-11 items-center gap-2 cursor-pointer"
            onClick={() => navigate('/dashboard')}
            aria-label="Go to dashboard"
          >
            <AppIcon size={32} />
            <span className="font-heading font-black text-slate-900 text-lg tracking-tight hidden sm:block">CareBridge</span>
          </button>
        </div>

        <div className="hidden md:flex flex-1 items-center justify-center gap-5 lg:gap-8">
          <button type="button"
            onClick={() => navigate('/dashboard')}
            className={`font-bold text-sm flex items-center gap-1.5 transition-colors cursor-pointer ${location.pathname === '/dashboard' ? 'text-primary-700' : 'text-slate-500 hover:text-primary-600'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button type="button"
            onClick={() => navigate('/doctors')}
            className={`font-bold text-sm flex items-center gap-1.5 transition-colors cursor-pointer ${location.pathname === '/doctors' ? 'text-primary-700' : 'text-slate-500 hover:text-primary-600'}`}
          >
            <User className="w-4 h-4" /> Doctors
          </button>
          {user ? (
            <button
              type="button"
              onClick={() => navigate('/patient/chat')}
              className={`font-bold text-sm flex items-center gap-1.5 transition-colors cursor-pointer ${location.pathname === '/patient/chat' ? 'text-primary-700' : 'text-slate-500 hover:text-primary-600'}`}
            >
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
          ) : null}
          <button type="button"
            onClick={handleOpenTriage}
            className="bg-primary-50 text-primary-700 hover:bg-primary-100 hover:text-primary-800 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1.5 transition-all shadow-sm shadow-primary-900/5 cursor-pointer border border-primary-100"
          >
            <Mic className="w-4 h-4" /> AI Triage
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button type="button" className="text-slate-400 hover:text-slate-600 relative cursor-pointer min-h-11 min-w-11" aria-label="Notifications">
            <Bell className="w-5 h-5" />
            {activeAppointmentsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-health-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm border border-primary-200">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-sm">
              <p className="font-bold text-slate-900 leading-none">{user?.name ? user.name.split(' ')[0] : 'User'}</p>
              <p className="text-slate-500 text-xs">Patient</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { logout(); navigate('/'); }}
            className="ml-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer min-h-11 min-w-11"
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAIModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/35 backdrop-blur-lg h-screen w-screen"
            role="dialog"
            aria-modal="true"
            aria-label="AI triage dialog"
          >
            {triageStep === 'select_patient' ? (
              <div className="flex min-h-full w-full items-center justify-center overflow-y-auto p-4 sm:p-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[min(90dvh,760px)] border border-slate-200"
                >
                  <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 p-6 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-health-400 rounded-full blur-[55px] opacity-30 pointer-events-none"></div>
                    <div className="absolute -bottom-12 -left-8 w-40 h-40 bg-primary-300 rounded-full blur-[70px] opacity-20 pointer-events-none"></div>
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-sm">
                        <Activity className="w-5 h-5 text-health-400" />
                      </div>
                      <div>
                        <h2 className="font-heading font-black text-xl text-white">AI Voice Triage</h2>
                        <p className="text-primary-100/90 text-xs font-medium mt-0.5">Select patient, then describe symptoms naturally</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAIModalOpen(false)}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors relative z-10 cursor-pointer border border-white/10"
                      aria-label="Close AI triage dialog"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 sm:p-7 flex-1 bg-white relative z-10 min-h-[280px]">
                    <div className="w-full h-full flex flex-col">
                      <div className="mb-4 text-center">
                        <h3 className="text-lg font-black text-slate-900">Who is this consultation for?</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">Choose patient profile to personalize triage and booking</p>
                      </div>

                      {loadingMembers ? (
                        <div className="space-y-3">
                          <div className="h-16 bg-slate-100 rounded-2xl animate-pulse border border-slate-200" />
                          <div className="h-16 bg-slate-100 rounded-2xl animate-pulse border border-slate-200" />
                          <div className="h-16 bg-slate-100 rounded-2xl animate-pulse border border-slate-200" />
                        </div>
                      ) : (
                        <div className="space-y-3 overflow-y-auto pr-1 max-h-[min(44dvh,360px)] sm:max-h-[min(48dvh,420px)]">
                          <button type="button"
                            onClick={() => { setSelectedPatientId('self'); setTriageStep('assistant'); }}
                            className="group w-full flex items-center justify-between p-4 rounded-2xl border border-primary-200 bg-primary-50/60 hover:border-primary-300 hover:bg-primary-50 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 bg-white text-primary-700 rounded-full flex items-center justify-center font-black border border-primary-200">
                                {user?.name?.charAt(0) || 'M'}
                              </div>
                              <div className="text-left">
                                <p className="font-black text-slate-900 leading-none mb-1">Myself</p>
                                <p className="text-xs text-slate-600 font-medium">{user?.name}</p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white border border-primary-200 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                              <ChevronRight className="text-primary-700" size={16} />
                            </div>
                          </button>

                          {familyMembers.map(member => (
                            <button type="button"
                              key={member.id}
                              onClick={() => { setSelectedPatientId(member.id); setTriageStep('assistant'); }}
                              className="group w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-health-300 hover:bg-health-50 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-health-100 text-health-700 rounded-full flex items-center justify-center font-black border border-health-200">
                                  {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left">
                                  <p className="font-black text-slate-900 leading-none mb-1">{member.name}</p>
                                  <p className="text-xs text-slate-600 font-medium">{member.relation || 'Family member'}</p>
                                </div>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-health-100 group-hover:border-health-200 transition-colors">
                                <ChevronRight className="text-slate-500 group-hover:text-health-700" size={16} />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : (
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
                    patientId={selectedPatientId}
                  />
                </Suspense>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-50 cursor-pointer"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 h-screen w-[85vw] max-w-80 bg-white shadow-2xl z-[60] flex flex-col border-r border-slate-200 overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AppIcon size={32} />
                  <span className="font-heading font-black text-slate-900 text-lg tracking-tight">Menu</span>
                </div>
                <button type="button" onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer min-h-11 min-w-11" aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 flex flex-col gap-2 flex-1">
                <button type="button"
                  onClick={() => { setIsSidebarOpen(false); navigate('/dashboard'); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors w-full text-left cursor-pointer ${location.pathname === '/dashboard' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <LayoutDashboard className="w-5 h-5" /> Dashboard
                </button>
                <button type="button"
                  onClick={() => { setIsSidebarOpen(false); navigate('/doctors'); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors w-full text-left cursor-pointer ${location.pathname === '/doctors' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <User className="w-5 h-5" /> Doctors
                </button>
                {user ? (
                  <button
                    type="button"
                    onClick={() => { setIsSidebarOpen(false); navigate('/patient/chat'); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors w-full text-left cursor-pointer ${location.pathname === '/patient/chat' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <MessageSquare className="w-5 h-5" /> Chat
                  </button>
                ) : null}
                <button type="button"
                  onClick={() => { setIsSidebarOpen(false); navigate('/patient/account?tab=family'); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors w-full text-left cursor-pointer ${isFamilyTabActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Users className="w-5 h-5" /> Family Members
                </button>
                <button type="button"
                  onClick={() => { setIsSidebarOpen(false); navigate('/patient/account?tab=medical-history'); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors w-full text-left cursor-pointer ${isMedicalHistoryTabActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <History className="w-5 h-5" /> Medical History
                </button>
              </div>

              <div className="p-6 border-t border-slate-100">
                <button type="button" onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-3 text-slate-500 hover:text-red-600 font-bold w-full transition-colors cursor-pointer">
                  <LogOut className="w-5 h-5" /> Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
