import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Activity,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SharedNavbar from '../components/SharedNavbar';
import { formatDoctorName } from '../utils/doctorName';
import { DOCTOR_NAV_ITEMS, handleDoctorNavClick as navigateDoctorNavClick } from '../utils/doctorNavigation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const WINDOW_OPTIONS = ['All', 'Today', 'This Week'];

function getAppointmentDate(appointment) {
  const rawDate =
    appointment?.scheduledAt ||
    appointment?.startTime ||
    appointment?.appointmentTime ||
    appointment?.createdAt ||
    appointment?.updatedAt;

  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isToday(date) {
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isThisWeek(date) {
  if (!date) return false;
  const now = new Date();
  const firstDayOfWeek = new Date(now);
  firstDayOfWeek.setHours(0, 0, 0, 0);
  firstDayOfWeek.setDate(now.getDate() - now.getDay());

  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 7);

  return date >= firstDayOfWeek && date < lastDayOfWeek;
}

function getStatusBadge(status) {
  if (status === 'COMPLETED') {
    return { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (status === 'ACCEPTED') {
    return { label: 'In Progress', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  }
  if (status === 'CANCELLED' || status === 'REJECTED') {
    return { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200' };
  }
  return { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' };
}

function getSessionRoute(appointment) {
  const mode = appointment?.consultationMode;
  if (mode === 'IN_PERSON') return `/doctor/in-person/${appointment.id}`;
  return `/room/${appointment.id}`;
}

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [windowFilter, setWindowFilter] = useState('All');
  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));

  useEffect(() => {
    setIsOnline(Boolean(user?.doctorProfile?.isOnline));
  }, [user?.doctorProfile?.isOnline]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/appointments`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setAppointments(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to fetch doctor appointments', error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const filteredAppointments = useMemo(() => {
    if (windowFilter === 'All') return appointments;

    return appointments.filter((appointment) => {
      const date = getAppointmentDate(appointment);
      if (windowFilter === 'Today') return isToday(date);
      return isThisWeek(date);
    });
  }, [appointments, windowFilter]);

  const todayAppointments = useMemo(
    () =>
      filteredAppointments
        .filter((appointment) => isToday(getAppointmentDate(appointment)))
        .sort((a, b) => {
          const dateA = getAppointmentDate(a)?.getTime() || 0;
          const dateB = getAppointmentDate(b)?.getTime() || 0;
          return dateA - dateB;
        })
        .slice(0, 6),
    [filteredAppointments]
  );

  const completedCount = filteredAppointments.filter((appointment) => appointment.status === 'COMPLETED').length;
  const upcomingCount = filteredAppointments.filter(
    (appointment) =>
      appointment.type === 'SCHEDULED' &&
      (appointment.status === 'PENDING' || appointment.status === 'ACCEPTED')
  ).length;
  const inProgressCount = filteredAppointments.filter(
    (appointment) => appointment.status === 'ACCEPTED' && appointment.type !== 'SCHEDULED'
  ).length;
  const pendingCount = filteredAppointments.filter((appointment) => appointment.status === 'PENDING').length;
  const cancelledCount = filteredAppointments.filter(
    (appointment) => appointment.status === 'CANCELLED' || appointment.status === 'REJECTED'
  ).length;
  const uniquePatients = new Set(
    filteredAppointments.map((appointment) => appointment.patientId || appointment.patient?.id).filter(Boolean)
  ).size;
  const paidAppointments = filteredAppointments.filter((appointment) => appointment.paymentStatus === 'PAID');
  const paidRevenue = paidAppointments.reduce((sum, appointment) => {
    const fee = Number.parseFloat(appointment?.doctor?.doctorProfile?.fee ?? 0);
    return sum + (Number.isFinite(fee) ? fee : 0);
  }, 0);
  const prescriptionsCount = filteredAppointments.filter(
    (appointment) => Boolean(appointment?.consultation?.prescriptionUrl)
  ).length;
  const medicalCertificatesCount = filteredAppointments.filter(
    (appointment) => Boolean(appointment?.consultation?.medicalCertificateUrl)
  ).length;
  const specialistReferralsCount = filteredAppointments.filter(
    (appointment) => Boolean(appointment?.consultation?.specialistReferralUrl)
  ).length;
  const pathologyLettersCount = filteredAppointments.filter(
    (appointment) => Boolean(appointment?.consultation?.pathologyLetterUrl)
  ).length;
  const radiologyLettersCount = filteredAppointments.filter(
    (appointment) => Boolean(appointment?.consultation?.radiologyLetterUrl)
  ).length;
  const completionRate = filteredAppointments.length
    ? Math.round((completedCount / filteredAppointments.length) * 100)
    : 0;

  const modeCounts = useMemo(() => {
    const totals = { VIDEO: 0, AUDIO: 0, IN_PERSON: 0 };

    filteredAppointments.forEach((appointment) => {
      const mode = appointment?.consultationMode;
      if (mode === 'AUDIO' || mode === 'IN_PERSON' || mode === 'VIDEO') {
        totals[mode] += 1;
      } else {
        totals.VIDEO += 1;
      }
    });

    const totalModes = totals.VIDEO + totals.AUDIO + totals.IN_PERSON;
    if (totalModes === 0) {
      return {
        VIDEO: 0,
        AUDIO: 0,
        IN_PERSON: 0,
        total: 0,
      };
    }

    return {
      ...totals,
      total: totalModes,
    };
  }, [filteredAppointments]);

  const modePercentages = useMemo(() => {
    if (modeCounts.total === 0) {
      return { VIDEO: 0, AUDIO: 0, IN_PERSON: 0 };
    }

    return {
      VIDEO: Math.round((modeCounts.VIDEO / modeCounts.total) * 100),
      AUDIO: Math.round((modeCounts.AUDIO / modeCounts.total) * 100),
      IN_PERSON: Math.max(
        0,
        100 -
          Math.round((modeCounts.VIDEO / modeCounts.total) * 100) -
          Math.round((modeCounts.AUDIO / modeCounts.total) * 100)
      ),
    };
  }, [modeCounts]);

  const doctorDisplayName = formatDoctorName(user?.name, 'Doctor');

  const doctorNavItems = DOCTOR_NAV_ITEMS;

  const handleDoctorNavClick = (key) => {
    navigateDoctorNavClick(key, navigate);
  };

  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    try {
      await axios.put(
        `${API_URL}/api/doctors/me/online`,
        { isOnline: nextStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Failed to update doctor online status', error);
      setIsOnline(!nextStatus);
    }
  };

  const totalGrowth = filteredAppointments.length;
  const revenue = paidRevenue.toFixed(2);

  const overviewCards = [
    {
      label: 'Revenue',
      value: `$${revenue}`,
      icon: Activity,
      iconClass: 'bg-violet-100 text-violet-700',
      route: '/doctor/payouts',
    },
    {
      label: 'Appointments',
      value: filteredAppointments.length,
      icon: Calendar,
      iconClass: 'bg-lime-100 text-lime-700',
      route: '/doctor/appointments',
    },
    {
      label: 'Pathology Letters',
      value: pathologyLettersCount,
      icon: FileText,
      iconClass: 'bg-amber-100 text-amber-700',
      route: '/doctor/medical-documents?type=PATHOLOGY_LETTER',
    },
    {
      label: 'Specialist Referral',
      value: specialistReferralsCount,
      icon: FileText,
      iconClass: 'bg-cyan-100 text-cyan-700',
      route: '/doctor/medical-documents?type=SPECIALIST_REFERRAL',
    },
    {
      label: 'Radiology Letters',
      value: radiologyLettersCount,
      icon: FileText,
      iconClass: 'bg-green-100 text-green-700',
      route: '/doctor/medical-documents?type=RADIOLOGY_LETTER',
    },
    {
      label: 'Prescriptions',
      value: prescriptionsCount,
      icon: FileText,
      iconClass: 'bg-rose-100 text-rose-700',
      route: '/doctor/medical-documents?type=PRESCRIPTION',
    },
    {
      label: 'Total Patients',
      value: uniquePatients,
      icon: Users,
      iconClass: 'bg-blue-100 text-blue-700',
      route: '/doctor/patients',
    },
    {
      label: 'Medical Certificates',
      value: medicalCertificatesCount,
      icon: FileText,
      iconClass: 'bg-indigo-100 text-indigo-700',
      route: '/doctor/medical-documents?type=MEDICAL_CERTIFICATE',
    },
  ];

  const hasServiceData = modeCounts.total > 0;
  const serviceChartData = [
    {
      key: 'VIDEO',
      label: 'Video',
      value: modeCounts.VIDEO,
      percentage: modePercentages.VIDEO,
      barClass: 'bg-blue-500',
    },
    {
      key: 'AUDIO',
      label: 'Audio',
      value: modeCounts.AUDIO,
      percentage: modePercentages.AUDIO,
      barClass: 'bg-emerald-500',
    },
    {
      key: 'IN_PERSON',
      label: 'In-Person',
      value: modeCounts.IN_PERSON,
      percentage: modePercentages.IN_PERSON,
      barClass: 'bg-amber-500',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f8ff] text-slate-900">
      <SharedNavbar
        user={user}
        brandLabel="CareBridge"
        onLogoClick={() => navigate('/dashboard')}
        navItems={doctorNavItems}
        activeTab="dashboard"
        onTabClick={handleDoctorNavClick}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        pendingCount={pendingCount}
        doctorName={doctorDisplayName}
        onLogout={logout}
        showMobileTabs
      />

      <main className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Dashboard</h1>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            <span>{windowFilter}</span>
            <ChevronDown className="h-4 w-4" />
            <select
              className="absolute opacity-0"
              value={windowFilter}
              onChange={(event) => setWindowFilter(event.target.value)}
              aria-label="Filter dashboard window"
            >
              {WINDOW_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className="grid gap-5 xl:grid-cols-[2fr_3fr]">
          <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-cyan-100/50" />
            <div className="pointer-events-none absolute -bottom-10 right-14 h-28 w-28 rounded-full bg-blue-100/40" />

            <div className="relative z-10 flex h-full flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-slate-500">Welcome,</p>
                <h2 className="mt-1 text-3xl font-black text-slate-900">{doctorDisplayName}</h2>
                <p className="mt-3 max-w-sm text-sm text-slate-500">
                  Your progress this year is strong. Keep delivering great care and follow-ups.
                </p>
              </div>

              <div className="h-40 w-full max-w-[220px] rounded-2xl border border-cyan-100 bg-gradient-to-b from-cyan-50 to-blue-50 p-4">
                <div className="flex h-full items-end justify-center gap-3">
                  <div className="mb-6 h-10 w-10 rounded-xl bg-primary-100" />
                  <div className="h-24 w-16 rounded-t-3xl bg-primary-500" />
                  <div className="mb-2 h-14 w-14 rounded-full bg-health-200/80" />
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Overview</h3>
                <p className="text-xs font-semibold text-slate-500">Total Growth: {totalGrowth || 'All'} </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {overviewCards.map((card) => (
                <button
                  type="button"
                  key={card.label}
                  onClick={() => navigate(card.route)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-left transition-colors hover:bg-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.iconClass}`}>
                      <card.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500">{card.label}</p>
                      <p className="text-lg font-black text-slate-900">{card.value}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              ))}
            </div>
          </article>
        </section>

        <section className="grid grid-cols-2 gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
          {[
            { label: 'Completed', value: completedCount, icon: CheckCircle, iconClass: 'bg-emerald-100 text-emerald-700' },
            { label: 'Upcoming', value: upcomingCount, icon: Calendar, iconClass: 'bg-blue-100 text-blue-700' },
            { label: 'Inprogress', value: inProgressCount, icon: Clock, iconClass: 'bg-amber-100 text-amber-700' },
            { label: 'Canceled', value: cancelledCount, icon: X, iconClass: 'bg-rose-100 text-rose-700' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconClass}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-base font-black text-slate-900">{item.value}</p>
                <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[270px_1fr]">
          <div className="space-y-4">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-600">Completion Rate</h3>
              <p className="mt-2 text-4xl font-black text-slate-900">{completionRate}%</p>
              <div className="mt-2 flex items-center gap-1 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-semibold text-slate-600">{completedCount} completed appointments</span>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Paid Appointments</p>
              <p className="mt-2 text-lg font-black text-slate-900">{paidAppointments.length}</p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Waiting room</p>
              <p className="mt-2 text-lg font-black text-slate-900">{pendingCount}</p>
            </article>
          </div>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-extrabold text-slate-900">Services Chart</h3>
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="grid grid-cols-[36px_1fr] gap-3">
                <div className="flex h-56 flex-col justify-between pb-8 text-[11px] font-semibold text-slate-400">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>

                <div className="relative h-56 rounded-2xl border border-dashed border-slate-200 bg-white px-4 pt-4">
                  <div className="absolute inset-x-4 top-4 bottom-8 grid grid-rows-4">
                    {[0, 1, 2, 3].map((row) => (
                      <div key={row} className="border-b border-slate-100" />
                    ))}
                  </div>

                  <div className="relative z-10 flex h-full items-end justify-around gap-3 pb-8">
                    {serviceChartData.map((service) => (
                      <div key={service.key} className="flex h-full w-full max-w-[96px] flex-col items-center justify-end">
                        <p className="mb-1 text-[11px] font-black text-slate-600">{service.percentage}%</p>
                        <div
                          className={`w-12 rounded-t-xl ${service.barClass} transition-all`}
                          style={{ height: `${service.percentage}%` }}
                        />
                        <p className="mt-2 text-[11px] font-black text-slate-600">{service.label}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{service.value} appts</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {!hasServiceData && (
                <p className="mt-3 text-xs font-semibold text-slate-500">No service data available for the selected window.</p>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_1.35fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-extrabold text-slate-900">Services</h3>
            <div className="mt-6 flex flex-col items-center justify-center gap-5">
              <div
                className="relative h-52 w-52 rounded-full"
                style={{
                  background: hasServiceData
                    ? `conic-gradient(#1e90ff 0 ${modePercentages.VIDEO}%, #10b981 ${modePercentages.VIDEO}% ${
                        modePercentages.VIDEO + modePercentages.AUDIO
                      }%, #f59e0b ${modePercentages.VIDEO + modePercentages.AUDIO}% 100%)`
                    : 'conic-gradient(#e2e8f0 0 100%)',
                }}
              >
                <div className="absolute inset-7 rounded-full bg-white shadow-inner" />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-600">
                  {hasServiceData ? 'Total' : 'No Data'}
                </div>
              </div>

              <div className="w-full space-y-2">
                {[
                  { label: 'Video', value: modePercentages.VIDEO, color: 'bg-blue-500' },
                  { label: 'Audio', value: modePercentages.AUDIO, color: 'bg-emerald-500' },
                  { label: 'In-Person', value: modePercentages.IN_PERSON, color: 'bg-amber-500' },
                ].map((service) => (
                  <div key={service.label} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${service.color}`} />
                      <span className="text-sm font-semibold text-slate-600">{service.label}</span>
                    </div>
                    <span className="text-sm font-black text-slate-800">{service.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-extrabold text-slate-900">Today's Appointments</h3>
              <button
                type="button"
                className="rounded-xl bg-primary-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-800"
                onClick={() => navigate('/doctor/appointments')}
              >
                Current Appointments
              </button>
            </div>

            {loading ? (
              <div className="flex min-h-[180px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              </div>
            ) : todayAppointments.length === 0 ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <Calendar className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-500">No Data</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full min-w-[620px] border-collapse text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">ID</th>
                      <th className="px-3 py-3">Patient Name</th>
                      <th className="px-3 py-3">Date & Time</th>
                      <th className="px-3 py-3">Duration</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAppointments.map((appointment) => {
                      const appointmentDate = getAppointmentDate(appointment);
                      const statusBadge = getStatusBadge(appointment.status);
                      const isJoinable = appointment.status === 'ACCEPTED';

                      return (
                        <tr key={appointment.id} className="border-t border-slate-100 text-sm text-slate-700">
                          <td className="px-3 py-3 font-semibold">#{appointment.id}</td>
                          <td className="px-3 py-3 font-semibold">
                            {appointment.familyMember?.name || appointment.patient?.name || 'Unknown Patient'}
                          </td>
                          <td className="px-3 py-3">
                            {appointmentDate
                              ? appointmentDate.toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Not scheduled'}
                          </td>
                          <td className="px-3 py-3">{appointment.durationMinutes || 30} mins</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusBadge.className}`}>
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {isJoinable ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-800"
                                onClick={() => navigate(getSessionRoute(appointment))}
                              >
                                Join
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

