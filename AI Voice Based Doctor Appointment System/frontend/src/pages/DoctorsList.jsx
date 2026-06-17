import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { NavBar } from '../components/ui/tubelight-navbar';
import { DoctorCard } from '../components/ui/doctor-card';
import { ArrowLeft, User, Search, LayoutDashboard, Mic, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TopHeader } from '../components/ui/top-header';
import AIVoiceAssistant from '../components/AIVoiceAssistant';
import { AnimatePresence } from 'framer-motion';

export default function DoctorsList() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDoctors = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/appointments/doctors', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if(Array.isArray(data)) setDoctors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const filteredDoctors = doctors.filter(doc => {
    const nameMatch = typeof doc.user?.name === 'string' ? doc.user.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const specMatch = typeof doc.specialization?.name === 'string' ? doc.specialization.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    return nameMatch || specMatch;
  });

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      <TopHeader onAITriageClick={() => setIsAIModalOpen(true)} />

      <main className="flex-1 max-w-[1200px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col overflow-hidden">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-6 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 shrink-0">
          <div>
            <h1 className="text-3xl font-heading font-black text-slate-900 mb-2">Our Specialists</h1>
            <p className="text-slate-500 font-medium text-lg">Browse our directory of verified medical professionals.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or specialty..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center flex flex-col items-center mt-8 shrink-0">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <User className="w-8 h-8 text-slate-300" />
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-2">No doctors found</h3>
             <p className="text-slate-500 font-medium">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 pb-4 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDoctors.map(doc => (
              <DoctorCard 
                key={doc.userId || Math.random()} 
                doctor={doc} 
                onBook={() => navigate(`/booking?specialization=${doc.specialization?.name || ''}`)} 
              />
            ))}
            </div>
          </div>
        )}
      </main>


    </div>
  );
}
