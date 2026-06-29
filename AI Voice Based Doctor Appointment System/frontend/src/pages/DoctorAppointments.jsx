import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Calendar, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SharedNavbar from '../components/SharedNavbar';
import { HistoryModal } from '../components/ui/history-modal';
import { formatDoctorName } from '../utils/doctorName';
import { DOCTOR_NAV_ITEMS, handleDoctorNavClick as navigateDoctorNavClick } from '../utils/doctorNavigation';
import './patient-account.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const EMPTY_STATE_IMAGE = 'https://cdn-icons-png.flaticon.com/512/4076/4076432.png';

function safeDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getAppointmentDate(appointment) {
  const rawDate =
    appointment?.scheduledAt ||
    appointment?.scheduledFor ||
    appointment?.startTime ||
    appointment?.appointmentTime ||
    appointment?.createdAt ||
    appointment?.updatedAt;
  return safeDate(rawDate);
}

function parseSummary(summary) {
  if (!summary) return {};
  if (typeof summary === 'object') return summary;
  if (typeof summary === 'string') {
    try {
      return JSON.parse(summary);
    } catch {
      return {};
    }
  }
  return {};
}

function formatStatusLabel(status) {
  return String(status || 'UNKNOWN')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getModeLabel(mode) {
  const normalized = String(mode || '').toUpperCase();
  if (normalized === 'IN_PERSON') return 'In Person';
  if (normalized === 'AUDIO') return 'Telephone';
  if (normalized === 'VIDEO') return 'Televideo';
  return 'Televideo';
}

export default function DoctorAppointments() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTab = searchParams.get('tab');
  const initialSearch = searchParams.get('q') || '';
  const selectedPatientId = searchParams.get('patientId');

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    initialTab === 'past' || initialTab === 'upcoming' || initialTab === 'current' ? initialTab : 'current'
  );
  const [search, setSearch] = useState(initialSearch);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedHistoryApt, setSelectedHistoryApt] = useState(null);
  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));
  const pageSize = 9;

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

  const doctorName = formatDoctorName(user?.name, 'Doctor');

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

  const tabbedAppointments = useMemo(() => {
    if (activeTab === 'current') {
      return appointments.filter(
        (appointment) =>
          appointment.status === 'ACCEPTED' ||
          (appointment.status === 'PENDING' && appointment.type === 'ON_DEMAND')
      );
    }

    if (activeTab === 'upcoming') {
      return appointments.filter(
        (appointment) =>
          appointment.type === 'SCHEDULED' &&
          appointment.status !== 'COMPLETED' &&
          appointment.status !== 'REJECTED' &&
          appointment.status !== 'CANCELLED'
      );
    }

    return appointments.filter(
      (appointment) =>
        appointment.status === 'COMPLETED' ||
        appointment.status === 'REJECTED' ||
        appointment.status === 'CANCELLED'
    );
  }, [appointments, activeTab]);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();
    const start = startDate ? safeDate(`${startDate}T00:00:00`) : null;
    const end = endDate ? safeDate(`${endDate}T23:59:59`) : null;

    return tabbedAppointments.filter((appointment) => {
      const patientName = (appointment.familyMember?.name || appointment.patient?.name || '').toLowerCase();
      const nameMatch = !query || patientName.includes(query);
      const patientMatch =
        !selectedPatientId || (appointment?.patient?.id || appointment?.patientId) === selectedPatientId;

      if (!nameMatch || !patientMatch) return false;
      if (!start && !end) return true;

      const appointmentDate = getAppointmentDate(appointment);
      if (!appointmentDate) return false;

      if (start && appointmentDate < start) return false;
      if (end && appointmentDate > end) return false;
      return true;
    });
  }, [tabbedAppointments, search, startDate, endDate, selectedPatientId]);

  const sortedAppointments = useMemo(() => {
    return [...filteredAppointments].sort((left, right) => {
      const leftTime = getAppointmentDate(left)?.getTime() || 0;
      const rightTime = getAppointmentDate(right)?.getTime() || 0;
      return rightTime - leftTime;
    });
  }, [filteredAppointments]);

  const maxPage = Math.max(1, Math.ceil(sortedAppointments.length / pageSize));
  const currentPage = Math.min(page, maxPage);
  const paginatedAppointments = sortedAppointments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = sortedAppointments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, sortedAppointments.length);

  return (
    <div className="min-h-screen bg-[#f5f8ff] text-slate-900">
      <SharedNavbar
        user={user}
        brandLabel="CareBridge"
        onLogoClick={() => navigate('/dashboard')}
        navItems={doctorNavItems}
        activeTab="appointments"
        onTabClick={handleDoctorNavClick}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        pendingCount={appointments.filter((appointment) => appointment.status === 'PENDING').length}
        doctorName={doctorName}
        onLogout={logout}
        showMobileTabs
      />

      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <article className="patient-account-card">
          <header className="patient-account-history-header">
            <h3>My Appointment</h3>
            <div className="patient-account-history-tabs" role="tablist" aria-label="Doctor appointment tabs">
              <button
                type="button"
                className={activeTab === 'current' ? 'is-active' : ''}
                onClick={() => {
                  setActiveTab('current');
                  setPage(1);
                }}
              >
                Current
              </button>
              <button
                type="button"
                className={activeTab === 'upcoming' ? 'is-active' : ''}
                onClick={() => {
                  setActiveTab('upcoming');
                  setPage(1);
                }}
              >
                Upcoming
              </button>
              <button
                type="button"
                className={activeTab === 'past' ? 'is-active' : ''}
                onClick={() => {
                  setActiveTab('past');
                  setPage(1);
                }}
              >
                Past
              </button>
            </div>
          </header>

          <div className="patient-account-history-filters">
            <label className="patient-account-history-filter patient-account-history-filter--search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search by patient name"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>

            <label className="patient-account-history-filter patient-account-history-filter--date">
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(1);
                }}
              />
              <Calendar size={14} />
            </label>

            <label className="patient-account-history-filter patient-account-history-filter--date">
              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
              />
              <Calendar size={14} />
            </label>
          </div>

          {loading ? (
            <div className="patient-account-history-empty">
              <div className="patient-account-history-spinner" />
              <p>Loading appointments...</p>
            </div>
          ) : paginatedAppointments.length === 0 ? (
            <div className="patient-account-history-empty">
              <img src={EMPTY_STATE_IMAGE} alt="No appointments found" />
              <p>No appointments found</p>
            </div>
          ) : (
            <>
              <div className="patient-account-history-grid">
                {paginatedAppointments.map((appointment) => {
                  const patientName = appointment.familyMember?.name || appointment.patient?.name || 'Unknown Patient';
                  const relationLabel = appointment.familyMember?.relation || 'Self';
                  const appointmentDate = getAppointmentDate(appointment);
                  const status = String(appointment?.status || 'UNKNOWN').toLowerCase();
                  const statusLabel = formatStatusLabel(appointment?.status);
                  const modeLabel = getModeLabel(appointment?.consultationMode);
                  const summary = parseSummary(appointment?.aiSummary);
                  const serviceLabel =
                    summary?.service ||
                    summary?.service_name ||
                    summary?.consultation_type ||
                    summary?.primary_symptom ||
                    'Consultation';
                  const appointmentType = appointment?.type === 'SCHEDULED' ? 'Scheduled' : 'On-demand';
                  return (
                    <article key={appointment.id} className="patient-account-history-card">
                      <div className="patient-account-history-card__head">
                        <img
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            patientName
                          )}&backgroundColor=f1f5f9`}
                          alt={patientName}
                        />
                        <div className="patient-account-history-card__head-meta">
                          <h4>{patientName.toUpperCase()}</h4>
                          <span>{`${relationLabel} | ${modeLabel}`}</span>
                        </div>
                        <strong className={`patient-account-history-card__status status-${status}`}>
                          {statusLabel}
                        </strong>
                      </div>

                      <div className="patient-account-history-card__body">
                        <h5>{serviceLabel}</h5>
                        <ul className="patient-account-history-card__facts">
                          <li>
                            <span>Appointment</span>
                            <strong>{`#${appointment.id}`}</strong>
                          </li>
                          <li>
                            <span>Type</span>
                            <strong>{appointmentType}</strong>
                          </li>
                          <li>
                            <span>Date &amp; Time</span>
                            <strong>
                              {appointmentDate
                                ? `${appointmentDate.toLocaleDateString()} ${appointmentDate.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}`
                                : '-'}
                            </strong>
                          </li>
                          <li>
                            <span>Payment</span>
                            <strong>{formatStatusLabel(appointment?.paymentStatus || 'pending')}</strong>
                          </li>
                        </ul>
                      </div>

                      <div className="patient-account-history-card__actions">
                        <button type="button" onClick={() => setSelectedHistoryApt(appointment)}>
                          View More
                        </button>
                        <button type="button" onClick={() => navigate('/doctor/chat')}>
                          Open Chat
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="patient-account-history-pagination">
                <span>{`${pageStart}-${pageEnd} of ${sortedAppointments.length}`}</span>
                <div>
                  <button
                    type="button"
                    onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((previous) => Math.min(maxPage, previous + 1))}
                    disabled={currentPage === maxPage}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </article>
      </main>

      {selectedHistoryApt ? (
        <HistoryModal apt={selectedHistoryApt} onClose={() => setSelectedHistoryApt(null)} />
      ) : null}
    </div>
  );
}

