import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { HistoryModal } from '../ui/history-modal';
import AppointmentReviewModal from '../reviews/AppointmentReviewModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const EMPTY_STATE_IMAGE = 'https://cdn-icons-png.flaticon.com/512/4076/4076432.png';
const ITEMS_PER_PAGE = 9;

function safeDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseSummary(summary) {
  if (!summary) return {};
  if (typeof summary === 'object') return summary;
  if (typeof summary === 'string') {
    try {
      return JSON.parse(summary);
    } catch {
      return { notes: summary };
    }
  }
  return {};
}

function getModeLabel(appointment) {
  const mode = String(appointment?.consultationMode || '').toUpperCase();
  if (mode === 'VIDEO') return 'Televideo';
  if (mode === 'AUDIO') return 'Telephone';
  if (mode === 'IN_PERSON') return 'In Person';
  return 'Televideo';
}

function getServiceLabel(appointment) {
  const summary = parseSummary(appointment?.aiSummary);
  return (
    summary?.service ||
    summary?.service_name ||
    summary?.consultation_type ||
    summary?.primary_symptom ||
    'Standard Consultation'
  );
}

function getRelationLabel(appointment) {
  return appointment?.familyMember?.relation || 'Self';
}

function getPrimaryDate(appointment) {
  return safeDate(appointment?.scheduledFor) || safeDate(appointment?.createdAt);
}

function isPastAppointment(appointment) {
  const status = String(appointment?.status || '').toUpperCase();
  return ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(status);
}

function filterByTab(appointment, activeTab) {
  const status = String(appointment?.status || '').toUpperCase();
  const now = new Date();
  const scheduledAt = safeDate(appointment?.scheduledFor);

  if (activeTab === 'current') {
    if (status !== 'ACCEPTED') return false;
    if (!scheduledAt) return true;
    return scheduledAt <= now;
  }

  if (activeTab === 'upcoming') {
    if (!['PENDING', 'PAID', 'ACCEPTED'].includes(status)) return false;
    if (!scheduledAt) return ['PENDING', 'PAID'].includes(status);
    return scheduledAt > now;
  }

  return isPastAppointment(appointment);
}

