import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, Download, FileText, MessageSquare, Stethoscope, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { formatDoctorName } from '../../utils/doctorName';
import { getPractitionerTypeLabel } from '../../utils/doctorConsultation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function resolveUrl(rawUrl) {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  const normalizedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${API_URL}${normalizedPath}`;
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

function parsePrescription(prescription) {
  if (Array.isArray(prescription)) return prescription;
  if (typeof prescription === 'string') {
    try {
      const parsed = JSON.parse(prescription);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatTime(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toTitleCase(value) {
  return String(value || 'Unknown')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getModeLabel(appointment) {
  const mode = String(appointment?.consultationMode || '').toUpperCase();
  if (mode === 'VIDEO') return 'Televideo';
  if (mode === 'AUDIO') return 'Telephone';
  if (mode === 'IN_PERSON') return 'In Person';
  return 'Televideo';
}

function getServiceLabel(summary) {
  return (
    summary?.serviceName ||
    summary?.service ||
    summary?.service_name ||
    summary?.consultation_type ||
    summary?.primary_symptom ||
    'Standard Consultation'
  );
}

function yesNo(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'YES') return 'Yes';
  if (normalized === 'NO') return 'No';
  return '-';
}

function formatCurrency(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '$0.00';
  return `$${value.toFixed(2)}`;
}

function paymentStatusLabel(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'PAID') return 'Succeeded';
  if (normalized === 'PENDING_PAYMENT') return 'Pending';
  if (normalized === 'FAILED') return 'Failed';
  return toTitleCase(status);
}

function detailValue(value) {
  const text = String(value ?? '').trim();
  return text || '-';
}

export function HistoryModal({ apt, onClose }) {
  const [activeTab, setActiveTab] = useState('booking');
  const [bookingSubTab, setBookingSubTab] = useState('health-concerns');
  const [detail, setDetail] = useState(apt);

  useEffect(() => {
    if (!apt?.id) {
      setDetail(apt);
      return;
    }

    let cancelled = false;
    setDetail(apt);

    const fetchDetail = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/appointments/${apt.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!cancelled && data?.id) setDetail(data);
      } catch (error) {
        if (!cancelled) console.error('Failed to fetch appointment detail for history drawer', error);
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [apt]);

  if (!apt) return null;

  const appointment = detail || apt;
  const summary = parseSummary(appointment.aiSummary);
  const doctorName = formatDoctorName(appointment?.doctor?.name, 'Doctor');
  const patientName = appointment?.familyMember?.name || appointment?.patient?.name || 'Patient';
  const patientEmail = appointment?.patient?.email || '-';
  const profile = appointment?.patient?.patientProfile || {};
  const serviceLabel = getServiceLabel(summary);
  const statusLabel = toTitleCase(appointment?.status);
  const modeLabel = getModeLabel(appointment);
  const bookingReference = appointment?.id ? `BK-${String(appointment.id).slice(0, 8).toUpperCase()}` : '-';
  const bookingDateTime = appointment?.scheduledFor || appointment?.createdAt;
  const questionAnswers = Array.isArray(summary?.chatHistory) ? summary.chatHistory : [];
  const attachedFiles = Array.isArray(summary?.attachedFiles) ? summary.attachedFiles : [];
  const prescriptionItems = parsePrescription(appointment?.consultation?.prescription);
  const questionnaire = summary?.prescriptionQuestionnaire && typeof summary.prescriptionQuestionnaire === 'object'
    ? summary.prescriptionQuestionnaire
    : null;
  const requestedPathologyTests = (
    Array.isArray(summary?.selectedBloodTests)
      ? summary.selectedBloodTests
      : Array.isArray(summary?.pathologyTests)
        ? summary.pathologyTests
        : []
  )
    .map((testName) => String(testName || '').trim())
    .filter(Boolean);
  const requestedRadiologyTests = (
    Array.isArray(summary?.selectedRadiologyTests)
      ? summary.selectedRadiologyTests
      : Array.isArray(summary?.radiologyTests)
        ? summary.radiologyTests
        : []
  )
    .map((testName) => String(testName || '').trim())
    .filter(Boolean);
  const prescriptionDocumentUrl = resolveUrl(appointment?.consultation?.prescriptionUrl || summary?.prescriptionUrl);
  const medicalCertificateDocumentUrl = resolveUrl(
    appointment?.consultation?.medicalCertificateUrl || summary?.medicalCertificateUrl
  );
  const specialistReferralDocumentUrl = resolveUrl(
    appointment?.consultation?.specialistReferralUrl || summary?.specialistReferralUrl
  );
  const pathologyLetterDocumentUrl = resolveUrl(
    appointment?.consultation?.pathologyLetterUrl || summary?.pathologyLetterUrl
  );
  const radiologyLetterDocumentUrl = resolveUrl(
    appointment?.consultation?.radiologyLetterUrl || summary?.radiologyLetterUrl
  );
  const documentTabs = [
    {
      key: 'prescription',
      label: 'Prescription',
      title: 'Official Prescription Document',
      url: prescriptionDocumentUrl,
      emptyMessage: 'No prescription was issued.',
      actionLabel: 'Open Document',
      buttonClass: 'bg-health-600 hover:bg-health-700',
      iframeTitle: 'Prescription Document',
    },
    {
      key: 'medical-certificate',
      label: 'Medical Certificate',
      title: 'Medical Certificate',
      url: medicalCertificateDocumentUrl,
      emptyMessage: 'No medical certificate was issued.',
      actionLabel: 'Open Document',
      buttonClass: 'bg-primary-700 hover:bg-primary-800',
      iframeTitle: 'Medical Certificate',
    },
    {
      key: 'specialist-referral',
      label: 'Specialist Referral',
      title: 'Specialist Referral Letter',
      url: specialistReferralDocumentUrl,
      emptyMessage: 'No specialist referral was issued.',
      actionLabel: 'Open Document',
      buttonClass: 'bg-primary-700 hover:bg-primary-800',
      iframeTitle: 'Specialist Referral Letter',
    },
    {
      key: 'pathology-letter',
      label: 'Pathology Letter',
      title: 'Pathology Letter',
      url: pathologyLetterDocumentUrl,
      emptyMessage: 'No pathology letter was issued.',
      actionLabel: 'Open Document',
      buttonClass: 'bg-primary-700 hover:bg-primary-800',
      iframeTitle: 'Pathology Letter',
    },
    {
      key: 'radiology-letter',
      label: 'Radiology Letter',
      title: 'Radiology Letter',
      url: radiologyLetterDocumentUrl,
      emptyMessage: 'No radiology letter was issued.',
      actionLabel: 'Open Document',
      buttonClass: 'bg-primary-700 hover:bg-primary-800',
      iframeTitle: 'Radiology Letter',
    },
  ];
  const activeDocumentTab = documentTabs.find((tab) => tab.key === activeTab) || null;

  const serviceCharges = Number(summary?.consultationFee);
  const normalizedServiceCharges = Number.isFinite(serviceCharges) && serviceCharges > 0 ? Number(serviceCharges.toFixed(2)) : 0;
  const platformChargesRaw = Number(summary?.platformFee);
  const platformCharges = Number.isFinite(platformChargesRaw) && platformChargesRaw >= 0
    ? Number(platformChargesRaw.toFixed(2))
    : Number((normalizedServiceCharges * 0.18).toFixed(2));
  const totalPaymentRaw = Number(summary?.totalAmount);
  const totalPayment = Number.isFinite(totalPaymentRaw) && totalPaymentRaw > 0
    ? Number(totalPaymentRaw.toFixed(2))
    : Number((normalizedServiceCharges + platformCharges).toFixed(2));

  const tabList = [
    { key: 'booking', label: 'Booking Details' },
    ...documentTabs.map((tab) => ({ key: tab.key, label: tab.label })),
    { key: 'call-notes', label: 'Call Notes' },
    { key: 'appointment', label: 'Appointment' },
    { key: 'medical-history', label: 'Medical History' },
  ];

  const bookingSubTabs = [
    { key: 'health-concerns', label: 'Health Concerns' },
    { key: 'questions', label: 'Questions And Answers' },
    { key: 'more-details', label: 'More Details' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1400] bg-slate-900/45 backdrop-blur-[1px]">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="ml-auto h-full w-full max-w-5xl bg-white shadow-2xl flex flex-col font-sans"
        >
          <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                aria-label="Close details"
              >
                <X className="w-4 h-4" />
              </button>
              <h2 className="font-heading text-xl sm:text-2xl leading-none font-black text-slate-900 truncate">
                Appointments Details
              </h2>
            </div>
          </div>

          <div className="px-5 py-4 border-b border-slate-200 bg-white">
            <div className="flex items-start gap-3">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${encodeURIComponent(
                  appointment?.doctor?.name || 'Doctor'
                )}&backgroundColor=f1f5f9`}
                alt={doctorName}
                className="w-14 h-14 rounded-full border border-slate-200"
              />
              <div className="min-w-0">
                <h3 className="font-heading text-xl sm:text-2xl font-black text-primary-700 truncate">{doctorName}</h3>
                <p className="text-sm text-slate-600 font-medium">
                  {getPractitionerTypeLabel(appointment?.doctor, 'Specialist')} | {modeLabel}
                </p>
                <p className="text-sm text-slate-500 font-semibold">Booking Reference ID: {bookingReference}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading text-lg font-bold text-slate-800 truncate">{serviceLabel}</p>
                <p className="text-sm text-slate-600 font-semibold">{formatDate(bookingDateTime)} | {formatTime(bookingDateTime)}</p>
              </div>
              <span className="text-sm font-black uppercase tracking-wide text-health-700">{statusLabel}</span>
            </div>
            <div className="mt-2">
              <button
                type="button"
                className="rounded-lg bg-primary-700 px-5 py-2 text-sm font-black text-white hover:bg-primary-800 transition-colors"
              >
                Add Note
              </button>
            </div>
          </div>

          <div className="px-5 border-b border-slate-200 overflow-x-auto">
            <div className="flex gap-8 min-w-max">
              {tabList.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'font-heading py-3 text-sm sm:text-base leading-none font-bold border-b-2 transition-colors',
                    activeTab === tab.key
                      ? 'text-primary-700 border-primary-700'
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 bg-white">
            {activeTab === 'booking' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(patientName)}&backgroundColor=eff6ff`}
                    alt={patientName}
                    className="w-16 h-16 rounded-full border border-slate-200"
                  />
                  <div>
                    <h4 className="font-heading text-xl sm:text-2xl leading-none font-black text-primary-700">{patientName}</h4>
                    <p className="text-base text-slate-600 font-semibold">
                      {detailValue(profile?.gender)} | {detailValue(appointment?.familyMember?.relation || profile?.relation || 'Self')}
                    </p>
                    <p className="text-base text-slate-700 font-semibold">{patientEmail}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
                  <div className="border-r border-slate-200 bg-slate-50">
                    {bookingSubTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setBookingSubTab(tab.key)}
                        className={cn(
                          'w-full text-left px-4 py-3 text-base font-black transition-colors border-b border-slate-200',
                          bookingSubTab === tab.key
                            ? 'text-primary-700 bg-white'
                            : 'text-slate-700 hover:bg-white'
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="p-4">
                    {bookingSubTab === 'health-concerns' ? (
                      <div>
                        <p className="font-heading text-lg font-black text-primary-700 mb-2">Health concern:</p>
                        <p className="text-base text-slate-700 font-semibold">
                          {detailValue(summary?.patientReason || summary?.primary_symptom || summary?.summary)}
                        </p>
                      </div>
                    ) : null}

                    {bookingSubTab === 'questions' ? (
                      <div className="space-y-2">
                        {questionnaire ? (
                          <>
                            <p className="text-sm"><span className="font-black text-slate-700">Consulted within last 12 months:</span> <span className="font-semibold text-slate-600">{yesNo(questionnaire?.consultedWithinLast12Months)}</span></p>
                            <p className="text-sm"><span className="font-black text-slate-700">Chronic conditions:</span> <span className="font-semibold text-slate-600">{yesNo(questionnaire?.chronicConditions)}</span></p>
                            <p className="text-sm"><span className="font-black text-slate-700">Taking medications:</span> <span className="font-semibold text-slate-600">{yesNo(questionnaire?.takingMedications)}</span></p>
                            <p className="text-sm"><span className="font-black text-slate-700">Recent surgeries/hospitalizations:</span> <span className="font-semibold text-slate-600">{yesNo(questionnaire?.recentSurgeriesOrHospitalizations)}</span></p>
                            <p className="text-sm"><span className="font-black text-slate-700">Needs language/mobility assistance:</span> <span className="font-semibold text-slate-600">{yesNo(questionnaire?.needsLanguageOrMobilityAssistance)}</span></p>
                            <p className="text-sm"><span className="font-black text-slate-700">Seen doctor for this issue before:</span> <span className="font-semibold text-slate-600">{yesNo(questionnaire?.seenDoctorForIssueBefore)}</span></p>
                            <p className="text-sm"><span className="font-black text-slate-700">Symptom duration:</span> <span className="font-semibold text-slate-600">{detailValue(questionnaire?.symptomDuration)}</span></p>
                            <p className="text-sm"><span className="font-black text-slate-700">Symptom severity:</span> <span className="font-semibold text-slate-600">{detailValue(questionnaire?.symptomSeverity)}</span></p>
                          </>
                        ) : null}
                        {requestedPathologyTests.length > 0 ? (
                          <div className="pt-1">
                            <p className="text-sm font-black text-slate-700">Requested pathology tests:</p>
                            <p className="text-sm font-semibold text-slate-600">{requestedPathologyTests.join(', ')}</p>
                          </div>
                        ) : null}
                        {requestedRadiologyTests.length > 0 ? (
                          <div className="pt-1">
                            <p className="text-sm font-black text-slate-700">Requested radiology tests:</p>
                            <p className="text-sm font-semibold text-slate-600">{requestedRadiologyTests.join(', ')}</p>
                          </div>
                        ) : null}
                        {!questionnaire && requestedPathologyTests.length === 0 && requestedRadiologyTests.length === 0 ? (
                          <p className="text-base text-slate-600 font-semibold">No Q&A recorded.</p>
                        ) : null}
                      </div>
                    ) : null}

                    {bookingSubTab === 'more-details' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { label: 'Date of Birth', value: profile?.dateOfBirth },
                          { label: 'Gender', value: profile?.gender },
                          { label: 'Phone', value: `${detailValue(profile?.phoneCode)} ${detailValue(profile?.phone)}` },
                          { label: 'Email', value: profile?.email || appointment?.patient?.email },
                          { label: 'Address', value: profile?.address },
                          { label: 'Health Identifier', value: profile?.healthIdentifierType },
                          { label: 'Medicare Number', value: profile?.medicareCardNumber },
                          { label: 'Medicare IRN', value: profile?.medicareIrn },
                        ].map((entry) => (
                          <div key={entry.label} className="rounded-lg border border-slate-200 p-3">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{entry.label}</p>
                            <p className="mt-1 font-heading text-base font-bold text-slate-800 break-words">{detailValue(entry.value)}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {activeDocumentTab ? (
              <div className="h-full">
                {activeDocumentTab.url ? (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full min-h-[500px]">
                    <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-health-600" />
                        <span className="font-heading text-base font-bold text-slate-800">{activeDocumentTab.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={activeDocumentTab.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-black transition-colors ${activeDocumentTab.buttonClass}`}
                        >
                          <FileText className="w-4 h-4" /> {activeDocumentTab.actionLabel}
                        </a>
                        <a
                          href={activeDocumentTab.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-black text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                        >
                          <Download className="w-4 h-4" /> Download
                        </a>
                      </div>
                    </div>
                    <iframe
                      src={activeDocumentTab.url}
                      className="w-full flex-1 bg-slate-100 min-h-[500px]"
                      title={activeDocumentTab.iframeTitle}
                    />
                  </div>
                ) : (
                  <div className="h-64 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-500">
                    <FileText className="w-10 h-10 mb-2" />
                    <p className="font-heading text-lg font-bold">{activeDocumentTab.emptyMessage}</p>
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === 'call-notes' && (
              <div className="space-y-4">
                <section className="rounded-xl border border-slate-200 p-4">
                  <p className="font-heading text-base sm:text-lg font-black text-primary-700 mb-2">Call Notes</p>
                  <p className="text-base text-slate-700 font-medium whitespace-pre-wrap">
                    {appointment?.consultation?.notes || 'No consultation notes available.'}
                  </p>
                </section>
                <section className="rounded-xl border border-slate-200 p-4">
                  <p className="font-heading text-base sm:text-lg font-black text-primary-700 mb-3">Chat History</p>
                  {Array.isArray(appointment?.messages) && appointment.messages.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {appointment.messages.map((msg, idx) => (
                        <div
                          key={`${msg?.id || 'msg'}-${idx}`}
                          className={cn(
                            'rounded-lg px-3 py-2 text-sm font-medium',
                            msg?.senderRole === 'PATIENT'
                              ? 'bg-primary-50 text-primary-800 border border-primary-100'
                              : 'bg-slate-50 text-slate-700 border border-slate-200'
                          )}
                        >
                          <p className="text-xs font-black uppercase tracking-wide mb-1">
                            {msg?.senderRole === 'PATIENT' ? patientName : doctorName}
                          </p>
                          <p>{msg?.text || '-'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base font-semibold text-slate-600">No chat messages recorded.</p>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'appointment' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 flex items-center gap-3">
                  <CalendarClock className="w-5 h-5 text-primary-700" />
                  <p className="font-heading text-lg font-black text-primary-700">
                    {formatDate(bookingDateTime)} | {formatTime(bookingDateTime)}
                  </p>
                </div>

                <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
                  <div className="space-y-1 text-slate-800">
                    <p className="font-heading text-lg font-bold">Booking Reference ID : <span className="font-sans font-semibold">{bookingReference}</span></p>
                    <p className="font-heading text-lg font-bold">Appointment Type : <span className="font-sans font-semibold">{serviceLabel}</span></p>
                    <p className="font-heading text-lg font-bold">Payment Status : <span className="font-sans font-semibold">{paymentStatusLabel(appointment?.paymentStatus)}</span></p>
                  </div>

                  <div className="mt-4 rounded-xl bg-white border border-slate-100 p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-heading text-lg font-bold text-slate-800">Service Charges</p>
                      <p className="font-heading text-lg font-bold text-slate-800">{formatCurrency(normalizedServiceCharges)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-heading text-lg font-bold text-slate-800">Platform Charges</p>
                      <p className="font-heading text-lg font-bold text-slate-800">{formatCurrency(platformCharges)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="font-heading text-2xl font-black text-slate-800">Total Payment</p>
                    <span className="rounded-lg bg-primary-700 px-4 py-2 font-heading text-2xl font-black text-white">
                      {formatCurrency(totalPayment)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'medical-history' && (
              <div className="space-y-4">
                <section className="rounded-xl border border-slate-200 p-4">
                  <p className="font-heading text-base sm:text-lg font-black text-primary-700 mb-2">Reason For Request</p>
                  <p className="text-base text-slate-700 font-medium">{detailValue(summary?.patientReason)}</p>
                </section>

                <section className="rounded-xl border border-slate-200 p-4">
                  <p className="font-heading text-base sm:text-lg font-black text-primary-700 mb-2">Medical Conditions & Allergies</p>
                  <p className="text-sm font-semibold text-slate-500">Medical Conditions</p>
                  <p className="text-base text-slate-700 font-medium">
                    {summary?.noMedicalCondition
                      ? 'No medical condition'
                      : Array.isArray(summary?.medicalConditions) && summary.medicalConditions.length > 0
                        ? summary.medicalConditions.join(', ')
                        : '-'}
                  </p>
                  <p className="text-sm font-semibold text-slate-500 mt-2">Allergies / Adverse Reactions</p>
                  <p className="text-base text-slate-700 font-medium">{detailValue(summary?.allergies)}</p>
                </section>

                <section className="rounded-xl border border-slate-200 p-4">
                  <p className="font-heading text-base sm:text-lg font-black text-primary-700 mb-2">GP & Medication History</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <p className="text-sm"><span className="font-black text-slate-700">Seen GP in last 12 months:</span> <span className="font-semibold text-slate-600">{yesNo(summary?.gpMedicationHistory)}</span></p>
                    <p className="text-sm"><span className="font-black text-slate-700">Current GP Name:</span> <span className="font-semibold text-slate-600">{detailValue(summary?.currentGpName)}</span></p>
                    <p className="text-sm"><span className="font-black text-slate-700">Current GP Email:</span> <span className="font-semibold text-slate-600">{detailValue(summary?.currentGpEmail)}</span></p>
                    <p className="text-sm"><span className="font-black text-slate-700">Medicine Name:</span> <span className="font-semibold text-slate-600">{detailValue(summary?.medicineName)}</span></p>
                  </div>
                </section>

                {questionnaire ? (
                  <section className="rounded-xl border border-slate-200 p-4">
                    <p className="font-heading text-base sm:text-lg font-black text-primary-700 mb-2">Prescription Questionnaire</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <p className="text-sm"><span className="font-black text-slate-700">Consulted within last 12 months:</span> <span className="font-semibold text-slate-600">{yesNo(questionnaire?.consultedWithinLast12Months)}</span></p>
                      <p className="text-sm"><span className="font-black text-slate-700">Chronic conditions:</span> <span className="font-semibold text-slate-600">{yesNo(questionnaire?.chronicConditions)}</span></p>
                      <p className="text-sm"><span className="font-black text-slate-700">Taking medications:</span> <span className="font-semibold text-slate-600">{yesNo(questionnaire?.takingMedications)}</span></p>
                      <p className="text-sm"><span className="font-black text-slate-700">Recent surgeries/hospitalizations:</span> <span className="font-semibold text-slate-600">{yesNo(questionnaire?.recentSurgeriesOrHospitalizations)}</span></p>
                      <p className="text-sm"><span className="font-black text-slate-700">Needs language/mobility assistance:</span> <span className="font-semibold text-slate-600">{yesNo(questionnaire?.needsLanguageOrMobilityAssistance)}</span></p>
                      <p className="text-sm"><span className="font-black text-slate-700">Seen doctor for this issue before:</span> <span className="font-semibold text-slate-600">{yesNo(questionnaire?.seenDoctorForIssueBefore)}</span></p>
                      <p className="text-sm"><span className="font-black text-slate-700">Symptom duration:</span> <span className="font-semibold text-slate-600">{detailValue(questionnaire?.symptomDuration)}</span></p>
                      <p className="text-sm"><span className="font-black text-slate-700">Symptom severity:</span> <span className="font-semibold text-slate-600">{detailValue(questionnaire?.symptomSeverity)}</span></p>
                    </div>
                    <p className="text-sm font-black text-slate-700 mt-2">Additional information</p>
                    <p className="text-sm font-semibold text-slate-600">{detailValue(questionnaire?.additionalInformation)}</p>
                  </section>
                ) : null}

                <section className="rounded-xl border border-slate-200 p-4">
                  <p className="font-heading text-base sm:text-lg font-black text-primary-700 mb-2">Requested Pathology Tests</p>
                  {requestedPathologyTests.length > 0 ? (
                    <div className="space-y-2">
                      {requestedPathologyTests.map((testName, idx) => (
                        <p key={`${testName}-${idx}`} className="text-sm font-semibold text-slate-700">{testName}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base font-semibold text-slate-600">No pathology tests selected.</p>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 p-4">
                  <p className="font-heading text-base sm:text-lg font-black text-primary-700 mb-2">Requested Radiology Tests</p>
                  {requestedRadiologyTests.length > 0 ? (
                    <div className="space-y-2">
                      {requestedRadiologyTests.map((testName, idx) => (
                        <p key={`${testName}-${idx}`} className="text-sm font-semibold text-slate-700">{testName}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base font-semibold text-slate-600">No radiology tests selected.</p>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 p-4">
                  <p className="font-heading text-base sm:text-lg font-black text-primary-700 mb-2">Uploaded Files During Booking</p>
                  {attachedFiles.length === 0 ? (
                    <p className="text-base font-semibold text-slate-600">No files uploaded during booking.</p>
                  ) : (
                    <div className="space-y-2">
                      {attachedFiles.map((file, idx) => (
                        <div key={`${file?.key || file?.name || 'file'}-${idx}`} className="rounded-lg border border-slate-200 p-3">
                          <p className="font-heading text-lg font-bold text-slate-800">{detailValue(file?.name || `File ${idx + 1}`)}</p>
                          <p className="text-sm text-slate-500 font-semibold">{detailValue(file?.contentType)}</p>
                          {file?.url ? (
                            <div className="mt-2 flex items-center gap-2">
                              <a
                                href={resolveUrl(file.url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-md border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-bold text-primary-700 hover:bg-primary-100"
                              >
                                Open File
                              </a>
                              <a
                                href={resolveUrl(file.url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                              >
                                Download
                              </a>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600 font-semibold mt-1">File URL not available.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {Array.isArray(appointment?.consultation?.prescription) && appointment.consultation.prescription.length > 0 ? (
                  <section className="rounded-xl border border-slate-200 p-4">
                    <p className="font-heading text-base sm:text-lg font-black text-primary-700 mb-2">Prescribed Medications</p>
                    <div className="space-y-2">
                      {prescriptionItems.map((med, idx) => (
                        <div key={`${med?.drugName || med?.name || 'medicine'}-${idx}`} className="rounded-lg border border-slate-200 p-3">
                          <p className="font-heading text-base sm:text-lg font-bold text-slate-800">{detailValue(med?.drugName || med?.name)}</p>
                          <p className="text-sm text-slate-600 font-semibold">
                            {[
                              med?.dosage || `${med?.dose || ''}${med?.doseUnit ? ` ${med.doseUnit}` : ''}`.trim(),
                              med?.frequency,
                              med?.duration || `${med?.durationValue || ''}${med?.durationUnit ? ` ${med.durationUnit}` : ''}`.trim(),
                              med?.route,
                            ].filter((item) => String(item || '').trim()).join(' | ') || '-'}
                          </p>
                          {String(med?.directions || '').trim() ? (
                            <p className="text-sm text-slate-600 font-semibold mt-1">Directions: {med.directions}</p>
                          ) : null}
                          {String(med?.notes || '').trim() ? (
                            <p className="text-sm text-slate-600 font-semibold mt-1">Notes: {med.notes}</p>
                          ) : null}
                          {String(med?.repeats || '').trim() ? (
                            <p className="text-sm text-slate-600 font-semibold mt-1">Repeats: {med.repeats}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {Array.isArray(questionAnswers) && questionAnswers.length > 0 ? (
                  <section className="rounded-xl border border-slate-200 p-4">
                    <p className="font-heading text-base sm:text-lg font-black text-primary-700 mb-2">Booking Conversation</p>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {questionAnswers.slice(0, 12).map((item, idx) => (
                        <p key={`${item.role || 'entry'}-${idx}`} className="text-sm">
                          <span className="font-black text-slate-800">
                            {item.role === 'assistant' ? 'Assistant: ' : 'Patient: '}
                          </span>
                          <span className="text-slate-700 font-medium">{item.content || item.text || '-'}</span>
                        </p>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
