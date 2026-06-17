import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, MessageSquare, Bot, User, UserRound, Download, CalendarClock, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

export function HistoryModal({ apt, onClose }) {
  const [activeTab, setActiveTab] = useState('ai');
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (!apt) return null;

  const doctorName = apt.doctor?.name?.startsWith('Dr.') ? apt.doctor?.name : `Dr. ${apt.doctor?.name}`;
  const appointmentDate = new Date(apt.createdAt).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden relative"
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 flex items-start justify-between bg-white relative z-10">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${apt.doctor?.name || 'Doctor'}&backgroundColor=f1f5f9`}
                alt="Doctor"
                className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-slate-200 object-cover shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-black text-slate-900 truncate">{doctorName}</h2>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 truncate">{appointmentDate}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-4 sm:px-6 pt-3 sm:pt-4 gap-3 sm:gap-6 border-b border-slate-200 bg-slate-50 relative z-10 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ai')}
              className={cn(
                "pb-3 sm:pb-4 font-bold text-xs sm:text-sm transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap",
                activeTab === 'ai' ? "border-primary-500 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <Bot className="w-4 h-4" /> <span>AI Triage</span>
            </button>
            <button
              onClick={() => setActiveTab('doctor')}
              className={cn(
                "pb-3 sm:pb-4 font-bold text-xs sm:text-sm transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap",
                activeTab === 'doctor' ? "border-primary-500 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <MessageSquare className="w-4 h-4" /> <span>Doctor Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('prescription')}
              className={cn(
                "pb-3 sm:pb-4 font-bold text-xs sm:text-sm transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap",
                activeTab === 'prescription' ? "border-health-500 text-health-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <FileText className="w-4 h-4" /> <span>Prescription</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 relative">
            <AnimatePresence mode="wait">
              {/* AI Triage Tab */}
              {activeTab === 'ai' && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {apt.aiSummary ? (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Status & Doctor Info */}
                      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Status</span>
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold",
                            apt.status === 'ACCEPTED' ? "bg-health-100 text-health-700" :
                              apt.status === 'COMPLETED' ? "bg-primary-100 text-primary-700" :
                                "bg-slate-100 text-slate-700"
                          )}>
                            {apt.status}
                          </span>
                        </div>
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Assigned Doctor</span>
                          <h4 className="text-sm font-bold text-slate-900">{doctorName}</h4>
                          <p className="text-xs font-medium text-slate-500">{apt.doctor?.doctorProfile?.specialization?.name || apt.doctor?.specialization?.name || 'Specialist'}</p>
                        </div>
                      </div>

                      {/* AI Summary Text */}
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <Bot className="w-5 h-5 text-primary-500" /> Triage Summary
                        </h3>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-sm font-medium text-slate-700 leading-relaxed">
                            {apt.aiSummary?.summary || apt.aiSummary?.primary_symptom || 'General consultation regarding health concerns.'}
                          </p>
                        </div>
                      </div>

                      {/* Chat with AI */}
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-primary-500" /> Full Triage Conversation
                        </h3>
                        {apt.aiSummary?.chatHistory?.length > 0 ? (
                          <div className="p-4 sm:p-6 border border-slate-100 rounded-xl bg-slate-50 space-y-4 max-h-[400px] overflow-y-auto">
                            {apt.aiSummary.chatHistory.map((msg, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "flex w-max max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-3 text-sm shadow-sm",
                                  msg.role === 'user'
                                    ? "ml-auto bg-primary-600 text-white rounded-tr-none"
                                    : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
                                )}
                              >
                                <span className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-70">
                                  {msg.role === 'user' ? (apt.familyMember?.name || apt.patient?.name) : '🤖 Aria (AI)'}
                                </span>
                                <span className="font-medium leading-relaxed">{msg.content || msg.text}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                            <Bot className="w-8 h-8 mb-3 text-slate-300" />
                            <p className="font-medium text-sm">No conversation recorded</p>
                            <p className="text-xs mt-1">Patient used text triage or no history was saved.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                      <Bot className="w-12 h-12 mb-4 text-slate-300" />
                      <p className="font-medium">No AI triage data found.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Doctor Chat Tab */}
              {activeTab === 'doctor' && (
                <motion.div
                  key="doctor"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary-500" /> Live Consultation Chat
                  </h3>
                  {apt.messages && apt.messages.length > 0 ? (
                    <div className="p-4 sm:p-6 border border-slate-100 rounded-xl bg-slate-50 space-y-4 max-h-[400px] overflow-y-auto">
                      {apt.messages.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex w-max max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-3 text-sm shadow-sm",
                            msg.senderRole === 'PATIENT'
                              ? "ml-auto bg-primary-600 text-white rounded-tr-none"
                              : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
                          )}
                        >
                          <span className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-70">
                            {msg.senderRole === 'PATIENT' ? (apt.familyMember?.name || apt.patient?.name) : `Dr. ${apt.doctor?.name}`}
                          </span>
                          <span className="font-medium leading-relaxed">{msg.text}</span>
                          <span className={cn("text-[10px] self-end mt-1", msg.senderRole === 'PATIENT' ? "text-primary-200" : "text-slate-400")}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                      <MessageSquare className="w-10 h-10 mb-3 text-slate-300" />
                      <p className="font-medium">No live messages recorded</p>
                      <p className="text-xs mt-1">No text chat was used during this video consultation.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Prescription Tab */}
              {activeTab === 'prescription' && (
                <motion.div
                  key="prescription"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full flex flex-col"
                >
                  {apt.consultation?.prescriptionUrl ? (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-full shadow-sm min-h-[500px]">
                      <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-health-600" />
                          <span className="font-bold text-slate-700 text-sm">Official Prescription Document</span>
                        </div>
                        <a
                          href={`http://localhost:5000${apt.consultation.prescriptionUrl}`}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-health-500 text-white rounded-lg text-sm font-bold hover:bg-health-600 transition-colors shadow-sm"
                        >
                          <Download className="w-4 h-4" /> Download PDF
                        </a>
                      </div>
                      <iframe
                        src={`http://localhost:5000${apt.consultation.prescriptionUrl}`}
                        className="w-full flex-1 bg-slate-100 min-h-[500px]"
                        title="Prescription Document"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
                      <FileText className="w-12 h-12 mb-4 text-slate-300" />
                      <p className="font-medium">No prescription was issued.</p>
                      <p className="text-xs mt-1 text-slate-400">The doctor did not attach a prescription to this session.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