export default function PatientMedicalHistoryTab({
  userFirstName = 'Patient',
  autoReviewAppointmentId = null,
  onAutoReviewHandled,
}) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('past');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedHistoryApt, setSelectedHistoryApt] = useState(null);
  const [reviewTargetAppointment, setReviewTargetAppointment] = useState(null);
  const [autoReviewAttemptedId, setAutoReviewAttemptedId] = useState(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch(`${API_URL}/api/appointments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Failed to fetch appointments');
        const payload = await response.json();
        setAppointments(Array.isArray(payload) ? payload : []);
      } catch (error) {
        console.error(error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, statusFilter, startDate, endDate]);

  useEffect(() => {
    setAutoReviewAttemptedId(null);
  }, [autoReviewAppointmentId]);

  const statusOptions = useMemo(() => {
    if (activeTab === 'current') return ['ALL', 'ACCEPTED'];
    if (activeTab === 'upcoming') return ['ALL', 'PENDING', 'PAID', 'ACCEPTED'];
    return ['ALL', 'COMPLETED', 'CANCELLED', 'REJECTED'];
  }, [activeTab]);

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const start = startDate ? safeDate(`${startDate}T00:00:00`) : null;
    const end = endDate ? safeDate(`${endDate}T23:59:59`) : null;

    return appointments
      .filter((appointment) => filterByTab(appointment, activeTab))
      .filter((appointment) => {
        if (!query) return true;
        const doctorName = String(appointment?.doctor?.name || '').toLowerCase();
        const serviceName = String(getServiceLabel(appointment)).toLowerCase();
        return doctorName.includes(query) || serviceName.includes(query);
      })
      .filter((appointment) => {
        if (statusFilter === 'ALL') return true;
        const status = String(appointment?.status || '').toUpperCase();
        return status === statusFilter;
      })
      .filter((appointment) => {
        if (!start && !end) return true;
        const date = getPrimaryDate(appointment);
        if (!date) return false;
        if (start && date < start) return false;
        if (end && date > end) return false;
        return true;
      })
      .sort((a, b) => {
        const left = getPrimaryDate(a)?.getTime() || 0;
        const right = getPrimaryDate(b)?.getTime() || 0;
        return right - left;
      });
  }, [activeTab, appointments, endDate, searchQuery, startDate, statusFilter]);

  const totalItems = filteredAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const handleReviewSubmitted = (review) => {
    if (!review?.appointmentId) return;
    setAppointments((previous) =>
      previous.map((appointment) =>
        appointment.id === review.appointmentId ? { ...appointment, review } : appointment
      )
    );
  };

  useEffect(() => {
    const targetId = String(autoReviewAppointmentId || '').trim();
    if (!targetId) return;

    setActiveTab('past');

    const targetAppointment = appointments.find((appointment) => appointment.id === targetId);
    const targetStatus = String(targetAppointment?.status || '').toUpperCase();
    const isCompleted = targetStatus === 'COMPLETED';

    if (targetAppointment && isCompleted) {
      setReviewTargetAppointment(targetAppointment);
      if (typeof onAutoReviewHandled === 'function') onAutoReviewHandled();
      return;
    }

    if (loading || autoReviewAttemptedId === targetId) return;

    setAutoReviewAttemptedId(targetId);
    let cancelled = false;
    const fetchTargetAppointment = async () => {
      try {
        const response = await fetch(`${API_URL}/api/appointments/${targetId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled || !payload?.id) return;

        setAppointments((previous) => {
          const exists = previous.some((appointment) => appointment.id === payload.id);
          if (exists) {
            return previous.map((appointment) => (appointment.id === payload.id ? payload : appointment));
          }
          return [payload, ...previous];
        });

        if (String(payload.status || '').toUpperCase() === 'COMPLETED') {
          setReviewTargetAppointment(payload);
          if (typeof onAutoReviewHandled === 'function') onAutoReviewHandled();
        }
      } catch (error) {
        console.error('Failed to fetch appointment for auto-review prompt', error);
      }
    };

    fetchTargetAppointment();

    return () => {
      cancelled = true;
    };
  }, [appointments, autoReviewAppointmentId, autoReviewAttemptedId, loading, onAutoReviewHandled]);

  return (
    <>
      <article className="patient-account-card">
        <header className="patient-account-history-header">
          <h3>Consultation History</h3>
          <div className="patient-account-history-tabs" role="tablist" aria-label="Appointment tabs">
            <button
              type="button"
              className={activeTab === 'current' ? 'is-active' : ''}
              onClick={() => setActiveTab('current')}
            >
              Current
            </button>
            <button
              type="button"
              className={activeTab === 'upcoming' ? 'is-active' : ''}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming
            </button>
            <button
              type="button"
              className={activeTab === 'past' ? 'is-active' : ''}
              onClick={() => setActiveTab('past')}
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
              placeholder="Search doctor or service"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <label className="patient-account-history-filter">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'ALL' ? 'Status' : option}
                </option>
              ))}
            </select>
          </label>

          <label className="patient-account-history-filter patient-account-history-filter--date">
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <Calendar size={14} />
          </label>

          <label className="patient-account-history-filter patient-account-history-filter--date">
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
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
                const modeLabel = getModeLabel(appointment);
                const serviceLabel = getServiceLabel(appointment);
                const relationLabel = getRelationLabel(appointment);
                const appointmentDate = getPrimaryDate(appointment);
                const isRated = Boolean(appointment?.review);
                const statusKey = String(appointment?.status || 'unknown').toLowerCase();
                const statusLabel = String(appointment?.status || 'Unknown')
                  .toLowerCase()
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (char) => char.toUpperCase());

                return (
                  <article key={appointment.id} className="patient-account-history-card">
                    <div className="patient-account-history-card__head">
                      <img
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${encodeURIComponent(
                          appointment?.doctor?.name || 'Doctor'
                        )}&backgroundColor=f1f5f9`}
                        alt={appointment?.doctor?.name || 'Doctor'}
                      />
                      <div className="patient-account-history-card__head-meta">
                        <h4>{String(appointment?.doctor?.name || 'Doctor').toUpperCase()}</h4>
                        <span>{modeLabel}</span>
                      </div>
                      <strong className={`patient-account-history-card__status status-${statusKey}`}>
                        {statusLabel}
                      </strong>
                    </div>

                    <div className="patient-account-history-card__body">
                      <h5>{serviceLabel}</h5>
                      <ul className="patient-account-history-card__facts">
                        <li>
                          <span>Patient</span>
                          <strong>{userFirstName}</strong>
                        </li>
                        <li>
                          <span>Relation</span>
                          <strong>{relationLabel}</strong>
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
                      </ul>
                    </div>

                    <div className="patient-account-history-card__actions">
                      <button type="button" onClick={() => setSelectedHistoryApt(appointment)}>
                        View More
                      </button>
                      <button
                        type="button"
                        className={isRated ? '' : 'is-primary'}
                        onClick={() => setReviewTargetAppointment(appointment)}
                      >
                        {isRated ? 'View Review' : 'Rate Doctor'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="patient-account-history-pagination">
              <span>{`${pageStart}-${pageEnd} of ${totalItems}`}</span>
              <div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </article>

      {selectedHistoryApt ? (
        <HistoryModal apt={selectedHistoryApt} onClose={() => setSelectedHistoryApt(null)} />
      ) : null}

      <AppointmentReviewModal
        open={Boolean(reviewTargetAppointment)}
        appointment={reviewTargetAppointment}
        onClose={() => setReviewTargetAppointment(null)}
        onSubmitted={handleReviewSubmitted}
      />
    </>
  );
}
