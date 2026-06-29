import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Send, FileText,
  Pill, Plus, Activity, MessageSquare, ChevronRight, CheckCircle2,
  Shield, Clock, UserPlus, Search, X, Check,
  LayoutDashboard, Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import SharedNavbar from '../components/SharedNavbar';
import LandingNavbar from '../components/LandingNavbar';
import { formatDoctorName } from '../utils/doctorName';
import { getPractitionerTypeLabel } from '../utils/doctorConsultation';
import { DOCTOR_NAV_ITEMS, handleDoctorNavClick as navigateDoctorNavClick } from '../utils/doctorNavigation';
import { uploadFileToS3 } from '../utils/fileUpload';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '1480fbbff91244f7a77f0a8ed1359c19';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PATIENT_APPOINTMENTS_ROUTE = '/patient/account?tab=medical-history';
const PATHOLOGY_TEST_OPTIONS = [
  'Vitamin D',
  'Full Blood Count (FBC)',
  'Liver Function Tests (LFT)',
  'TSH',
  'High Density Lipoprotein (HDL)',
  'Low Density Lipoprotein (LDL)',
  'Fasting Glucose',
  'Cholesterol',
  'Triglycerides',
  'Calcium, Magnesium, Phosphate',
  'Blood Test',
  'Electrolytes And Kidney Function',
];
const RADIOLOGY_TEST_OPTIONS = [
  'Head',
  'Jaw',
  'Nose',
  'Back',
  'Fingers',
  'Ankle',
  'Knee',
  'Head/Brain',
];
const PRESCRIBER_TYPE_OPTIONS = [
  'Medical Practitioner',
  'Nurse Practitioner',
  'Dentist',
  'Other',
];
const PRESCRIPTION_ROUTE_OPTIONS = ['Oral', 'Topical', 'Inhalation', 'Injection', 'Other'];
const PRESCRIPTION_DURATION_UNITS = ['days', 'weeks', 'months'];
const PRESCRIPTION_DOSE_UNITS = ['mg', 'mcg', 'g', 'ml', 'tablet', 'capsule', 'drop', 'puff', 'unit'];
const CALL_NOTES_MANAGEMENT_OPTIONS = [
  { key: 'medicationPrescribed', label: 'Medication Prescribed' },
  { key: 'pathologyRequest', label: 'Pathology Request' },
  { key: 'referralGiven', label: 'Referral Given' },
  { key: 'medicalCertificateIssued', label: 'Medical Certificate Issued' },
  { key: 'radiologyRequest', label: 'Radiology Request' },
  { key: 'other', label: 'Other' },
];
const PRESCRIPTION_FORM_LABEL_CLASS = 'text-xs font-semibold text-slate-700';
const PRESCRIPTION_FORM_CONTROL_CLASS = 'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100';
const PRESCRIPTION_FORM_TEXTAREA_CLASS = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100';
const PRESCRIPTION_FORM_CHECKBOX_LABEL_CLASS = 'flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 cursor-pointer hover:border-primary-200 hover:bg-primary-50/40 transition-colors';

function createEmptyCallNotesForm() {
  return {
    temperature: '',
    bloodPressure: '',
    bloodGlucose: '',
    heartRate: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    otherNotes: '',
    clinicalAssessment: '',
    followUpInstructions: '',
    medicationPrescribed: false,
    pathologyRequest: false,
    referralGiven: false,
    medicalCertificateIssued: false,
    radiologyRequest: false,
    other: false,
  };
}

function formatCallNoteValue(value, fallback = 'Not provided') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function buildCallNotesPayload(form, context = {}) {
  const selectedPlans = CALL_NOTES_MANAGEMENT_OPTIONS
    .filter((item) => Boolean(form?.[item.key]))
    .map((item) => item.label);

  const lines = [
    'Patient Info:',
    `- Patient Name: ${formatCallNoteValue(context.patientName)}`,
    `- DOB: ${formatCallNoteValue(context.patientDateOfBirth)}`,
    `- Consultation Type: ${formatCallNoteValue(context.consultationType)}`,
    `- Service Name: ${formatCallNoteValue(context.serviceName)}`,
    '',
    'Observations:',
    `- Temperature (Ã‚Â°C): ${formatCallNoteValue(form?.temperature)}`,
    `- Blood Pressure (mmHg): ${formatCallNoteValue(form?.bloodPressure)}`,
    `- Blood Glucose / Diabetes Info: ${formatCallNoteValue(form?.bloodGlucose)}`,
    `- Heart Rate (bpm): ${formatCallNoteValue(form?.heartRate)}`,
    `- Respiratory Rate (breaths/min): ${formatCallNoteValue(form?.respiratoryRate)}`,
    `- Oxygen Saturation (SpO2): ${formatCallNoteValue(form?.oxygenSaturation)}`,
    `- Other Notes: ${formatCallNoteValue(form?.otherNotes)}`,
    '',
    'Clinical Assessment / Provisional Diagnosis:',
    formatCallNoteValue(form?.clinicalAssessment),
    '',
    'Management Plan:',
    selectedPlans.length > 0 ? `- ${selectedPlans.join(', ')}` : '- None selected',
    '',
    'Follow-up Instructions:',
    formatCallNoteValue(form?.followUpInstructions),
  ];

  return lines.join('\n');
}

function createEmptyPrescriptionDraft() {
  return {
    issueType: 'EPRESCRIPTION',
    medicareNumber: '',
    medicareIrn: '',
    prescriberHpioNumber: '',
    prescriberHpiiNumber: '',
    prescriberNumber: '',
    ahpraNumber: '',
    authorityNumber: '',
    prescriptionEntityId: '',
    prescriberType: 'Medical Practitioner',
    diagnosis: '',
    reasonForPrescription: '',
    reasonForAuthority: '',
    drugName: '',
    packName: '',
    prescribedQuantity: '',
    packQuantity: '',
    route: 'Oral',
    repeats: '0',
    minimumRepeatIntervalDays: '',
    dose: '',
    doseUnit: 'mg',
    durationValue: '',
    durationUnit: 'days',
    frequency: '',
    directions: '',
    preferredPharmacy: '',
    notes: '',
    annotations: '',
    noBrandSubstitution: false,
    includeBrandName: false,
    emergencySupply: false,
    activeScript: false,
    sendToEmail: true,
    sendToSms: false,
    printCopy: false,
    expiryDate: '',
    reminderEnabled: false,
  };
}

function buildDosageLabel(draft) {
  const dose = String(draft?.dose || '').trim();
  const unit = String(draft?.doseUnit || '').trim();
  if (!dose) return '';
  return `${dose}${unit ? ` ${unit}` : ''}`.trim();
}

function buildDurationLabel(draft) {
  const value = String(draft?.durationValue || '').trim();
  const unit = String(draft?.durationUnit || '').trim();
  if (!value) return '';
  return `${value}${unit ? ` ${unit}` : ''}`.trim();
}

function toPrescriptionItem(draft) {
  const drugName = String(draft?.drugName || '').trim();
  const dosageLabel = buildDosageLabel(draft);
  const durationLabel = buildDurationLabel(draft);
  return {
    ...draft,
    name: drugName,
    dosage: dosageLabel,
    duration: durationLabel,
    frequency: String(draft?.frequency || '').trim(),
  };
}

