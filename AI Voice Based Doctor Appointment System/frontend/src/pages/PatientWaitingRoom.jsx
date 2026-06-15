import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Stethoscope, Video, Clock } from 'lucide-react';

export default function PatientWaitingRoom() {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('id');

  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    if (!appointmentId) return;

    const fetchAppointment = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/appointments`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const appt = res.data.find(a => a.id === appointmentId);
        if (appt) {
          setAppointment(appt);
          if (appt.status === 'ACCEPTED') {
            navigate(`/room/${appt.id}`);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchAppointment();
  }, [appointmentId, navigate]);

  useEffect(() => {
    if (!socket || !appointmentId) return;

    const handleUpdate = (updatedAppt) => {
      if (updatedAppt.id === appointmentId) {
        setAppointment(updatedAppt);
        if (updatedAppt.status === 'ACCEPTED') {
          navigate(`/room/${updatedAppt.id}`);
        } else if (updatedAppt.status === 'REJECTED') {
          alert('The doctor rejected the request.');
          navigate('/dashboard');
        }
      }
    };

    socket.on('appointment:updated', handleUpdate);

    return () => {
      socket.off('appointment:updated', handleUpdate);
    };
  }, [socket, appointmentId, navigate]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-200 blur-[150px] pointer-events-none opacity-40"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-health-200 blur-[150px] pointer-events-none opacity-40"></div>

      {/* Top Navbar */}
      <nav className="relative z-10 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm px-6 py-4 flex items-center justify-between">
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
          <ArrowLeft className="w-4 h-4" /> Exit Queue
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
          
          {/* Header Banner */}
          <div className="bg-primary-900 p-8 text-center relative overflow-hidden">
             {/* Decorative glow inside banner */}
             <div className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-800 to-health-900 opacity-90"></div>
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-health-500 rounded-full blur-[40px] opacity-30"></div>
             
             <div className="relative z-10">
               <h2 className="text-white font-heading font-black text-2xl tracking-tight mb-2">Virtual Waiting Room</h2>
               <p className="text-primary-100 font-medium text-sm">You are next in line for consultation.</p>
             </div>
          </div>

          <div className="p-8 pt-10 flex flex-col items-center">
             
             {/* Pulsing Avatar/Loader */}
             <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                {/* Outer pulsing rings */}
                <div className="absolute inset-0 rounded-full border-4 border-health-100 animate-ping opacity-75"></div>
                <div className="absolute inset-2 rounded-full border-4 border-health-200 animate-pulse"></div>
                
                {/* Center Avatar */}
                <div className="absolute inset-4 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden z-10">
                   <img 
                     src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${appointment?.doctor?.name || 'Loading'}`} 
                     alt="Doctor" 
                     className="w-full h-full object-cover"
                   />
                </div>
                
                {/* Floating Video Icon */}
                <div className="absolute bottom-0 right-0 w-10 h-10 bg-health-500 rounded-full border-4 border-white flex items-center justify-center z-20 shadow-md">
                   <Video className="w-4 h-4 text-white" />
                </div>
             </div>

             <h3 className="font-heading font-bold text-2xl text-slate-900 mb-1 text-center">
               Waiting for Dr. {appointment?.doctor?.name || '...'}
             </h3>
             <p className="text-slate-500 font-medium text-center mb-8">
               The doctor is reviewing your triage notes and will admit you to the video room shortly.
             </p>

             {/* Status Box */}
             <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                   <Clock className="w-6 h-6 text-health-500 animate-pulse" />
                </div>
                <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Current Status</p>
                   <p className="font-bold text-slate-700">Connecting to secure room...</p>
                </div>
             </div>

          </div>
        </div>
        
        {/* Secure Note */}
        <p className="mt-8 flex items-center gap-2 text-sm font-medium text-slate-400">
           <Stethoscope className="w-4 h-4" /> End-to-end encrypted telemedicine session
        </p>
      </main>
    </div>
  );
}
