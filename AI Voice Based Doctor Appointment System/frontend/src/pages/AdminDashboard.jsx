import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users, LayoutDashboard, UserPlus, FileText, LogOut, X,
  ShieldCheck, Stethoscope, CalendarClock, TrendingUp, Bell, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDoctorName } from '../utils/doctorName';

const STATUS_COLORS = {
  PENDING:   { bg: 'rgba(245,158,11,0.1)',  color: '#d97706', label: 'Pending'   },
  ACCEPTED:  { bg: 'rgba(5,150,105,0.1)',   color: '#059669', label: 'Confirmed' },
  COMPLETED: { bg: 'rgba(14,116,144,0.1)',  color: '#0e7490', label: 'Completed' },
  REJECTED:  { bg: 'rgba(234,67,53,0.1)',   color: '#dc2626', label: 'Declined'  },
  CANCELLED: { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Cancelled' },
};

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
  const [specializations, setSpecializations] = useState([]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'ADMIN') { navigate('/dashboard'); return; }
    fetchStats();
    fetchSpecializations();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'doctors') fetchDoctors();
    if (activeTab === 'patients') fetchPatients();
    if (activeTab === 'appointments') fetchAppointments();
  }, [activeTab]);

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const fetchStats = async () => {
    try { const res = await axios.get('http://localhost:5000/api/admin/dashboard', auth()); setStats(res.data); }
    catch (e) { console.error(e); }
  };
  const fetchSpecializations = async () => {
    try { const res = await axios.get('http://localhost:5000/api/doctors/specializations', auth()); setSpecializations(res.data); }
    catch (e) { console.error(e); }
  };
  const fetchDoctors = async () => {
    try { const res = await axios.get('http://localhost:5000/api/admin/doctors', auth()); setDoctors(res.data); }
    catch (e) { console.error(e); }
  };
  const fetchPatients = async () => {
    try { const res = await axios.get('http://localhost:5000/api/admin/patients', auth()); setPatients(res.data); }
    catch (e) { console.error(e); }
  };
  const fetchAppointments = async () => {
    try { const res = await axios.get('http://localhost:5000/api/admin/appointments', auth()); setAppointments(res.data); }
    catch (e) { console.error(e); }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await axios.post('http://localhost:5000/api/admin/doctors', newDoctor, auth());
      setIsAddDoctorModalOpen(false);
      setNewDoctor({ name: '', email: '', password: '', specializationId: '', fee: '' });
      fetchDoctors(); fetchStats();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create doctor. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const navItems = [
    { key: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
    { key: 'doctors',      icon: Stethoscope,     label: 'Doctors'      },
    { key: 'patients',     icon: Users,           label: 'Patients'     },
    { key: 'appointments', icon: CalendarClock,   label: 'Appointments' },
  ];

  const tabTitle = {
    dashboard:    { title: 'Overview',     sub: 'System-wide statistics at a glance' },
    doctors:      { title: 'Doctors',      sub: 'Manage registered medical professionals' },
    patients:     { title: 'Patients',     sub: 'All registered patient accounts' },
    appointments: { title: 'Appointments', sub: 'All appointments across the system' },
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">

      {/* ── Top Nav — matches patient / doctor header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">+</div>
            <span className="font-heading font-black text-slate-900 text-lg tracking-tight hidden sm:block">CareBridge</span>
            <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:block">Admin</span>
          </div>

          {/* Center nav */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-6">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`font-bold text-sm flex items-center gap-1.5 transition-colors cursor-pointer relative ${
                  activeTab === item.key ? 'text-primary-700' : 'text-slate-500 hover:text-primary-600'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {activeTab === item.key && (
                  <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-primary-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {activeTab === 'doctors' && (
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setIsAddDoctorModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-sm cursor-pointer transition-all"
                style={{ background: 'linear-gradient(135deg,#0e7490,#059669)', boxShadow: '0 3px 10px rgba(14,116,144,0.3)' }}
              >
                <UserPlus className="w-4 h-4" /> Add Doctor
              </motion.button>
            )}
            <div className="w-px h-6 bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm border border-primary-200">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="hidden sm:block text-sm">
                <p className="font-bold text-slate-900 leading-none">{user?.name || 'Admin'}</p>
                <p className="text-slate-500 text-xs">Administrator</p>
              </div>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="ml-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer" title="Sign Out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="md:hidden flex border-t border-slate-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === item.key ? 'text-primary-700 border-b-2 border-primary-600' : 'text-slate-400 border-b-2 border-transparent'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main content ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Page title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-heading font-black text-slate-900">{tabTitle[activeTab].title}</h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">{tabTitle[activeTab].sub}</p>
            </div>
            {activeTab === 'doctors' && (
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setIsAddDoctorModalOpen(true)}
                className="md:hidden flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-sm cursor-pointer"
                style={{ background: 'linear-gradient(135deg,#0e7490,#059669)' }}
              >
                <UserPlus className="w-4 h-4" /> Add
              </motion.button>
            )}
          </div>

          {/* ── Dashboard stats ── */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: 'Total Doctors',       value: stats.totalDoctors,       icon: Stethoscope,   color: '#0e7490', bg: 'rgba(14,116,144,0.1)',  border: 'rgba(14,116,144,0.2)'  },
                { label: 'Total Patients',       value: stats.totalPatients,      icon: Users,         color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.18)' },
                { label: 'Total Appointments',   value: stats.totalAppointments,  icon: CalendarClock, color: '#059669', bg: 'rgba(5,150,105,0.1)',   border: 'rgba(5,150,105,0.2)'   },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, type: 'spring', stiffness: 120 }}
                  className="rounded-2xl p-6"
                  style={{ background: 'white', border: `1px solid ${stat.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#94a3b8' }}>{stat.label}</p>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg }}>
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="text-4xl font-heading font-black" style={{ color: '#0f172a' }}>{stat.value}</p>
                  <div className="flex items-center gap-1 mt-3">
                    <TrendingUp className="w-3 h-3" style={{ color: stat.color }} />
                    <span className="text-[10px] font-bold" style={{ color: stat.color }}>System total</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Doctors table ── */}
          {activeTab === 'doctors' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl overflow-hidden"
              style={{ background: 'white', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            >
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(248,250,252,0.8)' }}>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-slate-800 text-base">Registered Doctors</h2>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full" style={{ background: 'rgba(14,116,144,0.1)', color: '#0e7490' }}>{doctors.length}</span>
                </div>
              </div>
              {doctors.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(0,0,0,0.04)' }}>
                    <Stethoscope className="w-7 h-7 text-slate-300" />
                  </div>
                  <h3 className="font-heading font-bold text-slate-600 mb-1">No doctors yet</h3>
                  <p className="text-slate-400 text-sm font-medium">Add your first doctor using the button above.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {doctors.map((doc, idx) => (
                    <motion.div
                      key={doc.userId}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, type: 'spring' }}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-4 transition-colors"
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,116,144,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${doc.user.name}&backgroundColor=0e7490`}
                          alt={doc.user.name}
                          className="w-10 h-10 rounded-full border shrink-0"
                          style={{ borderColor: 'rgba(14,116,144,0.3)' }}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">
                              {formatDoctorName(doc.user.name, doc.user.name)}
                          </p>
                          <p className="text-slate-500 text-xs truncate">{doc.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-6 flex-wrap pl-13 sm:pl-0">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: 'rgba(14,116,144,0.08)', color: '#0e7490', border: '1px solid rgba(14,116,144,0.15)' }}>
                          {doc.specialization?.name || 'General'}
                        </span>
                        <span className="text-sm font-black text-slate-800">${parseFloat(doc.fee || 0).toFixed(0)}<span className="text-xs font-medium text-slate-400">/visit</span></span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Patients table ── */}
          {activeTab === 'patients' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl overflow-hidden"
              style={{ background: 'white', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            >
              <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(248,250,252,0.8)' }}>
                <h2 className="font-heading font-bold text-slate-800 text-base">Registered Patients</h2>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full" style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed' }}>{patients.length}</span>
              </div>
              {patients.length === 0 ? (
                <div className="py-16 flex flex-col items-center">
                  <Users className="w-7 h-7 text-slate-300 mb-3" />
                  <p className="font-bold text-slate-500">No patients registered yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {patients.map((p, idx) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, type: 'spring' }}
                      className="flex items-center gap-4 px-6 py-4 transition-colors"
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <img
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${p.name}&backgroundColor=e2e8f0`}
                        alt={p.name}
                        className="w-10 h-10 rounded-full border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{p.name}</p>
                        <p className="text-slate-500 text-xs truncate">{p.email}</p>
                      </div>
                      <p className="text-xs text-slate-400 font-medium shrink-0">
                        {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Appointments table ── */}
          {activeTab === 'appointments' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl overflow-hidden"
              style={{ background: 'white', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            >
              <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(248,250,252,0.8)' }}>
                <h2 className="font-heading font-bold text-slate-800 text-base">All Appointments</h2>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>{appointments.length}</span>
              </div>
              {appointments.length === 0 ? (
                <div className="py-16 flex flex-col items-center">
                  <CalendarClock className="w-7 h-7 text-slate-300 mb-3" />
                  <p className="font-bold text-slate-500">No appointments found.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {appointments.map((a, idx) => {
                    const s = STATUS_COLORS[a.status] || STATUS_COLORS.PENDING;
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04, type: 'spring' }}
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 px-6 py-4 transition-colors"
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.01)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Patient + doctor */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <img
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${a.patient?.name}&backgroundColor=e2e8f0`}
                            alt={a.patient?.name}
                            className="w-9 h-9 rounded-full border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{a.patient?.name}</p>
                            <p className="text-slate-500 text-xs truncate">
                              {formatDoctorName(a.doctor?.name, a.doctor?.name || '—')}
                            </p>
                          </div>
                        </div>
                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap pl-12 sm:pl-0">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                            style={{
                              background: a.type === 'ON_DEMAND' ? 'rgba(124,58,237,0.08)' : 'rgba(59,130,246,0.08)',
                              color: a.type === 'ON_DEMAND' ? '#7c3aed' : '#2563eb'
                            }}>
                            {a.type === 'ON_DEMAND' ? 'Live' : 'Scheduled'}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                            style={{ background: s.bg, color: s.color }}>
                            {s.label}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

        </div>
      </main>

      {/* ── Add Doctor Modal ── */}
      <AnimatePresence>
        {isAddDoctorModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
            onClick={e => { if (e.target === e.currentTarget) setIsAddDoctorModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: 'rgba(248,250,252,0.8)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,116,144,0.1)' }}>
                    <UserPlus className="w-4.5 h-4.5" style={{ color: '#0e7490' }} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-slate-900 text-base">Add New Doctor</h3>
                    <p className="text-xs text-slate-400 font-medium">Create a doctor account</p>
                  </div>
                </div>
                <button onClick={() => setIsAddDoctorModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddDoctor} className="p-6 space-y-4">
                {formError && (
                  <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(234,67,53,0.08)', color: '#dc2626', border: '1px solid rgba(234,67,53,0.2)' }}>
                    {formError}
                  </div>
                )}

                {[
                  { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Dr. Jane Smith' },
                  { label: 'Email',     key: 'email', type: 'email', placeholder: 'doctor@example.com' },
                  { label: 'Password',  key: 'password', type: 'password', placeholder: '••••••••' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      required
                      placeholder={field.placeholder}
                      value={newDoctor[field.key]}
                      onChange={e => setNewDoctor({ ...newDoctor, [field.key]: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-sm text-slate-800 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Specialization</label>
                  <select
                    required
                    value={newDoctor.specializationId}
                    onChange={e => setNewDoctor({ ...newDoctor, specializationId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-sm text-slate-800 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white"
                  >
                    <option value="">Select specialization…</option>
                    {specializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Consultation Fee ($)</label>
                  <input
                    type="number" required min="0" step="0.01"
                    placeholder="50.00"
                    value={newDoctor.fee}
                    onChange={e => setNewDoctor({ ...newDoctor, fee: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-sm text-slate-800 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white cursor-pointer transition-all mt-2 flex items-center justify-center gap-2"
                  style={{ background: formLoading ? '#94a3b8' : 'linear-gradient(135deg,#0e7490,#059669)', boxShadow: formLoading ? 'none' : '0 4px 14px rgba(14,116,144,0.3)' }}
                >
                  {formLoading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
                  ) : (
                    <><Check className="w-4 h-4" /> Create Doctor</>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