function parseAiSummary(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function firstNonEmptyValue(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

export default function MeetingRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const socket = useSocket();

  const [appointment, setAppointment] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [activeRemoteUid, setActiveRemoteUid] = useState(null);
  const [isManualFocus, setIsManualFocus] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [joining, setJoining] = useState(true); // auto-join in progress
  const [showCompletedDialog, setShowCompletedDialog] = useState(false);
  const [showNotesSuccess, setShowNotesSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // For notifications while in meeting
  const [incomingCall, setIncomingCall] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));
  const consultationMode = appointment?.consultationMode || 'VIDEO';
  const isAudioMode = consultationMode === 'AUDIO';
  const isInPersonMode = consultationMode === 'IN_PERSON';
  const isRtcMode = !isInPersonMode;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };
  const showComingSoon = (feature) => showToast(`${feature} will be available here soon.`);
  const handleSignatureSelect = async (targetKey, event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setUploadingSignatureFor(targetKey);
    setSignatureUploadError('');
    try {
      const uploaded = await uploadFileToS3(selectedFile, `doctor-signature-${targetKey}`);
      setSignatureUploads((current) => ({
        ...current,
        [targetKey]: uploaded,
      }));
      showToast('Signature uploaded successfully.');
    } catch (error) {
      console.error('Failed to upload signature', error);
      setSignatureUploadError(error?.response?.data?.error || 'Could not upload signature.');
    } finally {
      setUploadingSignatureFor('');
      event.target.value = '';
    }
  };

  useEffect(() => {
    setIsOnline(Boolean(user?.doctorProfile?.isOnline));
  }, [user?.doctorProfile?.isOnline]);

  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const client = useMemo(() => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }), []);
  const initRef = useRef(false);

  // Chat
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef(null);

  // Sidebar
  const [activeTab, setActiveTab] = useState(null); // null = closed
  const [notes, setNotes] = useState('');
  const [callNotesForm, setCallNotesForm] = useState(createEmptyCallNotesForm);
  const [savingCallNote, setSavingCallNote] = useState(false);
  const [prescription, setPrescription] = useState([]);
  const [prescriptionDraft, setPrescriptionDraft] = useState(createEmptyPrescriptionDraft);
  const [medicalCertForm, setMedicalCertForm] = useState({ startDate: '', endDate: '', reason: '', advice: '' });
  const [referralForm, setReferralForm] = useState({ doctorName: '', doctorEmail: '', doctorAddress: '', phoneNo: '', condition: '' });
  const [referralSpecialists, setReferralSpecialists] = useState([]);
  const [loadingReferralSpecialists, setLoadingReferralSpecialists] = useState(false);
  const [pathologyTestInput, setPathologyTestInput] = useState('');
  const [pathologyTests, setPathologyTests] = useState([]);
  const [radiologyTestInput, setRadiologyTestInput] = useState('');
  const [radiologyTests, setRadiologyTests] = useState([]);
  const [patientRequestNote, setPatientRequestNote] = useState('');
  const [signatureUploads, setSignatureUploads] = useState({
    medicalCertificate: null,
    specialistReferral: null,
    pathologyRequest: null,
    radiologyRequest: null,
  });
  const [uploadingSignatureFor, setUploadingSignatureFor] = useState('');
  const [signatureUploadError, setSignatureUploadError] = useState('');
  const medicalCertificateSignatureInputRef = useRef(null);
  const specialistReferralSignatureInputRef = useRef(null);
  const pathologySignatureInputRef = useRef(null);
  const radiologySignatureInputRef = useRef(null);
  const [savingGeneratedDocumentType, setSavingGeneratedDocumentType] = useState('');

  const [userNames, setUserNames] = useState({});
  const myUidRef = useRef(null);

  // Duration timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Completion confirmation flow
  const [waitingForPatientConfirmation, setWaitingForPatientConfirmation] = useState(false);
  const [showPatientEndConfirm, setShowPatientEndConfirm] = useState(false);
  const [showLeaveCallOptions, setShowLeaveCallOptions] = useState(false);
  const notesRef = useRef('');
  const prescriptionRef = useRef([]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { prescriptionRef.current = prescription; }, [prescription]);

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => {
    if (incomingCall && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (incomingCall && timeLeft === 0) {
      const timer = setTimeout(() => setIncomingCall(null), 0);
      return () => clearTimeout(timer);
    }
  }, [incomingCall, timeLeft]);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [doctorsList, setDoctorsList] = useState([]);
  const [invitingDoctorId, setInvitingDoctorId] = useState(null);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Fetch doctors for invite ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  const fetchDoctorsForInvite = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/appointments/doctors`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Exclude self and already invited
      const available = res.data.filter(d =>
        d.userId !== user.id &&
        !appointment?.invitedDoctors?.some(inv => inv.doctorId === d.userId)
      );
      setDoctorsList(available);
    } catch (err) { console.error('Failed to fetch doctors', err); }
  };

  const openInviteModal = () => {
    setShowInviteModal(true);
    fetchDoctorsForInvite();
  };

  const handleInviteDoctor = async (doctorId) => {
    try {
      setInvitingDoctorId(doctorId);
      await axios.post(`${API_URL}/api/appointments/${appointmentId}/invite`, {
        doctorId
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Optionally show a toast
      setShowInviteModal(false);
      showToast('Doctor invited successfully!');
    } catch (err) {
      console.error('Failed to invite doctor', err);
      showToast('Failed to invite doctor');
    } finally {
      setInvitingDoctorId(null);
    }
  };
  const fetchReferralSpecialists = async () => {
    try {
      setLoadingReferralSpecialists(true);
      const res = await axios.get(`${API_URL}/api/appointments/doctors`, {
        params: { type: 'SCHEDULED' },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      setReferralSpecialists(rows.filter((item) => item?.userId && item.userId !== user?.id));
    } catch (err) {
      console.error('Failed to fetch specialists for referral', err);
      setReferralSpecialists([]);
    } finally {
      setLoadingReferralSpecialists(false);
    }
  };

  const handleReferralSpecialistChange = (value) => {
    const typed = String(value || '').trim();
    const normalized = typed.toLowerCase();
    const matched = referralSpecialists.find(
      (item) => String(item?.user?.name || '').trim().toLowerCase() === normalized
    );
    if (!matched) {
      setReferralForm((current) => ({
        ...current,
        doctorName: typed,
        doctorEmail: '',
        doctorAddress: '',
        phoneNo: '',
      }));
      return;
    }

    setReferralForm((current) => ({
      ...current,
      doctorName: String(matched?.user?.name || '').trim(),
      doctorEmail: String(matched?.user?.email || '').trim(),
      doctorAddress: String(matched?.address || '').trim(),
      phoneNo: String([matched?.phoneCode, matched?.phone].filter(Boolean).join(' ')).trim(),
    }));
  };


  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Fetch appointment ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  useEffect(() => {
    const fetchAppt = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/appointments/${appointmentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (data?.consultationMode === 'IN_PERSON') {
          // ponytail: route in-person sessions to dedicated pages.
          const inPersonRoute = user?.role === 'DOCTOR'
            ? `/doctor/in-person/${appointmentId}`
            : `/patient/in-person/${appointmentId}`;
          navigate(inPersonRoute, { replace: true });
          return;
        }
        setAppointment(data);
        if (data.messages) {
          setMessages(data.messages.map(m => ({
            ...m,
            senderName: m.senderRole === 'DOCTOR' ? data.doctor.name : (data.familyMember?.name || data.patient.name)
          })));
        }
        if (Array.isArray(data?.consultation?.prescription)) {
          setPrescription(data.consultation.prescription);
        }
        if (typeof data?.consultation?.notes === 'string') {
          setNotes(data.consultation.notes);
        }
      } catch (err) { console.error(err); }
    };
    fetchAppt();
  }, [appointmentId, navigate, user?.role]);

  useEffect(() => {
    if (!showInviteModal && !showPatientEndConfirm && !waitingForPatientConfirmation && !showLeaveCallOptions && !activeTab) return undefined;
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (showInviteModal) {
        setShowInviteModal(false);
        return;
      }
      if (showPatientEndConfirm) {
        setShowPatientEndConfirm(false);
        return;
      }
      if (waitingForPatientConfirmation) {
        setWaitingForPatientConfirmation(false);
        return;
      }
      if (showLeaveCallOptions) {
        setShowLeaveCallOptions(false);
        return;
      }
      if (activeTab) {
        setActiveTab(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showInviteModal, showPatientEndConfirm, waitingForPatientConfirmation, showLeaveCallOptions, activeTab]);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Socket ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  useEffect(() => {
    if (!socket || !appointmentId) return;
    socket.emit('join_appointment', appointmentId);
    const handleMsg = (msg) => setMessages(prev => [...prev, msg]);
    socket.on('chat:message', handleMsg);
    return () => socket.off('chat:message', handleMsg);
  }, [socket, appointmentId]);

  useEffect(() => {
    if (!socket || !appointmentId || !appointment) return;
    if (user?.role === 'DOCTOR' && appointment.status === 'ACCEPTED' && isRtcMode) {
      socket.emit('call:initiate', {
        appointmentId,
        patientId: appointment.patientId,
        doctorName: user.name,
        invitedDoctorIds: appointment.invitedDoctors?.map(inv => inv.doctorId) || []
      });
    }
    const handleAnswered = (data) => {
      if (data.appointmentId === appointmentId && !data.accepted) {
        navigate(user?.role === 'PATIENT' ? PATIENT_APPOINTMENTS_ROUTE : '/dashboard');
      }
    };

    const handleStatusUpdate = (updatedApt) => {
      if (updatedApt.id === appointmentId && updatedApt.status === 'COMPLETED') {
        setShowCompletedDialog(true);
      }
    };

    const handleRequestComplete = (data) => {
      if (data.appointmentId === appointmentId && user?.role === 'PATIENT') {
        setShowPatientEndConfirm(true);
      }
    };

    const handleAcceptComplete = async (data) => {
      if (data.appointmentId === appointmentId && user?.role === 'DOCTOR') {
        setWaitingForPatientConfirmation(false);
        try {
          await axios.put(`${API_URL}/api/appointments/${appointmentId}/status`,
            { status: 'COMPLETED', notes: notesRef.current, prescription: prescriptionRef.current },
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          leaveCall();
        } catch (err) {
          if (err.response?.status === 400) {
            showToast(err.response?.data?.error || 'Cannot complete consultation yet.');
          } else {
            showToast('Failed to complete consultation');
          }
        }
      }
    };

    const handleDeclineComplete = (data) => {
      if (data.appointmentId === appointmentId && user?.role === 'DOCTOR') {
        setWaitingForPatientConfirmation(false);
        showToast('The patient requested to continue the consultation.');
      }
    };

    const handleIncomingCall = (data) => {
      // Ignore if the incoming call is for the meeting we are currently already inside
      if (data.appointmentId === appointmentId) return;

      // Even if they are in another meeting, show the incoming call notification
      setIncomingCall(data);
      setTimeLeft(30);
      playSuccessSound();
    };

    const handlePrescriptionSync = (data) => {
      if (!data || String(data.appointmentId) !== String(appointmentId)) return;
      setPrescription(Array.isArray(data.prescription) ? data.prescription : []);
    };
    const handleCallNotesSync = (data) => {
      if (!data || String(data.appointmentId) !== String(appointmentId)) return;
      setNotes(String(data.notes || ''));
    };

    const handleAgoraUserJoined = (data) => {
      if (data.appointmentId === appointmentId) {
        setUserNames(prev => ({ ...prev, [data.uid]: data.name }));
        if (data.requestReply && myUidRef.current) {
          socket.emit('agora:name_reply', { appointmentId, uid: myUidRef.current, name: user.name, requestReply: false });
        }
      }
    };

    socket.on('call:answered', handleAnswered);
    socket.on('appointment:updated', handleStatusUpdate);
    socket.on('call:request_complete', handleRequestComplete);
    socket.on('call:accept_complete', handleAcceptComplete);
    socket.on('call:decline_complete', handleDeclineComplete);
    socket.on('call:incoming', handleIncomingCall);
    socket.on('prescription:sync', handlePrescriptionSync);
    socket.on('call-notes:sync', handleCallNotesSync);
    socket.on('agora:user_joined', handleAgoraUserJoined);
    return () => {
      socket.off('call:answered', handleAnswered);
      socket.off('appointment:updated', handleStatusUpdate);
      socket.off('call:request_complete', handleRequestComplete);
      socket.off('call:accept_complete', handleAcceptComplete);
      socket.off('call:decline_complete', handleDeclineComplete);
      socket.off('call:incoming', handleIncomingCall);
      socket.off('prescription:sync', handlePrescriptionSync);
      socket.off('call-notes:sync', handleCallNotesSync);
      socket.off('agora:user_joined', handleAgoraUserJoined);
    };
  }, [socket, appointmentId, appointment, user, navigate, isRtcMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket || !appointmentId || user?.role !== 'DOCTOR') return;
    // ponytail: push current draft list to room so patient sees add/remove instantly.
    socket.emit('prescription:sync', { appointmentId, prescription });
  }, [socket, appointmentId, user?.role, prescription]);

  // Guarantee that we broadcast our name to the room as soon as we are in the call 
  // and the socket is fully available. This covers the edge case where the socket 
  // connects slightly after the Agora setup useEffect has already run.
  useEffect(() => {
    if (isRtcMode && inCall && socket && myUidRef.current && user?.name) {
      socket.emit('agora:join', { appointmentId, uid: myUidRef.current, name: user.name, requestReply: true });
    }
  }, [inCall, socket, appointmentId, user?.name, isRtcMode]);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Agora setup + AUTO JOIN ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  useEffect(() => {
    if (!appointment) return;
    if (!isRtcMode) {
      const stateSyncTimer = setTimeout(() => {
        setJoining(false);
        setInCall(true);
      }, 0);
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      }
      return () => {
        clearTimeout(stateSyncTimer);
        clearInterval(timerRef.current);
        timerRef.current = null;
      };
    }

    if (initRef.current) return;
    initRef.current = true;

    // Remote events
    client.on('user-joined', (u) => setRemoteUsers(prev => [...prev.filter(x => x.uid !== u.uid), u]));
    client.on('user-published', async (u, mediaType) => {
      try {
        await client.subscribe(u, mediaType);
        setRemoteUsers(prev => [...prev.filter(x => x.uid !== u.uid), u]);
        if (mediaType === 'audio') u.audioTrack.play();
      } catch (err) {
        console.error('Failed to subscribe:', err);
      }
    });
    client.on('user-unpublished', (u) => setRemoteUsers(prev => [...prev.filter(x => x.uid !== u.uid), u]));
    client.on('user-left', (u) => setRemoteUsers(prev => prev.filter(x => x.uid !== u.uid)));

    client.enableAudioVolumeIndicator();
    client.on('volume-indicator', (volumes) => {
      volumes.forEach(vol => {
        const ring = document.getElementById(`vol-${vol.uid}`);
        if (ring) {
          ring.style.transform = `scale(${1 + (vol.level / 100) * 1.4})`;
          ring.style.opacity = Math.max(0.1, (vol.level / 100) * 0.7);
        }
      });
    });

    let mounted = true;

    const init = async () => {
      let tracks = [];
      try {
        if (isAudioMode) {
          const at = await AgoraRTC.createMicrophoneAudioTrack();
          tracks = [at, null];
        } else {
          tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        }
      } catch (err) {
        console.warn('Camera/Mic failed:', err);
        try {
          const at = await AgoraRTC.createMicrophoneAudioTrack();
          tracks = [at, null];
        } catch (audioErr) {
          console.warn('Mic fallback failed:', audioErr);
          showToast(`Could not access camera or microphone.`);
        }
      }

      if (!mounted) {
        // If component unmounted while waiting for permissions, discard tracks and abort
        tracks.forEach(t => t && t.close());
        return;
      }

      setLocalTracks(tracks);

      // Auto-join immediately
      try {
        const res = await axios.get(`${API_URL}/api/agora/token?channelName=${appointmentId}`);
        if (!mounted) return;

        const uid = await client.join(APP_ID, appointmentId, res.data.token, null);
        myUidRef.current = uid;
        if (!mounted) {
          client.leave();
          return;
        }

        if (socket) {
          socket.emit('agora:join', { appointmentId, uid, name: user.name, requestReply: true });
        }

        if (tracks.length > 0) {
          await client.publish(tracks.filter(Boolean));
        }

        if (!mounted) return;
        setInCall(true);
        // Start timer
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      } catch (err) {
        console.error('Auto-join failed:', err);
        if (mounted) {
          showToast('Failed to join the meeting. Check console logs.');
        }
      }
      if (mounted) {
        setJoining(false);
      }
    };
    init();

    return () => {
      mounted = false;
      client.removeAllListeners();
      try { client.leave(); } catch { /* no-op */ }
      clearInterval(timerRef.current);
      timerRef.current = null;
      initRef.current = false;
    };
  }, [appointment, isRtcMode, isAudioMode]); // eslint-disable-line

  useEffect(() => {
    return () => localTracks.forEach(t => { if (t) { t.stop(); t.close(); } });
  }, [localTracks]);

  // Local video (self preview tile)
  useEffect(() => {
    const localVideoTrack = localTracks[1];
    if (!localVideoTrack) return;

    if (videoMuted) {
      try {
        localVideoTrack.stop();
      } catch (err) {
        console.warn('Failed to stop local video track:', err);
      }
      if (localVideoRef.current) {
        localVideoRef.current.innerHTML = '';
      }
      return;
    }

    if (!localVideoRef.current) return;
    if (!localVideoRef.current.querySelector('video')) {
      localVideoRef.current.innerHTML = '';
      try {
        localVideoTrack.play(localVideoRef.current);
      } catch (err) {
        console.warn('Failed to play local video track:', err);
      }
    }
  }, [localTracks, videoMuted, remoteUsers.length, inCall]);

  // Remote video (main stage + stacked participant tiles)
  useEffect(() => {
    remoteUsers.forEach((u) => {
      const container = remoteVideoRefs.current[u.uid];
      if (!u?.videoTrack || !container) return;
      try {
        // Avoid redundant replays/flicker if this container already has a playing video element.
        if (!container.querySelector('video')) {
          container.innerHTML = '';
          u.videoTrack.play(container);
        }
      } catch (err) {
        console.warn('Failed to play remote video track:', err);
      }
    });
  }, [remoteUsers, activeRemoteUid]);

  // Keep one active remote user selected for the main display.
  // Doctor view: prefer patient in center.
  // Patient view: prefer primary doctor in center.
  useEffect(() => {
    if (remoteUsers.length === 0) {
      const resetTimer = setTimeout(() => {
        setActiveRemoteUid(null);
        setIsManualFocus(false);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const normalizeName = (name = '') => name.toLowerCase().replace(/^dr\.?\s+/, '').replace(/[^a-z0-9]/g, '');
    const roleIsDoctor = user?.role === 'DOCTOR';
    const preferredCenterName = roleIsDoctor
      ? (appointment?.familyMember?.name || appointment?.patient?.name || '')
      : (appointment?.doctor?.name || '');
    const preferredCenterNorm = normalizeName(preferredCenterName);
    const preferredMatch = remoteUsers.find((u) => normalizeName(userNames[u.uid] || '') === preferredCenterNorm);
    const preferredUid = preferredMatch?.uid || remoteUsers[0]?.uid;

    // Doctors should always keep the patient on the main screen.
    if (roleIsDoctor) {
      if (preferredUid) {
        queueMicrotask(() => setActiveRemoteUid(preferredUid));
      }
      if (isManualFocus) {
        queueMicrotask(() => setIsManualFocus(false));
      }
      return;
    }

    queueMicrotask(() => {
      setActiveRemoteUid((prev) => {
        const prevStillPresent = prev && remoteUsers.some((u) => u.uid === prev);
        if (isManualFocus && prevStillPresent) return prev;
        if (preferredMatch?.uid) return preferredMatch.uid;
        if (prevStillPresent) return prev;
        return preferredUid;
      });
    });

    const prevStillPresent = activeRemoteUid && remoteUsers.some((u) => u.uid === activeRemoteUid);
    if (isManualFocus && !prevStillPresent) {
      queueMicrotask(() => setIsManualFocus(false));
    }
  }, [remoteUsers, appointment, userNames, isManualFocus, activeRemoteUid, user?.role]);

  // Chat scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Helpers ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  async function leaveCall(skipNavigate = false, navigationState = null) {
    localTracks.forEach(t => { if (t) { t.stop(); t.close(); } });
    setLocalTracks([]);
    clearInterval(timerRef.current);
    timerRef.current = null;
    if (isRtcMode) {
      await client.leave();
    }
    setInCall(false);
    if (skipNavigate !== true) {
      const defaultRedirect = user?.role === 'PATIENT' ? PATIENT_APPOINTMENTS_ROUTE : '/dashboard';
      if (navigationState && typeof navigationState === 'object') {
        const redirectTo = typeof navigationState.redirectTo === 'string' && navigationState.redirectTo.trim()
          ? navigationState.redirectTo.trim()
          : defaultRedirect;
        const nextState = { ...navigationState };
        delete nextState.redirectTo;
        navigate(redirectTo, { state: Object.keys(nextState).length > 0 ? nextState : null });
      } else {
        navigate(defaultRedirect);
      }
    }
  }

  const toggleMic = async () => {
    if (localTracks[0]) { await localTracks[0].setMuted(!micMuted); setMicMuted(!micMuted); }
  };

  const toggleVideo = async () => {
    if (localTracks[1]) { await localTracks[1].setMuted(!videoMuted); setVideoMuted(!videoMuted); }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    socket.emit('chat:send', { appointmentId, senderId: user.id, senderRole: user.role, text: newMessage, senderName: user.name });
    setNewMessage('');
  };

  const updateCallNotesField = (field, value) => {
    setCallNotesForm((current) => ({ ...current, [field]: value }));
  };

  const toggleCallNotesField = (field, checked) => {
    setCallNotesForm((current) => ({ ...current, [field]: Boolean(checked) }));
  };

  const saveCallNote = async () => {
    try {
      setSavingCallNote(true);
      const notesPayload = buildCallNotesPayload(callNotesForm, {
        patientName,
        patientDateOfBirth,
        consultationType: callNotesConsultationType,
        serviceName: callNotesServiceName,
      });
      setNotes(notesPayload);
      await axios.post(`${API_URL}/api/appointments/${appointmentId}/notes`,
        { notes: notesPayload, prescription: prescriptionRef.current || prescription },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (socket) {
        socket.emit('call-notes:sync', { appointmentId, notes: notesPayload });
      }
      showToast('Call note saved.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save call note');
    } finally {
      setSavingCallNote(false);
    }
  };

  const addMedicine = () => {
    const nextName = String(prescriptionDraft.drugName || '').trim();
    if (!nextName) return;
    const nextItem = toPrescriptionItem({
      ...prescriptionDraft,
      drugName: nextName,
    });
    setPrescription((current) => [...current, nextItem]);
    setPrescriptionDraft((current) => ({
      ...current,
      diagnosis: '',
      reasonForPrescription: '',
      reasonForAuthority: '',
      drugName: '',
      packName: '',
      prescribedQuantity: '',
      packQuantity: '',
      route: 'Oral',
      repeats: '0',
      minimumRepeatIntervalDays: '',
      dose: '',
      doseUnit: current?.doseUnit || 'mg',
      durationValue: '',
      durationUnit: current?.durationUnit || 'days',
      frequency: '',
      directions: '',
      preferredPharmacy: '',
      notes: '',
      annotations: '',
      noBrandSubstitution: false,
      includeBrandName: false,
      emergencySupply: false,
      activeScript: false,
      expiryDate: '',
      reminderEnabled: false,
    }));
  };
  const updatePrescriptionDraftField = (field, value) => {
    setPrescriptionDraft((current) => ({ ...current, [field]: value }));
  };
  const togglePrescriptionDraftCheckbox = (field, checked) => {
    setPrescriptionDraft((current) => ({ ...current, [field]: Boolean(checked) }));
  };

  const addPathologyTest = () => {
    const next = pathologyTestInput.trim();
    if (!next) return;
    setPathologyTests((current) => (current.includes(next) ? current : [...current, next]));
    setPathologyTestInput('');
  };

  const togglePathologyTest = (testName, checked) => {
    const normalized = String(testName || '').trim();
    if (!normalized) return;
    setPathologyTests((current) => {
      if (checked) return current.includes(normalized) ? current : [...current, normalized];
      return current.filter((item) => item !== normalized);
    });
  };

  const addRadiologyTest = () => {
    const next = radiologyTestInput.trim();
    if (!next) return;
    setRadiologyTests((current) => (current.includes(next) ? current : [...current, next]));
    setRadiologyTestInput('');
  };

  const toggleRadiologyTest = (testName, checked) => {
    const normalized = String(testName || '').trim();
    if (!normalized) return;
    setRadiologyTests((current) => {
      if (checked) return current.includes(normalized) ? current : [...current, normalized];
      return current.filter((item) => item !== normalized);
    });
  };

  const completeConsultation = async () => {
    // Force completion directly without patient approval (fallback for doctor)
    try {
      await axios.put(`${API_URL}/api/appointments/${appointmentId}/status`,
        { status: 'COMPLETED', notes: notesRef.current || notes, prescription: prescriptionRef.current || prescription },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      leaveCall();
    } catch (err) {
      if (err.response?.status === 400) {
        showToast(err.response?.data?.error || 'Cannot complete consultation yet.');
      } else {
        showToast('Failed to complete consultation');
      }
    }
  };

  const submitInvitedDoctorNotes = async () => {
    try {
      await axios.post(`${API_URL}/api/appointments/${appointmentId}/notes`,
        { notes: notesRef.current || notes, prescription: prescriptionRef.current || prescription },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      // Show success toast before leaving
      setShowNotesSuccess(true);
      setTimeout(() => {
        leaveCall();
      }, 2000);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit notes');
    }
  };

  const requestCompleteConsultation = async () => {
    try {
      // PRE-FLIGHT CHECK
      const { data: aptData } = await axios.get(`${API_URL}/api/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const pendingInvites = aptData.invitedDoctors?.filter(inv => inv.status !== 'COMPLETED');
      if (pendingInvites && pendingInvites.length > 0) {
        showToast('Cannot complete: Waiting for invited doctors to submit their notes.');
        return;
      }

      await axios.post(`${API_URL}/api/appointments/${appointmentId}/notes`,
        { notes: notesRef.current || notes, prescription: prescriptionRef.current || prescription },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setWaitingForPatientConfirmation(true);
      socket.emit('call:request_complete', { appointmentId });
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save notes before completing');
    }
  };

  const isDoctor = user?.role === 'DOCTOR';
  const isPrimaryDoctor = isDoctor && appointment?.doctorId === user?.id;
  const toggleTab = (tabKey) => setActiveTab((prev) => (prev === tabKey ? null : tabKey));
  const summary = parseAiSummary(appointment?.aiSummary);
  const medicalConditions = Array.isArray(summary?.medicalConditions) ? summary.medicalConditions : [];
  const attachedFileNames = Array.isArray(summary?.attachedFileNames) ? summary.attachedFileNames : [];
  const bookingQuestionnaire = summary?.prescriptionQuestionnaire && typeof summary.prescriptionQuestionnaire === 'object'
    ? summary.prescriptionQuestionnaire
    : {};
  const requestedPathologyTests = Array.isArray(summary?.selectedBloodTests)
    ? summary.selectedBloodTests
    : Array.isArray(summary?.pathologyTests)
      ? summary.pathologyTests
      : [];
  const requestedRadiologyTests = Array.isArray(summary?.selectedRadiologyTests)
    ? summary.selectedRadiologyTests
    : Array.isArray(summary?.radiologyTests)
      ? summary.radiologyTests
      : [];
  const patientProfile = appointment?.patient?.patientProfile || null;
  const familyLinkedProfile = appointment?.familyMember?.linkedUser?.patientProfile || null;
  const resolvedPatientProfile = appointment?.familyMember ? (familyLinkedProfile || patientProfile) : patientProfile;
  const hasGpMedicationHistory = ['yes', 'y', 'true', '1'].includes(String(summary?.gpMedicationHistory || '').trim().toLowerCase());

  const otherName = isDoctor
    ? (appointment?.familyMember?.name || appointment?.patient?.name)
    : formatDoctorName(appointment?.doctor?.name, appointment?.doctor?.name);
  const patientName = appointment?.familyMember?.name || appointment?.patient?.name || 'Patient';
  const patientEmail = appointment?.patient?.email || '';
  const doctorDisplayName = formatDoctorName(appointment?.doctor?.name, appointment?.doctor?.name || 'Doctor');
  const doctorEmail = appointment?.doctor?.email || '';
  const doctorProfile = appointment?.doctor?.doctorProfile || null;
  const doctorQualification = doctorProfile?.qualification || 'MBBS';
  const doctorSpecialization = getPractitionerTypeLabel(appointment?.doctor, 'General Practitioner');
  const doctorAddress = String(doctorProfile?.address || '').trim();
  const doctorContact = String([doctorProfile?.phoneCode, doctorProfile?.phone].filter(Boolean).join(' ')).trim();
  const doctorProviderNumber = String(doctorProfile?.providerNumber || '').trim();
  const doctorPrescriberNumber = String(doctorProfile?.prescriberNumber || '').trim();
  const doctorAhpraNumber = String(doctorProfile?.ahpraNumber || '').trim();
  const doctorHpiiNumber = String(doctorProfile?.hpiIndividualNumber || '').trim();
  const doctorHpioNumber = String(doctorProfile?.hpioNumber || '').trim();
  const doctorPrescriptionEntityId = String(doctorProfile?.prescriptionEntityId || '').trim();
  const patientMedicareCardNumber = firstNonEmptyValue(
    resolvedPatientProfile?.medicareCardNumber,
    summary?.medicareCardNumber,
    summary?.medicareNumber
  );
  const patientMedicareIrn = firstNonEmptyValue(resolvedPatientProfile?.medicareIrn, summary?.medicareIrn);
  const patientDateOfBirth = firstNonEmptyValue(resolvedPatientProfile?.dateOfBirth, summary?.patientDateOfBirth);
  const patientGender = firstNonEmptyValue(appointment?.familyMember?.gender, resolvedPatientProfile?.gender);
  const patientContact = firstNonEmptyValue(
    [resolvedPatientProfile?.phoneCode, resolvedPatientProfile?.phone].filter(Boolean).join(' '),
    summary?.patientPhone,
    patientEmail
  );
  const patientAddress = firstNonEmptyValue(
    appointment?.familyMember?.address,
    resolvedPatientProfile?.address,
    summary?.patient_address,
    summary?.address
  );
  const knownPatientReason = firstNonEmptyValue(summary?.patientReason, summary?.reasonForRequest);
  const knownDiagnosis = firstNonEmptyValue(
    summary?.diagnosis,
    knownPatientReason,
    Array.isArray(summary?.symptoms) ? summary.symptoms.join(', ') : ''
  );
  const knownClinicalNotes = firstNonEmptyValue(summary?.medicalHistoryNotes);
  const knownAllergies = firstNonEmptyValue(resolvedPatientProfile?.allergies, summary?.allergies);
  const callNotesConsultationType = isInPersonMode ? 'In Person' : 'Telehealth';
  const callNotesServiceName = firstNonEmptyValue(
    summary?.serviceName,
    summary?.service_name,
    summary?.service,
    'Standard Consultation'
  );
  const questionnaireRows = [
    { label: 'Consulted within last 12 months', value: bookingQuestionnaire?.consultedWithinLast12Months || summary?.recentConsultationResponse },
    { label: 'Any chronic conditions', value: bookingQuestionnaire?.chronicConditions },
    { label: 'Currently taking medications', value: bookingQuestionnaire?.takingMedications },
    { label: 'Recent surgeries or hospitalizations', value: bookingQuestionnaire?.recentSurgeriesOrHospitalizations },
    { label: 'Needs language or mobility assistance', value: bookingQuestionnaire?.needsLanguageOrMobilityAssistance },
    { label: 'Seen doctor for this issue before', value: bookingQuestionnaire?.seenDoctorForIssueBefore },
    { label: 'Symptom duration', value: bookingQuestionnaire?.symptomDuration },
    { label: 'Symptom severity (1-10)', value: bookingQuestionnaire?.symptomSeverity },
    { label: 'Additional information', value: bookingQuestionnaire?.additionalInformation },
  ];
  const hasQuestionnaireResponses = questionnaireRows.some((row) => String(row.value || '').trim());
  const queueTypeLabel = String(summary?.queueType || '').trim().toUpperCase() === 'GENERAL' ? 'General Queue' : 'Doctor Specific';
  const normalizedServiceLabel = String(
    summary?.serviceName || summary?.service_name || summary?.service || ''
  ).trim().toLowerCase();
  const normalizedServiceType = String(
    summary?.serviceType || summary?.service_type || ''
  ).trim().toLowerCase();
  const isPrescriptionOnlyMeeting = (
    normalizedServiceLabel.includes('single prescription') ||
    normalizedServiceLabel.includes('multiple prescription') ||
    (normalizedServiceLabel === '' && normalizedServiceType.includes('prescription'))
  );
  const autoReferralCondition = summary?.noMedicalCondition
    ? (knownDiagnosis || 'General medical review')
    : (medicalConditions.length > 0 ? medicalConditions.join(', ') : (knownDiagnosis || 'General medical review'));

  useEffect(() => {
    if (!isDoctor || activeTab !== 'specialist-referral') return;
    if (referralSpecialists.length > 0 || loadingReferralSpecialists) return;
    fetchReferralSpecialists();
  }, [isDoctor, activeTab, referralSpecialists.length, loadingReferralSpecialists]);

  useEffect(() => {
    if (!isDoctor) return;
    setReferralForm((current) => ({
      ...current,
      condition: current.condition || autoReferralCondition,
    }));
  }, [isDoctor, autoReferralCondition]);

  useEffect(() => {
    if (!isDoctor) return;
    setCallNotesForm((current) => ({
      ...current,
      clinicalAssessment: current.clinicalAssessment || knownDiagnosis,
      otherNotes: current.otherNotes || knownClinicalNotes,
    }));
  }, [isDoctor, knownDiagnosis, knownClinicalNotes]);

  useEffect(() => {
    if (!isDoctor) return;
    const payload = buildCallNotesPayload(callNotesForm, {
      patientName,
      patientDateOfBirth,
      consultationType: callNotesConsultationType,
      serviceName: callNotesServiceName,
    });
    setNotes(payload);
  }, [
    isDoctor,
    callNotesForm,
    patientName,
    patientDateOfBirth,
    callNotesConsultationType,
    callNotesServiceName,
  ]);

  useEffect(() => {
    if (!isDoctor) return;
    setPrescriptionDraft((current) => ({
      ...current,
      medicareNumber: current.medicareNumber || patientMedicareCardNumber,
      medicareIrn: current.medicareIrn || patientMedicareIrn,
      diagnosis: current.diagnosis || knownDiagnosis,
      reasonForPrescription: current.reasonForPrescription || knownPatientReason,
      notes: current.notes || knownClinicalNotes,
      annotations: current.annotations || (knownAllergies ? `Allergies: ${knownAllergies}` : ''),
      prescriberHpioNumber: current.prescriberHpioNumber || doctorHpioNumber,
      prescriberHpiiNumber: current.prescriberHpiiNumber || doctorHpiiNumber,
      prescriberNumber: current.prescriberNumber || doctorPrescriberNumber || doctorProviderNumber,
      ahpraNumber: current.ahpraNumber || doctorAhpraNumber,
      prescriptionEntityId: current.prescriptionEntityId || doctorPrescriptionEntityId,
    }));
  }, [
    isDoctor,
    patientMedicareCardNumber,
    patientMedicareIrn,
    knownDiagnosis,
    knownPatientReason,
    knownClinicalNotes,
    knownAllergies,
    doctorHpioNumber,
    doctorHpiiNumber,
    doctorPrescriberNumber,
    doctorProviderNumber,
    doctorAhpraNumber,
    doctorPrescriptionEntityId,
  ]);
  useEffect(() => {
    if (!isDoctor) return;
    if (pathologyTests.length > 0) return;
    if (!Array.isArray(requestedPathologyTests) || requestedPathologyTests.length === 0) return;

    const normalized = Array.from(
      new Set(
        requestedPathologyTests
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    ).slice(0, 10);

    if (normalized.length > 0) {
      setPathologyTests(normalized);
    }
  }, [isDoctor, pathologyTests.length, requestedPathologyTests]);
  useEffect(() => {
    if (!isDoctor) return;
    if (radiologyTests.length > 0) return;
    if (!Array.isArray(requestedRadiologyTests) || requestedRadiologyTests.length === 0) return;

    const normalized = Array.from(
      new Set(
        requestedRadiologyTests
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    );

    if (normalized.length > 0) {
      setRadiologyTests(normalized);
    }
  }, [isDoctor, radiologyTests.length, requestedRadiologyTests]);
  useEffect(() => {
    if (!isPrescriptionOnlyMeeting) return;
    if (![
      'medical-certificate',
      'specialist-referral',
      'pathology-request',
      'radiology-request',
      'triage',
      'request-medical-certificate',
      'request-specialist-referral',
      'request-pathology',
      'request-radiology',
    ].includes(activeTab)) return;
    setActiveTab('booking');
  }, [activeTab, isPrescriptionOnlyMeeting]);
  const currentDateLabel = new Date().toLocaleDateString('en-GB');
  const referralValidUntilDate = new Date();
  referralValidUntilDate.setFullYear(referralValidUntilDate.getFullYear() + 1);
  const referralValidUntilLabel = referralValidUntilDate.toLocaleDateString('en-GB');
  const generatedDocumentFieldByType = {
    MEDICAL_CERTIFICATE: 'medicalCertificateUrl',
    SPECIALIST_REFERRAL: 'specialistReferralUrl',
    PATHOLOGY_LETTER: 'pathologyLetterUrl',
    RADIOLOGY_LETTER: 'radiologyLetterUrl',
  };
  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const buildDocumentHtml = ({ title, bodyHtml, signatureUrl }) => {
    const signatureBlock = signatureUrl
      ? `<div style="margin-top:20px;"><p style="margin:0 0 8px;font-weight:600;">Doctor Signature</p><img src="${escapeHtml(signatureUrl)}" alt="Doctor signature" style="max-width:220px;max-height:120px;object-fit:contain;border:1px solid #d1d5db;padding:6px;border-radius:8px;background:#fff;" /></div>`
      : '';
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; line-height: 1.5; }
    h1 { margin: 0 0 12px; font-size: 22px; }
    .meta { color: #475569; font-size: 13px; margin-bottom: 16px; }
    .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-top: 10px; background: #f8fafc; }
    ul { margin: 8px 0 0 18px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Generated at ${escapeHtml(new Date().toLocaleString())}</div>
  ${bodyHtml}
  ${signatureBlock}
</body>
</html>`;
  };

  const saveGeneratedDocument = async (documentType, htmlContent, signatureUpload) => {
    if (!appointmentId) return;
    if (!signatureUpload?.url) {
      showToast('Please upload doctor signature before saving.');
      return;
    }
    const lowerType = String(documentType || '').toLowerCase();
    const fileName = `${lowerType}_${appointmentId}_${Date.now()}.html`;
    const htmlFile = new File([htmlContent], fileName, { type: 'text/html' });

    setSavingGeneratedDocumentType(documentType);
    try {
      const uploadedDocument = await uploadFileToS3(htmlFile, `generated-${lowerType}`);
      await axios.post(
        `${API_URL}/api/appointments/${appointmentId}/documents`,
        {
          documentType,
          documentUrl: uploadedDocument.url,
          signatureUrl: signatureUpload?.url || '',
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      const targetField = generatedDocumentFieldByType[documentType];
      setAppointment((current) => {
        if (!current) return current;
        const currentSummary = parseAiSummary(current.aiSummary);
        return {
          ...current,
          aiSummary: {
            ...currentSummary,
            [targetField]: uploadedDocument.url,
          },
        };
      });
      showToast('Document saved successfully.');
    } catch (error) {
      console.error('Failed to save generated document', error);
      showToast(error?.response?.data?.error || 'Failed to save document.');
    } finally {
      setSavingGeneratedDocumentType('');
    }
  };

  const handleSaveMedicalCertificate = async () => {
    const signatureUpload = signatureUploads.medicalCertificate;
    const bodyHtml = `
      <div class="card">
        <p><strong>Doctor:</strong> ${escapeHtml(doctorDisplayName)}</p>
        <p><strong>Patient:</strong> ${escapeHtml(patientName)}</p>
        <p><strong>Date:</strong> ${escapeHtml(currentDateLabel)}</p>
        <p><strong>Unfit From:</strong> ${escapeHtml(medicalCertForm.startDate || 'Not provided')}</p>
        <p><strong>Unfit To:</strong> ${escapeHtml(medicalCertForm.endDate || 'Not provided')}</p>
        <p><strong>Reason:</strong> ${escapeHtml(medicalCertForm.reason || 'Not provided')}</p>
        <p><strong>Advice:</strong> ${escapeHtml(medicalCertForm.advice || 'Not provided')}</p>
      </div>`;
    const htmlContent = buildDocumentHtml({
      title: 'Medical Certificate',
      bodyHtml,
      signatureUrl: signatureUpload?.url || '',
    });
    await saveGeneratedDocument('MEDICAL_CERTIFICATE', htmlContent, signatureUpload);
  };

  const handleSaveSpecialistReferral = async () => {
    const signatureUpload = signatureUploads.specialistReferral;
    const bodyHtml = `
      <div class="card">
        <p><strong>Doctor:</strong> ${escapeHtml(doctorDisplayName)}</p>
        <p><strong>Patient:</strong> ${escapeHtml(patientName)}</p>
        <p><strong>Date:</strong> ${escapeHtml(currentDateLabel)}</p>
        <p><strong>Referred To:</strong> ${escapeHtml(referralForm.doctorName || 'Not provided')}</p>
        <p><strong>Referred Email:</strong> ${escapeHtml(referralForm.doctorEmail || 'Not provided')}</p>
        <p><strong>Referred Address:</strong> ${escapeHtml(referralForm.doctorAddress || 'Not provided')}</p>
        <p><strong>Phone:</strong> ${escapeHtml(referralForm.phoneNo || 'Not provided')}</p>
        <p><strong>Condition:</strong> ${escapeHtml(referralForm.condition || 'Not provided')}</p>
        <p><strong>Valid Until:</strong> ${escapeHtml(referralValidUntilLabel)}</p>
      </div>`;
    const htmlContent = buildDocumentHtml({
      title: 'Specialist Referral Letter',
      bodyHtml,
      signatureUrl: signatureUpload?.url || '',
    });
    await saveGeneratedDocument('SPECIALIST_REFERRAL', htmlContent, signatureUpload);
  };

  const handleSavePathologyLetter = async () => {
    const signatureUpload = signatureUploads.pathologyRequest;
    const testsList = pathologyTests.length > 0
      ? pathologyTests.map((test) => `<li>${escapeHtml(test)}</li>`).join('')
      : '<li>No tests added</li>';
    const bodyHtml = `
      <div class="card">
        <p><strong>Doctor:</strong> ${escapeHtml(doctorDisplayName)}</p>
        <p><strong>Patient:</strong> ${escapeHtml(patientName)}</p>
        <p><strong>Date:</strong> ${escapeHtml(currentDateLabel)}</p>
        <p><strong>Requested Pathology Tests:</strong></p>
        <ul>${testsList}</ul>
      </div>`;
    const htmlContent = buildDocumentHtml({
      title: 'Pathology Request Letter',
      bodyHtml,
      signatureUrl: signatureUpload?.url || '',
    });
    await saveGeneratedDocument('PATHOLOGY_LETTER', htmlContent, signatureUpload);
  };

  const handleSaveRadiologyLetter = async () => {
    const signatureUpload = signatureUploads.radiologyRequest;
    const testsList = radiologyTests.length > 0
      ? radiologyTests.map((test) => `<li>${escapeHtml(test)}</li>`).join('')
      : '<li>No tests added</li>';
    const bodyHtml = `
      <div class="card">
        <p><strong>Doctor:</strong> ${escapeHtml(doctorDisplayName)}</p>
        <p><strong>Patient:</strong> ${escapeHtml(patientName)}</p>
        <p><strong>Date:</strong> ${escapeHtml(currentDateLabel)}</p>
        <p><strong>Requested Radiology Tests:</strong></p>
        <ul>${testsList}</ul>
      </div>`;
    const htmlContent = buildDocumentHtml({
      title: 'Radiology Request Letter',
      bodyHtml,
      signatureUrl: signatureUpload?.url || '',
    });
    await saveGeneratedDocument('RADIOLOGY_LETTER', htmlContent, signatureUpload);
  };
  const activeRemoteUser = remoteUsers.find((u) => u.uid === activeRemoteUid) || remoteUsers[0] || null;
  const stackedRemoteUsers = activeRemoteUser
    ? remoteUsers.filter((u) => u.uid !== activeRemoteUser.uid)
    : remoteUsers;
  const getRemoteDisplayName = (u) => {
    const known = userNames[u.uid];
    if (known) return known;
    if (u.uid === activeRemoteUser?.uid && isDoctor) return patientName;
    if (remoteUsers.length === 1) return otherName;
    return 'Participant';
  };
  const activeRemoteHasVideo = Boolean(activeRemoteUser?.videoTrack || activeRemoteUser?.hasVideo);
  const activeRemoteHasAudio = Boolean(activeRemoteUser?.audioTrack || activeRemoteUser?.hasAudio);
  const participantStackUsers = activeRemoteUser ? [activeRemoteUser, ...stackedRemoteUsers] : [];
  const participantStackCount = 1 + participantStackUsers.length; // includes "You" tile
  const participantTileWidthClass = participantStackCount >= 6
    ? 'w-20 sm:w-24 md:w-28'
    : participantStackCount >= 4
      ? 'w-24 sm:w-28 md:w-32'
      : 'w-28 sm:w-32 md:w-36';
  const participantStackMaxHeightClass = participantStackCount > 3
    ? 'max-h-[calc(100%-1.25rem)]'
    : 'max-h-[calc(100%-1.5rem)]';
  const participantStackScrollClass = participantStackCount > 3
    ? 'overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
    : '';
  const sidebarOpen = activeTab !== null;
  const consultationModeLabel = isInPersonMode ? 'In-Person' : (isAudioMode ? 'Audio' : 'Video');
  const roomTitle = isInPersonMode ? `${consultationModeLabel} Consultation Room` : `${consultationModeLabel} Consultation`;
  const patientVisiblePrescription = Array.isArray(prescription) ? prescription : [];
  const patientRequestTabs = {
    'request-medical-certificate': {
      tabLabel: 'Medical Cert Request',
      title: 'Request Medical Certificate',
      requestLabel: 'Medical Certificate',
      description: 'Ask your doctor to issue a medical certificate.',
    },
    'request-specialist-referral': {
      tabLabel: 'Referral Request',
      title: 'Request Specialist Referral Letter',
      requestLabel: 'Specialist Referral Letter',
      description: 'Ask your doctor to issue a specialist referral letter.',
    },
    'request-pathology': {
      tabLabel: 'Pathology Request',
      title: 'Request Pathology Form',
      requestLabel: 'Pathology Request',
      description: 'Ask your doctor to issue a pathology test request.',
    },
    'request-radiology': {
      tabLabel: 'Radiology Request',
      title: 'Request Radiology Form',
      requestLabel: 'Radiology Request',
      description: 'Ask your doctor to issue a radiology request.',
    },
  };
  const activePatientRequest = !isDoctor ? patientRequestTabs[activeTab] : null;

  const sendPatientCertificateRequest = (requestLabel) => {
    if (!socket) {
      showToast('Chat is not connected yet.');
      return;
    }
    const normalizedRequestLabel = String(requestLabel || '').trim();
    if (!normalizedRequestLabel) {
      showToast('Unable to send request.');
      return;
    }
    const extraNote = String(patientRequestNote || '').trim();
    const text = `[Patient Document Request] ${normalizedRequestLabel}${extraNote ? ` | Note: ${extraNote}` : ''}`;
    socket.emit('chat:send', { appointmentId, senderId: user.id, senderRole: user.role, text, senderName: user.name });
    setPatientRequestNote('');
    showToast('Request sent to doctor.');
    setActiveTab('chat');
  };

  const handleLeaveOnly = () => {
    setShowLeaveCallOptions(false);
    leaveCall();
  };

  const getSessionRouteByMode = (targetAppointmentId, modeValue) => {
    const mode = String(modeValue || '').toUpperCase();
    if (mode !== 'IN_PERSON') return `/room/${targetAppointmentId}`;
    if (user?.role === 'DOCTOR') return `/doctor/in-person/${targetAppointmentId}`;
    if (user?.role === 'PATIENT') return `/patient/in-person/${targetAppointmentId}`;
    return `/room/${targetAppointmentId}`;
  };

  const resolveSessionRouteForAppointment = async (targetAppointmentId) => {
    if (!targetAppointmentId) return user?.role === 'PATIENT' ? PATIENT_APPOINTMENTS_ROUTE : '/dashboard';

    if (String(targetAppointmentId) === String(appointmentId) && appointment?.consultationMode) {
      return getSessionRouteByMode(targetAppointmentId, appointment.consultationMode);
    }

    try {
      const { data } = await axios.get(`${API_URL}/api/appointments/${targetAppointmentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return getSessionRouteByMode(targetAppointmentId, data?.consultationMode);
    } catch {
      return `/room/${targetAppointmentId}`;
    }
  };

  const completeConsultationFromPatient = async () => {
    try {
      await axios.put(
        `${API_URL}/api/appointments/${appointmentId}/status`,
        { status: 'COMPLETED' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
    } catch (err) {
      if (err?.response?.status === 400 || err?.response?.status === 403) {
        showToast(err.response?.data?.error || 'Unable to end consultation right now.');
      } else {
        showToast('Failed to end consultation');
      }
      return false;
    }

    if (socket) {
      socket.emit('call:accept_complete', { appointmentId });
    }

    leaveCall(false, {
      redirectTo: '/patient/account?tab=medical-history',
      promptReviewAppointmentId: appointmentId,
    });
    return true;
  };

  const handleEndMeetingFromPrompt = async () => {
    setShowLeaveCallOptions(false);
    if (isDoctor) {
      if (isPrimaryDoctor) {
        await requestCompleteConsultation();
      } else {
        await submitInvitedDoctorNotes();
      }
      return;
    }
    await completeConsultationFromPatient();
  };

  const doctorNavItems = DOCTOR_NAV_ITEMS;

  const handleDoctorNavbarClick = async (key) => {
    await leaveCall(true);
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
  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Render ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  return (
    <div className="h-[100dvh] bg-slate-50 flex flex-col font-sans select-none overflow-hidden">

      {isDoctor ? (
        <SharedNavbar
          className="bg-white border-b border-slate-200 shrink-0 z-40"
          user={user}
          brandLabel="CareBridge"
          onLogoClick={() => handleDoctorNavbarClick('dashboard')}
          navItems={doctorNavItems}
          activeTab=""
          onTabClick={handleDoctorNavbarClick}
          isOnline={isOnline}
          onToggleOnline={handleToggleOnline}
          pendingCount={0}
          doctorName={user?.name}
          isDoctor
          showMobileTabs
          onLogout={() => {
            leaveCall(true).then(() => {
              if (typeof logout === 'function') logout();
              else navigate('/');
            });
          }}
        />
      ) : (
        <LandingNavbar activeKey="patient" />
      )}

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Joining overlay ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <AnimatePresence>
        {joining && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4"
            style={{ background: '#f8fafc' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="w-14 h-14 rounded-full border-4 border-primary-500 border-t-transparent"
            />
            <p className="text-slate-900 font-heading font-black text-xl tracking-tight">Connecting to call...</p>
            <p className="text-slate-500 text-sm font-medium">Setting up your camera & microphone</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Call Incoming Toast ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4"
            style={{ background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(16px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Incoming consultation call"
          >
            <motion.div
              initial={{ scale: 0.85, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center backdrop-blur-sm shadow-2xl"
            >
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 rounded-full border-2 border-health-400/40 animate-ping" />
                <div className="absolute inset-3 rounded-full border-2 border-health-300/30 animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-slate-100 border-4 border-white shadow-xl overflow-hidden z-10">
                  <img
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${incomingCall.doctorName || 'Doctor'}`}
                    alt="Doctor"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-1 right-1 w-8 h-8 bg-health-500 rounded-full border-4 border-slate-900/80 flex items-center justify-center z-20">
                  <Video className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              <p className="text-health-400 text-xs font-black uppercase tracking-widest mb-3">
                Incoming Consultation Call
              </p>
              <h3 className="text-white font-heading font-black text-2xl sm:text-3xl text-center mb-1">
                {formatDoctorName(incomingCall.doctorName, incomingCall.doctorName)}
              </h3>
              <p className="text-slate-400 font-medium text-sm text-center mb-8">
                is asking you to join another consultation
              </p>

              <div className="mb-8 flex flex-col items-center gap-2">
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - (timeLeft / 30))}`}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-heading font-black text-sm">
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <p className="text-white/40 text-xs font-medium">Auto-dismiss in</p>
              </div>

              <div className="grid w-full grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: false });
                    setIncomingCall(null);
                  }}
                  className="py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors cursor-pointer"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => {
                    socket.emit('call:tentative_join', {
                      appointmentId: incomingCall.appointmentId,
                      doctorName: user.name || 'Invited Doctor',
                      delayMinutes: 5
                    });
                    try {
                      const saved = localStorage.getItem('deferredInvites');
                      const invites = saved ? JSON.parse(saved) : [];
                      invites.push(incomingCall);
                      localStorage.setItem('deferredInvites', JSON.stringify(invites));
                    } catch { /* no-op */ }
                    setIncomingCall(null);
                  }}
                  className="py-2.5 rounded-xl bg-orange-500/90 text-white font-bold text-sm hover:bg-orange-600 transition-colors cursor-pointer"
                >
                  +5 Mins
                </button>
              </div>

              <button
                type="button"
                onClick={async () => {
                  socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: true });
                  const sessionRoute = await resolveSessionRouteForAppointment(incomingCall.appointmentId);
                  leaveCall(true).then(() => {
                    // Force a full unmount/remount to cleanly initialize the new WebRTC connection
                    window.location.href = sessionRoute;
                  });
                }}
                className="w-full mt-3 py-3 rounded-xl text-white font-black text-sm transition-transform hover:scale-[1.01] shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #0e7490, #059669)' }}
              >
                <Check className="w-4 h-4" /> End Current & Join
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Patient End Confirmation Overlay ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <AnimatePresence>
        {showPatientEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Patient end consultation confirmation"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-health-100 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-health-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">End Consultation?</h2>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                The doctor has requested to end the consultation. Do you agree to end the meeting now?
              </p>
              <div className="flex gap-4 w-full">
                <button type="button"
                  onClick={() => {
                    socket.emit('call:decline_complete', { appointmentId });
                    setShowPatientEndConfirm(false);
                  }}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Continue Call
                </button>
                <button type="button"
                  onClick={async () => {
                    const completed = await completeConsultationFromPatient();
                    if (completed) {
                      setShowPatientEndConfirm(false);
                    }
                  }}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm text-slate-900 transition-transform hover:scale-105 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#0e7490,#059669)', boxShadow: '0 8px 20px rgba(14,116,144,0.3)' }}
                >
                  Yes, End Call
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Doctor Waiting Overlay ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <AnimatePresence>
        {showLeaveCallOptions && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Leave or end consultation"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center"
            >
              <h2 className="text-2xl font-black text-slate-900 mb-2">Leave Call?</h2>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                You can leave just for yourself, or end this meeting for everyone.
              </p>
              <div className="grid grid-cols-1 gap-3 w-full">
                <button
                  type="button"
                  onClick={handleLeaveOnly}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Leave Call Only
                </button>
                <button
                  type="button"
                  onClick={handleEndMeetingFromPrompt}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white transition-transform hover:scale-[1.01] cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#ea4335,#dc2626)' }}
                >
                  End Meeting
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeaveCallOptions(false)}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {waitingForPatientConfirmation && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Waiting for patient confirmation"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="mb-6">
                <Activity className="w-12 h-12 text-primary-500" />
              </motion.div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Waiting for Patient</h2>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                We have asked the patient to confirm they are ready to end the consultation.
              </p>
              <button type="button"
                onClick={() => {
                  setWaitingForPatientConfirmation(false);
                  completeConsultation();
                }}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
              >
                Force End Consultation
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Invite Doctor Modal ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Invite doctor"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col"
              style={{ maxHeight: '80vh' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary-500" />
                  Invite Doctor
                </h2>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Close invite doctor dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name or practitioner type..."
                  value={inviteSearchQuery}
                  onChange={e => setInviteSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="flex-1 overflow-y-auto min-h-[200px]" style={{ scrollbarWidth: 'thin' }}>
                {doctorsList.filter(d =>
                  d.user.name.toLowerCase().includes(inviteSearchQuery.toLowerCase()) ||
                  String(getPractitionerTypeLabel(d, '')).toLowerCase().includes(inviteSearchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="text-center text-slate-500 py-8 font-medium">
                    No doctors available to invite.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {doctorsList.filter(d =>
                      d.user.name.toLowerCase().includes(inviteSearchQuery.toLowerCase()) ||
                      String(getPractitionerTypeLabel(d, '')).toLowerCase().includes(inviteSearchQuery.toLowerCase())
                    ).map(d => (
                      <div key={d.userId} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-primary-100 bg-slate-50 hover:bg-primary-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                            {d.user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{formatDoctorName(d.user.name, d.user.name)}</p>
                            <p className="text-xs text-slate-500 font-medium">
                              {getPractitionerTypeLabel(d, 'General Practitioner (GP)')}
                            </p>
                          </div>
                        </div>
                        <button type="button"
                          onClick={() => handleInviteDoctor(d.userId)}
                          disabled={invitingDoctorId === d.userId}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-slate-900 transition-all hover:scale-105 disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #0e7490, #059669)' }}
                        >
                          {invitingDoctorId === d.userId ? 'Inviting...' : 'Invite'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Consultation Completed overlay ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <AnimatePresence>
        {showCompletedDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-white/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden border border-slate-100"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-health-50 to-transparent pointer-events-none" />

              <div className="w-20 h-20 bg-health-100 text-health-600 rounded-full flex items-center justify-center mb-6 relative z-10 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-heading font-black text-slate-900 mb-2 relative z-10">Consultation Complete</h2>
              <p className="text-slate-500 text-sm mb-8 relative z-10 leading-relaxed">
                {isDoctor
                  ? "The patient has confirmed and ended this consultation. You will now be redirected to your dashboard."
                  : "The doctor has ended this consultation. You will now be redirected to My Appointments so you can rate your doctor."}
              </p>
              <button type="button"
                onClick={() => leaveCall(false, isDoctor
                  ? null
                  : {
                      redirectTo: '/patient/account?tab=medical-history',
                      promptReviewAppointmentId: appointmentId,
                    })}
                className="w-full py-4 bg-health-500 hover:bg-health-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-health-500/20 relative z-10 active:scale-95"
              >
                {isDoctor ? 'Return to Dashboard' : 'Go to My Appointments'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Notes Success Toast ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <AnimatePresence>
        {showNotesSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] bg-white p-6 rounded-3xl shadow-2xl border border-health-100 max-w-sm w-full"
            style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-health-100 flex items-center justify-center text-health-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 leading-tight">Notes Submitted</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Success</p>
              </div>
            </div>
            <p className="text-slate-600 text-sm font-medium">Your notes have been saved. You are now leaving the consultation.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Global Toast ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[200] bg-white text-slate-900 px-6 py-3 rounded-full shadow-2xl border border-slate-700 flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            <span className="font-bold text-sm">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Top bar ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 z-10" style={{ background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        {/* Left: logo + name */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #0e7490, #059669)' }}>
            {isInPersonMode ? <MessageSquare className="w-4 h-4 text-slate-900" /> : (isAudioMode ? <Phone className="w-4 h-4 text-slate-900" /> : <Video className="w-4 h-4 text-slate-900" />)}
          </div>
          <div className="min-w-0">
            <p className="text-slate-900 font-heading font-black text-sm leading-tight truncate">
              {otherName || roomTitle}
            </p>
            <p className="text-slate-500 text-[10px] font-medium">{consultationModeLabel} Ã‚Â· {getPractitionerTypeLabel(appointment?.doctor, 'Consultation Session')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {inCall && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)' }}>
              <Clock className="w-3 h-3 text-slate-500" />
              <span className="text-slate-900 font-mono font-bold text-xs">{fmt(elapsed)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: inCall ? 'rgba(5,150,105,0.15)' : 'rgba(234,67,53,0.15)', border: `1px solid ${inCall ? 'rgba(5,150,105,0.3)' : 'rgba(234,67,53,0.3)'}` }}>
            <div className={`w-2 h-2 rounded-full ${inCall ? 'bg-health-400 animate-pulse' : 'bg-red-400'}`} />
            <span className={`text-[10px] font-black uppercase tracking-wider ${inCall ? 'text-health-600' : 'text-red-400'}`}>
              {inCall ? (isInPersonMode ? 'Active Chat' : 'Live') : 'Connecting'}
            </span>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 relative flex overflow-hidden min-h-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-24 sm:pb-24 gap-3 sm:gap-4">
        {/* Video section */}
        <div className={`flex-1 h-full min-w-0 min-h-0 flex flex-col relative overflow-hidden w-full border rounded-2xl ${sidebarOpen ? 'max-w-none mx-0' : 'max-w-[1180px] mx-auto'}`}>
          <div className="flex-1 relative overflow-hidden min-h-0">
            <div className="absolute inset-0 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
              {isInPersonMode ? (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="max-w-xl w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center">
                      <MessageSquare className="w-7 h-7" />
                    </div>
                    <h3 className="mt-4 text-xl font-heading font-black text-slate-900">In-Person Consultation Workspace</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Use the chat tab to coordinate with the patient and the prescription tab to record medicines.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      This mode does not start an Agora call.
                    </p>
                  </div>
                </div>
              ) : remoteUsers.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                      <motion.div
                        animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-full border-2 border-primary-500"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3], opacity: [0.35, 0] }}
                        transition={{ duration: 2, delay: 0.6, repeat: Infinity }}
                        className="absolute inset-0 rounded-full border-2 border-primary-400"
                      />
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 relative z-10" style={{ borderColor: 'rgba(14,116,144,0.5)' }}>
                        <img
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${otherName}&backgroundColor=0e7490`}
                          alt={otherName}
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                    <p className="text-slate-900 font-heading font-black text-lg">{otherName}</p>
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent"
                      />
                      Waiting for them to joinÃ¢â‚¬Â¦
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-slate-900">
                  {activeRemoteHasVideo ? (
                    <div className="w-full h-full [&>div>video]:object-cover" ref={(el) => { remoteVideoRefs.current[activeRemoteUser.uid] = el; }} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-100">
                      <div className="relative w-28 h-28">
                        <div
                          id={`vol-${activeRemoteUser?.uid}`}
                          className="absolute inset-0 rounded-full transition-all duration-75"
                          style={{ background: 'rgba(14,116,144,0.3)', opacity: 0.1 }}
                        />
                        <div className="absolute inset-0 rounded-full overflow-hidden border-4" style={{ borderColor: 'rgba(14,116,144,0.4)' }}>
                          <img
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${activeRemoteUser ? getRemoteDisplayName(activeRemoteUser) : 'Participant'}&backgroundColor=0e7490`}
                            alt={activeRemoteUser ? getRemoteDisplayName(activeRemoteUser) : 'Participant'}
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                      <p className="text-slate-900 font-heading font-black text-lg">
                        {activeRemoteUser ? getRemoteDisplayName(activeRemoteUser) : 'Participant'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeRemoteUser && remoteUsers.length > 0 && (
                <div className="absolute bottom-20 left-4 z-20">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 text-slate-800 backdrop-blur-md border border-slate-200">
                    <span className="text-slate-900 text-sm font-bold truncate max-w-[180px]">{getRemoteDisplayName(activeRemoteUser)}</span>
                    <div className="w-px h-3 bg-slate-300 mx-1" />
                    {!activeRemoteHasAudio ? (
                      <MicOff className="w-4 h-4 text-red-500" />
                    ) : (
                      <Mic className="w-4 h-4 text-emerald-500" />
                    )}
                    {!activeRemoteHasVideo ? (
                      <VideoOff className="w-4 h-4 text-red-500" />
                    ) : (
                      <Video className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                </div>
              )}

              {/* Right-side participant stack: active/main participant first, then others */}
              {!isInPersonMode && (participantStackUsers.length > 0 || Boolean(localTracks[1]) || Boolean(localTracks[0])) && (
                <div className={`absolute top-3 right-3 z-20 ${participantStackMaxHeightClass} ${participantStackScrollClass}`}>
                  <div className="flex flex-col gap-2">
                    {/* You tile */}
                    <div
                      className={`${participantTileWidthClass} text-left rounded-xl overflow-hidden border border-white/50 shadow-lg bg-slate-900/90`}
                      style={{ aspectRatio: '4/3' }}
                    >
                      <div className="relative w-full h-full">
                        {!videoMuted && Boolean(localTracks[1]) ? (
                          <div className="w-full h-full transform scale-x-[-1] [&>div>video]:object-cover" ref={localVideoRef} />
                        ) : (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-slate-900/70 via-slate-800/50 to-slate-700/40">
                            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/35 bg-slate-700/45">
                              <img
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'Me'}&backgroundColor=334155`}
                                alt="You"
                                className="w-full h-full"
                              />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 px-2 py-1 bg-gradient-to-t from-slate-900/70 to-transparent text-white text-[10px]">
                          <span className="font-bold truncate">You</span>
                          <div className="flex items-center gap-1">
                            {micMuted ? <MicOff className="w-3 h-3 text-red-300 shrink-0" /> : <Mic className="w-3 h-3 text-emerald-300 shrink-0" />}
                            {isAudioMode ? <Phone className="w-3 h-3 text-emerald-300 shrink-0" /> : (videoMuted ? <VideoOff className="w-3 h-3 text-red-300 shrink-0" /> : <Video className="w-3 h-3 text-emerald-300 shrink-0" />)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {participantStackUsers.map((u, idx) => {
                      const isActiveTile = idx === 0;
                      const remoteHasVideo = Boolean(u.videoTrack || u.hasVideo);
                      const remoteHasAudio = Boolean(u.audioTrack || u.hasAudio);
                      return (
                        <button type="button"
                          key={u.uid}
                          onClick={() => {
                            if (isDoctor) return;
                            setIsManualFocus(true);
                            setActiveRemoteUid(u.uid);
                          }}
                          className={`${participantTileWidthClass} text-left rounded-xl overflow-hidden shadow-lg bg-slate-900/90 ${isDoctor ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'} transition-transform ${isActiveTile ? 'border-2 border-primary-300' : 'border border-white/50'}`}
                          style={{ aspectRatio: '4/3' }}
                          title={`${isActiveTile ? 'On main screen: ' : 'Show on main screen: '}${getRemoteDisplayName(u)}`}
                        >
                          <div className="relative w-full h-full">
                            {remoteHasVideo && !isActiveTile ? (
                              <div
                                className="w-full h-full [&>div>video]:object-cover"
                                ref={(el) => { remoteVideoRefs.current[u.uid] = el; }}
                              />
                            ) : (
                              <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-slate-900/70 via-slate-800/50 to-slate-700/40">
                                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/35 bg-slate-700/45">
                                  <img
                                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${getRemoteDisplayName(u)}&backgroundColor=0e7490`}
                                    alt={getRemoteDisplayName(u)}
                                    className="w-full h-full"
                                  />
                                </div>
                              </div>
                            )}
                            {isActiveTile && (
                              <div className="absolute top-1.5 right-1.5 z-20 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary-500/90 text-white">
                                MAIN
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 px-2 py-1 bg-gradient-to-t from-slate-900/70 to-transparent text-white text-[10px]">
                              <span className="font-bold truncate">{getRemoteDisplayName(u)}</span>
                              <div className="flex items-center gap-1">
                                {remoteHasAudio ? <Mic className="w-3 h-3 text-emerald-300 shrink-0" /> : <MicOff className="w-3 h-3 text-red-300 shrink-0" />}
                                 {isAudioMode ? <Phone className="w-3 h-3 text-emerald-300 shrink-0" /> : (remoteHasVideo ? <Video className="w-3 h-3 text-emerald-300 shrink-0" /> : <VideoOff className="w-3 h-3 text-red-300 shrink-0" />)}
                               </div>
                             </div>
                           </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {inCall && (
                <div className="sm:hidden absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-slate-200">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-900 font-mono font-bold text-xs">{fmt(elapsed)}</span>
                </div>
              )}

              {/* Floating controls inside the stage */}
              {isRtcMode && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-3 py-2 rounded-full bg-white/90 border border-slate-200 shadow-lg">
                  <VideoOverlayBtn label="CC" icon={<span className="text-[11px] font-black">CC</span>} onClick={() => { }} />
                  <VideoOverlayBtn
                    label={micMuted ? 'Unmute' : 'Mute'}
                    icon={micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    onClick={toggleMic}
                    danger={micMuted}
                  />
                  {!isAudioMode && (
                    <VideoOverlayBtn
                      label={videoMuted ? 'Show' : 'Hide'}
                      icon={videoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      onClick={toggleVideo}
                      danger={videoMuted}
                    />
                  )}
                  <button type="button"
                    onClick={() => setShowLeaveCallOptions(true)}
                    className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 shadow-lg"
                    style={{ background: '#ea4335', boxShadow: '0 4px 16px rgba(234,67,53,0.45)' }}
                    title="Leave or end meeting"
                  >
                    <PhoneOff className="w-5 h-5 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs row Ã¢â‚¬â€ below video, horizontal scrollable */}
          <div
            className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm flex items-stretch justify-start overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-2 sm:px-4"
            style={{ scrollbarWidth: 'none' }}
          >
            <TabBtn icon={<Calendar className="w-5 h-5" />} label="Booking Details" active={activeTab === 'booking'} onClick={() => toggleTab('booking')} />
            <TabBtn icon={<MessageSquare className="w-5 h-5" />} label="Chat" active={activeTab === 'chat'} onClick={() => toggleTab('chat')} badge={messages.length || null} />
            <TabBtn
              icon={<Pill className="w-5 h-5" />}
              label="Prescription"
              active={activeTab === 'prescription'}
              onClick={() => toggleTab('prescription')}
            />
            <TabBtn
              icon={<FileText className="w-5 h-5" />}
              label="Call Notes"
              active={activeTab === 'notes'}
              onClick={() => toggleTab('notes')}
            />
            {isDoctor ? (
              <>
                <TabBtn icon={<Activity className="w-5 h-5" />} label="Medical History" active={activeTab === 'medical-history'} onClick={() => toggleTab('medical-history')} />
                {!isPrescriptionOnlyMeeting && (
                  <>
                    <TabBtn icon={<FileText className="w-5 h-5" />} label="Medical Certificate" active={activeTab === 'medical-certificate'} onClick={() => toggleTab('medical-certificate')} />
                    <TabBtn icon={<FileText className="w-5 h-5" />} label="Specialist Referral Letter" active={activeTab === 'specialist-referral'} onClick={() => toggleTab('specialist-referral')} />
                    <TabBtn icon={<Search className="w-5 h-5" />} label="Pathology Request" active={activeTab === 'pathology-request'} onClick={() => toggleTab('pathology-request')} />
                    <TabBtn icon={<LayoutDashboard className="w-5 h-5" />} label="Radiology Request" active={activeTab === 'radiology-request'} onClick={() => toggleTab('radiology-request')} />
                  </>
                )}
              </>
            ) : (
              <>
                {isPrescriptionOnlyMeeting ? (
                  <TabBtn icon={<Activity className="w-5 h-5" />} label="Medical History" active={activeTab === 'medical-history'} onClick={() => toggleTab('medical-history')} />
                ) : (
                  <>
                    <TabBtn icon={<FileText className="w-5 h-5" />} label="Medical Cert Request" active={activeTab === 'request-medical-certificate'} onClick={() => toggleTab('request-medical-certificate')} />
                    <TabBtn icon={<FileText className="w-5 h-5" />} label="Referral Request" active={activeTab === 'request-specialist-referral'} onClick={() => toggleTab('request-specialist-referral')} />
                    <TabBtn icon={<Search className="w-5 h-5" />} label="Pathology Request" active={activeTab === 'request-pathology'} onClick={() => toggleTab('request-pathology')} />
                    <TabBtn icon={<LayoutDashboard className="w-5 h-5" />} label="Radiology Request" active={activeTab === 'request-radiology'} onClick={() => toggleTab('request-radiology')} />
                  </>
                )}
              </>
            )}

            {isDoctor && !isPrescriptionOnlyMeeting && (
              <>
                <TabBtn icon={<Activity className="w-5 h-5" />} label="AI Triage" active={activeTab === 'triage'} onClick={() => toggleTab('triage')} />
                {isPrimaryDoctor && (
                  <TabBtn icon={<UserPlus className="w-5 h-5" />} label="Invite Doctor" active={showInviteModal} onClick={openInviteModal} />
                )}
                {isPrimaryDoctor ? (
                  <TabBtn icon={<CheckCircle2 className="w-5 h-5" />} label="Complete" onClick={requestCompleteConsultation} accent />
                ) : (
                  <TabBtn icon={<CheckCircle2 className="w-5 h-5" />} label="Submit & Leave" onClick={() => setActiveTab('notes')} accent />
                )}
              </>
            )}
          </div>
        </div>
        {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Sidebar ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute top-0 right-0 z-40 h-full w-[min(96vw,440px)] flex flex-col overflow-hidden min-h-0 lg:static lg:z-auto lg:self-stretch lg:h-full lg:min-h-0 lg:max-h-full lg:w-[460px] lg:shrink-0"
              style={{ background: '#f8fafc', borderLeft: '1px solid rgba(0,0,0,0.05)' }} role="dialog" aria-label="Consultation sidebar"
            >
              {/* Sidebar header */}
              <div className="shrink-0 flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <h3 className="text-slate-900 font-heading font-black text-base flex items-center gap-2">
                  {activeTab === 'booking' && <><Calendar className="w-4 h-4 text-primary-600" /> Booking Details</>}
                  {activeTab === 'chat' && <><MessageSquare className="w-4 h-4 text-primary-600" /> Live Chat</>}
                  {activeTab === 'triage' && <><Activity className="w-4 h-4 text-health-600" /> AI Triage</>}
                  {activeTab === 'prescription' && <><Pill className="w-4 h-4 text-primary-600" /> Prescription</>}
                  {activeTab === 'notes' && <><FileText className="w-4 h-4 text-health-600" /> Call Notes</>}
                  {activePatientRequest && <><FileText className="w-4 h-4 text-primary-600" /> {activePatientRequest.title}</>}
                  {activeTab === 'medical-certificate' && <><FileText className="w-4 h-4 text-primary-600" /> Medical Certificate</>}
                  {activeTab === 'specialist-referral' && <><FileText className="w-4 h-4 text-primary-600" /> Specialist Referral Letter</>}
                  {activeTab === 'medical-history' && <><Activity className="w-4 h-4 text-primary-600" /> Medical History</>}
                  {activeTab === 'pathology-request' && <><Search className="w-4 h-4 text-primary-600" /> Pathology Request</>}
                  {activeTab === 'radiology-request' && <><LayoutDashboard className="w-4 h-4 text-primary-600" /> Radiology Request</>}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white/10 transition-all cursor-pointer"
                  aria-label="Close side panel"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {activeTab === 'booking' && (
                <div
                  className="flex-1 overflow-y-auto p-5 space-y-3"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}
                >
                  <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Primary concern</p>
                    <p className="mt-1 text-[15px] font-semibold leading-6 text-slate-900">
                      {String(summary?.patientReason || '').trim() || 'Not provided'}
                    </p>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Clinical context</p>
                    <div className="mt-2.5 space-y-2.5 text-sm">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Allergies</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{String(summary?.allergies || '').trim() || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Medical conditions</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">
                          {summary?.noMedicalCondition
                            ? 'No medical condition selected'
                            : medicalConditions.length > 0
                              ? medicalConditions.join(', ')
                              : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Supporting files</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">
                          {attachedFileNames.length > 0 ? attachedFileNames.join(', ') : 'No files uploaded'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Requested pathology tests</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">
                          {requestedPathologyTests.length > 0 ? requestedPathologyTests.join(', ') : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Requested radiology tests</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">
                          {requestedRadiologyTests.length > 0 ? requestedRadiologyTests.join(', ') : 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Consultation history</p>
                    <div className="mt-2.5 space-y-2.5 text-sm">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Seen any doctor/clinic in last 12 months?</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{String(summary?.recentConsultationResponse || '').trim() || 'Not answered'}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Currently seeing GP or on medication?</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{String(summary?.gpMedicationHistory || '').trim() || 'Not answered'}</p>
                      </div>
                    </div>
                  </section>

                  {hasQuestionnaireResponses ? (
                    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Questionnaire responses</p>
                      <div className="mt-2.5 space-y-2.5 text-sm">
                        {questionnaireRows.map((row) => (
                          <div key={row.label}>
                            <p className="text-[12px] font-semibold text-slate-500">{row.label}</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">
                              {String(row.value || '').trim() || 'Not answered'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">GP / medication details</p>
                    {hasGpMedicationHistory ? (
                      <div className="mt-2.5 border-l-2 border-slate-300 pl-3 space-y-2.5 text-sm">
                        <div>
                          <p className="text-[12px] font-semibold text-slate-500">Current GP Name</p>
                          <p className="text-[14px] font-medium leading-5 text-slate-900">{String(summary?.currentGpName || '').trim() || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold text-slate-500">Current GP Email</p>
                          <p className="text-[14px] font-medium leading-5 text-slate-900">{String(summary?.currentGpEmail || '').trim() || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold text-slate-500">Medicine Name</p>
                          <p className="text-[14px] font-medium leading-5 text-slate-900">{String(summary?.medicineName || '').trim() || 'Not provided'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-[14px] font-medium text-slate-600">No GP/medication sub-details provided.</p>
                    )}
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Patient identity</p>
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 text-sm">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Patient Name</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{patientName}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Patient Email</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{patientEmail || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">User Type</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{appointment?.familyMember ? 'Family Member' : 'Self'}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Address</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{patientAddress || 'Not provided'}</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Appointment details</p>
                    <div className="mt-2.5 border-l-2 border-slate-300 pl-3 space-y-2.5 text-sm">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Reason for request</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{String(summary?.patientReason || '').trim() || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Service Name</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{String(summary?.serviceName || '').trim() || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Service Type</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{String(summary?.serviceType || appointment?.type || '').trim() || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Consultation Mode</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{consultationModeLabel}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Queue Type</p>
                          <p className="text-[14px] font-medium leading-5 text-slate-900">{queueTypeLabel}</p>
                        </div>
                      </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Health identifiers</p>
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 text-sm">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Medicare Card Number</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{String(patientProfile?.medicareCardNumber || '').trim() || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Medicare IRN</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{String(patientProfile?.medicareIrn || '').trim() || 'Not provided'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[12px] font-semibold text-slate-500">Health Identifier Type</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{String(patientProfile?.healthIdentifierType || '').trim() || 'Not provided'}</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ CHAT TAB ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Encrypted badge */}
                  <div className="shrink-0 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest"
                    style={{ background: 'rgba(5,150,105,0.08)', borderBottom: '1px solid rgba(5,150,105,0.15)', color: '#34d399' }}>
                    <Shield className="w-3 h-3" /> End-to-End Encrypted
                  </div>

                  {/* Messages */}
                  <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto px-4 py-5 space-y-4"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}
                  >
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40 py-12">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.03)' }}>
                          <MessageSquare className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-slate-500 font-bold text-sm">No messages yet</p>
                        <p className="text-slate-600 text-xs font-medium">Start the conversation</p>
                      </div>
                    )}
                    <AnimatePresence>
                      {messages.map((msg, idx) => {
                        const isMe = msg.senderId === user.id;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                          >
                            {/* Avatar dot */}
                            <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden mt-1">
                              <img
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${msg.senderName}&backgroundColor=${isMe ? '0e7490' : '475569'}`}
                                alt={msg.senderName}
                                className="w-full h-full"
                              />
                            </div>
                            <div className={`flex flex-col gap-1 max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] font-bold px-1 uppercase tracking-wider" style={{ color: isMe ? '#0e7490' : '#94a3b8' }}>
                                {isMe ? 'You' : msg.senderName}
                              </span>
                              <div
                                className="text-sm leading-relaxed px-3.5 py-2.5 break-words"
                                style={{
                                  borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                  background: isMe
                                    ? 'linear-gradient(135deg, #0e7490 0%, #059669 100%)'
                                    : 'rgba(0,0,0,0.08)',
                                  color: isMe ? 'white' : '#334155',
                                  border: isMe ? 'none' : '1px solid rgba(0,0,0,0.08)'
                                }}
                              >
                                {msg.text}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Input bar */}
                  <form
                    onSubmit={handleSendMessage}
                    className="shrink-0 flex items-center gap-2 p-3"
                    style={{ borderTop: '1px solid rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.01)' }}
                  >
                    <input
                      type="text"
                      aria-label="Type a chat message"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 text-sm font-medium px-4 py-3 rounded-2xl outline-none text-slate-900 placeholder-slate-600 transition-all"
                      style={{
                        background: 'rgba(0,0,0,0.05)',
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-900 disabled:opacity-30 transition-all cursor-pointer hover:scale-105 shrink-0"
                      style={{ background: 'linear-gradient(135deg,#0e7490,#059669)' }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ AI TRIAGE TAB ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
              {activeTab === 'triage' && isDoctor && (
                <div
                  className="flex-1 overflow-y-auto p-5 space-y-4"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}
                >
                  {!appointment?.aiSummary ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50 py-16">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.03)' }}>
                        <Activity className="w-8 h-8 text-slate-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-slate-600 font-bold text-sm mb-1">No Triage Data</p>
                        <p className="text-slate-600 text-xs font-medium">AI triage not yet completed</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* AI Summary card */}
                      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(14,116,144,0.3)' }}>
                        <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'rgba(14,116,144,0.2)' }}>
                          <Activity className="w-4 h-4 text-primary-600" />
                          <span className="text-[11px] font-black text-primary-300 uppercase tracking-widest">AI Clinical Summary</span>
                          {appointment.aiSummary?.urgency && (
                            <span className="ml-auto text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                              style={{
                                background: appointment.aiSummary.urgency === 'high' ? 'rgba(234,67,53,0.3)' : 'rgba(245,158,11,0.2)',
                                color: appointment.aiSummary.urgency === 'high' ? '#f87171' : '#fbbf24',
                                border: `1px solid ${appointment.aiSummary.urgency === 'high' ? 'rgba(234,67,53,0.4)' : 'rgba(245,158,11,0.3)'}`
                              }}>
                              {appointment.aiSummary.urgency}
                            </span>
                          )}
                        </div>
                        <div className="px-4 py-4" style={{ background: 'rgba(0,0,0,0.02)' }}>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            {appointment?.aiSummary?.summary || 'No summary provided.'}
                          </p>
                        </div>
                      </div>

                      {/* Symptoms pills if available */}
                      {Array.isArray(appointment?.aiSummary?.symptoms) && appointment.aiSummary.symptoms.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Reported Symptoms</p>
                          <div className="flex flex-wrap gap-2">
                            {appointment.aiSummary.symptoms.map((s, i) => (
                              <span key={i} className="text-xs font-bold px-3 py-1 rounded-full"
                                style={{ background: 'rgba(14,116,144,0.2)', color: '#0e7490', border: '1px solid rgba(14,116,144,0.3)' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Transcript */}
                      {Array.isArray(appointment?.aiSummary?.chatHistory) && appointment.aiSummary.chatHistory.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Patient Conversation</p>
                          <div className="space-y-2.5">
                            {appointment?.aiSummary?.chatHistory?.map((msg, i) => (
                              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                  className="max-w-[88%] text-xs leading-relaxed px-3.5 py-2.5 break-words"
                                  style={{
                                    borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                                    background: msg.role === 'user' ? 'rgba(14,116,144,0.25)' : 'rgba(0,0,0,0.03)',
                                    color: '#334155',
                                    border: msg.role === 'user' ? '1px solid rgba(14,116,144,0.3)' : '1px solid rgba(0,0,0,0.05)'
                                  }}
                                >
                                  <span className="text-[9px] font-black uppercase tracking-widest block mb-1.5 opacity-50">
                                    {msg.role === 'user' ? 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¤ Patient' : 'ÃƒÂ°Ã…Â¸Ã‚Â¤Ã¢â‚¬â€œ AI'}
                                  </span>
                                  {msg.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ AI TRIAGE mic control bar ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ sticky bottom ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
              {activeTab === 'triage' && isDoctor && (
                <div
                  className="shrink-0 flex items-center justify-between px-5 py-3 gap-3"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.05)', background: '#ffffff' }}
                >
                  <div className="flex items-center gap-2">
                    <div className={`relative w-2 h-2 rounded-full ${micMuted ? '' : 'bg-green-500'}`}>
                      {!micMuted && <span className="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-60" />}
                      {micMuted && <span className="block w-2 h-2 rounded-full bg-slate-600" />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: micMuted ? '#64748b' : '#34d399' }}>
                      {micMuted ? 'Mic muted' : 'Mic live'}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={toggleMic}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all"
                    style={
                      micMuted
                        ? { background: 'rgba(234,67,53,0.18)', color: '#f87171', border: '1px solid rgba(234,67,53,0.35)' }
                        : { background: 'rgba(5,150,105,0.18)', color: '#34d399', border: '1px solid rgba(5,150,105,0.35)' }
                    }
                  >
                    {micMuted
                      ? <><MicOff className="w-4 h-4" /> Unmute</>
                      : <><Mic className="w-4 h-4" /> Mute</>
                    }
                  </motion.button>
                </div>
              )}

              {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ PRESCRIPTION / NOTES TAB ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
              {activeTab === 'prescription' && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}>
                  {isDoctor ? (
                    <div className="flex h-full flex-col gap-5">
                      {prescription.length > 0 ? (
                        <section className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-black text-slate-900">Added Medicines</h4>
                            <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-primary-50 px-2 py-1 text-[11px] font-bold text-primary-700">
                              {prescription.length}
                            </span>
                          </div>
                          <div className="mt-3 max-h-[38vh] overflow-y-auto pr-1 space-y-2.5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}>
                            {prescription.map((med, i) => (
                              <motion.div
                                key={`${med?.drugName || med?.name || 'medicine'}-${i}`}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-bold leading-tight text-slate-900 truncate">
                                    {med?.drugName || med?.name || 'Medicine'}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    {(med?.dosage || med?.dose) && (
                                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                        {med?.dosage || `${med?.dose || ''}${med?.doseUnit ? ` ${med.doseUnit}` : ''}`.trim()}
                                      </span>
                                    )}
                                    {med?.frequency && <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">{med.frequency}</span>}
                                    {(med?.duration || med?.durationValue) && (
                                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                        {med?.duration || `${med?.durationValue || ''}${med?.durationUnit ? ` ${med.durationUnit}` : ''}`.trim()}
                                      </span>
                                    )}
                                    {med?.route && <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">{med.route}</span>}
                                    {String(med?.repeats || '').trim() && (
                                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                        Repeats: {med.repeats}
                                      </span>
                                    )}
                                  </div>
                                  {String(med?.directions || '').trim() ? (
                                    <p className="mt-2 text-[11px] font-medium text-slate-600 break-words">Directions: {med.directions}</p>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setPrescription((current) => current.filter((_, j) => j !== i))}
                                  className="mt-0.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 transition-colors hover:bg-rose-50"
                                  aria-label="Remove medicine"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        </section>
                      ) : null}

                      <section className="shrink-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">1. Prescription Setup</p>
                          <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Prescription Mode</span>
                              <div className="grid grid-cols-1 gap-2">
                                <label className={PRESCRIPTION_FORM_CHECKBOX_LABEL_CLASS}>
                                  <input
                                    type="radio"
                                    name="prescription-issue-type"
                                    checked={prescriptionDraft.issueType === 'EPRESCRIPTION'}
                                    onChange={() => updatePrescriptionDraftField('issueType', 'EPRESCRIPTION')}
                                  />
                                  ePrescription
                                </label>
                                <label className={PRESCRIPTION_FORM_CHECKBOX_LABEL_CLASS}>
                                  <input
                                    type="radio"
                                    name="prescription-issue-type"
                                    checked={prescriptionDraft.issueType === 'PAPER'}
                                    onChange={() => updatePrescriptionDraftField('issueType', 'PAPER')}
                                  />
                                  Paper Prescription
                                </label>
                              </div>
                            </div>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Prescriber Type</span>
                              <select
                                value={prescriptionDraft.prescriberType}
                                onChange={(e) => updatePrescriptionDraftField('prescriberType', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              >
                                {PRESCRIBER_TYPE_OPTIONS.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">2. Patient & Authority</p>
                          <div className="grid grid-cols-1 gap-3">
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Patient Medicare Number</span>
                              <input
                                type="text"
                                value={prescriptionDraft.medicareNumber}
                                onChange={(e) => updatePrescriptionDraftField('medicareNumber', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Medicare IRN</span>
                              <input
                                type="text"
                                value={prescriptionDraft.medicareIrn}
                                onChange={(e) => updatePrescriptionDraftField('medicareIrn', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Authority Number</span>
                              <input
                                type="text"
                                value={prescriptionDraft.authorityNumber}
                                onChange={(e) => updatePrescriptionDraftField('authorityNumber', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">3. Prescriber Identifiers</p>
                          <div className="grid grid-cols-1 gap-3">
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>HPI-O Number</span>
                              <input
                                type="text"
                                value={prescriptionDraft.prescriberHpioNumber}
                                onChange={(e) => updatePrescriptionDraftField('prescriberHpioNumber', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>HPI-I Number</span>
                              <input
                                type="text"
                                value={prescriptionDraft.prescriberHpiiNumber}
                                onChange={(e) => updatePrescriptionDraftField('prescriberHpiiNumber', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>AHPRA Number</span>
                              <input
                                type="text"
                                value={prescriptionDraft.ahpraNumber}
                                onChange={(e) => updatePrescriptionDraftField('ahpraNumber', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Prescriber Number</span>
                              <input
                                type="text"
                                value={prescriptionDraft.prescriberNumber}
                                onChange={(e) => updatePrescriptionDraftField('prescriberNumber', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Prescription Entity ID</span>
                              <input
                                type="text"
                                value={prescriptionDraft.prescriptionEntityId}
                                onChange={(e) => updatePrescriptionDraftField('prescriptionEntityId', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">4. Medicine Details</p>
                          <div className="grid grid-cols-1 gap-3">
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Diagnosis / Clinical indication</span>
                              <input
                                type="text"
                                value={prescriptionDraft.diagnosis}
                                onChange={(e) => updatePrescriptionDraftField('diagnosis', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Drug Name *</span>
                              <input
                                type="text"
                                value={prescriptionDraft.drugName}
                                onChange={(e) => updatePrescriptionDraftField('drugName', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Pack Name</span>
                              <input
                                type="text"
                                value={prescriptionDraft.packName}
                                onChange={(e) => updatePrescriptionDraftField('packName', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Prescribed Qty</span>
                              <input
                                type="text"
                                value={prescriptionDraft.prescribedQuantity}
                                onChange={(e) => updatePrescriptionDraftField('prescribedQuantity', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Pack Qty</span>
                              <input
                                type="text"
                                value={prescriptionDraft.packQuantity}
                                onChange={(e) => updatePrescriptionDraftField('packQuantity', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">5. Dose & Schedule</p>
                          <div className="grid grid-cols-1 gap-3">
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Dose</span>
                              <input
                                type="text"
                                value={prescriptionDraft.dose}
                                onChange={(e) => updatePrescriptionDraftField('dose', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Dose Unit</span>
                              <select
                                value={prescriptionDraft.doseUnit}
                                onChange={(e) => updatePrescriptionDraftField('doseUnit', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              >
                                {PRESCRIPTION_DOSE_UNITS.map((unit) => (
                                  <option key={unit} value={unit}>{unit}</option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Duration</span>
                              <input
                                type="text"
                                value={prescriptionDraft.durationValue}
                                onChange={(e) => updatePrescriptionDraftField('durationValue', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Duration Unit</span>
                              <select
                                value={prescriptionDraft.durationUnit}
                                onChange={(e) => updatePrescriptionDraftField('durationUnit', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              >
                                {PRESCRIPTION_DURATION_UNITS.map((unit) => (
                                  <option key={unit} value={unit}>{unit}</option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Frequency</span>
                              <input
                                type="text"
                                value={prescriptionDraft.frequency}
                                onChange={(e) => updatePrescriptionDraftField('frequency', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Route</span>
                              <select
                                value={prescriptionDraft.route}
                                onChange={(e) => updatePrescriptionDraftField('route', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              >
                                {PRESCRIPTION_ROUTE_OPTIONS.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Preferred Pharmacy</span>
                              <input
                                type="text"
                                value={prescriptionDraft.preferredPharmacy}
                                onChange={(e) => updatePrescriptionDraftField('preferredPharmacy', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Repeats</span>
                              <input
                                type="number"
                                min="0"
                                value={prescriptionDraft.repeats}
                                onChange={(e) => updatePrescriptionDraftField('repeats', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Min Repeat Interval (days)</span>
                              <input
                                type="number"
                                min="0"
                                value={prescriptionDraft.minimumRepeatIntervalDays}
                                onChange={(e) => updatePrescriptionDraftField('minimumRepeatIntervalDays', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Expiry Date</span>
                              <input
                                type="date"
                                value={prescriptionDraft.expiryDate}
                                onChange={(e) => updatePrescriptionDraftField('expiryDate', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                          </div>

                          <label className="space-y-1 block">
                            <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Directions</span>
                            <textarea
                              rows={2}
                              value={prescriptionDraft.directions}
                              onChange={(e) => updatePrescriptionDraftField('directions', e.target.value)}
                              className={PRESCRIPTION_FORM_TEXTAREA_CLASS}
                            />
                          </label>

                          <div className="grid grid-cols-1 gap-3">
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Prescription Reason</span>
                              <input
                                type="text"
                                value={prescriptionDraft.reasonForPrescription}
                                onChange={(e) => updatePrescriptionDraftField('reasonForPrescription', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Authority Reason</span>
                              <input
                                type="text"
                                value={prescriptionDraft.reasonForAuthority}
                                onChange={(e) => updatePrescriptionDraftField('reasonForAuthority', e.target.value)}
                                className={PRESCRIPTION_FORM_CONTROL_CLASS}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">6. Notes & Delivery</p>
                          <div className="grid grid-cols-1 gap-3">
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Clinical Notes</span>
                              <textarea
                                rows={2}
                                value={prescriptionDraft.notes}
                                onChange={(e) => updatePrescriptionDraftField('notes', e.target.value)}
                                className={PRESCRIPTION_FORM_TEXTAREA_CLASS}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className={PRESCRIPTION_FORM_LABEL_CLASS}>Annotations</span>
                              <textarea
                                rows={2}
                                value={prescriptionDraft.annotations}
                                onChange={(e) => updatePrescriptionDraftField('annotations', e.target.value)}
                                className={PRESCRIPTION_FORM_TEXTAREA_CLASS}
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-xs font-semibold text-slate-700">
                            <label className={PRESCRIPTION_FORM_CHECKBOX_LABEL_CLASS}>
                              <input
                                type="checkbox"
                                checked={prescriptionDraft.noBrandSubstitution}
                                onChange={(e) => togglePrescriptionDraftCheckbox('noBrandSubstitution', e.target.checked)}
                              />
                              No brand substitution
                            </label>
                            <label className={PRESCRIPTION_FORM_CHECKBOX_LABEL_CLASS}>
                              <input
                                type="checkbox"
                                checked={prescriptionDraft.includeBrandName}
                                onChange={(e) => togglePrescriptionDraftCheckbox('includeBrandName', e.target.checked)}
                              />
                              Include brand name
                            </label>
                            <label className={PRESCRIPTION_FORM_CHECKBOX_LABEL_CLASS}>
                              <input
                                type="checkbox"
                                checked={prescriptionDraft.emergencySupply}
                                onChange={(e) => togglePrescriptionDraftCheckbox('emergencySupply', e.target.checked)}
                              />
                              Emergency supply
                            </label>
                            <label className={PRESCRIPTION_FORM_CHECKBOX_LABEL_CLASS}>
                              <input
                                type="checkbox"
                                checked={prescriptionDraft.activeScript}
                                onChange={(e) => togglePrescriptionDraftCheckbox('activeScript', e.target.checked)}
                              />
                              Active script
                            </label>
                            <label className={PRESCRIPTION_FORM_CHECKBOX_LABEL_CLASS}>
                              <input
                                type="checkbox"
                                checked={prescriptionDraft.sendToEmail}
                                onChange={(e) => togglePrescriptionDraftCheckbox('sendToEmail', e.target.checked)}
                              />
                              Send by email
                            </label>
                            <label className={PRESCRIPTION_FORM_CHECKBOX_LABEL_CLASS}>
                              <input
                                type="checkbox"
                                checked={prescriptionDraft.sendToSms}
                                onChange={(e) => togglePrescriptionDraftCheckbox('sendToSms', e.target.checked)}
                              />
                              Send by mobile
                            </label>
                            <label className={PRESCRIPTION_FORM_CHECKBOX_LABEL_CLASS}>
                              <input
                                type="checkbox"
                                checked={prescriptionDraft.printCopy}
                                onChange={(e) => togglePrescriptionDraftCheckbox('printCopy', e.target.checked)}
                              />
                              Print copy
                            </label>
                            <label className={PRESCRIPTION_FORM_CHECKBOX_LABEL_CLASS}>
                              <input
                                type="checkbox"
                                checked={prescriptionDraft.reminderEnabled}
                                onChange={(e) => togglePrescriptionDraftCheckbox('reminderEnabled', e.target.checked)}
                              />
                              Enable reminder
                            </label>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={addMedicine}
                            disabled={!String(prescriptionDraft.drugName || '').trim()}
                            className="shrink-0 rounded-xl bg-primary-700 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Add
                          </button>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500">
                          Prescription is submitted with notes when the consultation is completed.
                        </p>
                      </section>
                    </div>
                  ) : (
                    <section className="rounded-2xl border border-primary-100 bg-white p-4 space-y-3">
                      <h4 className="text-sm font-black text-primary-800">Prescription</h4>
                      {patientVisiblePrescription.length === 0 ? (
                        <p className="text-sm font-medium text-slate-600">No prescription available yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {patientVisiblePrescription.map((med, idx) => (
                            <div key={`${med?.drugName || med?.name || 'med'}-${idx}`} className="rounded-xl border border-primary-100 bg-primary-50/60 p-3">
                              <p className="text-sm font-bold text-slate-900">{med?.drugName || med?.name || 'Medicine'}</p>
                              <p className="text-xs text-slate-600 mt-1">
                                {[
                                  med?.dosage || `${med?.dose || ''}${med?.doseUnit ? ` ${med.doseUnit}` : ''}`.trim(),
                                  med?.frequency,
                                  med?.duration || `${med?.durationValue || ''}${med?.durationUnit ? ` ${med.durationUnit}` : ''}`.trim(),
                                  med?.route,
                                ].filter(Boolean).join(' - ') || 'Details not provided'}
                              </p>
                              {String(med?.directions || '').trim() ? (
                                <p className="text-xs text-slate-700 mt-1">Directions: {med.directions}</p>
                              ) : null}
                              {String(med?.notes || '').trim() ? (
                                <p className="text-xs text-slate-600 mt-1">Notes: {med.notes}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}

              {activeTab === 'notes' && isDoctor && (
                <div
                  className="flex-1 flex flex-col overflow-y-auto"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}
                >
                  <div className="flex-1 p-5 space-y-4">
                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Patient Info :</p>
                      <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-[12px] font-semibold text-slate-500">Patient Name</p>
                          <p className="text-[14px] font-bold text-primary-700">{patientName}</p>
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold text-slate-500">DOB</p>
                          <p className="text-[14px] font-bold text-primary-700">{patientDateOfBirth || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold text-slate-500">Consultation Type</p>
                          <p className="text-[14px] font-bold text-primary-700">{callNotesConsultationType}</p>
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold text-slate-500">Service Name</p>
                          <p className="text-[14px] font-bold text-primary-700">{callNotesServiceName}</p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Observations :</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <label className="space-y-1">
                          <span className="text-xs font-semibold text-slate-700">Temperature (Â°C)</span>
                          <input
                            type="text"
                            value={callNotesForm.temperature}
                            onChange={(e) => updateCallNotesField('temperature', e.target.value)}
                            placeholder="Enter Temperature"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold text-slate-700">Blood Pressure (mmHg)</span>
                          <input
                            type="text"
                            value={callNotesForm.bloodPressure}
                            onChange={(e) => updateCallNotesField('bloodPressure', e.target.value)}
                            placeholder="Enter BP (e.g. 120/80)"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold text-slate-700">Blood Glucose / Diabetes Info</span>
                          <input
                            type="text"
                            value={callNotesForm.bloodGlucose}
                            onChange={(e) => updateCallNotesField('bloodGlucose', e.target.value)}
                            placeholder="Enter Blood Glucose"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold text-slate-700">Heart Rate (bpm)</span>
                          <input
                            type="text"
                            value={callNotesForm.heartRate}
                            onChange={(e) => updateCallNotesField('heartRate', e.target.value)}
                            placeholder="Enter Heart Rate"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold text-slate-700">Respiratory Rate (breaths/min)</span>
                          <input
                            type="text"
                            value={callNotesForm.respiratoryRate}
                            onChange={(e) => updateCallNotesField('respiratoryRate', e.target.value)}
                            placeholder="Enter Respiratory Rate"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold text-slate-700">Oxygen Saturation (SpO2)</span>
                          <input
                            type="text"
                            value={callNotesForm.oxygenSaturation}
                            onChange={(e) => updateCallNotesField('oxygenSaturation', e.target.value)}
                            placeholder="Enter SpO2 (%)"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          />
                        </label>
                        <label className="space-y-1 md:col-span-2">
                          <span className="text-xs font-semibold text-slate-700">Other Notes</span>
                          <input
                            type="text"
                            value={callNotesForm.otherNotes}
                            onChange={(e) => updateCallNotesField('otherNotes', e.target.value)}
                            placeholder="Enter Other Notes"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          />
                        </label>
                        <label className="space-y-1 md:col-span-2">
                          <span className="text-xs font-semibold text-slate-700">Clinical Assessment / Provisional Diagnosis</span>
                          <textarea
                            rows={3}
                            value={callNotesForm.clinicalAssessment}
                            onChange={(e) => updateCallNotesField('clinicalAssessment', e.target.value)}
                            placeholder="Enter assessment or diagnosis"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none resize-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          />
                        </label>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Management Plan :</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {CALL_NOTES_MANAGEMENT_OPTIONS.map((option) => (
                          <label
                            key={option.key}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(callNotesForm[option.key])}
                              onChange={(e) => toggleCallNotesField(option.key, e.target.checked)}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                      <label className="mt-3 block space-y-1">
                        <span className="text-xs font-semibold text-slate-700">Follow-up Instructions</span>
                        <textarea
                          rows={3}
                          value={callNotesForm.followUpInstructions}
                          onChange={(e) => updateCallNotesField('followUpInstructions', e.target.value)}
                          placeholder="Enter follow-up instructions"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none resize-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                      </label>
                    </section>
                  </div>

                  <div className="shrink-0 p-4" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <button
                      type="button"
                      onClick={saveCallNote}
                      disabled={savingCallNote}
                      className="w-full py-3 rounded-xl border border-primary-200 bg-primary-50 text-primary-700 font-black text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingCallNote ? 'Saving...' : 'Save Call Note'}
                    </button>
                  </div>
                </div>
              )}
              {activeTab === 'notes' && !isDoctor && (
                <div
                  className="flex-1 overflow-y-auto p-5"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}
                >
                  <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Call notes</p>
                    <p className="text-[14px] font-medium leading-6 text-slate-900 whitespace-pre-wrap">
                      {String(notes || appointment?.consultation?.notes || '').trim() || 'Call notes are not available yet.'}
                    </p>
                  </section>
                </div>
              )}

              {activePatientRequest && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}>
                  <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 className="text-sm font-black text-slate-900">{activePatientRequest.title}</h4>
                    <p className="text-xs text-slate-600">{activePatientRequest.description}</p>
                    <textarea
                      rows={4}
                      value={patientRequestNote}
                      onChange={(e) => setPatientRequestNote(e.target.value)}
                      placeholder="Add note (optional)"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => sendPatientCertificateRequest(activePatientRequest.requestLabel)}
                      className="w-full rounded-xl bg-primary-800 py-2.5 text-sm font-black text-white"
                    >
                      Send Request to Doctor
                    </button>
                  </section>
                </div>
              )}

              {activeTab === 'medical-certificate' && isDoctor && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}>
                  <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 className="text-sm font-black text-slate-900">Add Medical Certificate</h4>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1.5">Select start and end dates for certificate validity</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={medicalCertForm.startDate} onChange={(e) => setMedicalCertForm((c) => ({ ...c, startDate: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none" />
                        <input type="date" value={medicalCertForm.endDate} onChange={(e) => setMedicalCertForm((c) => ({ ...c, endDate: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none" />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={medicalCertForm.reason}
                      onChange={(e) => setMedicalCertForm((c) => ({ ...c, reason: e.target.value }))}
                      placeholder="Reason for certificate"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                    />
                    <textarea
                      value={medicalCertForm.advice}
                      onChange={(e) => setMedicalCertForm((c) => ({ ...c, advice: e.target.value }))}
                      placeholder="Any necessary instructions..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => medicalCertificateSignatureInputRef.current?.click()}
                      disabled={uploadingSignatureFor === 'medicalCertificate'}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Upload Signature
                    </button>
                    <input
                      ref={medicalCertificateSignatureInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleSignatureSelect('medicalCertificate', event)}
                      hidden
                    />
                    {signatureUploads.medicalCertificate ? (
                      <p className="text-xs font-semibold text-emerald-700">
                        Signature uploaded: {signatureUploads.medicalCertificate.name}
                      </p>
                    ) : null}
                    {signatureUploadError && uploadingSignatureFor === '' ? (
                      <p className="text-xs font-semibold text-rose-700">{signatureUploadError}</p>
                    ) : null}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                      <p className="text-lg font-black text-slate-900 mb-2">Medical Certificate</p>
                      <div className="h-px bg-slate-300 mb-3" />
                      <p><strong>{doctorDisplayName}</strong></p>
                      <p>Email: {doctorEmail || 'Not provided'}</p>
                      <p>Address: {doctorAddress || 'Not provided'}</p>
                      <p>Date: {currentDateLabel}</p>
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                        <p><strong>To Whom It May Concern:</strong></p>
                        <p>
                          This is to certify that <strong>{patientName}</strong>
                          {patientDateOfBirth ? <> , born on <strong>{patientDateOfBirth}</strong></> : null}
                          {patientEmail ? <> , with the email address <strong>{patientEmail}</strong></> : null}
                          {patientAddress ? <> , and residing at <strong>{patientAddress}</strong></> : null}, was examined by me on <strong>{currentDateLabel}</strong>.
                        </p>
                        <p>
                          The patient is unfit for work from <strong>{medicalCertForm.startDate || '[start date]'}</strong> to <strong>{medicalCertForm.endDate || '[end date]'}</strong> due to <strong>{medicalCertForm.reason || '[reason for certificate]'}</strong>.
                        </p>
                        <p>
                          I have recommended the patient to <strong>{medicalCertForm.advice || '[any necessary instructions, such as rest or medication]'}</strong>.
                        </p>
                        <p>Should you require further details, I am available to provide additional information.</p>
                        <p>Best regards,</p>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{doctorDisplayName}</p>
                          <p className="text-xs text-slate-600">{doctorSpecialization}</p>
                          <p className="text-xs text-slate-600">{doctorEmail || 'No email'}</p>
                          <p className="text-xs text-slate-600">Provider Number - {doctorProviderNumber || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">
                      Please ensure all details are accurate, patient information is complete, and the certificate is formatted correctly before submitting.
                    </p>
                    <button
                      type="button"
                      onClick={handleSaveMedicalCertificate}
                      disabled={savingGeneratedDocumentType === 'MEDICAL_CERTIFICATE' || !signatureUploads.medicalCertificate?.url}
                      className="w-full rounded-xl bg-primary-800 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingGeneratedDocumentType === 'MEDICAL_CERTIFICATE' ? 'Saving...' : 'Save & Send'}
                    </button>
                  </section>
                </div>
              )}

              {activeTab === 'specialist-referral' && isDoctor && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}>
                  <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 className="text-sm font-black text-slate-900">Add Specialist Referral Letter</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        list="specialist-referral-options"
                        placeholder={loadingReferralSpecialists ? 'Loading specialists...' : 'Search Specialist / Referred Doctor Name'}
                        value={referralForm.doctorName}
                        onChange={(e) => handleReferralSpecialistChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                      />
                      <datalist id="specialist-referral-options">
                        {referralSpecialists.map((item) => (
                          <option
                            key={item.userId}
                            value={item?.user?.name || ''}
                          >
                            {item?.practitionerType || 'Specialist'}
                          </option>
                        ))}
                      </datalist>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1.5">
                        <p><strong>Email:</strong> {referralForm.doctorEmail || 'Auto-filled after specialist selection'}</p>
                        <p><strong>Address:</strong> {referralForm.doctorAddress || 'Auto-filled after specialist selection'}</p>
                        <p><strong>Phone:</strong> {referralForm.phoneNo || 'Auto-filled after specialist selection'}</p>
                        <p><strong>Medical Condition:</strong> {referralForm.condition || 'Auto-filled from booking details'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => specialistReferralSignatureInputRef.current?.click()}
                      disabled={uploadingSignatureFor === 'specialistReferral'}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Upload Signature
                    </button>
                    <input
                      ref={specialistReferralSignatureInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleSignatureSelect('specialistReferral', event)}
                      hidden
                    />
                    {signatureUploads.specialistReferral ? (
                      <p className="text-xs font-semibold text-emerald-700">
                        Signature uploaded: {signatureUploads.specialistReferral.name}
                      </p>
                    ) : null}
                    {signatureUploadError && uploadingSignatureFor === '' ? (
                      <p className="text-xs font-semibold text-rose-700">{signatureUploadError}</p>
                    ) : null}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                      <p className="text-lg font-black text-slate-900 mb-2">Specialist Referral Letter</p>
                      <div className="h-px bg-slate-300 mb-3" />
                      <p>To,</p>
                      <p><strong>{referralForm.doctorName || '[Referred Doctor Name]'}</strong></p>
                      <p>{referralForm.doctorEmail || '[Referred Doctor Email]'}</p>
                      <p>{referralForm.doctorAddress || '[Referred Doctor Address]'}</p>
                      <p>{referralForm.phoneNo || '[Phone No]'}</p>
                      <p className="mt-3">Date: {currentDateLabel}</p>
                      <p className="mt-2"><strong>Subject: Referral of {patientName}</strong></p>
                      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                        <p>
                          I am referring <strong>{patientName}</strong>
                          {patientDateOfBirth ? <> , born on <strong>{patientDateOfBirth}</strong></> : null}
                          {patientAddress ? <> , residing at <strong>{patientAddress}</strong></> : null}, for specialized medical care.
                        </p>
                        <p>
                          The patient requires evaluation and treatment for <strong>{referralForm.condition || '[medical condition]'}</strong>. Please undertake the necessary assessment and treatment.
                        </p>
                        <p>Please contact me for any further information.</p>
                        <p className="text-right text-[12px] font-semibold text-slate-700">
                          Valid: {currentDateLabel} to {referralValidUntilLabel}
                        </p>
                        <p>Sincerely,</p>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{doctorDisplayName}</p>
                          <p className="text-xs text-slate-600">{doctorSpecialization}</p>
                          <p className="text-xs text-slate-600">{doctorEmail || 'No email'}</p>
                          <p className="text-xs text-slate-600">Provider Number - {doctorProviderNumber || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">
                      Please ensure all details are accurate, patient information is complete, and the referral letter is formatted correctly before submitting.
                    </p>
                    <button
                      type="button"
                      onClick={handleSaveSpecialistReferral}
                      disabled={savingGeneratedDocumentType === 'SPECIALIST_REFERRAL' || !signatureUploads.specialistReferral?.url}
                      className="w-full rounded-xl bg-primary-800 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingGeneratedDocumentType === 'SPECIALIST_REFERRAL' ? 'Saving...' : 'Save & Send'}
                    </button>
                  </section>
                </div>
              )}

              {activeTab === 'medical-history' && (
                <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}>
                  <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Medical history snapshot</p>
                    <div className="mt-2.5 space-y-2.5">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Medical conditions</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">
                          {summary?.noMedicalCondition
                            ? 'No medical condition selected'
                            : medicalConditions.length > 0
                              ? medicalConditions.join(', ')
                              : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Allergies</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{String(summary?.allergies || '').trim() || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Recent consultation response</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{String(summary?.recentConsultationResponse || '').trim() || 'Not answered'}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">GP / medication history</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">{String(summary?.gpMedicationHistory || '').trim() || 'Not answered'}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Requested pathology tests</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">
                          {requestedPathologyTests.length > 0 ? requestedPathologyTests.join(', ') : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">Requested radiology tests</p>
                        <p className="text-[14px] font-medium leading-5 text-slate-900">
                          {requestedRadiologyTests.length > 0 ? requestedRadiologyTests.join(', ') : 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </section>

                  {hasQuestionnaireResponses ? (
                    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Questionnaire responses</p>
                      <div className="mt-2.5 space-y-2.5">
                        {questionnaireRows.map((row) => (
                          <div key={`history-${row.label}`}>
                            <p className="text-[12px] font-semibold text-slate-500">{row.label}</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">
                              {String(row.value || '').trim() || 'Not answered'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              )}

              {activeTab === 'pathology-request' && isDoctor && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}>
                  <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-black text-slate-900">Pathology Request</h4>
                      <button type="button" onClick={addPathologyTest} className="rounded-lg bg-primary-800 px-3 py-1.5 text-xs font-black text-white">Add New Test</button>
                    </div>
                    <p className="text-xs text-slate-600">Please select the test that needs to be performed in pathology lab. (Optional)</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PATHOLOGY_TEST_OPTIONS.map((testOption) => {
                        const checked = pathologyTests.includes(testOption);
                        return (
                          <label
                            key={testOption}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                              checked
                                ? 'border-primary-300 bg-primary-50 text-primary-800'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => togglePathologyTest(testOption, event.target.checked)}
                            />
                            <span>{testOption}</span>
                          </label>
                        );
                      })}
                    </div>
                    <input type="text" value={pathologyTestInput} onChange={(e) => setPathologyTestInput(e.target.value)} placeholder="Add custom pathology test" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none" />
                    {pathologyTests.length === 0 && (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        Please select at least one pathology service from the options above to create a letter.
                      </div>
                    )}
                    {pathologyTests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {pathologyTests.map((test, idx) => (
                          <span key={`${test}-${idx}`} className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                            {test}
                            <button type="button" onClick={() => setPathologyTests((current) => current.filter((_, i) => i !== idx))} className="text-red-600">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => pathologySignatureInputRef.current?.click()}
                      disabled={uploadingSignatureFor === 'pathologyRequest'}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Upload Signature
                    </button>
                    <input
                      ref={pathologySignatureInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleSignatureSelect('pathologyRequest', event)}
                      hidden
                    />
                    {signatureUploads.pathologyRequest ? (
                      <p className="text-xs font-semibold text-emerald-700">
                        Signature uploaded: {signatureUploads.pathologyRequest.name}
                      </p>
                    ) : null}
                    {signatureUploadError && uploadingSignatureFor === '' ? (
                      <p className="text-xs font-semibold text-rose-700">{signatureUploadError}</p>
                    ) : null}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                      <p className="text-lg font-black text-slate-900 mb-2">Pathology Test Request</p>
                      <div className="h-px bg-slate-300 mb-3" />

                      <section className="rounded-lg border border-slate-300 bg-white p-3">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">Doctor information</p>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                          <p><strong>Name:</strong> {doctorDisplayName}</p>
                          <p><strong>Date:</strong> {currentDateLabel}</p>
                          <p><strong>Qualification:</strong> {doctorQualification}</p>
                          <p><strong>Contact:</strong> {doctorContact || 'Not provided'}</p>
                          <p><strong>Specialization:</strong> {doctorSpecialization}</p>
                          <p><strong>Address:</strong> {doctorAddress || 'Not provided'}</p>
                        </div>
                      </section>

                      <p className="mt-3"><strong>To Pathology Center</strong></p>
                      <p className="mt-2">
                        I am referring the following patient for diagnostic evaluation through the specified pathology tests.
                        Kindly conduct the requested investigations and share the results at your earliest convenience.
                      </p>

                      <section className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">Patient information</p>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                          <p><strong>Name:</strong> {patientName}</p>
                          <p><strong>Gender:</strong> {patientGender || 'Not provided'}</p>
                          <p><strong>Date of Birth:</strong> {patientDateOfBirth || 'Not provided'}</p>
                          <p><strong>Contact:</strong> {patientContact || 'Not provided'}</p>
                          <p className="col-span-2"><strong>Address:</strong> {patientAddress || 'Not provided'}</p>
                        </div>
                      </section>

                      <section className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">Patient medical information</p>
                        <div className="mt-2 space-y-1 text-[12px]">
                          <p><strong>Allergies:</strong> {String(summary?.allergies || '').trim() || '[Allergies]'}</p>
                          <p><strong>Medical Condition:</strong> {summary?.noMedicalCondition ? 'No medical condition selected' : (medicalConditions.length > 0 ? medicalConditions.join(', ') : '[Medical Condition]')}</p>
                        </div>
                      </section>

                      <section className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">Requested tests</p>
                        <div className="mt-2 space-y-1 text-[12px]">
                          <p><strong>Tests:</strong> {pathologyTests.length > 0 ? pathologyTests.join(', ') : '[No tests added]'}</p>
                          <p><strong>Additional Instructions:</strong> Please ensure fasting before tests where necessary.</p>
                        </div>
                      </section>

                      <p className="mt-3">Thank you for your cooperation.</p>
                      <div className="mt-4 flex justify-end">
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{doctorDisplayName}</p>
                          <p className="text-xs text-slate-600">{doctorSpecialization}</p>
                          <p className="text-xs text-slate-600">Provider Number - {doctorProviderNumber || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">
                      Please ensure all details are accurate, patient information is complete, and the pathology letter is formatted correctly before submitting.
                    </p>
                    <button
                      type="button"
                      onClick={handleSavePathologyLetter}
                      disabled={savingGeneratedDocumentType === 'PATHOLOGY_LETTER' || !signatureUploads.pathologyRequest?.url}
                      className="w-full rounded-xl bg-primary-800 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingGeneratedDocumentType === 'PATHOLOGY_LETTER' ? 'Saving...' : 'Save & Send'}
                    </button>
                  </section>
                </div>
              )}

              {activeTab === 'radiology-request' && isDoctor && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}>
                  <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-black text-slate-900">Radiology Request</h4>
                      <button type="button" onClick={addRadiologyTest} className="rounded-lg bg-primary-800 px-3 py-1.5 text-xs font-black text-white">Add New Test</button>
                    </div>
                    <p className="text-xs text-slate-600">Please select the test from the dropdown that needs to be performed in pathology lab. (Optional)</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {RADIOLOGY_TEST_OPTIONS.map((testOption) => {
                        const checked = radiologyTests.includes(testOption);
                        return (
                          <label
                            key={testOption}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                              checked
                                ? 'border-primary-300 bg-primary-50 text-primary-800'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => toggleRadiologyTest(testOption, event.target.checked)}
                            />
                            <span>{testOption}</span>
                          </label>
                        );
                      })}
                    </div>
                    <input type="text" value={radiologyTestInput} onChange={(e) => setRadiologyTestInput(e.target.value)} placeholder="Add custom radiology test" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none" />
                    {radiologyTests.length === 0 && (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        Please select at least one radiology service from the options above to create a letter.
                      </div>
                    )}
                    {radiologyTests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {radiologyTests.map((test, idx) => (
                          <span key={`${test}-${idx}`} className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                            {test}
                            <button type="button" onClick={() => setRadiologyTests((current) => current.filter((_, i) => i !== idx))} className="text-red-600">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => radiologySignatureInputRef.current?.click()}
                      disabled={uploadingSignatureFor === 'radiologyRequest'}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Upload Signature
                    </button>
                    <input
                      ref={radiologySignatureInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleSignatureSelect('radiologyRequest', event)}
                      hidden
                    />
                    {signatureUploads.radiologyRequest ? (
                      <p className="text-xs font-semibold text-emerald-700">
                        Signature uploaded: {signatureUploads.radiologyRequest.name}
                      </p>
                    ) : null}
                    {signatureUploadError && uploadingSignatureFor === '' ? (
                      <p className="text-xs font-semibold text-rose-700">{signatureUploadError}</p>
                    ) : null}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                      <p className="text-lg font-black text-slate-900 mb-2">Radiology Test Request</p>
                      <div className="h-px bg-slate-300 mb-3" />

                      <section className="rounded-lg border border-slate-300 bg-white p-3">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">Doctor information</p>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                          <p><strong>Name:</strong> {doctorDisplayName}</p>
                          <p><strong>Date:</strong> {currentDateLabel}</p>
                          <p><strong>Qualification:</strong> {doctorQualification}</p>
                          <p><strong>Contact:</strong> {doctorContact || 'Not provided'}</p>
                          <p><strong>Specialization:</strong> {doctorSpecialization}</p>
                          <p><strong>Address:</strong> {doctorAddress || 'Not provided'}</p>
                        </div>
                      </section>

                      <p className="mt-3"><strong>To Radiology Center</strong></p>
                      <p className="mt-2">
                        I am referring the following patient for diagnostic evaluation through the specified radiology tests.
                        Kindly conduct the requested investigations and share the results at your earliest convenience.
                      </p>

                      <section className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">Patient information</p>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                          <p><strong>Name:</strong> {patientName}</p>
                          <p><strong>Gender:</strong> {patientGender || 'Not provided'}</p>
                          <p><strong>Date of Birth:</strong> {patientDateOfBirth || 'Not provided'}</p>
                          <p><strong>Contact:</strong> {patientContact || 'Not provided'}</p>
                          <p className="col-span-2"><strong>Address:</strong> {patientAddress || 'Not provided'}</p>
                        </div>
                      </section>

                      <section className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">Patient medical information</p>
                        <div className="mt-2 space-y-1 text-[12px]">
                          <p><strong>Allergies:</strong> {String(summary?.allergies || '').trim() || '[Allergies]'}</p>
                          <p><strong>Medical Condition:</strong> {summary?.noMedicalCondition ? 'No medical condition selected' : (medicalConditions.length > 0 ? medicalConditions.join(', ') : '[Medical Condition]')}</p>
                        </div>
                      </section>

                      <section className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">Requested tests</p>
                        <div className="mt-2 space-y-1 text-[12px]">
                          <p><strong>Tests:</strong> {radiologyTests.length > 0 ? radiologyTests.join(', ') : '[No tests added]'}</p>
                          <p><strong>Additional Instructions:</strong> Please mention clinical notes if any special protocol is required.</p>
                        </div>
                      </section>

                      <p className="mt-3">Thank you for your cooperation.</p>
                      <div className="mt-4 flex justify-end">
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{doctorDisplayName}</p>
                          <p className="text-xs text-slate-600">{doctorSpecialization}</p>
                          <p className="text-xs text-slate-600">Provider Number - {doctorProviderNumber || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">
                      Please ensure all details are accurate, patient information is complete, and the radiology letter is formatted correctly before submitting.
                    </p>
                    <button
                      type="button"
                      onClick={handleSaveRadiologyLetter}
                      disabled={savingGeneratedDocumentType === 'RADIOLOGY_LETTER' || !signatureUploads.radiologyRequest?.url}
                      className="w-full rounded-xl bg-primary-800 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingGeneratedDocumentType === 'RADIOLOGY_LETTER' ? 'Saving...' : 'Save & Send'}
                    </button>
                  </section>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Sub-components ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */

/* Small round button INSIDE the video overlay */
function VideoOverlayBtn({ icon, label, onClick, danger }) {
  return (
    <button type="button"
      onClick={onClick}
      title={label}
      className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105"
      style={{
        background: danger ? 'rgba(234,67,53,0.1)' : '#f1f5f9',
        border: danger ? '1px solid rgba(234,67,53,0.3)' : '1px solid #e2e8f0',
        color: danger ? '#ef4444' : '#475569'
      }}
    >
      {icon}
    </button>
  );
}

/* Tab button in the bottom row below the video */
function TabBtn({ icon, label, active, onClick, badge, accent }) {
  return (
    <button type="button"
      onClick={onClick}
      className="relative min-w-[150px] sm:min-w-[165px] flex flex-col items-center justify-center gap-2 px-3 py-3.5 shrink-0 cursor-pointer transition-all group"
      style={{
        border: active ? '1px solid rgba(14,116,144,0.35)' : '1px solid rgba(100,116,139,0.18)',
        background: active ? 'rgba(14,116,144,0.06)' : '#ffffff',
        borderBottom: active ? '2px solid #0e7490' : '2px solid rgba(100,116,139,0.12)',
        color: active ? '#0e7490' : accent ? '#059669' : '#64748b'
      }}
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform"
        style={{ background: active ? 'rgba(14,116,144,0.1)' : 'rgba(100,116,139,0.08)' }}
      >
        {icon}
      </span>
      <span className="text-[12px] font-extrabold leading-[1.05rem] text-center whitespace-normal">{label}</span>
      {badge && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </div>
      )}
    </button>
  );
}








