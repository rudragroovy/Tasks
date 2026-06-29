import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileBadge2, FileText, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPractitionerTypeLabel } from '../../utils/doctorConsultation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PAGE_SIZE = 9;

const DOCUMENT_TYPES = [
  {
    key: 'PRESCRIPTION',
    label: 'Prescription',
    consultationField: 'prescriptionUrl',
    actionLabel: 'View Electronic Prescription',
    emptyMessage: 'No prescription documents found',
  },
  {
    key: 'MEDICAL_CERTIFICATE',
    label: 'Medical Certificate',
    consultationField: 'medicalCertificateUrl',
    actionLabel: 'View Medical Certificate',
    emptyMessage: 'No medical certificate documents found',
  },
  {
    key: 'SPECIALIST_REFERRAL',
    label: 'Specialist Referral',
    consultationField: 'specialistReferralUrl',
    actionLabel: 'View Specialist Referral',
    emptyMessage: 'No specialist referral documents found',
  },
  {
    key: 'PATHOLOGY_LETTER',
    label: 'Pathology Letter',
    consultationField: 'pathologyLetterUrl',
    actionLabel: 'View Pathology Letter',
    emptyMessage: 'No pathology letters found',
  },
  {
    key: 'RADIOLOGY_LETTER',
    label: 'Radiology Letter',
    consultationField: 'radiologyLetterUrl',
    actionLabel: 'View Radiology Letter',
    emptyMessage: 'No radiology letters found',
  },
];

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

function resolveDocumentUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  const normalizedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${API_URL}${normalizedPath}`;
}

function getServiceLabel(appointment) {
  const summary = parseSummary(appointment?.aiSummary);
  return (
    summary?.service ||
    summary?.service_name ||
    summary?.consultation_type ||
    summary?.primary_symptom ||
    getPractitionerTypeLabel(appointment?.doctor, '') ||
    'Standard Consultation'
  );
}

function formatDateTime(rawDate) {
  if (!rawDate) return '--';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return '--';
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function PatientMedicalDocumentsTab() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeDocType, setActiveDocType] = useState('PRESCRIPTION');
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
        console.error('Failed to fetch patient medical documents', error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const activeTypeConfig = DOCUMENT_TYPES.find((item) => item.key === activeDocType) || DOCUMENT_TYPES[0];

  const medicalDocuments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        if (!user?.id) return true;
        const appointmentPatientId = appointment?.patientId || appointment?.patient?.id;
        if (!appointmentPatientId) return true;
        return appointmentPatientId === user.id;
      })
      .map((appointment) => {
        const consultation = appointment?.consultation || {};
        const summary = parseSummary(appointment?.aiSummary);
        const rawDocumentUrl =
          consultation?.[activeTypeConfig.consultationField] ||
          summary?.[activeTypeConfig.consultationField];
        const documentUrl = resolveDocumentUrl(rawDocumentUrl);
        if (!documentUrl) return null;

        return {
          id: appointment.id,
          doctorName: String(appointment?.doctor?.name || 'Doctor'),
          doctorEmail: String(appointment?.doctor?.email || 'doctor@carebridge.com'),
          consultationLabel: getServiceLabel(appointment),
          dateTimeLabel: formatDateTime(appointment?.scheduledFor || appointment?.createdAt),
          sortValue: Number(
            new Date(appointment?.scheduledFor || appointment?.createdAt || appointment?.updatedAt || 0)
          ),
          documentUrl,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.sortValue - a.sortValue);
  }, [appointments, user?.id, activeTypeConfig.consultationField]);

  const filteredDocuments = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return medicalDocuments;
    return medicalDocuments.filter((document) => {
      return (
        document.doctorName.toLowerCase().includes(search) ||
        document.doctorEmail.toLowerCase().includes(search)
      );
    });
  }, [medicalDocuments, searchText]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeDocType, searchText]);

  const totalItems = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalItems);

  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <article className="patient-account-card">
      <header className="patient-account-documents-header">
        <h3>Medical Documents</h3>
        <label className="patient-account-documents-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search By Name"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </label>
      </header>

      <div className="patient-account-documents-types" role="tablist" aria-label="Document types">
        {DOCUMENT_TYPES.map((docType) => (
          <button
            key={docType.key}
            type="button"
            className={activeDocType === docType.key ? 'is-active' : ''}
            onClick={() => setActiveDocType(docType.key)}
          >
            {docType.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="patient-account-documents-empty">
          <div className="patient-account-documents-spinner" />
          <p>Loading medical documents...</p>
        </div>
      ) : paginatedDocuments.length === 0 ? (
        <div className="patient-account-documents-empty">
          <p>{activeTypeConfig.emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="patient-account-documents-grid">
            {paginatedDocuments.map((document) => (
              <article key={`${activeDocType}-${document.id}`} className="patient-account-doc-card">
                <div className="patient-account-doc-card__head">
                  <img
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${encodeURIComponent(
                      document.doctorName
                    )}&backgroundColor=f1f5f9`}
                    alt={document.doctorName}
                  />
                  <div>
                    <h4>{document.doctorName}</h4>
                    <p>{document.doctorEmail}</p>
                  </div>
                </div>

                <div className="patient-account-doc-card__meta">
                  <span className="patient-account-doc-card__meta-icon">
                    <FileBadge2 size={16} />
                  </span>
                  <div>
                    <span className="patient-account-doc-card__status">Uploaded</span>
                    <h5>{document.consultationLabel}</h5>
                    <small>{document.dateTimeLabel}</small>
                  </div>
                </div>

                <div className="patient-account-doc-card__actions">
                  <button
                    type="button"
                    className="patient-account-doc-card__action"
                    onClick={() => window.open(document.documentUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <FileText size={14} />
                    {activeTypeConfig.actionLabel}
                  </button>
                  <a
                    href={document.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="patient-account-doc-card__action patient-account-doc-card__action--download"
                  >
                    <Download size={14} />
                    Download
                  </a>
                </div>
              </article>
            ))}
          </div>

          <div className="patient-account-documents-pagination">
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
