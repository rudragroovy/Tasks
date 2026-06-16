import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Calendar, Clock, CreditCard, Video, ArrowLeft, Star, ShieldCheck, Activity } from 'lucide-react';

export default function Booking() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  
  const [bookingType, setBookingType] = useState('ON_DEMAND'); 
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [processingId, setProcessingId] = useState(null);
  
  // Price Breakdown Modal State
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  
  const specialization = searchParams.get('specialization') || '';
  const aiSummary = location.state?.aiSummary || {};

  const fetchDoctors = async () => {
    try {
      const { data } = await axios.get(`http://localhost:5000/api/appointments/doctors?specializationName=${specialization}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setDoctors(data);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [specialization]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchDoctors();
    socket.on('doctors:updated', handleUpdate);
    return () => socket.off('doctors:updated', handleUpdate);
  }, [socket, specialization]);

  const confirmBooking = async () => {
    if (!selectedDoctor) return;
    setProcessingId(selectedDoctor.userId);
    try {
      let scheduledFor = null;
      if (bookingType === 'SCHEDULED') {
        scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      const { data: appointment } = await axios.post('http://localhost:5000/api/appointments', {
        doctorId: selectedDoctor.userId,
        aiSummary,
        type: bookingType,
        scheduledFor
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const { data: session } = await axios.post('http://localhost:5000/api/payments/create-checkout-session', {
        doctorId: selectedDoctor.userId,
        appointmentId: appointment.id,
        type: bookingType
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      window.location.href = session.url;

    } catch (err) {
      console.error(err);
      alert('Failed to initiate booking process.');
      setProcessingId(null);
      setSelectedDoctor(null);
    }
  };

  const handleBookClick = (doc) => {
    if (bookingType === 'SCHEDULED' && (!scheduledDate || !scheduledTime)) {
      return alert('Please select a date and time for your scheduled consultation.');
    }
    setSelectedDoctor(doc);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-200 blur-[150px] pointer-events-none opacity-40"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-health-200 blur-[150px] pointer-events-none opacity-40"></div>

      {/* Navigation */}
      <nav className="relative z-10 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-900 rounded-md flex items-center justify-center relative overflow-hidden shadow-sm">
               <div className="absolute w-4 h-4 bg-white top-0 left-0 rounded-br-md" />
               <div className="absolute w-4 h-4 bg-health-500 bottom-0 right-0 rounded-tl-md" />
            </div>
            <span className="font-heading font-black text-primary-900 text-xl tracking-tight">MyDrScripts</span>
          </div>
          
          <button 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10 lg:py-12">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-bold font-heading mb-4 border border-primary-200">
             <Activity className="w-3 h-3" /> Step 2: Select Provider
          </span>
          <h1 className="text-3xl md:text-5xl font-heading font-black text-slate-900 tracking-tight mb-3">
            Available Specialists
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
            {specialization ? `We've filtered our network for ${specialization} experts based on your AI triage.` : 'Select from our network of world-class healthcare providers.'}
          </p>
        </div>

        {/* Custom Toggle */}
        <div className="flex justify-center mb-10">
           <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm inline-flex">
             <button
                onClick={() => setBookingType('ON_DEMAND')}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-heading font-bold transition-all duration-300 cursor-pointer ${
                  bookingType === 'ON_DEMAND' 
                    ? 'bg-primary-900 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Video size={18} /> Consult Now
              </button>
              <button
                onClick={() => setBookingType('SCHEDULED')}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-heading font-bold transition-all duration-300 cursor-pointer ${
                  bookingType === 'SCHEDULED' 
                    ? 'bg-primary-900 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar size={18} /> Schedule Later
              </button>
           </div>
        </div>

        {/* Schedule Inputs */}
        {bookingType === 'SCHEDULED' && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 mb-10 animate-in slide-in-from-top-4 fade-in">
            <div className="flex-1">
              <label className="block text-sm font-bold font-heading text-slate-700 mb-2">Select Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-4 text-primary-500" size={18} />
                <input 
                  type="date" 
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="pl-12 w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-shadow text-slate-900 font-bold cursor-pointer"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold font-heading text-slate-700 mb-2">Select Time</label>
              <div className="relative">
                <Clock className="absolute left-4 top-4 text-primary-500" size={18} />
                <input 
                  type="time" 
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="pl-12 w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-shadow text-slate-900 font-bold cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Doctors Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-900 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium font-heading">Finding the best matches...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm max-w-2xl mx-auto">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-slate-300" />
             </div>
             <p className="text-slate-800 font-bold font-heading text-xl mb-1">No providers available</p>
             <p className="text-slate-500 font-medium">There are no doctors matching this criteria currently online.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map(doc => (
              <div key={doc.userId} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group">
                
                {/* Card Header Background */}
                <div className="h-24 bg-gradient-to-r from-primary-900 to-primary-700 relative">
                   <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   {/* Online Badge */}
                   <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white border border-white/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 bg-health-400 rounded-full animate-pulse"></span> Available
                   </div>
                </div>

                <div className="p-6 relative">
                  {/* Avatar */}
                  <div className="absolute -top-12 left-6 w-20 h-20 bg-white rounded-2xl p-1 shadow-md border border-slate-100">
                    <div className="w-full h-full bg-slate-100 rounded-xl overflow-hidden">
                       <img src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${doc.user.name}`} alt="Doctor" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <div className="mt-10 mb-4">
                    <h3 className="text-xl font-heading font-black text-slate-900 flex items-center gap-2">
                       Dr. {doc.user.name} <ShieldCheck className="w-5 h-5 text-health-500" />
                    </h3>
                    <p className="text-primary-600 font-bold text-sm">{doc.specialization.name}</p>
                  </div>
                  
                  <div className="flex items-center gap-1 text-amber-500 mb-6">
                     <Star className="w-4 h-4 fill-current" />
                     <Star className="w-4 h-4 fill-current" />
                     <Star className="w-4 h-4 fill-current" />
                     <Star className="w-4 h-4 fill-current" />
                     <Star className="w-4 h-4 fill-current" />
                     <span className="text-slate-500 text-xs font-bold ml-1">(120+ Sessions)</span>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100 mb-6">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Consultation Fee</span>
                    <span className="font-heading font-black text-slate-900 text-xl">${doc.fee || '150.00'}</span>
                  </div>

                  <button 
                    onClick={() => handleBookClick(doc)}
                    disabled={processingId === doc.userId}
                    className="w-full bg-health-600 hover:bg-health-700 text-white font-bold font-heading py-4 rounded-xl transition-all shadow-md shadow-health-600/20 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                  >
                    {processingId === doc.userId ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        Book Appointment
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Price Breakdown Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-heading font-black text-xl text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-600" /> Payment Summary
              </h3>
              <button 
                onClick={() => !processingId && setSelectedDoctor(null)}
                className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1"
                disabled={processingId !== null}
              >
                ✕
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${selectedDoctor.user.name}`} alt="Doctor" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Dr. {selectedDoctor.user.name}</h4>
                  <p className="text-sm text-slate-500 font-medium">{selectedDoctor.specialization?.name || selectedDoctor.specialization}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span>Consultation Fee</span>
                  <span>${parseFloat(selectedDoctor.fee || 150).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span>Platform Fee</span>
                  <span>$0.00</span>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-800">Total</span>
                  <span className="font-heading font-black text-2xl text-slate-900">
                    ${parseFloat(selectedDoctor.fee || 150).toFixed(2)}
                  </span>
                </div>
              </div>

              <button 
                onClick={confirmBooking}
                disabled={processingId !== null}
                className="w-full bg-primary-900 hover:bg-primary-800 text-white font-bold font-heading py-4 rounded-xl transition-all shadow-md shadow-primary-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {processingId !== null ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>Proceed to Payment <ArrowLeft className="w-4 h-4 rotate-180" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
