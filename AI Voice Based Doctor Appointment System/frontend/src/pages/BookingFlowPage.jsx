import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Clock3, HeartPulse, ShieldAlert, Upload } from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';
import AppIcon from '../components/branding/AppIcon';
import { getServiceRate } from '../data/practitionerServiceCatalog';
import { formatDoctorName } from '../utils/doctorName';
import { getPractitionerTypeLabel } from '../utils/doctorConsultation';
import {
  getServiceRateFromMap,
  normalizeStringArray,
  parseDoctorServiceSelections,
} from '../utils/doctorServices';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MEDICAL_CONDITION_OPTIONS = [
  'Diabetes',
  'Hypertension',
  'Asthma',
  'Heart Disease',
  'Thyroid Disorder',
  'High Cholesterol',
  'Kidney Disease',
  'Liver Disease',
  'Other',
];

const MODE_OPTIONS = [
  { value: 'VIDEO', label: 'Televideo' },
  { value: 'AUDIO', label: 'Telephone' },
  { value: 'IN_PERSON', label: 'In-Person Doctor Visit' },
];

const toIsoDate = (date) => date.toISOString().split('T')[0];

const getDateWithOffset = (offsetDays = 0) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
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

function findMatchingServiceName(services, candidate) {
  const target = String(candidate || '').trim().toLowerCase();
  if (!target) return '';
  return services.find((service) => String(service).trim().toLowerCase() === target) || '';
}

const choiceButtonClass = (isActive) =>
  `h-10 min-w-28 rounded-[10px] border text-sm font-extrabold transition ${
    isActive
      ? 'border-transparent bg-gradient-to-r from-cyan-800 to-cyan-700 text-white'
      : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300'
  }`;

const formControlClass = (isInvalid = false) =>
  `w-full rounded-[10px] border bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition focus:outline-none focus:ring-4 ${
    isInvalid
      ? 'border-red-300 bg-red-50 ring-red-500/10'
      : 'border-slate-200 focus:border-sky-300 focus:ring-cyan-700/10'
  }`;

const primaryActionClass =
  'inline-flex h-11 min-w-[190px] items-center justify-center rounded-[10px] bg-gradient-to-r from-cyan-800 to-cyan-700 px-4 text-[15px] font-black text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65';

