import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users,
  LayoutDashboard,
  UserPlus,
  LogOut,
  X,
  Stethoscope,
  CalendarClock,
  TrendingUp,
  Check,
  Search,
  Filter,
  RotateCcw,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDoctorName } from '../utils/doctorName';
import AppIcon from '../components/branding/AppIcon';

const STATUS_COLORS = {
  PENDING: { bg: 'rgba(245,158,11,0.1)', color: '#d97706', label: 'Pending' },
  ACCEPTED: { bg: 'rgba(5,150,105,0.1)', color: '#059669', label: 'Confirmed' },
  COMPLETED: { bg: 'rgba(14,116,144,0.1)', color: '#0e7490', label: 'Completed' },
  REJECTED: { bg: 'rgba(234,67,53,0.1)', color: '#dc2626', label: 'Declined' },
  CANCELLED: { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Cancelled' },
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_APPOINTMENT_FILTERS = {
  q: '',
  status: 'ALL',
  mode: 'ALL',
  type: 'ALL',
  doctorId: 'ALL',
  patientId: 'ALL',
  dateFrom: '',
  dateTo: '',
};

const DEFAULT_APPOINTMENT_PAGINATION = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ totalDoctors: 0, totalPatients: 0, totalAppointments: 0 });
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [appointmentActionLoading, setAppointmentActionLoading] = useState('');
  const [appointmentActionNotice, setAppointmentActionNotice] = useState('');
  const [appointmentActionNoticeType, setAppointmentActionNoticeType] = useState('success');
  const [appointmentFilters, setAppointmentFilters] = useState(DEFAULT_APPOINTMENT_FILTERS);
  const [appointmentPagination, setAppointmentPagination] = useState(DEFAULT_APPOINTMENT_PAGINATION);
  const [appointmentPageSize, setAppointmentPageSize] = useState(DEFAULT_APPOINTMENT_PAGINATION.pageSize);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassignDoctorId, setReassignDoctorId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [auditTarget, setAuditTarget] = useState(null);
  const [auditEntries, setAuditEntries] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    email: '',
    password: '',
    specializationId: '',
    fee: ''
  });
  const [specializations, setSpecializations] = useState([]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const auth = useCallback(
    () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
    []
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/dashboard`, auth());
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  }, [auth]);

  const fetchSpecializations = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/doctors/specializations`, auth());
      setSpecializations(res.data);
    } catch (error) {
      console.error(error);
    }
  }, [auth]);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/doctors`, auth());
      setDoctors(res.data);
    } catch (error) {
      console.error(error);
    }
  }, [auth]);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/patients`, auth());
      setPatients(res.data);
    } catch (error) {
      console.error(error);
    }
  }, [auth]);

  const fetchAppointments = useCallback(async ({
    filters = appointmentFilters,
    page = 1,
    pageSize = appointmentPageSize
  } = {}) => {
    try {
      setAppointmentsLoading(true);
      setAppointmentsError('');
      const params = Object.entries(filters || {}).reduce((acc, [key, value]) => {
        if (value !== '' && value !== 'ALL' && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});
      params.page = page;
      params.pageSize = pageSize;

      const res = await axios.get(`${API_URL}/api/admin/appointments`, { ...auth(), params });
      const payload = res.data || {};
      const items = Array.isArray(payload) ? payload : (payload.items || []);
      const pagination = payload.pagination || {
        page,
        pageSize,
        total: items.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      };
      setAppointments(items);
      setAppointmentPagination(pagination);
    } catch (error) {
      console.error(error);
      setAppointmentsError(error?.response?.data?.error || 'Failed to fetch appointments');
    } finally {
      setAppointmentsLoading(false);
    }
  }, [appointmentFilters, appointmentPageSize, auth]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }

    const timerId = window.setTimeout(() => {
      fetchStats();
      fetchSpecializations();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [user, navigate, fetchStats, fetchSpecializations]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      if (activeTab === 'doctors') {
        fetchDoctors();
        return;
      }
      if (activeTab === 'patients') {
        fetchPatients();
        return;
      }
      if (activeTab === 'appointments') {
        fetchAppointments();
        fetchDoctors();
        fetchPatients();
      }
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [activeTab, fetchAppointments, fetchDoctors, fetchPatients]);

  const handleAddDoctor = async (event) => {
    event.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      await axios.post(`${API_URL}/api/admin/doctors`, newDoctor, auth());
      setIsAddDoctorModalOpen(false);
      setNewDoctor({ name: '', email: '', password: '', specializationId: '', fee: '' });
      await Promise.all([fetchDoctors(), fetchStats()]);
    } catch (error) {
      setFormError(error?.response?.data?.error || 'Failed to create doctor. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAppointmentFilterChange = (key, value) => {
    setAppointmentFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyAppointmentFilters = () => {
    fetchAppointments({ filters: appointmentFilters, page: 1, pageSize: appointmentPageSize });
  };

  const resetAppointmentFilters = () => {
    setAppointmentFilters(DEFAULT_APPOINTMENT_FILTERS);
    setAppointmentActionNotice('');
    fetchAppointments({ filters: DEFAULT_APPOINTMENT_FILTERS, page: 1, pageSize: appointmentPageSize });
  };

  const handleCancelAppointment = async (appointmentId) => {
    const reasonInput = window.prompt('Reason for cancellation (optional):', '');
    if (reasonInput === null) return;

    try {
      setAppointmentActionLoading(`cancel:${appointmentId}`);
      setAppointmentActionNotice('');
      setAppointmentActionNoticeType('success');

      await axios.patch(
        `${API_URL}/api/admin/appointments/${appointmentId}/cancel`,
        { reason: reasonInput },
        auth()
      );
      await Promise.all([
        fetchAppointments({
          filters: appointmentFilters,
          page: appointmentPagination.page,
          pageSize: appointmentPagination.pageSize
        }),
        fetchStats()
      ]);

      setAppointmentActionNotice('Appointment cancelled.');
      setAppointmentActionNoticeType('success');
    } catch (error) {
      console.error(error);
      setAppointmentActionNotice(error?.response?.data?.error || 'Failed to cancel appointment.');
      setAppointmentActionNoticeType('error');
    } finally {
      setAppointmentActionLoading('');
    }
  };

  const openReassignModal = (appointment) => {
    const alternativeDoctors = doctors.filter((doc) => doc.userId !== appointment?.doctorId);
    setReassignTarget(appointment);
    setReassignDoctorId(alternativeDoctors[0]?.userId || '');
    setReassignReason('');
    setAppointmentActionNotice('');
  };

  const closeReassignModal = () => {
    setReassignTarget(null);
    setReassignDoctorId('');
    setReassignReason('');
  };

  const handleReassignAppointment = async () => {
    if (!reassignTarget?.id || !reassignDoctorId) return;

    try {
      setAppointmentActionLoading(`reassign:${reassignTarget.id}`);
      setAppointmentActionNotice('');
      setAppointmentActionNoticeType('success');

      await axios.patch(
        `${API_URL}/api/admin/appointments/${reassignTarget.id}/reassign`,
        { doctorId: reassignDoctorId, reason: reassignReason },
        auth()
      );

      closeReassignModal();
      await fetchAppointments({
        filters: appointmentFilters,
        page: appointmentPagination.page,
        pageSize: appointmentPagination.pageSize
      });
      setAppointmentActionNotice('Appointment reassigned.');
      setAppointmentActionNoticeType('success');
    } catch (error) {
      console.error(error);
      setAppointmentActionNotice(error?.response?.data?.error || 'Failed to reassign appointment.');
      setAppointmentActionNoticeType('error');
    } finally {
      setAppointmentActionLoading('');
    }
  };

  const handleAppointmentPageChange = (nextPage) => {
    fetchAppointments({
      filters: appointmentFilters,
      page: nextPage,
      pageSize: appointmentPagination.pageSize
    });
  };

  const handleAppointmentPageSizeChange = (nextSize) => {
    const parsed = Number.parseInt(nextSize, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setAppointmentPageSize(parsed);
    fetchAppointments({
      filters: appointmentFilters,
      page: 1,
      pageSize: parsed
    });
  };

  const openAuditModal = async (appointment) => {
    setAuditTarget(appointment);
    setAuditEntries([]);
    setAuditLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/appointments/${appointment.id}/audit`, auth());
      setAuditEntries(Array.isArray(res.data?.entries) ? res.data.entries : []);
    } catch (error) {
      console.error(error);
      setAppointmentActionNotice(error?.response?.data?.error || 'Failed to load appointment audit log.');
      setAppointmentActionNoticeType('error');
    } finally {
      setAuditLoading(false);
    }
  };

  const closeAuditModal = () => {
    setAuditTarget(null);
    setAuditEntries([]);
    setAuditLoading(false);
  };

  useEffect(() => {
    if (!reassignTarget && !auditTarget && !isAddDoctorModalOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (isAddDoctorModalOpen) {
        setIsAddDoctorModalOpen(false);
        return;
      }
      if (auditTarget) {
        closeAuditModal();
        return;
      }
      if (reassignTarget) {
        closeReassignModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [reassignTarget, auditTarget, isAddDoctorModalOpen]);

  const reassignOptions = useMemo(
    () => doctors.filter((doc) => doc.userId !== reassignTarget?.doctorId),
    [doctors, reassignTarget]
  );

  const navItems = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { key: 'doctors', icon: Stethoscope, label: 'Doctors' },
    { key: 'patients', icon: Users, label: 'Patients' },
    { key: 'appointments', icon: CalendarClock, label: 'Appointments' },
  ];

  const tabTitle = {
    dashboard: { title: 'Overview', sub: 'System-wide statistics at a glance' },
    doctors: { title: 'Doctors', sub: 'Manage registered medical professionals' },
    patients: { title: 'Patients', sub: 'All registered patient accounts' },
    appointments: { title: 'Appointments', sub: 'Filter, cancel, and reassign appointment flow' },
  };

  const getAuditActionLabel = (action) => {
    if (action === 'CANCEL') return 'Cancelled';
    if (action === 'REASSIGN') return 'Reassigned';
    return action || 'Updated';
  };

  const formatAuditDateTime = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown time';
    return parsed.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppIcon size={32} />
            <span className="font-heading font-black text-slate-900 text-lg tracking-tight hidden sm:block">CareBridge</span>
            <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:block">Admin</span>
          </div>

          <div className="hidden md:flex flex-1 items-center justify-center gap-6">
            {navItems.map((item) => (
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

          <div className="flex items-center gap-3">
            {activeTab === 'doctors' && (
              <button
                onClick={() => setIsAddDoctorModalOpen(true)}
                className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-sm cursor-pointer transition-all"
                style={{ background: 'linear-gradient(135deg,#0e7490,#059669)' }}
              >
                <UserPlus className="w-4 h-4" /> Add Doctor
              </button>
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
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="ml-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="md:hidden flex border-t border-slate-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {navItems.map((item) => (
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

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-heading font-black text-slate-900">{tabTitle[activeTab].title}</h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">{tabTitle[activeTab].sub}</p>
            </div>
            {activeTab === 'doctors' && (
              <button
                onClick={() => setIsAddDoctorModalOpen(true)}
                className="md:hidden flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-sm cursor-pointer"
                style={{ background: 'linear-gradient(135deg,#0e7490,#059669)' }}
              >
                <UserPlus className="w-4 h-4" /> Add
              </button>
            )}
          </div>

          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: 'Total Doctors', value: stats.totalDoctors, icon: Stethoscope, color: '#0e7490', bg: 'rgba(14,116,144,0.1)', border: 'rgba(14,116,144,0.2)' },
                { label: 'Total Patients', value: stats.totalPatients, icon: Users, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.18)' },
                { label: 'Total Appointments', value: stats.totalAppointments, icon: CalendarClock, color: '#059669', bg: 'rgba(5,150,105,0.1)', border: 'rgba(5,150,105,0.2)' },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-6"
                  style={{ background: 'white', border: `1px solid ${stat.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">{stat.label}</p>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg }}>
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="text-4xl font-heading font-black text-slate-900">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-3">
                    <TrendingUp className="w-3 h-3" style={{ color: stat.color }} />
                    <span className="text-[10px] font-bold" style={{ color: stat.color }}>System total</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'doctors' && (
            <div className="rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-slate-800 text-base">Registered Doctors</h2>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-700">{doctors.length}</span>
                </div>
              </div>
              {doctors.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-center">
                  <Stethoscope className="w-7 h-7 text-slate-300 mb-3" />
                  <p className="font-bold text-slate-500">No doctors yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {doctors.map((doc) => (
                    <div key={doc.userId} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{formatDoctorName(doc.user?.name, doc.user?.name)}</p>
                        <p className="text-slate-500 text-xs truncate">{doc.user?.email}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-bold px-3 py-1 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200">
                          {doc.specialization?.name || 'General'}
                        </span>
                        <span className="text-sm font-black text-slate-800">${parseFloat(doc.fee || 0).toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              <div className="px-6 py-4 flex items-center gap-2 border-b border-slate-100 bg-slate-50/70">
                <h2 className="font-heading font-bold text-slate-800 text-base">Registered Patients</h2>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">{patients.length}</span>
              </div>
              {patients.length === 0 ? (
                <div className="py-16 flex flex-col items-center">
                  <Users className="w-7 h-7 text-slate-300 mb-3" />
                  <p className="font-bold text-slate-500">No patients registered yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {patients.map((patient) => (
                    <div key={patient.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{patient.name}</p>
                        <p className="text-slate-500 text-xs truncate">{patient.email}</p>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">
                        {new Date(patient.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              <div className="px-6 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-slate-800 text-base">Appointment Control Center</h2>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{appointmentPagination.total}</span>
                </div>
                <div className="text-xs font-bold text-slate-500">Filter, cancel, and reassign</div>
              </div>

              <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/40 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={appointmentFilters.q}
                      onChange={(e) => handleAppointmentFilterChange('q', e.target.value)}
                      placeholder="Search patient, doctor, email, ID"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                    />
                  </div>

                  <select
                    value={appointmentFilters.status}
                    onChange={(e) => handleAppointmentFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>

                  <select
                    value={appointmentFilters.mode}
                    onChange={(e) => handleAppointmentFilterChange('mode', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  >
                    <option value="ALL">All Modes</option>
                    <option value="VIDEO">Video</option>
                    <option value="AUDIO">Audio</option>
                    <option value="IN_PERSON">In-Person</option>
                  </select>

                  <select
                    value={appointmentFilters.type}
                    onChange={(e) => handleAppointmentFilterChange('type', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  >
                    <option value="ALL">All Types</option>
                    <option value="ON_DEMAND">Consult Now</option>
                    <option value="SCHEDULED">Scheduled</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <select
                    value={appointmentFilters.doctorId}
                    onChange={(e) => handleAppointmentFilterChange('doctorId', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  >
                    <option value="ALL">All Doctors</option>
                    {doctors.map((doc) => (
                      <option key={doc.userId} value={doc.userId}>
                        {formatDoctorName(doc.user?.name, doc.user?.name)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={appointmentFilters.patientId}
                    onChange={(e) => handleAppointmentFilterChange('patientId', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  >
                    <option value="ALL">All Patients</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>{patient.name}</option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={appointmentFilters.dateFrom}
                    onChange={(e) => handleAppointmentFilterChange('dateFrom', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  />

                  <input
                    type="date"
                    value={appointmentFilters.dateTo}
                    onChange={(e) => handleAppointmentFilterChange('dateTo', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label htmlFor="admin-appointments-page-size" className="text-xs font-bold text-slate-500">Rows</label>
                    <select
                      id="admin-appointments-page-size"
                      value={appointmentPagination.pageSize}
                      onChange={(event) => handleAppointmentPageSizeChange(event.target.value)}
                      disabled={appointmentsLoading}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none disabled:opacity-50"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <button
                    onClick={applyAppointmentFilters}
                    disabled={appointmentsLoading}
                    className="px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ background: 'linear-gradient(135deg,#0e7490,#059669)' }}
                  >
                    <Filter className="w-4 h-4" /> Apply Filters
                  </button>
                  <button
                    onClick={resetAppointmentFilters}
                    disabled={appointmentsLoading}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                  {appointmentActionNotice && (
                    <span
                      className={`text-xs font-bold rounded-lg px-2.5 py-1 border ${
                        appointmentActionNoticeType === 'error'
                          ? 'text-red-700 bg-red-50 border-red-200'
                          : 'text-primary-700 bg-primary-50 border-primary-200'
                      }`}
                    >
                      {appointmentActionNotice}
                    </span>
                  )}
                </div>
              </div>

              {appointmentsLoading ? (
                <div className="py-16 flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="font-bold text-slate-500">Loading appointments...</p>
                </div>
              ) : appointmentsError ? (
                <div className="py-16 flex flex-col items-center text-center px-6">
                  <CalendarClock className="w-7 h-7 text-red-300 mb-3" />
                  <p className="font-bold text-red-600">{appointmentsError}</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="py-16 flex flex-col items-center">
                  <CalendarClock className="w-7 h-7 text-slate-300 mb-3" />
                  <p className="font-bold text-slate-500">No appointments found for selected filters.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {appointments.map((appointment) => {
                    const statusColor = STATUS_COLORS[appointment.status] || STATUS_COLORS.PENDING;
                    const modeLabel = appointment.consultationMode === 'IN_PERSON'
                      ? 'In-Person'
                      : appointment.consultationMode === 'AUDIO'
                        ? 'Audio'
                        : 'Video';
                    const isFinal = ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(appointment.status);
                    const cancelLoading = appointmentActionLoading === `cancel:${appointment.id}`;
                    const hasAlternativeDoctor = doctors.some((doc) => doc.userId !== appointment.doctorId);

                    return (
                      <div key={appointment.id} className="px-4 sm:px-6 py-4 flex flex-col xl:flex-row xl:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {appointment.familyMember?.name || appointment.patient?.name}
                          </p>
                          <p className="text-slate-500 text-xs truncate">
                            {formatDoctorName(appointment.doctor?.name, appointment.doctor?.name || 'Doctor')}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{appointment.id}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                            style={{
                              background: appointment.type === 'ON_DEMAND' ? 'rgba(124,58,237,0.08)' : 'rgba(59,130,246,0.08)',
                              color: appointment.type === 'ON_DEMAND' ? '#7c3aed' : '#2563eb'
                            }}
                          >
                            {appointment.type === 'ON_DEMAND' ? 'Consult Now' : 'Scheduled'}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700">
                            {modeLabel}
                          </span>
                          <span
                            className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                            style={{ background: statusColor.bg, color: statusColor.color }}
                          >
                            {statusColor.label}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {new Date(appointment.scheduledFor || appointment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => openAuditModal(appointment)}
                            disabled={appointmentActionLoading.length > 0}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                          >
                            <History className="w-3.5 h-3.5" /> Audit
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(appointment.id)}
                            disabled={isFinal || cancelLoading || appointmentActionLoading.startsWith('reassign:')}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {cancelLoading ? 'Cancelling...' : 'Cancel'}
                          </button>
                          <button
                            onClick={() => openReassignModal(appointment)}
                            disabled={isFinal || appointmentActionLoading.length > 0 || !hasAlternativeDoctor}
                            title={hasAlternativeDoctor ? 'Reassign appointment' : 'No alternative doctors available'}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Reassign
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!appointmentsLoading && !appointmentsError && (
                <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs font-semibold text-slate-500">
                    Page {appointmentPagination.page} of {appointmentPagination.totalPages} · {appointmentPagination.total} total
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAppointmentPageChange(Math.max(1, appointmentPagination.page - 1))}
                      disabled={!appointmentPagination.hasPrev || appointmentsLoading}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handleAppointmentPageChange(appointmentPagination.page + 1)}
                      disabled={!appointmentPagination.hasNext || appointmentsLoading}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {reassignTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
            onClick={(event) => { if (event.target === event.currentTarget) closeReassignModal(); }}
            role="dialog"
            aria-modal="true"
            aria-label="Reassign appointment dialog"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
                <div>
                  <h3 className="font-heading font-bold text-slate-900 text-base">Reassign Appointment</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {reassignTarget.familyMember?.name || reassignTarget.patient?.name} to {formatDoctorName(reassignTarget.doctor?.name, reassignTarget.doctor?.name || 'Doctor')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeReassignModal}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                  aria-label="Close reassign appointment dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="reassign-doctor" className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">New Doctor</label>
                  <select
                    id="reassign-doctor"
                    value={reassignDoctorId}
                    onChange={(event) => setReassignDoctorId(event.target.value)}
                    disabled={reassignOptions.length === 0}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-sm text-slate-800 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white disabled:opacity-60"
                  >
                    {reassignOptions.map((doc) => (
                      <option key={doc.userId} value={doc.userId}>
                        {formatDoctorName(doc.user?.name, doc.user?.name)} - {doc.specialization?.name || 'General'}
                      </option>
                    ))}
                  </select>
                  {reassignOptions.length === 0 && (
                    <p className="text-xs font-medium text-slate-500 mt-2">No alternate doctor available for reassignment.</p>
                  )}
                </div>

                <div>
                  <label htmlFor="reassign-reason" className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Reason (Optional)</label>
                  <textarea
                    id="reassign-reason"
                    value={reassignReason}
                    onChange={(event) => setReassignReason(event.target.value)}
                    rows={3}
                    maxLength={400}
                    placeholder="Why is this appointment being reassigned?"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-sm text-slate-800 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={closeReassignModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-sm font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReassignAppointment}
                    disabled={!reassignDoctorId || reassignOptions.length === 0 || appointmentActionLoading === `reassign:${reassignTarget.id}`}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#0e7490,#059669)' }}
                  >
                    {appointmentActionLoading === `reassign:${reassignTarget.id}` ? 'Reassigning...' : 'Confirm Reassign'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {auditTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
            onClick={(event) => { if (event.target === event.currentTarget) closeAuditModal(); }}
            role="dialog"
            aria-modal="true"
            aria-label="Appointment audit log dialog"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
                <div>
                  <h3 className="font-heading font-bold text-slate-900 text-base">Appointment Audit Log</h3>
                  <p className="text-xs text-slate-400 font-medium truncate">
                    {auditTarget.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAuditModal}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                  aria-label="Close appointment audit log dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {auditLoading ? (
                  <div className="py-12 flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="font-bold text-slate-500">Loading audit log...</p>
                  </div>
                ) : auditEntries.length === 0 ? (
                  <div className="py-12 flex flex-col items-center text-center">
                    <History className="w-7 h-7 text-slate-300 mb-3" />
                    <p className="font-bold text-slate-500">No admin actions recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditEntries.map((entry, index) => (
                      <div key={`${entry.at || 'unknown'}-${index}`} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-black uppercase px-2 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                            {getAuditActionLabel(entry.action)}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {formatAuditDateTime(entry.at)}
                          </span>
                        </div>
                        {(entry.fromDoctorId || entry.toDoctorId) && (
                          <p className="text-xs text-slate-600 mb-1">
                            Doctor: {entry.fromDoctorId || '-'} to {entry.toDoctorId || '-'}
                          </p>
                        )}
                        {(entry.fromStatus || entry.toStatus) && (
                          <p className="text-xs text-slate-600 mb-1">
                            Status: {entry.fromStatus || '-'} to {entry.toStatus || '-'}
                          </p>
                        )}
                        <p className="text-sm text-slate-700">
                          {entry.reason ? entry.reason : 'No reason provided.'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddDoctorModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
            onClick={(event) => { if (event.target === event.currentTarget) setIsAddDoctorModalOpen(false); }}
            role="dialog"
            aria-modal="true"
            aria-label="Add doctor dialog"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-100">
                    <UserPlus className="w-4.5 h-4.5 text-cyan-700" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-slate-900 text-base">Add New Doctor</h3>
                    <p className="text-xs text-slate-400 font-medium">Create a doctor account</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddDoctorModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                  aria-label="Close add doctor dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddDoctor} className="p-6 space-y-4">
                {formError && (
                  <div className="px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-600 border border-red-200">
                    {formError}
                  </div>
                )}

                {[
                  { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Dr. Jane Smith' },
                  { label: 'Email', key: 'email', type: 'email', placeholder: 'doctor@example.com' },
                  { label: 'Password', key: 'password', type: 'password', placeholder: '********' },
                ].map((field) => (
                  <div key={field.key}>
                    <label htmlFor={`new-doctor-${field.key}`} className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">{field.label}</label>
                    <input
                      id={`new-doctor-${field.key}`}
                      type={field.type}
                      required
                      placeholder={field.placeholder}
                      value={newDoctor[field.key]}
                      onChange={(event) => setNewDoctor({ ...newDoctor, [field.key]: event.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-sm text-slate-800 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                ))}

                <div>
                  <label htmlFor="new-doctor-specialization" className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Specialization</label>
                  <select
                    id="new-doctor-specialization"
                    required
                    value={newDoctor.specializationId}
                    onChange={(event) => setNewDoctor({ ...newDoctor, specializationId: event.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-sm text-slate-800 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white"
                  >
                    <option value="">Select specialization...</option>
                    {specializations.map((specialization) => (
                      <option key={specialization.id} value={specialization.id}>{specialization.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="new-doctor-fee" className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Consultation Fee ($)</label>
                  <input
                    id="new-doctor-fee"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="50.00"
                    value={newDoctor.fee}
                    onChange={(event) => setNewDoctor({ ...newDoctor, fee: event.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-sm text-slate-800 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white cursor-pointer transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#0e7490,#059669)' }}
                >
                  {formLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Create Doctor
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
