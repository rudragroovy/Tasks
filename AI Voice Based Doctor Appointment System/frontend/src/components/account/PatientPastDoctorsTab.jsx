import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDoctorName } from '../../utils/doctorName';
import { getPractitionerTypeLabel } from '../../utils/doctorConsultation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const EMPTY_STATE_IMAGE = 'https://cdn-icons-png.flaticon.com/512/4076/4076432.png';
const ITEMS_PER_PAGE = 9;

function safeDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getAppointmentDate(appointment) {
  return safeDate(appointment?.scheduledFor) || safeDate(appointment?.createdAt);
}

export default function PatientPastDoctorsTab() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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

  const pastDoctors = useMemo(() => {
    const groupedByDoctor = new Map();

    appointments.forEach((appointment) => {
      const status = String(appointment?.status || '').toUpperCase();
      if (status !== 'COMPLETED') return;

      const doctorId = String(appointment?.doctor?.id || appointment?.doctorId || '').trim();
      if (!doctorId) return;

      const doctorNameRaw = String(appointment?.doctor?.name || 'Doctor').trim() || 'Doctor';
      const practitionerType = getPractitionerTypeLabel(appointment?.doctor, 'General Practitioner (GP)');
      const qualification = String(appointment?.doctor?.doctorProfile?.qualification || '').trim();
      const consultedAt = getAppointmentDate(appointment);
      const consultedAtTs = consultedAt?.getTime() || 0;

      const existing = groupedByDoctor.get(doctorId) || {
        id: doctorId,
        nameRaw: doctorNameRaw,
        practitionerType,
        qualification,
        consultationCount: 0,
        lastConsultedAt: null,
        lastConsultedAtTs: 0,
      };

      existing.consultationCount += 1;
      if (consultedAtTs >= existing.lastConsultedAtTs) {
        existing.lastConsultedAt = consultedAt;
        existing.lastConsultedAtTs = consultedAtTs;
        existing.nameRaw = doctorNameRaw;
        existing.practitionerType = practitionerType;
        existing.qualification = qualification;
      }

      groupedByDoctor.set(doctorId, existing);
    });

    return Array.from(groupedByDoctor.values()).sort(
      (left, right) => right.lastConsultedAtTs - left.lastConsultedAtTs
    );
  }, [appointments]);

  const filteredDoctors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return pastDoctors;

    return pastDoctors.filter((doctor) => {
      const doctorName = formatDoctorName(doctor.nameRaw, doctor.nameRaw).toLowerCase();
      return (
        doctorName.includes(query) ||
        String(doctor.practitionerType || '').toLowerCase().includes(query) ||
        String(doctor.qualification || '').toLowerCase().includes(query)
      );
    });
  }, [pastDoctors, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalItems = filteredDoctors.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginatedDoctors = filteredDoctors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  return (
    <article className="patient-account-card">
      <header className="patient-account-history-header">
        <h3>Past Doctors</h3>
      </header>

      <div className="patient-account-history-filters">
        <label className="patient-account-history-filter patient-account-history-filter--search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search doctor or practitioner type"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
      </div>

      {loading ? (
        <div className="patient-account-history-empty">
          <div className="patient-account-history-spinner" />
          <p>Loading past doctors...</p>
        </div>
      ) : paginatedDoctors.length === 0 ? (
        <div className="patient-account-history-empty">
          <img src={EMPTY_STATE_IMAGE} alt="No past doctors found" />
          <p>No past doctors found</p>
        </div>
      ) : (
        <>
          <div className="patient-account-history-grid">
            {paginatedDoctors.map((doctor) => {
              const displayName = formatDoctorName(doctor.nameRaw, doctor.nameRaw);
              return (
                <article key={doctor.id} className="patient-account-history-card">
                  <div className="patient-account-history-card__head">
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${encodeURIComponent(
                        doctor.nameRaw
                      )}&backgroundColor=f1f5f9`}
                      alt={displayName}
                    />
                    <div className="patient-account-history-card__head-meta">
                      <h4>{displayName.toUpperCase()}</h4>
                      <span>{doctor.practitionerType || 'General Practitioner (GP)'}</span>
                    </div>
                  </div>

                  <div className="patient-account-history-card__body">
                    <h5>{doctor.qualification || 'Doctor'}</h5>
                    <ul className="patient-account-history-card__facts">
                      <li>
                        <span>Consultations</span>
                        <strong>{doctor.consultationCount}</strong>
                      </li>
                      <li>
                        <span>Last Consulted</span>
                        <strong>
                          {doctor.lastConsultedAt
                            ? `${doctor.lastConsultedAt.toLocaleDateString()} ${doctor.lastConsultedAt.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : '-'}
                        </strong>
                      </li>
                    </ul>
                  </div>

                  <div className="patient-account-history-card__actions">
                    <button type="button" onClick={() => navigate(`/booking/doctor/${doctor.id}`)}>
                      View Profile
                    </button>
                    <button
                      type="button"
                      className="is-primary"
                      onClick={() =>
                        navigate(`/booking/doctor/${doctor.id}/steps`, {
                          state: {
                            doctorPreview: {
                              name: doctor.nameRaw,
                              practitionerType: doctor.practitionerType,
                              qualification: doctor.qualification,
                            },
                          },
                        })
                      }
                    >
                      Book Again
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
  );
}
