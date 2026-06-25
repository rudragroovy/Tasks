import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';
import { HistoryModal } from '../components/ui/history-modal';
import AppointmentReviewModal from '../components/reviews/AppointmentReviewModal';
import { useAuth } from '../context/AuthContext';
import AppIcon from '../components/branding/AppIcon';
import './medical-history.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const EMPTY_STATE_IMAGE =
  'https://cdn-icons-png.flaticon.com/512/4076/4076432.png';
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
    if (!['PENDING', 'ACCEPTED'].includes(status)) return false;
    if (!scheduledAt) return status === 'PENDING';
    return scheduledAt > now;
  }

  return isPastAppointment(appointment);
}

export default function MedicalHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const statusOptions = useMemo(() => {
    if (activeTab === 'current') return ['ALL', 'ACCEPTED'];
    if (activeTab === 'upcoming') return ['ALL', 'PENDING', 'ACCEPTED'];
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

  const userName = String(user?.name || 'Patient').trim() || 'Patient';
  const userFirstName = userName.split(/\s+/)[0] || 'Patient';
  const userEmail = String(user?.email || '').trim();

  return (
    <div className="appointments-page">
      <LandingNavbar />

      <main className="appointments-shell">
        <aside className="appointments-sidebar">
          <div className="appointments-profile">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                userName
              )}&backgroundColor=e2e8f0`}
              alt={userName}
            />
            <h2>{userName.toUpperCase()}</h2>
            <p>{userEmail || 'patient@carebridge.com'}</p>
          </div>

          <div className="appointments-nav-group">
            <h3>My Profile</h3>
            <button type="button" onClick={() => navigate('/patient/account?tab=profile')}>
              My Information
            </button>
            <button type="button" onClick={() => navigate('/patient/account?tab=family')}>
              Family Members
            </button>
            <button type="button" onClick={() => navigate('/patient/account?tab=wallet')}>
              My Wallet
            </button>
          </div>

          <div className="appointments-nav-group">
            <h3>My Healthcare</h3>
            <button type="button" className="is-active">
              My Appointments
            </button>
            <button type="button" onClick={() => navigate('/doctors')}>
              My Doctors
            </button>
            <button type="button" onClick={() => navigate('/patient/account?tab=medical-history')}>
              Medical Documents
            </button>
            <button type="button" onClick={() => navigate('/dashboard')}>
              Invoice
            </button>
          </div>
        </aside>

        <section className="appointments-content">
          <header className="appointments-content__header">
            <h1>Consultation</h1>
            <div className="appointments-tabs" role="tablist" aria-label="Appointment tabs">
              <button
                type="button"
                className={activeTab === 'current' ? 'is-active' : ''}
                onClick={() => setActiveTab('current')}
              >
                Current Appointments
              </button>
              <button
                type="button"
                className={activeTab === 'upcoming' ? 'is-active' : ''}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming Appointments
              </button>
              <button
                type="button"
                className={activeTab === 'past' ? 'is-active' : ''}
                onClick={() => setActiveTab('past')}
              >
                Past Appointments
              </button>
            </div>
          </header>

          <div className="appointments-filters">
            <label className="appointments-filter appointments-filter--search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search By Name"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>

            <label className="appointments-filter">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'ALL' ? 'Appointment Status' : option}
                  </option>
                ))}
              </select>
            </label>

            <label className="appointments-filter appointments-filter--date">
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
              <Calendar size={14} />
            </label>

            <label className="appointments-filter appointments-filter--date">
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
              <Calendar size={14} />
            </label>
          </div>

          <div className="appointments-divider" />

          {loading ? (
            <div className="appointments-empty">
              <div className="appointments-spinner" />
              <p>Loading appointments...</p>
            </div>
          ) : paginatedAppointments.length === 0 ? (
            <div className="appointments-empty">
              <img src={EMPTY_STATE_IMAGE} alt="No appointments found" />
              <p>No appointments found</p>
            </div>
          ) : (
            <>
              <div className="appointments-grid">
                {paginatedAppointments.map((appointment) => {
                  const modeLabel = getModeLabel(appointment);
                  const serviceLabel = getServiceLabel(appointment);
                  const relationLabel = getRelationLabel(appointment);
                  const appointmentDate = getPrimaryDate(appointment);
                  const isRated = Boolean(appointment?.review);

                  return (
                    <article key={appointment.id} className="appointment-card">
                      <div className="appointment-card__head">
                        <img
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${encodeURIComponent(
                            appointment?.doctor?.name || 'Doctor'
                          )}&backgroundColor=f1f5f9`}
                          alt={appointment?.doctor?.name || 'Doctor'}
                        />
                        <div>
                          <h2>{String(appointment?.doctor?.name || 'Doctor').toUpperCase()}</h2>
                          <span className="appointment-card__mode">{modeLabel}</span>
                        </div>
                      </div>

                      <div className="appointment-card__body">
                        <h3>{serviceLabel}</h3>
                        <p>{`Consult For - ${userFirstName}`}</p>
                        <p>{`Relation - ${relationLabel}`}</p>
                        <small>
                          {appointmentDate
                            ? `${appointmentDate.toLocaleDateString()} ${appointmentDate.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : '-'}
                        </small>
                        <strong className={`status-${String(appointment?.status || '').toLowerCase()}`}>
                          {String(appointment?.status || '').toUpperCase() || 'UNKNOWN'}
                        </strong>
                      </div>

                      <div className="appointment-card__actions">
                        <button type="button" onClick={() => setSelectedHistoryApt(appointment)}>
                          View More
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewTargetAppointment(appointment)}
                        >
                          {isRated ? 'View Review' : 'Report Doctor'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="appointments-pagination">
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
        </section>
      </main>

      <footer className="landing-footer appointments-footer">
        <div className="container landing-footer__grid">
          <div>
            <div className="landing-footer__brand">
              <AppIcon size={30} />
              <span>CareBridge</span>
            </div>
            <p>
              CareBridge helps patients manage consultations, prescriptions, referrals, and medical workflows from one
              place.
            </p>
          </div>
          <div>
            <h4>Patient</h4>
            <Link to="/services/standard-consultation">Telehealth Medical Consultation</Link>
            <Link to="/category/prescription">Prescription</Link>
            <Link to="/category/medical-certificate">Medical Certificates</Link>
            <Link to="/category/popular-blood-tests">Blood Test Requests</Link>
            <Link to="/category/specialist-referral">Specialist Referrals</Link>
          </div>
          <div>
            <h4>Quick Links</h4>
            <Link to="/">About Us</Link>
            <Link to="/">Our Team</Link>
            <Link to="/">Blog</Link>
            <Link to="/">Career</Link>
          </div>
          <div>
            <h4>Help &amp; Support</h4>
            <Link to="/">Contact Us</Link>
            <Link to="/">Help Center</Link>
            <Link to="/">Privacy Policy</Link>
            <Link to="/">Terms &amp; Conditions</Link>
          </div>
        </div>
        <div className="landing-footer__bar">Copyright &copy; 2026 CareBridge. All rights reserved.</div>
      </footer>

      {selectedHistoryApt ? (
        <HistoryModal apt={selectedHistoryApt} onClose={() => setSelectedHistoryApt(null)} />
      ) : null}

      <AppointmentReviewModal
        open={Boolean(reviewTargetAppointment)}
        appointment={reviewTargetAppointment}
        onClose={() => setReviewTargetAppointment(null)}
        onSubmitted={handleReviewSubmitted}
      />
    </div>
  );
}
