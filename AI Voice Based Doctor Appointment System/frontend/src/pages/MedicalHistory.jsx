import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TopHeader } from '../components/ui/top-header';
import { HistoryModal } from '../components/ui/history-modal';
import { Search, FileText, Calendar, Clock, Stethoscope, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MedicalHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedHistoryApt, setSelectedHistoryApt] = useState(null);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/appointments', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        // Only COMPLETED appointments
        setAppointments(data.filter(a => a.status === 'COMPLETED').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return appointments;
    const query = searchQuery.toLowerCase();
    return appointments.filter(apt => {
      const docName = apt.doctor?.name?.toLowerCase() || '';
      const docSpec = apt.doctor?.specialization?.toLowerCase() || '';
      const summary1 = apt.aiSummary?.primary_symptom?.toLowerCase() || '';
      const summary2 = (typeof apt.consultation?.aiSummary === 'string' ? apt.consultation.aiSummary : '').toLowerCase();
      return docName.includes(query) || docSpec.includes(query) || summary1.includes(query) || summary2.includes(query);
    });
  }, [appointments, searchQuery]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const currentItems = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <TopHeader />
      
      <main className="flex-1 max-w-[1000px] w-full mx-auto p-4 sm:p-6 lg:p-8 pb-8 flex flex-col">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-6 transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8 shrink-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 mb-1 sm:mb-2">Medical History</h1>
            <p className="text-slate-500 font-medium text-sm sm:text-base lg:text-lg">Review your past consultations and prescriptions.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
            />
            <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-12 text-center flex flex-col items-center shadow-sm">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <FileText className="w-8 h-8 text-slate-300" />
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-2">No records found</h3>
             <p className="text-slate-500 font-medium">Try adjusting your search or check back later.</p>
          </div>
        ) : (
          <div className="space-y-4 flex-1">
            {currentItems.map((apt, idx) => (
              <motion.div 
                key={apt.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedHistoryApt(apt)}
                className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-md hover:border-primary-200 transition-all flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center relative overflow-hidden cursor-pointer group"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-100 group-hover:bg-primary-400 transition-colors duration-300"></div>
                <div className="flex items-center gap-3 sm:gap-4 shrink-0 pl-2">
                  <img 
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${apt.doctor?.name || 'Doctor'}&backgroundColor=f1f5f9`} 
                    alt="Doctor" 
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-slate-100 object-cover"
                  />
                  <div className="min-w-0">
                    <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                      {apt.doctor?.name?.startsWith('Dr.') ? apt.doctor?.name : `Dr. ${apt.doctor?.name}`}
                    </h4>
                    <p className="text-xs sm:text-sm font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Stethoscope className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                      <span className="truncate">{apt.doctor?.specialization || 'General'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex-1 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-6 min-w-0 w-full">
                   <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                     <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(apt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                     <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(apt.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                   </div>
                   <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed line-clamp-2">
                     {apt.aiSummary?.primary_symptom || (typeof apt.consultation?.aiSummary === 'string' ? apt.consultation.aiSummary : '') || 'General consultation regarding health concerns.'}
                   </p>
                </div>

                {apt.consultation?.prescriptionUrl && (
                  <div className="shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
                    <button 
                       onClick={() => window.open(`http://localhost:5000${apt.consultation.prescriptionUrl}`, '_blank')}
                       title="View Prescription"
                       className="w-10 h-10 bg-health-50 text-health-600 hover:bg-health-100 hover:text-health-700 rounded-full flex items-center justify-center transition-colors shadow-sm"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between pt-6 mt-8 border-t border-slate-200 gap-4">
                <p className="text-sm font-medium text-slate-500">
                  Showing <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredHistory.length)}</span> of <span className="font-bold text-slate-900">{filteredHistory.length}</span> records
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({length: totalPages}, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${currentPage === page ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedHistoryApt && (
        <HistoryModal 
          apt={selectedHistoryApt} 
          onClose={() => setSelectedHistoryApt(null)} 
        />
      )}
    </div>
  );
}
