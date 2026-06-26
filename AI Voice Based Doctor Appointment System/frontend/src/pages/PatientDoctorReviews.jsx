import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Phone, Star, Video } from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';
import AppIcon from '../components/branding/AppIcon';
import { getServiceRate } from '../data/practitionerServiceCatalog';
import { formatDoctorName } from '../utils/doctorName';
import { getDoctorConsultationFeeFromDoctorRecord, getPractitionerTypeLabel } from '../utils/doctorConsultation';
import {
  getServiceRateFromMap,
  normalizeStringArray,
  parseDoctorServiceSelections,
} from '../utils/doctorServices';
import './patient-doctor-reviews.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MODE_OPTIONS = [
  { value: 'VIDEO', label: 'Televideo', icon: Video },
  { value: 'AUDIO', label: 'Telephone', icon: Phone },
  { value: 'IN_PERSON', label: 'In-Person Doctor Visit', icon: CalendarDays },
];

const toIsoDate = (date) => date.toISOString().split('T')[0];

const getDateWithOffset = (offsetDays = 0) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return toIsoDate(date);
};

const addDaysToIsoDate = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

const parseTimeTo12Hour = (value) => {
  if (!value) return '';
  const input = String(value).trim();
  if (/[aApP][mM]/.test(input)) return input.toUpperCase();

  const match = input.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours24 = Number(match[1]);
    const suffix = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${match[2]} ${suffix}`;
  }

  const date = new Date(input);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return input;
};

const formatRelativeDate = (dateLike) => {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
};

function ReviewStars({ rating = 0, size = 14 }) {
  return (
    <div className="doctor-detail-stars">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} size={size} fill={value <= rating ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

function getSatisfactionTag(rating) {
  if (rating >= 4) return { label: 'Satisfied', className: 'is-positive' };
  if (rating === 3) return { label: 'Neutral', className: 'is-neutral' };
  return { label: 'Needs Improvement', className: 'is-negative' };
}

function sortReviews(reviews, sortKey) {
  const next = [...reviews];
  if (sortKey === 'oldest') return next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (sortKey === 'highest') return next.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  if (sortKey === 'lowest') return next.sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0));
  return next.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function findMatchingServiceName(services, candidate) {
  const target = String(candidate || '').trim().toLowerCase();
  if (!target) return '';
  return services.find((service) => String(service).trim().toLowerCase() === target) || '';
}

export default function PatientDoctorReviews() {
  const { doctorId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const preview = location.state?.doctorPreview || null;
  const aiSummary = location.state?.aiSummary || {};
  const aiServiceName = String(aiSummary?.serviceName || '').trim();
  const selectedPatientId =
    typeof location.state?.selectedPatientId === 'string' ? location.state.selectedPatientId : 'self';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doctor, setDoctor] = useState({
    id: doctorId,
    name: preview?.name || '',
    practitionerType: preview?.practitionerType || '',
    qualification: preview?.qualification || '',
    yearsExperience: Number(preview?.yearsExperience || 0),
    consultationFee: 75,
    offeredServices: [],
    offeredServiceRates: {},
    isOnline: false,
  });
  const [summary, setSummary] = useState({
    averageRating: 0,
    reviewCount: 0,
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [allReviews, setAllReviews] = useState([]);
  const [sort, setSort] = useState('newest');

  const [activeTab, setActiveTab] = useState('availability');
  const [futureBooking, setFutureBooking] = useState(true);
  const [consultationMode, setConsultationMode] = useState('VIDEO');
  const [selectedServiceName, setSelectedServiceName] = useState(aiServiceName);
  const [rangeStartDate, setRangeStartDate] = useState(getDateWithOffset(0));
  const [selectedDate, setSelectedDate] = useState(getDateWithOffset(0));
  const [selectedSlotStart, setSelectedSlotStart] = useState('');
  const [slotMapByDate, setSlotMapByDate] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const token = localStorage.getItem('token');

  const visibleDates = useMemo(
    () => [0, 1, 2].map((offset) => addDaysToIsoDate(rangeStartDate, offset)),
    [rangeStartDate]
  );

  useEffect(() => {
    if (!visibleDates.includes(selectedDate)) {
      setSelectedDate(visibleDates[0]);
      setSelectedSlotStart('');
    }
  }, [selectedDate, visibleDates]);

  useEffect(() => {
    if (!doctorId) return;

    const fetchDoctorScreenData = async () => {
      setLoading(true);
      setError('');
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const [doctorListResponse, reviewsResponse] = await Promise.all([
          axios.get(`${API_URL}/api/appointments/doctors`, {
            params: { appointmentType: 'SCHEDULED', type: 'SCHEDULED' },
            headers,
          }),
          axios.get(`${API_URL}/api/reviews/doctor/${doctorId}/public`, {
            params: { page: 1, pageSize: 50, sort: 'newest' },
            headers,
          }),
        ]);

        const doctors = Array.isArray(doctorListResponse.data) ? doctorListResponse.data : [];
        const targetDoctor = doctors.find((item) => String(item.userId) === String(doctorId));
        const parsedServices = parseDoctorServiceSelections(targetDoctor?.services);
        const offeredServices = normalizeStringArray(parsedServices.selectedServices);

        setDoctor((current) => ({
          ...current,
          id: doctorId,
          name: targetDoctor?.user?.name || reviewsResponse?.data?.doctor?.name || current.name,
          practitionerType: getPractitionerTypeLabel(targetDoctor, current.practitionerType || 'General Practitioner (GP)'),
          qualification: targetDoctor?.qualification || current.qualification || 'MBBS, MD',
          yearsExperience: Number(targetDoctor?.yearsExperience || targetDoctor?.years_of_experience || current.yearsExperience || 1),
          consultationFee: getDoctorConsultationFeeFromDoctorRecord(targetDoctor, current.consultationFee || 75),
          offeredServices,
          offeredServiceRates: parsedServices.selectedServiceRates || {},
          isOnline: Boolean(targetDoctor?.isOnline),
        }));
        setSelectedServiceName((current) => {
          if (offeredServices.length === 0) {
            return current || aiServiceName || 'General Consultation';
          }
          const matchingCurrent = findMatchingServiceName(offeredServices, current);
          if (matchingCurrent) return matchingCurrent;
          const matchingAiService = findMatchingServiceName(offeredServices, aiServiceName);
          if (matchingAiService) return matchingAiService;
          return offeredServices[0];
        });

        setSummary(
          reviewsResponse?.data?.summary || {
            averageRating: 0,
            reviewCount: 0,
            ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          }
        );
        setAllReviews(Array.isArray(reviewsResponse?.data?.reviews) ? reviewsResponse.data.reviews : []);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError?.response?.data?.error || 'Failed to load doctor details.');
        setAllReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorScreenData();
  }, [aiServiceName, doctorId, token]);

  useEffect(() => {
    if (!doctorId || !futureBooking) {
      setSlotMapByDate({});
      return;
    }

    const fetchVisibleSlots = async () => {
      setLoadingSlots(true);
      setSlotsError('');
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const entries = await Promise.all(
          visibleDates.map(async (date) => {
            const { data } = await axios.get(`${API_URL}/api/appointments/doctors/${doctorId}/slots`, {
              params: { date, mode: consultationMode },
              headers,
            });
            return [date, Array.isArray(data?.slots) ? data.slots : []];
          })
        );
        setSlotMapByDate(Object.fromEntries(entries));
      } catch (fetchError) {
        console.error(fetchError);
        setSlotsError(fetchError?.response?.data?.error || 'Failed to fetch available slots.');
        setSlotMapByDate({});
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchVisibleSlots();
  }, [consultationMode, doctorId, futureBooking, token, visibleDates]);

  const reviews = useMemo(() => sortReviews(allReviews, sort), [allReviews, sort]);
  const averageRating = Number(summary?.averageRating || 0);
  const roundedRating = Math.round(averageRating);
  const reviewCount = Number(summary?.reviewCount || 0);
  const formattedDoctorName = formatDoctorName(doctor.name, 'Doctor');
  const selectedSlotLabel = selectedSlotStart ? parseTimeTo12Hour(selectedSlotStart) : '';
  const offeredServiceOptions = useMemo(() => {
    const services = normalizeStringArray(doctor?.offeredServices);
    if (services.length > 0) return services;
    return ['General Consultation'];
  }, [doctor?.offeredServices]);
  const resolvedServiceName = useMemo(() => {
    const matching = findMatchingServiceName(offeredServiceOptions, selectedServiceName);
    if (matching) return matching;
    return offeredServiceOptions[0] || 'General Consultation';
  }, [offeredServiceOptions, selectedServiceName]);
  const resolvedConsultationFee = useMemo(() => {
    const mappedRate = Number(getServiceRateFromMap(doctor?.offeredServiceRates, resolvedServiceName));
    if (Number.isFinite(mappedRate) && mappedRate > 0) {
      return Number(mappedRate.toFixed(2));
    }

    const offeredServices = normalizeStringArray(doctor?.offeredServices);
    const hasService = offeredServices.some(
      (service) => String(service).trim().toLowerCase() === String(resolvedServiceName).trim().toLowerCase()
    );
    if (hasService) {
      return Number(getServiceRate(resolvedServiceName).toFixed(2));
    }

    const fallback = Number(doctor?.consultationFee);
    if (Number.isFinite(fallback) && fallback > 0) {
      return Number(fallback.toFixed(2));
    }

    return 75;
  }, [doctor?.consultationFee, doctor?.offeredServiceRates, doctor?.offeredServices, resolvedServiceName]);

  const selectedDatePretty = useMemo(
    () =>
      new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    [selectedDate]
  );

  const bookingType = futureBooking ? 'SCHEDULED' : 'ON_DEMAND';

  const handleBookAppointment = () => {
    if (!doctorId) return;
    if (futureBooking && !selectedSlotStart) {
      window.alert('Please select a slot before booking.');
      return;
    }

    const serviceName = String(resolvedServiceName || '').trim();

    navigate(`/booking/doctor/${doctorId}/steps`, {
      state: {
        aiSummary,
        selectedPatientId,
        bookingType,
        futureBooking,
        consultationMode,
        selectedDate,
        selectedSlotStart: bookingType === 'SCHEDULED' ? selectedSlotStart : '',
        serviceName: serviceName || aiServiceName || '',
        doctorPreview: {
          id: doctorId,
          name: doctor?.name || '',
          practitionerType: doctor?.practitionerType || 'General Practitioner (GP)',
          qualification: doctor?.qualification || '',
          yearsExperience: doctor?.yearsExperience || 0,
        },
      },
    });
  };

  const renderAvailability = () => (
    <div className="doctor-detail-availability">
      <div className="doctor-detail-select-row">
        <select value={resolvedServiceName} onChange={(event) => setSelectedServiceName(event.target.value)}>
          {offeredServiceOptions.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
        <label className="doctor-detail-toggle">
          <span>Future Booking</span>
          <input
            type="checkbox"
            checked={futureBooking}
            onChange={(event) => {
              setFutureBooking(event.target.checked);
              setSelectedSlotStart('');
            }}
          />
          <i />
        </label>
      </div>

      <p className="doctor-detail-text">
        {resolvedServiceName} appointments are available with secure online booking and verified telehealth workflow.
      </p>

      <div className="doctor-detail-date-range">
        <strong>Select a Date Range</strong>
        <div>
          <span>{new Date(`${visibleDates[0]}T00:00:00`).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}</span>
          <span> - </span>
          <span>{new Date(`${visibleDates[2]}T00:00:00`).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}</span>
          <button
            type="button"
            aria-label="Previous dates"
            onClick={() => setRangeStartDate((current) => addDaysToIsoDate(current, -3))}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            aria-label="Next dates"
            onClick={() => setRangeStartDate((current) => addDaysToIsoDate(current, 3))}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {slotsError ? <p className="doctor-detail-slot-error">{slotsError}</p> : null}

      <div className="doctor-detail-slot-grid">
        {visibleDates.map((date) => {
          const slots = slotMapByDate[date] || [];
          const heading = new Date(`${date}T00:00:00`).toLocaleDateString('en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          return (
            <article
              key={date}
              className={`doctor-detail-slot-column ${selectedDate === date ? 'is-selected-date' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <h4>{heading}</h4>
              {!futureBooking ? (
                <p className="doctor-detail-slot-empty">Instant consultation mode is enabled.</p>
              ) : loadingSlots ? (
                <p className="doctor-detail-slot-empty">Loading slots...</p>
              ) : slots.length === 0 ? (
                <p className="doctor-detail-slot-empty">Doctor's slots are not available</p>
              ) : (
                <div className="doctor-detail-slot-buttons">
                  {slots.slice(0, 6).map((slot) => {
                    const isSelected = selectedSlotStart === slot.startAt;
                    return (
                      <button
                        type="button"
                        key={slot.startAt}
                        className={isSelected ? 'is-selected' : ''}
                        disabled={!slot.available}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedDate(date);
                          setSelectedSlotStart(slot.startAt);
                        }}
                      >
                        {parseTimeTo12Hour(slot.label || slot.startAt)}
                      </button>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <main className="doctor-detail-page">
        <LandingNavbar activeKey="patient" />
        <section className="doctor-detail-shell doctor-detail-shell--page">
          <div className="doctor-detail-state">
            <p>Loading doctor details...</p>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="doctor-detail-page">
        <LandingNavbar activeKey="patient" />
        <section className="doctor-detail-shell doctor-detail-shell--page">
          <div className="doctor-detail-state doctor-detail-state--error">
            <p>{error}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="doctor-detail-page">
      <LandingNavbar activeKey="patient" />

      <section className="doctor-detail-shell doctor-detail-shell--page">
        <article className="doctor-detail-header">
          <div className="doctor-detail-header__profile">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formattedDoctorName)}`}
              alt={formattedDoctorName}
            />
            <div>
              <div className="doctor-detail-name">
                <h1>{formattedDoctorName}</h1>
                <CheckCircle2 size={14} />
              </div>
              <p>
                {doctor.practitionerType || 'Specialist'} | {doctor?.gender || 'Male'} | {doctor.yearsExperience || 1} Years Of
                Experience
              </p>
              <div className="doctor-detail-qualification-row">
                <span>{doctor.qualification || 'MBBS, MD'}</span>
                <ReviewStars rating={roundedRating} size={14} />
                <strong>{averageRating.toFixed(1)}</strong>
                <em>{averageRating >= 4.5 ? 'Highly rated' : 'Verified doctor'}</em>
              </div>
            </div>
          </div>

          <div className="doctor-detail-header__modes">
            {MODE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={consultationMode === option.value ? 'is-active' : ''}
                  onClick={() => setConsultationMode(option.value)}
                >
                  <Icon size={17} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </article>

        <article className="doctor-detail-tabs">
          <header>
            {[
              { key: 'availability', label: 'Availability' },
              { key: 'service', label: 'Service Details' },
              { key: 'about', label: 'About The Doctor' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? 'is-active' : ''}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </header>

          {activeTab === 'availability' ? renderAvailability() : null}
          {activeTab === 'service' ? (
            <div className="doctor-detail-tab-content">
              <h3>{resolvedServiceName} consultation</h3>
              <p>
                This service includes assessment, treatment guidance, prescription support, and follow-up planning based on
                symptoms and medical context.
              </p>
            </div>
          ) : null}
          {activeTab === 'about' ? (
            <div className="doctor-detail-tab-content">
              <h3>About {formattedDoctorName}</h3>
              <p>
                Experienced telehealth doctor focused on evidence-based care, patient safety, and practical treatment plans for
                fast recovery.
              </p>
            </div>
          ) : null}
        </article>

        <article className="doctor-detail-reviews">
          <div className="doctor-detail-reviews__summary">
            <div>
              <h2>Patient Reviews</h2>
              <p>Overall satisfaction</p>
            </div>
            <div className="doctor-detail-reviews__score">
              <div>
                <strong>{averageRating.toFixed(1)}</strong>
                <ReviewStars rating={roundedRating} size={24} />
                <span>{reviewCount} Reviews</span>
              </div>
              <div className="doctor-detail-reviews__breakdown">
                {[5, 4, 3, 2, 1].map((score) => {
                  const count = Number(summary?.ratingBreakdown?.[score] || 0);
                  const width = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                  return (
                    <div key={score}>
                      <span>{score}</span>
                      <Star size={14} fill="currentColor" />
                      <i>
                        <b style={{ width: `${width}%` }} />
                      </i>
                      <strong>{count}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="doctor-detail-reviews__list">
            <header>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="newest">Most Recent</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </header>

            {reviews.length === 0 ? (
              <div className="doctor-detail-state">
                <p>No reviews available for this doctor yet.</p>
              </div>
            ) : (
              <div className="doctor-detail-review-items">
                {reviews.slice(0, 6).map((review) => {
                  const rating = Number(review.rating || 0);
                  const patientName = review?.patient?.name || 'Patient';
                  const tag = getSatisfactionTag(rating);
                  return (
                    <article key={review.id}>
                      <div className="doctor-detail-review-head">
                        <div className="doctor-detail-review-patient">
                          <div>{String(patientName).charAt(0).toUpperCase() || 'P'}</div>
                          <h3>{patientName}</h3>
                        </div>
                        <span className={`doctor-detail-review-tag ${tag.className}`}>{tag.label}</span>
                      </div>
                      {review.message ? <p>{review.message}</p> : null}
                      <footer>
                        <span>{formatRelativeDate(review.createdAt)}</span>
                        <ReviewStars rating={rating} size={14} />
                        <strong>{rating}</strong>
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </article>
      </section>

      <div className="doctor-detail-booking-bar">
        <div>
          <strong>${resolvedConsultationFee.toFixed(2)}</strong>
          <p>
            {futureBooking && selectedSlotLabel
              ? `${selectedDatePretty}, ${selectedSlotLabel}`
              : futureBooking
                ? `Select a slot to continue`
                : 'Instant consultation'}
          </p>
          <span>{resolvedServiceName} | {consultationMode}</span>
        </div>
        <button type="button" onClick={handleBookAppointment} disabled={futureBooking && !selectedSlotStart}>
          Book Appointment
        </button>
      </div>

      <footer className="landing-footer">
        <div className="container landing-footer__grid">
          <div>
            <div className="landing-footer__brand">
              <AppIcon size={30} />
              <span>CareBridge</span>
            </div>
            <p>
              CareBridge is your all-in-one platform for consultations, prescriptions, referrals, and medical workflow
              support, helping patients access quality healthcare without delays.
            </p>
          </div>
          <div>
            <h4>Patient</h4>
            <a href="/">Telehealth Consultation</a>
            <a href="/">Prescription</a>
            <a href="/">Medical Certificates</a>
            <a href="/">Blood Test Requests</a>
            <a href="/">Radiology Requests</a>
          </div>
          <div>
            <h4>Quick Links</h4>
            <a href="/">About Us</a>
            <a href="/">Our Team</a>
            <a href="/">Blog</a>
            <a href="/">Career</a>
          </div>
          <div>
            <h4>Help &amp; Support</h4>
            <a href="/">Contact Us</a>
            <a href="/">Help Center</a>
            <a href="/">Privacy Policy</a>
            <a href="/">Terms &amp; Conditions</a>
          </div>
        </div>
        <div className="landing-footer__bar">2026 CareBridge. All rights reserved.</div>
      </footer>
    </main>
  );
}
