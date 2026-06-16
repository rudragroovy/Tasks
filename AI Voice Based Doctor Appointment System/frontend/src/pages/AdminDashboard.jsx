import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, LayoutDashboard, UserPlus, FileText, Settings, LogOut, Check, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ totalDoctors: 0, totalPatients: 0, totalAppointments: 0 });
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ name: '', email: '', password: '', specializationId: '', fee: '' });

  // Add Specializations state
  const [specializations, setSpecializations] = useState([]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    fetchStats();
    fetchSpecializations();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'doctors') fetchDoctors();
    if (activeTab === 'patients') fetchPatients();
    if (activeTab === 'appointments') fetchAppointments();
  }, [activeTab]);

  const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/dashboard', getHeaders());
      setStats(res.data);
    } catch (e) { 
      console.error('Fetch Stats Error:', e);
      if(e.response) alert('Stats error: ' + e.response.status);
    }
  };

  const fetchSpecializations = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/doctors/specializations', getHeaders());
      setSpecializations(res.data);
    } catch (e) { 
      console.error('Fetch Spec Error:', e); 
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/doctors', getHeaders());
      setDoctors(res.data);
    } catch (e) { 
      console.error('Fetch Doctors Error:', e);
      if(e.response) alert('Doctors error: ' + e.response.status);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/patients', getHeaders());
      setPatients(res.data);
    } catch (e) { 
      console.error('Fetch Patients Error:', e);
      if(e.response) alert('Patients error: ' + e.response.status);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/appointments', getHeaders());
      setAppointments(res.data);
    } catch (e) { 
      console.error('Fetch Appt Error:', e);
      if(e.response) alert('Appointments error: ' + e.response.status);
    }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/admin/doctors', newDoctor, getHeaders());
      setIsAddDoctorModalOpen(false);
      setNewDoctor({ name: '', email: '', password: '', specializationId: '', fee: '' });
      fetchDoctors();
      fetchStats();
      alert('Doctor created successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add doctor');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          <div className="p-6">
             <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                   <ShieldCheck className="w-5 h-5 text-slate-900" />
                </div>
                <span className="font-heading font-black text-white text-xl tracking-tight">Admin Portal</span>
             </div>
          </div>

          <nav className="mt-8 px-4 space-y-2">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
               <LayoutDashboard className="w-5 h-5" /> Dashboard
            </button>
            <button onClick={() => setActiveTab('doctors')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'doctors' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
               <Users className="w-5 h-5" /> Doctors
            </button>
            <button onClick={() => setActiveTab('patients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'patients' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
               <Users className="w-5 h-5" /> Patients
            </button>
            <button onClick={() => setActiveTab('appointments')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'appointments' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
               <FileText className="w-5 h-5" /> Appointments
            </button>
          </nav>
        </div>

        <div className="p-4">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between z-10 shrink-0">
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-800 capitalize">{activeTab}</h1>
            <p className="text-sm text-slate-500 font-medium">Manage system resources</p>
          </div>
          {activeTab === 'doctors' && (
            <button onClick={() => setIsAddDoctorModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-900 text-white rounded-lg font-bold text-sm hover:bg-primary-800 transition-colors">
              <UserPlus className="w-4 h-4" /> Add Doctor
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 z-10 bg-slate-50">
          
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 border shadow-sm">
                <p className="text-sm font-bold text-slate-500 uppercase">Total Doctors</p>
                <p className="text-4xl font-black text-slate-800 mt-2">{stats.totalDoctors}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border shadow-sm">
                <p className="text-sm font-bold text-slate-500 uppercase">Total Patients</p>
                <p className="text-4xl font-black text-slate-800 mt-2">{stats.totalPatients}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border shadow-sm">
                <p className="text-sm font-bold text-slate-500 uppercase">Total Appointments</p>
                <p className="text-4xl font-black text-slate-800 mt-2">{stats.totalAppointments}</p>
              </div>
            </div>
          )}

          {activeTab === 'doctors' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                    <th className="p-4 font-bold uppercase">Name</th>
                    <th className="p-4 font-bold uppercase">Email</th>
                    <th className="p-4 font-bold uppercase">Specialization</th>
                    <th className="p-4 font-bold uppercase">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map(doc => (
                    <tr key={doc.userId} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">{doc.user.name}</td>
                      <td className="p-4 text-slate-600">{doc.user.email}</td>
                      <td className="p-4 text-slate-600">{doc.specialization?.name}</td>
                      <td className="p-4 font-medium text-slate-800">${parseFloat(doc.fee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {doctors.length === 0 && <p className="p-8 text-center text-slate-500">No doctors found.</p>}
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                    <th className="p-4 font-bold uppercase">Name</th>
                    <th className="p-4 font-bold uppercase">Email</th>
                    <th className="p-4 font-bold uppercase">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">{p.name}</td>
                      <td className="p-4 text-slate-600">{p.email}</td>
                      <td className="p-4 text-slate-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                    <th className="p-4 font-bold uppercase">Patient</th>
                    <th className="p-4 font-bold uppercase">Doctor</th>
                    <th className="p-4 font-bold uppercase">Type</th>
                    <th className="p-4 font-bold uppercase">Status</th>
                    <th className="p-4 font-bold uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">{a.patient?.name}</td>
                      <td className="p-4 font-medium text-slate-600">{a.doctor?.name}</td>
                      <td className="p-4 text-slate-600 text-xs">{a.type}</td>
                      <td className="p-4 text-slate-800 font-bold text-xs">{a.status}</td>
                      <td className="p-4 text-slate-500 text-sm">{new Date(a.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Doctor Modal */}
      <AnimatePresence>
        {isAddDoctorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg">Add New Doctor</h3>
                <button onClick={() => setIsAddDoctorModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddDoctor} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Name</label>
                  <input type="text" required value={newDoctor.name} onChange={e => setNewDoctor({...newDoctor, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Email</label>
                  <input type="email" required value={newDoctor.email} onChange={e => setNewDoctor({...newDoctor, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Password</label>
                  <input type="password" required value={newDoctor.password} onChange={e => setNewDoctor({...newDoctor, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Specialization</label>
                  <select required value={newDoctor.specializationId} onChange={e => setNewDoctor({...newDoctor, specializationId: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="">Select Specialization</option>
                    {specializations.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Fee ($)</label>
                  <input type="number" required value={newDoctor.fee} onChange={e => setNewDoctor({...newDoctor, fee: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <button type="submit" className="w-full py-3 bg-primary-900 text-white font-bold rounded-lg hover:bg-primary-800 transition-colors mt-6">
                  Create Doctor
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
