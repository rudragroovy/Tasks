import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  Search,
  Share2,
  ShieldCheck,
  Star,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';
import AppIcon from '../components/branding/AppIcon';
import { getServiceRate } from '../data/practitionerServiceCatalog';
import { formatDoctorName } from '../utils/doctorName';
import {
  getServiceRateFromMap,
  normalizeStringArray,
  parseDoctorServiceSelections,
} from '../utils/doctorServices';
import { useSocket } from '../context/SocketContext';
import useServiceNavigation from '../hooks/useServiceNavigation';
import './booking-page.css';

const MODE_OPTIONS = [
  { value: 'VIDEO', label: 'Televideo' },
  { value: 'AUDIO', label: 'Telephone' },
  { value: 'IN_PERSON', label: 'In-Person Doctor Visit' },
  { value: 'HOME_VISIT', label: 'Home Visit', disabled: true },
];

const toIsoDate = (date) => date.toISOString().split('T')[0];

const getDateWithOffset = (offsetDays = 0) => {
  const next = new Date();
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + offsetDays);
  return toIsoDate(next);
};

const parseTimeTo12Hour = (value) => {
  if (!value) return '';

  const input = String(value).trim();
  if (/[aApP][mM]/.test(input)) return input.toUpperCase();

  const timePart = input.includes('T')
    ? new Date(input).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })
    : input;

  const match = timePart.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return timePart.toUpperCase();

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, '0')}:${minutes} ${suffix}`;
};

const formatDateBadges = (dateString) => {
  const parsed = new Date(`${dateString}T00:00:00`);
  const day = parsed.toLocaleDateString('en-US', { weekday: 'long' });
  return {
    day,
    date: dateString,
  };
};

const getDoctorRating = (doctor) => {
  const numeric = Number(doctor?.averageRating ?? doctor?.rating ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(5, numeric));
};

const getDoctorReviewCount = (doctor) => {
  const numeric = Number(doctor?.reviewCount ?? 0);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
};

const getDoctorServiceRate = (doctor, serviceName) => {
  if (!serviceName) return null;

  const fromDoctorMap = getServiceRateFromMap(doctor?.offeredServiceRates, serviceName);
  if (Number.isFinite(Number(fromDoctorMap))) return Number(fromDoctorMap);

  const offeredServices = normalizeStringArray(doctor?.offeredServices);
  const requested = String(serviceName).trim().toLowerCase();
  const hasRequestedService = offeredServices.some((name) => String(name).toLowerCase() === requested);
  if (!hasRequestedService) return null;
  return getServiceRate(serviceName);
};

const getDoctorDefaultServiceRate = (doctor) => {
  const rates = Object.values(doctor?.offeredServiceRates || {})
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (rates.length > 0) {
    const total = rates.reduce((sum, value) => sum + value, 0);
    return Number((total / rates.length).toFixed(2));
  }

  const offeredServices = normalizeStringArray(doctor?.offeredServices);
  if (offeredServices.length > 0) {
    return getServiceRate(offeredServices[0]);
  }

  return 75;
};

const isDoctorOnline = (doctor) => doctor?.isOnline === true;

const copyTextToClipboard = async (value) => {
  if (!value) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'absolute';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
};

export default function Booking() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const socket = useSocket();
  const navigateToService = useServiceNavigation();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [futureBooking, setFutureBooking] = useState(true);
  const [consultationMode, setConsultationMode] = useState('VIDEO');
  const [bookingDate, setBookingDate] = useState(getDateWithOffset(0));
  const [doctorSlots, setDoctorSlots] = useState({});
  const [selectedSlotsByDoctor, setSelectedSlotsByDoctor] = useState({});
  const [expandedSlotsByDoctor, setExpandedSlotsByDoctor] = useState({});
  const [sharedDoctorId, setSharedDoctorId] = useState(null);

  const [doctorNameFilter, setDoctorNameFilter] = useState('');
  const [clinicFilter, setClinicFilter] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('ANY');
  const [availabilityFilter, setAvailabilityFilter] = useState('ANY');
  const [genderFilter, setGenderFilter] = useState('ANY');
  const [ratingFilter, setRatingFilter] = useState('ANY');

  const aiSummary = location.state?.aiSummary || {};
  const selectedPatientId =
    typeof aiSummary.selectedPatientId === 'string' ? aiSummary.selectedPatientId : 'self';
  const practitionerTypeQuery = searchParams.get('practitionerType') || '';
  const selectedServiceName = searchParams.get('service') || aiSummary?.serviceName || '';
  const selectedServiceType = searchParams.get('serviceType') || aiSummary?.serviceType || '';
  const categoryQuery = searchParams.get('category') || '';

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const params = {
        type: futureBooking ? 'SCHEDULED' : 'ON_DEMAND',
        appointmentType: futureBooking ? 'SCHEDULED' : 'ON_DEMAND',
      };

      const { data } = await axios.get('http://localhost:5000/api/appointments/doctors', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const normalizedDoctors = (Array.isArray(data) ? data : []).map((doctor) => {
        const selections = parseDoctorServiceSelections(doctor?.services);
        return {
          ...doctor,
          offeredServiceTypes: selections.selectedServiceTypes,
          offeredServices: selections.selectedServices,
          offeredServiceRates: selections.selectedServiceRates,
        };
      });
      setDoctors(normalizedDoctors);
    } catch (error) {
      console.error(error);
      setFetchError(error?.response?.data?.error || 'Failed to load doctors.');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [futureBooking]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleDoctorsUpdated = () => {
      fetchDoctors();
    };
    socket.on('doctors:updated', handleDoctorsUpdated);
    return () => {
      socket.off('doctors:updated', handleDoctorsUpdated);
    };
  }, [fetchDoctors, socket]);

  useEffect(() => {
    setSelectedSlotsByDoctor({});
    setExpandedSlotsByDoctor({});
  }, [consultationMode, bookingDate, futureBooking]);

  useEffect(() => {
    if (!futureBooking || doctors.length === 0) {
      setDoctorSlots({});
      return;
    }

    let cancelled = false;
    const loadAllSlots = async () => {
      const slotEntries = await Promise.all(
        doctors.map(async (doctor) => {
          try {
            const { data } = await axios.get(
              `http://localhost:5000/api/appointments/doctors/${doctor.userId}/slots`,
              {
                params: {
                  date: bookingDate,
                  mode: consultationMode,
                },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
              }
            );
            return [
              doctor.userId,
              {
                loading: false,
                error: '',
                slots: Array.isArray(data?.slots) ? data.slots : [],
              },
            ];
          } catch (error) {
            return [
              doctor.userId,
              {
                loading: false,
                error: error?.response?.data?.error || 'Unable to load slots.',
                slots: [],
              },
            ];
          }
        })
      );

      if (cancelled) return;
      setDoctorSlots(Object.fromEntries(slotEntries));
    };

    const initialState = Object.fromEntries(
      doctors.map((doctor) => [doctor.userId, { loading: true, error: '', slots: [] }])
    );
    setDoctorSlots(initialState);
    loadAllSlots();

    return () => {
      cancelled = true;
    };
  }, [bookingDate, consultationMode, doctors, futureBooking]);

  const specializationOptions = useMemo(() => {
    const names = doctors
      .map((doctor) => doctor?.practitionerType)
      .filter(Boolean);
    return ['ANY', ...Array.from(new Set(names))];
  }, [doctors]);

  const visibleDoctors = useMemo(
    () => (futureBooking ? doctors : doctors.filter((doctor) => isDoctorOnline(doctor))),
    [doctors, futureBooking]
  );

  const filteredDoctors = useMemo(() => {
    return visibleDoctors.filter((doctor) => {
      const doctorName = formatDoctorName(doctor?.user?.name, 'Doctor').toLowerCase();
      const clinicName = String(
        doctor?.clinicName || doctor?.clinic?.name || doctor?.clinicAddress || 'Online Clinic'
      ).toLowerCase();
      const practitionerType = String(
        doctor?.practitionerType || 'General Practitioner (GP)'
      );
      const genderRaw = String(doctor?.gender || doctor?.user?.gender || '').trim().toUpperCase();
      const doctorGender = genderRaw.startsWith('M')
        ? 'MALE'
        : genderRaw.startsWith('F')
          ? 'FEMALE'
          : 'UNKNOWN';
      const ratingValue = getDoctorRating(doctor);
      const reviewCount = getDoctorReviewCount(doctor);
      const normalizedPractitionerType = String(practitionerType).trim().toLowerCase();
      const normalizedTypeFilter = String(specializationFilter || '').trim().toLowerCase();

      if (doctorNameFilter && !doctorName.includes(doctorNameFilter.toLowerCase())) return false;
      if (clinicFilter && !clinicName.includes(clinicFilter.toLowerCase())) return false;
      if (specializationFilter !== 'ANY' && normalizedPractitionerType !== normalizedTypeFilter) return false;
      if (genderFilter !== 'ANY' && doctorGender !== genderFilter) return false;
      if (ratingFilter !== 'ANY' && (reviewCount <= 0 || ratingValue < Number(ratingFilter))) return false;
      if (futureBooking && availabilityFilter !== 'ANY') {
        const slotState = doctorSlots[doctorId];
        if (slotState?.loading) return true;
        const hasAvailableSlot = Array.isArray(slotState?.slots)
          ? slotState.slots.some((slot) => slot?.available)
          : false;
        if (!hasAvailableSlot) return false;
      }
      return true;
    });
  }, [
    availabilityFilter,
    clinicFilter,
    doctorNameFilter,
    doctorSlots,
    futureBooking,
    genderFilter,
    ratingFilter,
    specializationFilter,
    visibleDoctors,
  ]);

  const avgFee = useMemo(() => {
    if (!filteredDoctors.length) return 49.25;

    if (selectedServiceName) {
      const serviceRates = filteredDoctors
        .map((doctor) => getDoctorServiceRate(doctor, selectedServiceName))
        .filter((value) => Number.isFinite(Number(value)) && Number(value) > 0);

      if (serviceRates.length > 0) {
        const total = serviceRates.reduce((sum, value) => sum + Number(value), 0);
        return Number((total / serviceRates.length).toFixed(2));
      }
    }

    const total = filteredDoctors.reduce((sum, doctor) => sum + getDoctorDefaultServiceRate(doctor), 0);
    return Number((total / filteredDoctors.length).toFixed(2));
  }, [filteredDoctors, selectedServiceName]);

  const clearFilters = () => {
    setDoctorNameFilter('');
    setClinicFilter('');
    setSpecializationFilter('ANY');
    setAvailabilityFilter('ANY');
    setGenderFilter('ANY');
    setRatingFilter('ANY');
    setBookingDate(getDateWithOffset(0));
  };

  const handleShareDoctor = async (doctor) => {
    if (!doctor?.userId) return;

    const doctorName = formatDoctorName(doctor?.user?.name, 'Doctor');
    const practitionerType = doctor?.practitionerType || 'General Practitioner (GP)';
    const shareUrl = new URL(`${window.location.origin}/booking`);

    if (categoryQuery) shareUrl.searchParams.set('category', categoryQuery);
    if (practitionerTypeQuery) {
      shareUrl.searchParams.set('practitionerType', practitionerTypeQuery);
    }
    shareUrl.searchParams.set('doctorId', doctor.userId);

    const shareData = {
      title: `${doctorName} - ${practitionerType}`,
      text: `Book a consultation with ${doctorName} on CareBridge.`,
      url: shareUrl.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyTextToClipboard(shareData.url);
      }
      setSharedDoctorId(doctor.userId);
      window.setTimeout(() => {
        setSharedDoctorId((current) => (current === doctor.userId ? null : current));
      }, 1700);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      try {
        await copyTextToClipboard(shareData.url);
        setSharedDoctorId(doctor.userId);
        window.setTimeout(() => {
          setSharedDoctorId((current) => (current === doctor.userId ? null : current));
        }, 1700);
      } catch (copyError) {
        console.error(copyError);
      }
    }
  };

  const handleOpenDoctorReviews = (doctor) => {
    if (!doctor?.userId) return;
    navigate(`/booking/doctor/${doctor.userId}`, {
      state: {
        aiSummary,
        selectedPatientId,
        doctorPreview: {
          id: doctor.userId,
          name: doctor?.user?.name || '',
          practitionerType: doctor?.practitionerType || 'General Practitioner (GP)',
          qualification: doctor?.qualification || '',
          yearsExperience: doctor?.yearsExperience || doctor?.years_of_experience || 0,
        },
      },
    });
  };

  const handleAvailabilitySelect = (value) => {
    setAvailabilityFilter(value);
    if (value === 'TODAY') setBookingDate(getDateWithOffset(0));
    if (value === 'TOMORROW') setBookingDate(getDateWithOffset(1));
    if (value === 'NEXT_WEEK') setBookingDate(getDateWithOffset(7));
  };

  const toggleSlotExpand = (doctorId) => {
    setExpandedSlotsByDoctor((prev) => ({
      ...prev,
      [doctorId]: !prev[doctorId],
    }));
  };

  const handleBookDoctor = (doctor) => {
    if (!doctor?.userId) return;
    const bookingType = futureBooking ? 'SCHEDULED' : 'ON_DEMAND';
    const selectedSlotStart = selectedSlotsByDoctor[doctor.userId];

    if (bookingType === 'SCHEDULED' && !selectedSlotStart) {
      window.alert('Please select a timeslot before continuing.');
      return;
    }

    navigate(`/booking/doctor/${doctor.userId}/steps`, {
      state: {
        aiSummary,
        selectedPatientId,
        bookingType,
        futureBooking,
        consultationMode,
        selectedDate: bookingDate,
        selectedSlotStart: bookingType === 'SCHEDULED' ? selectedSlotStart : '',
        serviceName: selectedServiceName || aiSummary?.serviceName || '',
        serviceType: selectedServiceType || aiSummary?.serviceType || '',
        doctorPreview: {
          id: doctor.userId,
          name: doctor?.user?.name || '',
          practitionerType: doctor?.practitionerType || 'General Practitioner (GP)',
          qualification: doctor?.qualification || '',
          yearsExperience: doctor?.yearsExperience || doctor?.years_of_experience || 0,
        },
      },
    });
  };

  const { day: bookingDayLabel, date: bookingDateLabel } = formatDateBadges(bookingDate);
  const canNavigateToSelectedService = Boolean(selectedServiceName || categoryQuery);

  const handleSelectedServiceBreadcrumbClick = () => {
    if (selectedServiceName) {
      navigateToService(selectedServiceName);
      return;
    }
    if (categoryQuery) {
      navigate(`/category/${encodeURIComponent(categoryQuery)}`);
    }
  };

  return (
    <main className="booking-page">
      <LandingNavbar activeKey="patient" />

      <section className="booking-shell booking-shell--page">
        <div className="booking-breadcrumbs">
          <button type="button" className="booking-breadcrumb-link" onClick={() => navigate('/home')}>
            Home
          </button>
          <span>/</span>
          <button
            type="button"
            className="booking-breadcrumb-link booking-breadcrumb-link--current"
            onClick={handleSelectedServiceBreadcrumbClick}
            disabled={!canNavigateToSelectedService}
          >
            {selectedServiceName || categoryQuery || 'Booking'}
          </button>
        </div>

        <div className="booking-layout">
          <aside className="booking-filters">
            <div className="booking-filters__head">
              <h3>Filters</h3>
              <button type="button" onClick={clearFilters}>Clear Filters</button>
            </div>

            <label className="booking-field">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search Doctor Name"
                value={doctorNameFilter}
                onChange={(event) => setDoctorNameFilter(event.target.value)}
              />
            </label>

            <label className="booking-field">
              <SlidersHorizontal size={15} />
              <input
                type="text"
                placeholder="Search Clinic Address"
                value={clinicFilter}
                onChange={(event) => setClinicFilter(event.target.value)}
              />
            </label>

            <div className="booking-filter-block">
              <p>Booking Date</p>
              <label className="booking-field">
                <CalendarDays size={15} />
                <input
                  type="date"
                  value={bookingDate}
                  min={getDateWithOffset(0)}
                  onChange={(event) => {
                    setAvailabilityFilter('ANY');
                    setBookingDate(event.target.value);
                  }}
                />
              </label>
            </div>

            <div className="booking-filter-block">
              <p>Practitioner Type</p>
              <div className="booking-chip-wrap">
                {specializationOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={specializationFilter === option ? 'is-active' : ''}
                    onClick={() => setSpecializationFilter(option)}
                  >
                    {option === 'ANY' ? 'Any' : option}
                  </button>
                ))}
              </div>
            </div>

            <div className="booking-filter-block">
              <p>Availability</p>
              <div className="booking-chip-wrap">
                {[
                  { value: 'ANY', label: 'Any' },
                  { value: 'TODAY', label: 'Today' },
                  { value: 'TOMORROW', label: 'Tomorrow' },
                  { value: 'NEXT_WEEK', label: 'Next Week' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={availabilityFilter === option.value ? 'is-active' : ''}
                    onClick={() => handleAvailabilitySelect(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="booking-filter-block">
              <p>Gender</p>
              <div className="booking-chip-wrap">
                {[
                  { value: 'ANY', label: 'Any' },
                  { value: 'MALE', label: 'Male' },
                  { value: 'FEMALE', label: 'Female' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={genderFilter === option.value ? 'is-active' : ''}
                    onClick={() => setGenderFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="booking-filter-block">
              <p>Rating</p>
              <div className="booking-chip-wrap booking-chip-wrap--rating">
                {[
                  { value: 'ANY', label: 'Any' },
                  { value: '5', label: '5 Stars' },
                  { value: '4', label: '4 Stars' },
                  { value: '3', label: '3 Stars' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={ratingFilter === option.value ? 'is-active' : ''}
                    onClick={() => setRatingFilter(option.value)}
                  >
                    {option.value !== 'ANY' && <Star size={12} fill="currentColor" />}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="booking-results">
            <header className="booking-results__head">
              <h1>
                Televideo consultation fee for this service is <span>${avgFee.toFixed(2)}</span>
              </h1>
              <p>{filteredDoctors.length} results</p>
            </header>

            <div className="booking-future-toggle">
              <label htmlFor="future-booking">
                <span>Future Booking</span>
                <input
                  id="future-booking"
                  type="checkbox"
                  checked={futureBooking}
                  onChange={(event) => setFutureBooking(event.target.checked)}
                />
                <i />
              </label>
            </div>

            <div className="booking-mode-tabs">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  className={consultationMode === option.value ? 'is-active' : ''}
                  onClick={() => {
                    if (!option.disabled) setConsultationMode(option.value);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {loading && (
              <div className="booking-state booking-state--loading">
                <p>Loading doctors...</p>
              </div>
            )}

            {!loading && fetchError && (
              <div className="booking-state booking-state--error">
                <p>{fetchError}</p>
              </div>
            )}

            {!loading && !fetchError && filteredDoctors.length === 0 && (
              <div className="booking-state">
                <p>No doctors matched your current filters.</p>
              </div>
            )}

            {!loading && !fetchError && filteredDoctors.length > 0 && (
              <div className="booking-doctor-list">
                {filteredDoctors.map((doctor) => {
                  const doctorId = doctor.userId;
                  const doctorName = formatDoctorName(doctor?.user?.name, 'Doctor');
                  const practitionerType = doctor?.practitionerType || 'General Practitioner (GP)';
                  const rating = getDoctorRating(doctor);
                  const reviewCount = getDoctorReviewCount(doctor);
                  const slotsState = doctorSlots[doctorId] || { loading: futureBooking, slots: [], error: '' };
                  const visibleSlots = expandedSlotsByDoctor[doctorId]
                    ? slotsState.slots
                    : slotsState.slots.slice(0, 9);
                  const selectedSlot = selectedSlotsByDoctor[doctorId];
                  const canShowMore = slotsState.slots.length > 9;

                  return (
                    <article
                      key={doctorId}
                      className="booking-doctor-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenDoctorReviews(doctor)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleOpenDoctorReviews(doctor);
                        }
                      }}
                    >
                      <div className="booking-doctor-card__head">
                        <div className="booking-doctor-main">
                          <img
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(doctorName)}`}
                            alt={doctorName}
                          />
                          <div>
                            <div className="booking-doctor-name-row">
                              <h3>{doctorName}</h3>
                              <CheckCircle2 size={14} />
                            </div>
                            <div className="booking-doctor-rating">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} size={12} fill={star <= Math.round(rating) ? 'currentColor' : 'none'} />
                              ))}
                              <span>
                                {reviewCount > 0 ? `${rating.toFixed(1)} (${reviewCount})` : 'No ratings yet'}
                              </span>
                            </div>
                            <p className="booking-doctor-qualification">
                              <ShieldCheck size={13} />
                              {doctor?.qualification || 'MBBS'}
                            </p>
                            <p className="booking-doctor-meta">
                              Practitioner Type: {practitionerType}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`booking-share-btn ${sharedDoctorId === doctorId ? 'is-shared' : ''}`}
                          aria-label={`Share ${doctorName}`}
                          title={sharedDoctorId === doctorId ? 'Link copied' : `Share ${doctorName}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleShareDoctor(doctor);
                          }}
                        >
                          {sharedDoctorId === doctorId ? <CheckCircle2 size={16} /> : <Share2 size={16} />}
                        </button>
                      </div>

                      {futureBooking ? (
                        <div
                          className="booking-slot-panel"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <div className="booking-slot-date">
                            <span>{bookingDayLabel}</span>
                            <span>{bookingDateLabel}</span>
                          </div>

                          {slotsState.loading ? (
                            <p className="booking-slot-hint">Loading slots...</p>
                          ) : slotsState.error ? (
                            <p className="booking-slot-hint booking-slot-hint--error">{slotsState.error}</p>
                          ) : slotsState.slots.length === 0 ? (
                            <p className="booking-slot-hint">No available slots for this date.</p>
                          ) : (
                            <>
                              <div className="booking-slot-grid">
                                {visibleSlots.map((slot) => (
                                  <button
                                    key={slot.startAt}
                                    type="button"
                                    className={selectedSlot === slot.startAt ? 'is-selected' : ''}
                                    disabled={!slot.available}
                                    onClick={() =>
                                      setSelectedSlotsByDoctor((prev) => ({
                                        ...prev,
                                        [doctorId]: slot.startAt,
                                      }))
                                    }
                                  >
                                    {parseTimeTo12Hour(slot.label || slot.startAt)}
                                  </button>
                                ))}
                              </div>
                              {canShowMore && (
                                <button
                                  type="button"
                                  className="booking-show-more"
                                  onClick={() => toggleSlotExpand(doctorId)}
                                >
                                  {expandedSlotsByDoctor[doctorId] ? 'Show Less' : 'Show More'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <div
                          className="booking-slot-panel"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <p className="booking-slot-hint">On-demand consultation starts as soon as doctor accepts.</p>
                        </div>
                      )}

                      <div
                        className="booking-doctor-card__actions"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <p>
                          {futureBooking && selectedSlot
                            ? `Selected: ${parseTimeTo12Hour(selectedSlot)}`
                            : futureBooking
                              ? 'Choose a slot to continue'
                              : 'Proceed with instant consultation'}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleBookDoctor(doctor)}
                          disabled={futureBooking && !selectedSlot}
                        >
                          {futureBooking ? 'Book Appointment' : 'Consult Now'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>

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