export default function BookingFlowPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  const doctorPreview = location.state?.doctorPreview || null;
  const aiSummary = location.state?.aiSummary || {};
  const sourceBookingType = String(location.state?.bookingType || '').toUpperCase();
  const sourceSelectedDate = String(location.state?.selectedDate || '').trim();
  const sourceSelectedSlotStart = String(location.state?.selectedSlotStart || '').trim();
  const sourceConsultationMode = String(location.state?.consultationMode || '').trim();
  const sourceServiceName = String(location.state?.serviceName || aiSummary?.serviceName || '').trim();
  const sourceServiceType = String(location.state?.serviceType || aiSummary?.serviceType || '').trim();
  const sourceSelectedPatientId = String(
    location.state?.selectedPatientId || aiSummary?.selectedPatientId || 'self'
  ).trim();

  const [showSafetyGate, setShowSafetyGate] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  const [doctorLoading, setDoctorLoading] = useState(true);
  const [doctorError, setDoctorError] = useState('');
  const [doctor, setDoctor] = useState({
    id: doctorId,
    name: doctorPreview?.name || '',
    practitionerType: doctorPreview?.practitionerType || '',
    qualification: doctorPreview?.qualification || '',
    yearsExperience: Number(doctorPreview?.yearsExperience || 0),
    offeredServices: [],
    offeredServiceRates: {},
  });

  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyLoading, setFamilyLoading] = useState(true);

  const [selectedPatientId, setSelectedPatientId] = useState(sourceSelectedPatientId || 'self');
  const [reasonForRequest, setReasonForRequest] = useState(String(aiSummary?.patientReason || '').trim());
  const [recentConsultationResponse, setRecentConsultationResponse] = useState(
    String(aiSummary?.recentConsultationResponse || '').trim()
  );
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [bookingType, setBookingType] = useState(
    sourceBookingType === 'ON_DEMAND' || sourceBookingType === 'SCHEDULED'
      ? sourceBookingType
      : location.state?.futureBooking === false
        ? 'ON_DEMAND'
        : 'SCHEDULED'
  );
  const [consultationMode, setConsultationMode] = useState(
    MODE_OPTIONS.some((mode) => mode.value === sourceConsultationMode) ? sourceConsultationMode : 'VIDEO'
  );
  const [selectedDate, setSelectedDate] = useState(sourceSelectedDate || getDateWithOffset(0));
  const [selectedSlotStart, setSelectedSlotStart] = useState(sourceSelectedSlotStart || '');
  const [allergies, setAllergies] = useState(String(aiSummary?.allergies || '').trim());
  const [selectedServiceName, setSelectedServiceName] = useState(sourceServiceName);
  const [selectedServiceType] = useState(sourceServiceType);
  const [selectedMedicalConditions, setSelectedMedicalConditions] = useState(
    normalizeStringArray(aiSummary?.medicalConditions)
  );
  const [noMedicalCondition, setNoMedicalCondition] = useState(Boolean(aiSummary?.noMedicalCondition));
  const [gpMedicationHistory, setGpMedicationHistory] = useState(
    String(aiSummary?.gpMedicationHistory || '').trim().toUpperCase()
  );
  const [currentGpName, setCurrentGpName] = useState(String(aiSummary?.currentGpName || '').trim());
  const [currentGpEmail, setCurrentGpEmail] = useState(String(aiSummary?.currentGpEmail || '').trim());
  const [medicineName, setMedicineName] = useState(String(aiSummary?.medicineName || '').trim());
  const [showConditionPicker, setShowConditionPicker] = useState(false);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (!doctorId) return;

    const fetchDoctor = async () => {
      setDoctorLoading(true);
      setDoctorError('');
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const { data } = await axios.get(`${API_URL}/api/appointments/doctors`, {
          params: { appointmentType: 'SCHEDULED', type: 'SCHEDULED' },
          headers,
        });
        const doctors = Array.isArray(data) ? data : [];
        const targetDoctor = doctors.find((item) => String(item.userId) === String(doctorId));

        if (!targetDoctor) {
          setDoctor((current) => ({
            ...current,
            id: doctorId,
          }));
          setDoctorError('Doctor details are limited for this booking session.');
          return;
        }

        const parsedServices = parseDoctorServiceSelections(targetDoctor.services);
        const offeredServices = normalizeStringArray(parsedServices.selectedServices);

        setDoctor({
          id: doctorId,
          name: targetDoctor?.user?.name || doctorPreview?.name || '',
          practitionerType: getPractitionerTypeLabel(targetDoctor, doctorPreview?.practitionerType || 'General Practitioner (GP)'),
          qualification: targetDoctor?.qualification || doctorPreview?.qualification || 'MBBS, MD',
          yearsExperience: Number(targetDoctor?.yearsExperience || targetDoctor?.years_of_experience || doctorPreview?.yearsExperience || 1),
          offeredServices,
          offeredServiceRates: parsedServices.selectedServiceRates || {},
        });

        setSelectedServiceName((current) => {
          if (offeredServices.length === 0) {
            return current || sourceServiceName || 'General Consultation';
          }
          const fromCurrent = findMatchingServiceName(offeredServices, current);
          if (fromCurrent) return fromCurrent;
          const fromSource = findMatchingServiceName(offeredServices, sourceServiceName);
          if (fromSource) return fromSource;
          return offeredServices[0];
        });
      } catch (error) {
        console.error(error);
        setDoctorError(error?.response?.data?.error || 'Failed to load doctor details.');
      } finally {
        setDoctorLoading(false);
      }
    };

    fetchDoctor();
  }, [doctorId, doctorPreview?.name, doctorPreview?.practitionerType, doctorPreview?.qualification, doctorPreview?.yearsExperience, sourceServiceName, token]);

  useEffect(() => {
    const fetchFamilyMembers = async () => {
      setFamilyLoading(true);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const { data } = await axios.get(`${API_URL}/api/family-members`, { headers });
        setFamilyMembers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setFamilyMembers([]);
      } finally {
        setFamilyLoading(false);
      }
    };

    fetchFamilyMembers();
  }, [token]);

  useEffect(() => {
    if (!doctorId || bookingType !== 'SCHEDULED') {
      setSlots([]);
      setSlotsError('');
      return;
    }

    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSlotsError('');
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const { data } = await axios.get(`${API_URL}/api/appointments/doctors/${doctorId}/slots`, {
          params: { date: selectedDate, mode: consultationMode },
          headers,
        });
        const nextSlots = Array.isArray(data?.slots) ? data.slots : [];
        setSlots(nextSlots);
        setSelectedSlotStart((current) => {
          if (!current) return '';
          const exists = nextSlots.some((slot) => slot.startAt === current);
          return exists ? current : '';
        });
      } catch (error) {
        console.error(error);
        setSlots([]);
        setSlotsError(error?.response?.data?.error || 'Failed to fetch available slots.');
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [bookingType, consultationMode, doctorId, selectedDate, token]);

  useEffect(() => {
    if (selectedPatientId === 'self') return;
    const exists = familyMembers.some((member) => String(member.id) === selectedPatientId);
    if (!exists) setSelectedPatientId('self');
  }, [familyMembers, selectedPatientId]);

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

  const consultationFee = useMemo(() => {
    const mappedRate = Number(getServiceRateFromMap(doctor?.offeredServiceRates, resolvedServiceName));
    if (Number.isFinite(mappedRate) && mappedRate > 0) return Number(mappedRate.toFixed(2));

    const offeredServices = normalizeStringArray(doctor?.offeredServices);
    const hasService = offeredServices.some(
      (service) => String(service).trim().toLowerCase() === String(resolvedServiceName).trim().toLowerCase()
    );
    if (hasService) return Number(getServiceRate(resolvedServiceName).toFixed(2));
    return 75;
  }, [doctor?.offeredServiceRates, doctor?.offeredServices, resolvedServiceName]);

  const platformFee = useMemo(() => Number((consultationFee * 0.18).toFixed(2)), [consultationFee]);
  const totalAmount = useMemo(() => Number((consultationFee + platformFee).toFixed(2)), [consultationFee, platformFee]);

  const formattedDoctorName = formatDoctorName(doctor?.name, 'Doctor');
  const selectedSlotLabel = selectedSlotStart ? parseTimeTo12Hour(selectedSlotStart) : 'Not selected';
  const selectedModeLabel =
    MODE_OPTIONS.find((option) => option.value === consultationMode)?.label || consultationMode;
  const consultationForLabel = selectedPatientId === 'self'
    ? 'Myself'
    : familyMembers.find((member) => String(member.id) === selectedPatientId)?.name || 'Family';

  const handleEmergencyYes = () => {
    window.location.href = 'tel:000';
  };

  const handleContinueFromSafetyGate = () => {
    setShowSafetyGate(false);
  };

  const clearValidationError = (fieldKey) => {
    setValidationErrors((current) => {
      if (!current[fieldKey]) return current;
      const next = { ...current };
      delete next[fieldKey];
      return next;
    });
  };

  const toggleMedicalCondition = (condition) => {
    setNoMedicalCondition(false);
    setSelectedMedicalConditions((current) => {
      const exists = current.includes(condition);
      if (exists) return current.filter((item) => item !== condition);
      return [...current, condition];
    });
  };

  const goNextStep = () => {
    const nextErrors = {};

    if (currentStep === 1) {
      if (!reasonForRequest.trim()) {
        nextErrors.reasonForRequest = 'Please enter the reason for your request.';
      }
      if (selectedPatientId !== 'self' && !familyMembers.some((member) => String(member.id) === selectedPatientId)) {
        nextErrors.selectedPatientId = 'Please select a family member.';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors((current) => ({ ...current, ...nextErrors }));
      return;
    }

    setValidationErrors((current) => {
      const next = { ...current };
      if (currentStep === 1) {
        delete next.reasonForRequest;
        delete next.selectedPatientId;
      }
      return next;
    });

    setCurrentStep((step) => Math.min(3, step + 1));
  };

  const goPreviousStep = () => {
    if (currentStep === 1) {
      navigate(-1);
      return;
    }
    setCurrentStep((step) => Math.max(1, step - 1));
  };

  const handlePayNow = async () => {
    if (bookingType === 'SCHEDULED' && !selectedSlotStart) {
      setValidationErrors((current) => ({
        ...current,
        selectedSlotStart: 'Selected timeslot is missing. Please go back and select a slot again.',
      }));
      setCurrentStep(2);
      return;
    }

    if (!acceptedTerms) {
      setValidationErrors((current) => ({
        ...current,
        acceptedTerms: 'Please accept terms of service before continuing.',
      }));
      return;
    }
    if (!doctorId) {
      setDoctorError('Doctor information is missing. Please go back and select a doctor again.');
      return;
    }

    clearValidationError('acceptedTerms');
    setProcessingPayment(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const normalizedAiSummary = {
        ...(aiSummary || {}),
        selectedPatientId,
        assigned_doctor_id: doctorId,
        assigned_doctor_name: doctor?.name || '',
        serviceName: resolvedServiceName,
        serviceType: selectedServiceType,
        patientReason: reasonForRequest.trim(),
        recentConsultationResponse,
        medicalConditions: noMedicalCondition ? [] : selectedMedicalConditions,
        noMedicalCondition,
        gpMedicationHistory,
        currentGpName: gpMedicationHistory === 'YES' ? currentGpName.trim() : '',
        currentGpEmail: gpMedicationHistory === 'YES' ? currentGpEmail.trim() : '',
        medicineName: gpMedicationHistory === 'YES' ? medicineName.trim() : '',
        medicalHistoryNotes: gpMedicationHistory
          ? gpMedicationHistory === 'YES'
            ? `Seen GP or taken medications in past 12 months: YES | GP Name: ${currentGpName.trim() || '-'} | GP Email: ${currentGpEmail.trim() || '-'} | Medicine: ${medicineName.trim() || '-'}`
            : 'Seen GP or taken medications in past 12 months: NO'
          : '',
        allergies: allergies.trim(),
        attachedFileNames: uploadedFiles.map((file) => file.name),
      };

      const { data: appointment } = await axios.post(
        `${API_URL}/api/appointments`,
        {
          doctorId,
          aiSummary: normalizedAiSummary,
          serviceName: resolvedServiceName,
          serviceType: selectedServiceType || '',
          type: bookingType,
          consultationMode,
          scheduledFor: bookingType === 'SCHEDULED' ? selectedSlotStart : null,
          familyMemberId: selectedPatientId !== 'self' ? selectedPatientId : null,
        },
        { headers }
      );

      const { data: session } = await axios.post(
        `${API_URL}/api/payments/create-checkout-session`,
        {
          doctorId,
          appointmentId: appointment.id,
          serviceName: resolvedServiceName,
          type: bookingType,
        },
        { headers }
      );

      window.location.href = session.url;
    } catch (error) {
      console.error(error);
      window.alert(error?.response?.data?.error || 'Failed to continue with payment.');
      setProcessingPayment(false);
    }
  };

  if (doctorLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_12%_-10%,rgba(20,184,166,0.08),transparent_42%),radial-gradient(circle_at_88%_6%,rgba(14,116,144,0.07),transparent_34%),#f8fbff] font-sans text-slate-900">
        <LandingNavbar activeKey="patient" />
        <section className="mx-auto w-[min(1080px,calc(100%-48px))] pb-16 pt-[86px] max-md:w-[calc(100%-24px)] max-md:pb-14 max-md:pt-[76px]">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-[15px] font-bold text-slate-600">
            <p>Loading booking details...</p>
          </div>
        </section>
      </main>
    );
  }

  if (doctorError && !doctor?.name) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_12%_-10%,rgba(20,184,166,0.08),transparent_42%),radial-gradient(circle_at_88%_6%,rgba(14,116,144,0.07),transparent_34%),#f8fbff] font-sans text-slate-900">
        <LandingNavbar activeKey="patient" />
        <section className="mx-auto w-[min(1080px,calc(100%-48px))] pb-16 pt-[86px] max-md:w-[calc(100%-24px)] max-md:pb-14 max-md:pt-[76px]">
          <div className="rounded-2xl border border-red-200 bg-white px-6 py-16 text-center text-[15px] font-bold text-red-700">
            <p>{doctorError}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_-10%,rgba(20,184,166,0.08),transparent_42%),radial-gradient(circle_at_88%_6%,rgba(14,116,144,0.07),transparent_34%),#f8fbff] font-sans text-slate-900">
      <LandingNavbar activeKey="patient" />

      {showSafetyGate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 pb-4 pt-7" role="dialog" aria-modal="true" aria-label="Safety Check">
          <article className="w-[min(640px,calc(100%-20px))] overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.34)]">
            <header className="bg-gradient-to-br from-red-500 to-rose-500 px-4 py-5 text-center text-white">
              <ShieldAlert size={30} className="mx-auto" />
              <h2 className="mt-2 font-heading text-[clamp(28px,2.3vw,36px)] font-black">Before You Continue</h2>
              <p className="text-sm font-bold">A quick safety check - CareBridge is not an emergency service.</p>
            </header>

            <div className="grid gap-2.5 px-4 pt-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-gradient-to-b from-rose-50 to-rose-50/30 px-3 py-2.5">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <AlertTriangle size={16} />
                </span>
                <div>
                  <strong className="mb-0.5 block text-base font-black text-red-800">Severe or life-threatening</strong>
                  <span className="text-sm font-bold text-red-800">Call 000 immediately.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-amber-50/30 px-3 py-2.5">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Clock3 size={16} />
                </span>
                <div>
                  <strong className="mb-0.5 block text-base font-black text-amber-900">Urgent but not life-threatening</strong>
                  <span className="text-sm font-bold text-amber-900">Contact your GP or nearest urgent care clinic.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-gradient-to-b from-sky-50 to-sky-50/30 px-3 py-2.5">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-cyan-800">
                  <HeartPulse size={16} />
                </span>
                <div>
                  <strong className="mb-0.5 block text-base font-black text-cyan-800">Non-urgent care</strong>
                  <span className="text-sm font-bold text-cyan-800">You are in the right place, continue below.</span>
                </div>
              </div>
            </div>

            <p className="mx-4 mb-2.5 mt-3.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-center text-sm font-extrabold text-red-800">
              Are you currently experiencing life-threatening symptoms such as chest pain, heavy bleeding, or difficulty
              breathing?
            </p>

            <div className="flex gap-2.5 px-4 pb-4 max-md:flex-col">
              <button type="button" className="h-11 flex-1 rounded-[10px] border border-rose-200 bg-white text-sm font-black text-red-700" onClick={handleEmergencyYes}>
                Yes
              </button>
              <button type="button" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-cyan-800 to-cyan-700 text-sm font-black text-white" onClick={handleContinueFromSafetyGate}>
                No, continue to booking <ArrowRight size={15} />
              </button>
            </div>
          </article>
        </div>
      ) : null}

      <section className="mx-auto w-[min(1080px,calc(100%-48px))] pb-16 pt-[86px] max-md:w-[calc(100%-24px)] max-md:pb-14 max-md:pt-[76px]">
        <div className="mb-[18px] flex items-center gap-2 text-[13px] font-bold text-slate-500">
          <span>Home</span>
          <span>/</span>
          <span>{resolvedServiceName || 'Standard Consultation'}</span>
          <span>/</span>
          <strong className="text-cyan-800">{formattedDoctorName}</strong>
        </div>

        <article className="mb-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(14,116,144,0.08)]">
          <button type="button" className="mb-2.5 bg-transparent text-sm font-extrabold text-cyan-800" onClick={goPreviousStep}>
            &larr; Back
          </button>
          <div className="flex items-center justify-between gap-5 max-lg:flex-col max-lg:items-stretch">
            <div className="flex min-w-[320px] items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3 max-lg:min-w-0">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formattedDoctorName)}`}
                alt={formattedDoctorName}
                className="h-[66px] w-[66px] rounded-[10px] border-2 border-sky-200 bg-slate-50 object-cover"
              />
              <div>
                <h1 className="mb-1 font-heading text-[clamp(24px,2.1vw,31px)] font-black leading-[1.05]">{formattedDoctorName}</h1>
                <p className="text-[13px] font-bold text-slate-500">{doctor?.practitionerType || 'General Practitioner'}</p>
                <span className="text-[13px] font-bold text-slate-500">Experience: {doctor?.yearsExperience || 1} Year(s)</span>
              </div>
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-4 max-lg:justify-start">
              {[
                { key: 1, label: 'Patient Details' },
                { key: 2, label: 'Appointment Details' },
                { key: 3, label: 'Review & Payment' },
              ].map((step) => {
                const isActive = currentStep >= step.key;
                return (
                  <div key={step.key} className={`flex items-center gap-2 text-[13px] font-extrabold ${isActive ? 'text-cyan-800' : 'text-slate-400'}`}>
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[13px] font-black ${isActive ? 'border-transparent bg-gradient-to-r from-cyan-800 to-cyan-700 text-white' : 'border-slate-300 text-slate-500'}`}>
                      {step.key}
                    </span>
                    <p className="m-0">{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-[18px] shadow-[0_10px_28px_rgba(14,116,144,0.08)] max-md:p-3.5">
          {doctorError ? (
            <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-red-200 bg-rose-50 px-3 py-2.5 text-[14px] font-bold text-red-700">
              <AlertTriangle size={16} />
              <p>{doctorError}</p>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <section>
              <h2 className="mb-4 text-center font-heading text-[clamp(22px,2vw,30px)] font-black">Patient Details</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-sky-50/30 p-3">
                  <h3 className="mb-2.5 font-heading text-[16px] font-black text-slate-900">Who are you booking this appointment for?</h3>
                  <div className="mb-2.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={choiceButtonClass(selectedPatientId === 'self')}
                      onClick={() => {
                        setSelectedPatientId('self');
                        clearValidationError('selectedPatientId');
                      }}
                    >
                      Myself
                    </button>
                    <button
                      type="button"
                      className={choiceButtonClass(selectedPatientId !== 'self')}
                      onClick={() => {
                        const firstFamily = familyMembers[0];
                        setSelectedPatientId(firstFamily ? String(firstFamily.id) : 'self');
                        clearValidationError('selectedPatientId');
                      }}
                    >
                      Family
                    </button>
                  </div>
                  {selectedPatientId !== 'self' ? (
                    <div>
                      <label htmlFor="booking-flow-family" className="mb-2 block text-[14px] font-black text-slate-700">Choose family member</label>
                      <select
                        id="booking-flow-family"
                        className={formControlClass(Boolean(validationErrors.selectedPatientId))}
                        value={selectedPatientId}
                        onChange={(event) => {
                          setSelectedPatientId(event.target.value);
                          clearValidationError('selectedPatientId');
                        }}
                        disabled={familyLoading || familyMembers.length === 0}
                      >
                        {familyMembers.length === 0 ? (
                          <option value="self">No family members available</option>
                        ) : (
                          familyMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name} ({member.relation})
                            </option>
                          ))
                        )}
                      </select>
                      {familyLoading ? <p className="mt-1.5 text-[13px] font-bold text-slate-500">Loading family members...</p> : null}
                      {validationErrors.selectedPatientId ? (
                        <p className="mt-2 text-[13px] font-bold text-red-700">{validationErrors.selectedPatientId}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[13px] font-bold text-slate-500">You are booking this consultation for yourself.</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-sky-50/30 p-3">
                  <h3 className="mb-2.5 font-heading text-[16px] font-black text-slate-900">
                    Reason for request
                    <span className="ml-2 rounded-full border border-sky-200 bg-cyan-50 px-2 py-0.5 font-sans text-[11px] font-extrabold uppercase tracking-wide text-cyan-800">
                      Required
                    </span>
                  </h3>
                  <div>
                    <label htmlFor="booking-flow-reason" className="mb-2 block text-[14px] font-black text-slate-700">Describe symptoms or concern</label>
                    <textarea
                      id="booking-flow-reason"
                      className={formControlClass(Boolean(validationErrors.reasonForRequest))}
                      value={reasonForRequest}
                      onChange={(event) => {
                        setReasonForRequest(event.target.value);
                        clearValidationError('reasonForRequest');
                      }}
                      rows={5}
                      placeholder="Example: fever since yesterday, sore throat, and fatigue..."
                    />
                    {validationErrors.reasonForRequest ? (
                      <p className="mt-2 text-[13px] font-bold text-red-700">{validationErrors.reasonForRequest}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-sky-50/30 p-3">
                  <h3 className="mb-2.5 font-heading text-[16px] font-black text-slate-900">
                    Upload files
                    <span className="ml-2 rounded-full border border-sky-200 bg-cyan-50 px-2 py-0.5 font-sans text-[11px] font-extrabold uppercase tracking-wide text-cyan-800">
                      Optional
                    </span>
                  </h3>
                  <div>
                    <label htmlFor="booking-flow-files" className="mb-2 block text-[14px] font-black text-slate-700">Photos, scans, reports, referrals</label>
                    <label htmlFor="booking-flow-files" className="flex min-h-[132px] cursor-pointer items-center justify-center rounded-[10px] border border-dashed border-sky-300 bg-sky-50 px-3 py-4 text-center hover:bg-sky-100/60">
                      <span className="flex flex-col items-center gap-1.5">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-sky-200 bg-cyan-50 text-cyan-800">
                          <Upload size={18} />
                        </span>
                        <span className="max-w-[360px] text-[14px] font-extrabold text-slate-700">Drag and drop files here, or click to select files</span>
                        <small className="text-[12px] font-bold text-slate-400">Supported: JPG, JPEG, PNG, PDF, DOC, XLSX</small>
                      </span>
                    </label>
                    <input
                      id="booking-flow-files"
                      type="file"
                      multiple
                      onChange={(event) => setUploadedFiles(Array.from(event.target.files || []))}
                      hidden
                    />
                    {uploadedFiles.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {uploadedFiles.map((file) => (
                          <span key={`${file.name}-${file.lastModified}`} className="max-w-full truncate rounded-full border border-sky-200 bg-cyan-50 px-2.5 py-1 text-[12px] font-extrabold text-cyan-800">
                            {file.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-sky-50/30 p-3 lg:col-span-2">
                  <h3 className="mb-2.5 font-heading text-[16px] font-black text-slate-900">Recent consultation history</h3>
                  <div>
                    <label className="mb-2 block text-[14px] font-black text-slate-700">Have you consulted any doctor or visited a partner clinic in the last 12 months?</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={choiceButtonClass(recentConsultationResponse === 'YES')}
                        onClick={() => setRecentConsultationResponse('YES')}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className={choiceButtonClass(recentConsultationResponse === 'NO')}
                        onClick={() => setRecentConsultationResponse('NO')}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {currentStep === 2 ? (
            <section>
              <h2 className="mb-[14px] text-left font-heading text-[clamp(22px,2vw,30px)] font-black">Appointment Details</h2>

              {validationErrors.selectedSlotStart ? (
                <p className="mb-2 text-[13px] font-bold text-red-700">{validationErrors.selectedSlotStart}</p>
              ) : null}

              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-sky-50/30 p-3.5">
                <div className="text-left">
                  <h3 className="font-heading text-[18px] font-black text-slate-900">Clinical Background</h3>
                  <p className="mt-1 text-[13px] font-bold text-slate-500">Help your doctor understand your condition before the consultation.</p>
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-black text-slate-700">Medical Conditions (Optional)</label>
                  <button
                    type="button"
                    className="min-h-10 w-full rounded-[10px] border border-sky-200 bg-white px-3 text-[14px] font-extrabold text-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => setShowConditionPicker((current) => !current)}
                    disabled={noMedicalCondition}
                  >
                    {showConditionPicker ? 'Hide Medical Conditions' : 'Select Medical Conditions'}
                  </button>
                  {showConditionPicker && !noMedicalCondition ? (
                    <div className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
                      {MEDICAL_CONDITION_OPTIONS.map((condition) => (
                        <button
                          type="button"
                          key={condition}
                          className={`min-h-[38px] rounded-[10px] border text-[13px] font-extrabold ${
                            selectedMedicalConditions.includes(condition)
                              ? 'border-transparent bg-gradient-to-r from-cyan-800 to-cyan-700 text-white'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                          aria-pressed={selectedMedicalConditions.includes(condition)}
                          onClick={() => toggleMedicalCondition(condition)}
                        >
                          {condition}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {!noMedicalCondition && selectedMedicalConditions.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {selectedMedicalConditions.map((condition) => (
                        <span key={condition} className="max-w-full truncate rounded-full border border-sky-200 bg-cyan-50 px-2.5 py-1 text-[12px] font-extrabold text-cyan-800">
                          {condition}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <label className="grid cursor-pointer grid-cols-[16px_minmax(0,1fr)] items-center gap-x-2.5 rounded-[10px] border border-slate-200 bg-white px-3 py-2.5" htmlFor="booking-flow-no-condition">
                  <input
                    className="m-0 h-4 w-4 shrink-0 self-center accent-cyan-700"
                    id="booking-flow-no-condition"
                    type="checkbox"
                    checked={noMedicalCondition}
                    onChange={(event) => {
                      setNoMedicalCondition(event.target.checked);
                      if (event.target.checked) {
                        setSelectedMedicalConditions([]);
                        setShowConditionPicker(false);
                      }
                    }}
                  />
                  <span className="m-0 self-center text-[14px] font-extrabold leading-5 text-slate-700">
                    I don't have any medical condition
                  </span>
                </label>
                {noMedicalCondition ? <p className="text-[13px] font-bold text-slate-500">You can proceed without selecting any condition.</p> : null}

                <div>
                  <label className="mb-2 block text-[14px] font-black text-slate-700">Medical History (Optional)</label>
                  <p className="mb-2 text-[13px] font-bold text-slate-500">
                    Are you seeing any General Practitioner, or have you taken any medications in past 12 months? (Yes or no)
                  </p>
                  <div className="mb-2.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={choiceButtonClass(gpMedicationHistory === 'YES')}
                      onClick={() => setGpMedicationHistory('YES')}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={choiceButtonClass(gpMedicationHistory === 'NO')}
                      onClick={() => {
                        setGpMedicationHistory('NO');
                        setCurrentGpName('');
                        setCurrentGpEmail('');
                        setMedicineName('');
                      }}
                    >
                      No
                    </button>
                  </div>

                  {gpMedicationHistory === 'YES' ? (
                    <div className="mt-0.5 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label htmlFor="booking-flow-gp-name" className="mb-2 block text-[14px] font-black text-slate-700">Current GP&apos;s Name</label>
                        <input
                          id="booking-flow-gp-name"
                          type="text"
                          className={formControlClass(false)}
                          value={currentGpName}
                          onChange={(event) => setCurrentGpName(event.target.value)}
                          placeholder="Enter GP name"
                        />
                      </div>

                      <div>
                        <label htmlFor="booking-flow-gp-email" className="mb-2 block text-[14px] font-black text-slate-700">Current GP&apos;s Email</label>
                        <input
                          id="booking-flow-gp-email"
                          type="email"
                          className={formControlClass(false)}
                          value={currentGpEmail}
                          onChange={(event) => setCurrentGpEmail(event.target.value)}
                          placeholder="Enter GP email"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor="booking-flow-medicine-name" className="mb-2 block text-[14px] font-black text-slate-700">Medicine Name</label>
                        <input
                          id="booking-flow-medicine-name"
                          type="text"
                          className={formControlClass(false)}
                          value={medicineName}
                          onChange={(event) => setMedicineName(event.target.value)}
                          placeholder="Enter medicine name"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="booking-flow-allergies" className="mb-2 block text-[14px] font-black text-slate-700">Allergies / Adverse Reactions</label>
                  <textarea
                    id="booking-flow-allergies"
                    className={formControlClass(false)}
                    value={allergies}
                    onChange={(event) => setAllergies(event.target.value)}
                    rows={3}
                    placeholder="Please add allergies"
                  />
                </div>
              </div>
            </section>
          ) : null}

          {currentStep === 3 ? (
            <section>
              <h2 className="mb-3 text-center font-heading text-[clamp(22px,2vw,30px)] font-black">Review &amp; Payment</h2>

              <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-sky-200 bg-sky-50 px-3 py-2.5 text-[14px] font-bold text-cyan-800">
                <AlertTriangle size={16} />
                <p>Camera and microphone access may be required during telehealth consultations.</p>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <article className="rounded-xl border border-slate-200 bg-sky-50/30 p-3">
                  <h3 className="mb-2.5 font-heading text-[18px] font-black">Appointment Details</h3>
                  <ul className="flex list-none flex-col gap-2.5 p-0">
                    <li className="flex justify-between gap-3 text-[14px]"><span className="font-bold text-slate-600">Doctor</span><strong className="text-right font-black">{formattedDoctorName}</strong></li>
                    <li className="flex justify-between gap-3 text-[14px]"><span className="font-bold text-slate-600">Practitioner Type</span><strong className="text-right font-black">{doctor.practitionerType || 'General Practitioner (GP)'}</strong></li>
                    <li className="flex justify-between gap-3 text-[14px]"><span className="font-bold text-slate-600">Consultation For</span><strong className="text-right font-black">{consultationForLabel}</strong></li>
                    <li className="flex justify-between gap-3 text-[14px]"><span className="font-bold text-slate-600">Service</span><strong className="text-right font-black">{resolvedServiceName}</strong></li>
                    <li className="flex justify-between gap-3 text-[14px]"><span className="font-bold text-slate-600">Mode</span><strong className="text-right font-black">{selectedModeLabel}</strong></li>
                    <li className="flex justify-between gap-3 text-[14px]"><span className="font-bold text-slate-600">Type</span><strong className="text-right font-black">{bookingType === 'SCHEDULED' ? 'Future Booking' : 'Consult Now'}</strong></li>
                    <li className="flex justify-between gap-3 text-[14px]"><span className="font-bold text-slate-600">Date</span><strong className="text-right font-black">{bookingType === 'SCHEDULED' ? selectedDate : 'Immediate'}</strong></li>
                    <li className="flex justify-between gap-3 text-[14px]"><span className="font-bold text-slate-600">Time</span><strong className="text-right font-black">{bookingType === 'SCHEDULED' ? selectedSlotLabel : 'As soon as doctor accepts'}</strong></li>
                  </ul>
                </article>

                <article className="rounded-xl border border-slate-200 bg-sky-50/30 p-3">
                  <h3 className="mb-2.5 font-heading text-[18px] font-black">Booking Details</h3>
                  <label htmlFor="booking-flow-coupon" className="mb-2 block text-[14px] font-black text-slate-700">Coupon Code</label>
                  <div className="mb-3 flex gap-2">
                    <input id="booking-flow-coupon" type="text" className="flex-1 rounded-[10px] border border-slate-200 px-3 py-2.5 text-[14px] font-semibold" placeholder="Enter coupon code" disabled />
                    <button type="button" className="min-w-[74px] rounded-[10px] bg-slate-200 text-sm font-extrabold text-slate-500" disabled>Apply</button>
                  </div>
                  <ul className="flex list-none flex-col gap-2.5 p-0">
                    <li className="flex justify-between gap-3 text-[14px]"><span className="font-bold text-slate-600">Consultation Charges</span><strong className="text-right font-black">${consultationFee.toFixed(2)}</strong></li>
                    <li className="flex justify-between gap-3 text-[14px]"><span className="font-bold text-slate-600">Platform Service Charges</span><strong className="text-right font-black">${platformFee.toFixed(2)}</strong></li>
                    <li className="mt-1.5 flex justify-between gap-3 border-t border-slate-200 pt-2.5 text-[16px]">
                      <span className="font-black text-cyan-800">Total Amount</span>
                      <strong className="text-right font-black text-cyan-800">${totalAmount.toFixed(2)}</strong>
                    </li>
                  </ul>
                  <label className={`mt-3 flex items-start gap-2 text-[13px] text-slate-700 ${validationErrors.acceptedTerms ? 'rounded-[10px] border border-dashed border-red-300 bg-red-50 p-2' : ''}`}>
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-cyan-700"
                      checked={acceptedTerms}
                      onChange={(event) => {
                        setAcceptedTerms(event.target.checked);
                        clearValidationError('acceptedTerms');
                      }}
                    />
                    <span>I confirm that I have read and accepted the terms of service and privacy policy.</span>
                  </label>
                  {validationErrors.acceptedTerms ? (
                    <p className="mt-2 text-[13px] font-bold text-red-700">{validationErrors.acceptedTerms}</p>
                  ) : null}
                </article>
              </div>
            </section>
          ) : null}

          <div className="mt-2 flex justify-center">
            {currentStep < 3 ? (
              <button type="button" className={primaryActionClass} onClick={goNextStep}>
                Next
              </button>
            ) : (
              <button type="button" className={primaryActionClass} onClick={handlePayNow} disabled={processingPayment}>
                {processingPayment ? 'Processing...' : `Pay $${totalAmount.toFixed(2)}`}
              </button>
            )}
          </div>
        </article>
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
