import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Avatar, Button, Card, ConfigProvider, Empty, Input, Pagination, Typography } from 'antd';
import { Download, FileBadge2, FileText, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SharedNavbar from '../components/SharedNavbar';
import { formatDoctorName } from '../utils/doctorName';
import { DOCTOR_NAV_ITEMS, handleDoctorNavClick as navigateDoctorNavClick } from '../utils/doctorNavigation';
import { getPractitionerTypeLabel } from '../utils/doctorConsultation';

const { Title, Text } = Typography;
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

function getAppointmentDate(appointment) {
  const rawDate =
    appointment?.scheduledFor ||
    appointment?.scheduledAt ||
    appointment?.appointmentTime ||
    appointment?.createdAt ||
    appointment?.updatedAt;
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateParts(rawDate) {
  if (!rawDate) return { date: '--', time: '--' };
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return { date: '--', time: '--' };
  return {
    date: date.toLocaleDateString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    time: date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function getPatientName(appointment) {
  return appointment?.familyMember?.name || appointment?.patient?.name || 'Unknown Patient';
}

function getPatientEmail(appointment) {
  return appointment?.patient?.email || 'No email available';
}

function getConsultationLabel(appointment) {
  return getPractitionerTypeLabel(appointment?.doctor, 'Standard Consultation');
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

function resolveDocumentUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  const normalizedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${API_URL}${normalizedPath}`;
}

export default function DoctorMedicalDocuments() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));
  const [searchText, setSearchText] = useState('');
  const resolveDocTypeFromQuery = () => {
    const requestedType = searchParams.get('type');
    if (DOCUMENT_TYPES.some((docType) => docType.key === requestedType)) {
      return requestedType;
    }
    return 'PRESCRIPTION';
  };
  const [activeDocType, setActiveDocType] = useState(resolveDocTypeFromQuery);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setIsOnline(Boolean(user?.doctorProfile?.isOnline));
  }, [user?.doctorProfile?.isOnline]);

  useEffect(() => {
    setActiveDocType(resolveDocTypeFromQuery());
  }, [searchParams]);

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
        console.error('Failed to fetch medical documents', error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const doctorName = formatDoctorName(user?.name, 'Doctor');
  const pendingCount = appointments.filter((appointment) => appointment.status === 'PENDING').length;
  const activeTypeConfig = DOCUMENT_TYPES.find((type) => type.key === activeDocType) || DOCUMENT_TYPES[0];

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

  const medicalDocuments = useMemo(() => {
    const authenticatedDoctorId = user?.id;
    if (!authenticatedDoctorId) return [];

    return appointments
      .filter((appointment) => {
        const appointmentDoctorId = appointment?.doctorId || appointment?.doctor?.id;
        return appointmentDoctorId === authenticatedDoctorId;
      })
      .map((appointment) => {
        const consultation = appointment?.consultation || {};
        const summary = parseSummary(appointment?.aiSummary);
        const rawDocumentUrl =
          consultation?.[activeTypeConfig.consultationField] ||
          summary?.[activeTypeConfig.consultationField];
        const documentUrl = resolveDocumentUrl(rawDocumentUrl);
        if (!documentUrl) return null;

        const appointmentDate = getAppointmentDate(appointment);
        return {
          id: appointment.id,
          patientName: getPatientName(appointment),
          patientEmail: getPatientEmail(appointment),
          consultationLabel: getConsultationLabel(appointment),
          appointmentDate,
          documentUrl,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.appointmentDate?.getTime() || 0) - (a.appointmentDate?.getTime() || 0));
  }, [appointments, user?.id, activeTypeConfig.consultationField]);

  const filteredDocuments = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return medicalDocuments;
    return medicalDocuments.filter((document) => {
      return (
        document.patientName.toLowerCase().includes(search) ||
        document.patientEmail.toLowerCase().includes(search)
      );
    });
  }, [medicalDocuments, searchText]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeDocType]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredDocuments.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredDocuments, currentPage]);

  const handleDocTypeChange = (docTypeKey) => {
    setActiveDocType(docTypeKey);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', docTypeKey);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0e7490',
          borderRadius: 12,
          fontFamily: '"Outfit", sans-serif',
        },
      }}
    >
      <div className="min-h-screen bg-[#f5f8ff] text-slate-900">
        <SharedNavbar
          user={user}
          brandLabel="CareBridge"
          onLogoClick={() => navigate('/dashboard')}
          navItems={doctorNavItems}
          activeTab="more"
          onTabClick={handleDoctorNavClick}
          isOnline={isOnline}
          onToggleOnline={handleToggleOnline}
          pendingCount={pendingCount}
          doctorName={doctorName}
          onLogout={logout}
          showMobileTabs
        />

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <Card bordered={false} className="shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Title level={3} style={{ margin: 0 }} className="!font-heading !font-black !text-slate-900">
                Medical Documents
              </Title>
              <Input
                allowClear
                prefix={<Search size={14} />}
                placeholder="Search By Name"
                style={{ width: 360 }}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>

            <div className="mb-5 flex flex-wrap gap-2.5">
              {DOCUMENT_TYPES.map((docType) => {
                const isActive = activeDocType === docType.key;
                return (
                  <button
                    type="button"
                    key={docType.key}
                    onClick={() => handleDocTypeChange(docType.key)}
                    className={`rounded-xl px-6 py-2.5 text-base font-bold transition-colors ${
                      isActive
                        ? 'bg-primary-700 text-white shadow-sm'
                        : 'bg-cyan-50 text-slate-900 hover:bg-cyan-100'
                    }`}
                  >
                    {docType.label}
                  </button>
                );
              })}
            </div>

            {paginatedDocuments.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20">
                <Empty
                  description={
                    <span className="text-base font-semibold text-slate-500">{activeTypeConfig.emptyMessage}</span>
                  }
                />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedDocuments.map((document) => {
                    const dateParts = formatDateParts(document.appointmentDate);
                    return (
                      <Card
                        key={`${activeDocType}-${document.id}`}
                        bordered
                        className="group h-full overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                        styles={{ body: { padding: 16 } }}
                      >
                        <div className="mb-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Avatar
                              size={54}
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                document.patientName
                              )}&backgroundColor=f1f5f9`}
                            />
                            <div className="min-w-0">
                              <Text className="!block !truncate !text-lg !font-black !leading-tight !text-primary-900">
                                {document.patientName}
                              </Text>
                              <Text className="!block !truncate !text-sm !font-medium !text-slate-600">
                                {document.patientEmail}
                              </Text>
                              <Text className="!mt-0.5 !block !text-[11px] !font-bold !uppercase !tracking-wide !text-slate-400">
                                ID: {document.id}
                              </Text>
                            </div>
                          </div>
                        </div>

                        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="mb-2 flex items-start gap-2">
                            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                              <FileBadge2 size={16} />
                            </span>
                            <div className="min-w-0">
                              <span className="mb-1 inline-flex rounded-full border border-lime-300 bg-lime-50 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-lime-700">
                                Uploaded
                              </span>
                              <p className="truncate text-base font-black leading-tight text-primary-900">
                                {document.consultationLabel}
                              </p>
                              <p className="text-sm font-semibold leading-tight text-slate-700">
                                {dateParts.date} | {dateParts.time}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="default"
                            icon={<FileText size={14} />}
                            className="!h-10 !flex-1 !rounded-lg !border-primary-700 !bg-white !text-sm !font-black !text-primary-700 transition-all duration-200 hover:!border-primary-800 hover:!bg-primary-50 hover:!text-primary-800"
                            onClick={() => window.open(document.documentUrl, '_blank', 'noopener,noreferrer')}
                          >
                            {activeTypeConfig.actionLabel}
                          </Button>
                          <Button
                            type="default"
                            icon={<Download size={14} />}
                            href={document.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="!h-10 !flex-1 !rounded-lg !border-slate-300 !bg-white !text-sm !font-black !text-slate-700 transition-all duration-200 hover:!border-slate-400 hover:!bg-slate-50 hover:!text-slate-900"
                          >
                            Download
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                <div className="mt-6 flex justify-center">
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={filteredDocuments.length}
                    onChange={setCurrentPage}
                    showSizeChanger={false}
                  />
                </div>
              </>
            )}
          </Card>
        </main>
      </div>
    </ConfigProvider>
  );
}

