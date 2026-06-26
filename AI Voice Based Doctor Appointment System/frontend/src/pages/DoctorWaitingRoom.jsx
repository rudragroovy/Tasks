import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  ConfigProvider,
  Empty,
  Input,
  Modal,
  Row,
  Segmented,
  Statistic,
  Table,
  Tag,
  Tabs,
  Typography,
  message,
} from 'antd';
import {
  CheckCircle,
  Clock3,
  TimerReset,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SharedNavbar from '../components/SharedNavbar';
import { formatDoctorName } from '../utils/doctorName';
import { DOCTOR_NAV_ITEMS, handleDoctorNavClick as navigateDoctorNavClick } from '../utils/doctorNavigation';
import { getPractitionerTypeLabel } from '../utils/doctorConsultation';

const { Title, Text } = Typography;
const { TextArea } = Input;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GENERAL_QUEUE_WAIT_MINUTES = 30;

function normalizeExperienceLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return '0-1 Experience';
  return /experience/i.test(raw) ? raw : `${raw} Experience`;
}

function resolveExperience(appointment) {
  const aiSummary = parseAppointmentAiSummary(appointment);
  const aiPatient = aiSummary?.patient && typeof aiSummary.patient === 'object' ? aiSummary.patient : {};
  const aiExperience = pickFirstNonEmpty([
    aiSummary?.experience,
    aiSummary?.experience_range,
    aiSummary?.patient_experience,
    aiPatient?.experience,
    aiPatient?.experience_range,
  ]);
  return normalizeExperienceLabel(
    aiExperience ||
      appointment?.patient?.experienceRange ||
      appointment?.familyMember?.experienceRange
  );
}

function parseAppointmentAiSummary(appointment) {
  const raw = appointment?.aiSummary;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getQueueTypeFromAppointment(appointment) {
  const aiSummary = parseAppointmentAiSummary(appointment);
  return String(aiSummary?.queueType || '').trim().toUpperCase() || 'DOCTOR_SPECIFIC';
}

function isAutoGeneralEligible(appointment) {
  if (!appointment) return false;
  if (appointment.type !== 'ON_DEMAND') return false;
  if (appointment.status !== 'PENDING') return false;
  if (appointment.paymentStatus !== 'PAID') return false;
  const createdAt = new Date(appointment.createdAt || 0);
  if (Number.isNaN(createdAt.getTime())) return false;
  const threshold = Date.now() - GENERAL_QUEUE_WAIT_MINUTES * 60 * 1000;
  return createdAt.getTime() <= threshold;
}

function isGeneralQueueRecord(appointment, viewerDoctorId) {
  const queueType = getQueueTypeFromAppointment(appointment);
  if (queueType === 'GENERAL') return true;
  if (!isAutoGeneralEligible(appointment)) return false;
  // ponytail: auto-general visibility is for non-assigned doctors; assigned doctor keeps it in doctor-specific tab until explicit GENERAL.
  return appointment?.doctorId !== viewerDoctorId;
}

function isDoctorSpecificRecord(appointment, doctorId) {
  if (!appointment || !doctorId) return false;
  const isPrimaryDoctor = appointment.doctorId === doctorId;
  const hasLegacyAssignedDoctor =
    appointment.assignedDoctorId === doctorId || appointment.invitedDoctorId === doctorId;
  const isInvitedDoctor = Array.isArray(appointment.invitedDoctors)
    ? appointment.invitedDoctors.some(
        (invite) => invite?.doctorId === doctorId && invite?.status !== 'REJECTED'
      )
    : false;
  return isPrimaryDoctor || hasLegacyAssignedDoctor || isInvitedDoctor;
}

function pickFirstNonEmpty(values) {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function resolveAddress(appointment) {
  const aiSummary = parseAppointmentAiSummary(appointment);
  const aiPatient = aiSummary?.patient && typeof aiSummary.patient === 'object' ? aiSummary.patient : {};
  const aiAddressObject = aiSummary?.address && typeof aiSummary.address === 'object' ? aiSummary.address : {};

  const aiAddressDirect = pickFirstNonEmpty([
    aiSummary?.address,
    aiSummary?.location,
    aiSummary?.patient_address,
    aiSummary?.full_address,
    aiSummary?.formatted_address,
    aiSummary?.home_address,
    aiPatient?.address,
    aiPatient?.location,
    aiAddressObject?.full,
    aiAddressObject?.line1,
  ]);

  const aiAddressParts = [
    aiAddressObject?.street,
    aiSummary?.street,
    aiPatient?.street,
    aiAddressObject?.suburb,
    aiSummary?.suburb,
    aiPatient?.suburb,
    aiAddressObject?.city,
    aiSummary?.city,
    aiPatient?.city,
    aiAddressObject?.state,
    aiSummary?.state,
    aiPatient?.state,
    aiAddressObject?.postcode,
    aiSummary?.postcode,
    aiPatient?.postcode,
    aiAddressObject?.country,
    aiSummary?.country,
    aiPatient?.country,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const mergedAiAddress = aiAddressParts.join(', ');

  const rawAddress =
    aiAddressDirect ||
    mergedAiAddress ||
    appointment?.patient?.address ||
    appointment?.patient?.doctorProfile?.address ||
    appointment?.familyMember?.address;
  const address = String(rawAddress || '').trim();
  return address || 'Address not provided';
}

function getSessionRoute(appointment) {
  if (appointment?.consultationMode === 'IN_PERSON') return `/doctor/in-person/${appointment.id}`;
  return `/room/${appointment.id}`;
}

function formatDateLabel(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getModeTag(mode) {
  if (mode === 'AUDIO') return <Tag color="green">AUDIO</Tag>;
  if (mode === 'IN_PERSON') return <Tag color="orange">IN_PERSON</Tag>;
  if (mode === 'VIDEO') return <Tag color="blue">VIDEO</Tag>;
  return <Tag color="default">{mode || '-'}</Tag>;
}

function getQueueTag(appointment, viewerDoctorId) {
  return isGeneralQueueRecord(appointment, viewerDoctorId)
    ? <Tag color="cyan">GENERAL</Tag>
    : <Tag color="geekblue">DOCTOR SPECIFIC</Tag>;
}

function canDoctorRespondToRequest(appointment, doctorId) {
  if (!appointment || !doctorId) return false;
  if (appointment.status !== 'PENDING') return false;
  if (appointment.doctorId === doctorId) return true;
  return isGeneralQueueRecord(appointment, doctorId);
}

export default function DoctorWaitingRoom() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messageApi, messageContextHolder] = message.useMessage();
  const seenPendingIdsRef = useRef(new Set());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [waitingTab, setWaitingTab] = useState('general');
  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayLabel = formatDateLabel(today);
  const todayWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(today);

  useEffect(() => {
    setIsOnline(Boolean(user?.doctorProfile?.isOnline));
  }, [user?.doctorProfile?.isOnline]);

  const fetchAppointments = useCallback(async ({ keepLoading = false } = {}) => {
    if (!keepLoading) setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/appointments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setAppointments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch waiting room data', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    const intervalId = setInterval(() => {
      fetchAppointments({ keepLoading: true });
    }, 15000);
    return () => clearInterval(intervalId);
  }, [fetchAppointments]);

  const enrichedAppointments = useMemo(() => appointments.map((appointment) => ({
    ...appointment,
    __isGeneralQueue: isGeneralQueueRecord(appointment, user?.id),
    __isDoctorSpecific: isDoctorSpecificRecord(appointment, user?.id),
  })), [appointments, user?.id]);

  const generalQueueRecords = useMemo(
    () => enrichedAppointments.filter((appointment) => appointment.__isGeneralQueue),
    [enrichedAppointments]
  );

  const doctorSpecificRecords = useMemo(
    () =>
      enrichedAppointments.filter(
        (appointment) => appointment.__isDoctorSpecific && !appointment.__isGeneralQueue
      ),
    [enrichedAppointments]
  );

  const scopedRecords = waitingTab === 'general' ? generalQueueRecords : doctorSpecificRecords;

  const pendingRecords = useMemo(
    () => scopedRecords.filter((appointment) => appointment.status === 'PENDING'),
    [scopedRecords]
  );

  useEffect(() => {
    const actionablePending = enrichedAppointments
      .filter((appointment) => canDoctorRespondToRequest(appointment, user?.id))
      .filter((appointment) => appointment.status === 'PENDING');
    const nextIds = new Set(actionablePending.map((appointment) => appointment.id));

    if (seenPendingIdsRef.current.size === 0) {
      seenPendingIdsRef.current = nextIds;
      return;
    }

    const newlyArrived = actionablePending.filter(
      (appointment) => !seenPendingIdsRef.current.has(appointment.id)
    );
    if (newlyArrived.length > 0) {
      const firstName =
        newlyArrived[0]?.familyMember?.name ||
        newlyArrived[0]?.patient?.name ||
        'Patient';
      messageApi.info(
        newlyArrived.length === 1
          ? `New appointment request from ${firstName}.`
          : `${newlyArrived.length} new appointment requests received.`
      );
    }

    seenPendingIdsRef.current = nextIds;
  }, [enrichedAppointments, messageApi, user?.id]);

  const completedToday = useMemo(
    () =>
      scopedRecords.filter((appointment) => {
        if (appointment.status !== 'COMPLETED') return false;
        const date = new Date(appointment.updatedAt || appointment.createdAt);
        return (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate()
        );
      }),
    [scopedRecords, today]
  );

  const doctorDisplayName = formatDoctorName(user?.name, 'Doctor');
  const displayedRecords = pendingRecords;
  const highlightedPatient = displayedRecords[0] || null;
  const highlightedDoctorProfile = user?.doctorProfile || highlightedPatient?.doctor?.doctorProfile || null;
  const highlightedCardName = doctorDisplayName;
  const highlightedServiceName =
    getPractitionerTypeLabel(highlightedDoctorProfile || highlightedPatient?.doctor, 'General Consultation');
  const highlightedDoctorExperience = normalizeExperienceLabel(
    highlightedDoctorProfile?.experienceRange || highlightedDoctorProfile?.experience
  );
  const highlightedDoctorAddress = String(highlightedDoctorProfile?.address || '').trim() || 'Address not provided';

  const avgWaitMinutes = displayedRecords.length
    ? Math.max(
        0,
        Math.round(
          displayedRecords.reduce((sum, appointment) => {
            const createdAt = new Date(appointment.createdAt || appointment.updatedAt || today.getTime());
            return sum + (today.getTime() - createdAt.getTime()) / 60000;
          }, 0) / displayedRecords.length
        )
      )
    : 0;

  const tableData = displayedRecords.map((appointment) => ({
    key: appointment.id,
    id: appointment.id,
    patientName: appointment.familyMember?.name || appointment.patient?.name || '-',
    patientExperience: resolveExperience(appointment),
    patientAddress: resolveAddress(appointment),
    userType: appointment.familyMember ? 'Family' : 'Self',
    serviceType: appointment.type || 'ON_DEMAND',
    consultationFor: appointment.familyMember ? 'Family Member' : 'Self',
    serviceName:
      getPractitionerTypeLabel(appointment.doctor, '-'),
    consultationMode: appointment.consultationMode || '-',
    queueType: getQueueTag(appointment, user?.id),
    appointment,
  }));

  const openDetailModal = (appointment) => {
    setSelectedAppointment(appointment);
    setDetailModalOpen(true);
  };

  const openDeclineModal = (appointment) => {
    setSelectedAppointment(appointment);
    setDeclineReason('');
    setDeclineModalOpen(true);
  };

  const closeDetailModal = () => {
    if (submittingAction) return;
    setDetailModalOpen(false);
  };

  const closeDeclineModal = () => {
    if (submittingAction) return;
    setDeclineModalOpen(false);
  };

  const handleAcceptRequest = async () => {
    if (!selectedAppointment?.id) return;
    setSubmittingAction(true);
    try {
      await axios.put(
        `${API_URL}/api/appointments/${selectedAppointment.id}/status`,
        { status: 'ACCEPTED' },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      messageApi.success('Request accepted successfully.');
      setDetailModalOpen(false);
      setDeclineModalOpen(false);
      await fetchAppointments({ keepLoading: true });
      navigate(getSessionRoute(selectedAppointment));
    } catch (error) {
      messageApi.error(error?.response?.data?.error || 'Failed to accept request.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!selectedAppointment?.id) return;
    const normalizedReason = String(declineReason || '').trim();
    const needsReason = !isGeneralQueueRecord(selectedAppointment, user?.id) || selectedAppointment?.doctorId === user?.id;

    if (needsReason && normalizedReason.length < 5) {
      messageApi.error('Please provide a decline reason with at least 5 characters.');
      return;
    }

    setSubmittingAction(true);
    try {
      const payload = { status: 'REJECTED' };
      if (normalizedReason) payload.declineReason = normalizedReason;

      await axios.put(
        `${API_URL}/api/appointments/${selectedAppointment.id}/status`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      messageApi.success('Request declined.');
      setDeclineModalOpen(false);
      setDetailModalOpen(false);
      setDeclineReason('');
      await fetchAppointments({ keepLoading: true });
    } catch (error) {
      messageApi.error(error?.response?.data?.error || 'Failed to decline request.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const selectedSummary = parseAppointmentAiSummary(selectedAppointment);
  const selectedConditions = Array.isArray(selectedSummary?.medicalConditions)
    ? selectedSummary.medicalConditions
    : [];
  const selectedUploadedFiles = Array.isArray(selectedSummary?.attachedFileNames)
    ? selectedSummary.attachedFileNames
    : [];
  const selectedPatientName =
    selectedAppointment?.familyMember?.name || selectedAppointment?.patient?.name || '-';
  const selectedProfile = selectedAppointment?.patient?.patientProfile || {};
  const selectedCanRespond = canDoctorRespondToRequest(selectedAppointment, user?.id);
  const hasGpMedicationHistory = String(selectedSummary?.gpMedicationHistory || '').trim().toUpperCase() === 'YES';

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80, render: (id) => <Text strong>#{id}</Text> },
    {
      title: 'Patient Name',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 320,
      render: (_, row) => (
        <div className="flex flex-col leading-tight">
          <Text strong className="!text-slate-900 !text-sm">
            {row.patientName}
          </Text>
          <Text className="!text-xs !text-slate-500">{row.patientExperience}</Text>
          <Text className="!text-xs !text-slate-500 !truncate" title={row.patientAddress}>
            {row.patientAddress}
          </Text>
        </div>
      ),
    },
    { title: 'User Type', dataIndex: 'userType', key: 'userType', width: 120 },
    { title: 'Service Type', dataIndex: 'serviceType', key: 'serviceType', width: 140 },
    { title: 'Consultation For', dataIndex: 'consultationFor', key: 'consultationFor', width: 170 },
    { title: 'Service Name', dataIndex: 'serviceName', key: 'serviceName', width: 180 },
    { title: 'Queue', dataIndex: 'queueType', key: 'queueType', width: 140 },
    {
      title: 'Consultation Mode',
      dataIndex: 'consultationMode',
      key: 'consultationMode',
      width: 170,
      render: (mode) => getModeTag(mode),
    },
    {
      title: 'Action',
      key: 'action',
      width: 170,
      render: (_, row) => {
        const canRespond = canDoctorRespondToRequest(row.appointment, user?.id);
        if (!canRespond) {
          return (
            <Button size="small" onClick={() => openDetailModal(row.appointment)}>
              View
            </Button>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <Button type="primary" size="small" onClick={() => openDetailModal(row.appointment)}>
              Accept
            </Button>
            <Button size="small" danger onClick={() => openDeclineModal(row.appointment)}>
              Decline
            </Button>
          </div>
        );
      },
    },
  ];

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

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0e7490',
          colorSuccess: '#059669',
          borderRadius: 12,
          fontFamily: '"Outfit", sans-serif',
        },
        components: {
          Segmented: {
            trackBg: '#e6f7fb',
            itemColor: '#155e75',
            itemHoverColor: '#0e7490',
            itemSelectedBg: '#0e7490',
            itemSelectedColor: '#ffffff',
          },
        },
      }}
    >
      <div className="min-h-screen bg-[#f5f8ff] text-slate-900">
        {messageContextHolder}
        <SharedNavbar
          user={user}
          brandLabel="CareBridge"
          onLogoClick={() => navigate('/dashboard')}
          navItems={doctorNavItems}
          activeTab="waiting-room"
          onTabClick={handleDoctorNavClick}
          isOnline={isOnline}
          onToggleOnline={handleToggleOnline}
          pendingCount={enrichedAppointments.filter((appointment) => appointment.status === 'PENDING').length}
          doctorName={doctorDisplayName}
          onLogout={logout}
          showMobileTabs
        />

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <Card bordered={false} className="shadow-sm">
            <Title level={3} style={{ marginTop: 0 }}>Patient Waiting List</Title>

            <Row gutter={[12, 12]}>
              <Col xs={24} lg={8}>
                <Card
                  bordered={false}
                  styles={{ body: { background: 'linear-gradient(135deg,#0e7490,#155e75)', borderRadius: 16 } }}
                >
                  <div className="flex items-start gap-3 text-white">
                    <Avatar
                      size={64}
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${highlightedCardName}&backgroundColor=ffffff`}
                      style={{ background: '#fff' }}
                    />
                    <div className="min-w-0">
                      <Text className="!mb-0 !block !truncate !text-xl !font-black !text-white">
                        {highlightedCardName.toUpperCase()}
                      </Text>
                      <Text className="!block !text-white/80">{highlightedServiceName}</Text>
                      <Text className="!block !text-white/80">{highlightedDoctorExperience}</Text>
                      <Text className="!block !max-w-[360px] !truncate !text-white/80" title={highlightedDoctorAddress}>
                        {highlightedDoctorAddress}
                      </Text>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Text className="!text-base !font-black !text-white">{todayLabel}</Text>
                    <Text className="!text-base !font-black !text-white">{todayWeekday}</Text>
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={16}>
                <Row gutter={[12, 12]}>
                  {[
                    { title: 'Total Appointments', value: scopedRecords.length, icon: <Users size={16} color="#fff" />, bg: '#0e7490' },
                    { title: 'Waiting Room', value: pendingRecords.length, icon: <Clock3 size={16} color="#fff" />, bg: '#0891b2' },
                    { title: 'Completed Today', value: completedToday.length, icon: <CheckCircle size={16} color="#fff" />, bg: '#059669' },
                    { title: 'Avg. Wait Time', value: `${avgWaitMinutes} Minutes`, icon: <TimerReset size={16} color="#fff" />, bg: '#155e75' },
                  ].map((item) => (
                    <Col xs={24} sm={12} lg={12} xl={6} key={item.title}>
                      <Card size="small" className="h-full">
                        <div className="flex items-center justify-between">
                          <Statistic title={item.title} value={item.value} valueStyle={{ fontWeight: 800, fontSize: 24 }} />
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-xl"
                            style={{ backgroundColor: item.bg }}
                          >
                            {item.icon}
                          </div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>

                <Alert
                  style={{ marginTop: 12 }}
                  type="info"
                  message={`${waitingTab === 'general' ? 'General Queue' : 'Doctor Specific Queue'}: ${scopedRecords.length} total, ${pendingRecords.length} waiting, ${completedToday.length} completed today (${todayLabel}).`}
                  showIcon
                />
              </Col>
            </Row>

            <div className="mt-4 mb-4">
              <Segmented
                block={false}
                value={waitingTab}
                onChange={(value) => setWaitingTab(String(value))}
                options={[
                  { label: 'General Waiting Room', value: 'general' },
                  { label: 'Doctor Specific Requests', value: 'doctor' },
                ]}
                style={{ padding: 4, borderRadius: 12 }}
              />
            </div>

            <Table
              columns={columns}
              dataSource={tableData}
              loading={loading}
              pagination={false}
              scroll={{ x: 1100 }}
              locale={{
                emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Data" />,
              }}
              size="middle"
            />
          </Card>
        </main>

        <Modal
          title={`Incoming Request - ${selectedPatientName}`}
          open={detailModalOpen}
          onCancel={closeDetailModal}
          width={840}
          footer={selectedCanRespond
            ? [
                <Button
                  key="open-decline"
                  danger
                  onClick={() => {
                    setDetailModalOpen(false);
                    openDeclineModal(selectedAppointment);
                  }}
                  disabled={submittingAction}
                >
                  Decline
                </Button>,
                <Button
                  key="accept"
                  type="primary"
                  loading={submittingAction}
                  onClick={handleAcceptRequest}
                >
                  Accept Request
                </Button>,
              ]
            : [
                <Button key="close" onClick={closeDetailModal}>
                  Close
                </Button>,
              ]}
        >
          {!selectedAppointment ? null : (
            <Tabs
              defaultActiveKey="health"
              items={[
                {
                  key: 'health',
                  label: 'Health Concerns',
                  children: (
                    <div className="space-y-3">
                      <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Primary concern</p>
                        <p className="mt-1 text-[15px] font-semibold leading-6 text-slate-900">
                          {String(selectedSummary?.patientReason || '').trim() || 'Not provided'}
                        </p>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Clinical context</p>
                        <div className="mt-2.5 space-y-2.5 text-sm">
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">Allergies</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{String(selectedSummary?.allergies || '').trim() || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">Medical conditions</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">
                              {selectedSummary?.noMedicalCondition
                                ? 'No medical condition selected'
                                : selectedConditions.length > 0
                                  ? selectedConditions.join(', ')
                                  : 'Not provided'}
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Supporting files</p>
                        {selectedUploadedFiles.length > 0 ? (
                          <ul className="mt-2 ml-4 list-disc space-y-1 text-[14px] font-medium text-slate-900">
                            {selectedUploadedFiles.map((fileName) => (
                              <li key={fileName}>{fileName}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-[14px] font-medium text-slate-600">No files uploaded</p>
                        )}
                      </section>
                    </div>
                  ),
                },
                {
                  key: 'qa',
                  label: 'Questions & Answers',
                  children: (
                    <div className="space-y-3">
                      <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Consultation history</p>
                        <div className="mt-2.5 space-y-2.5 text-sm">
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">Seen any doctor/clinic in last 12 months?</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{String(selectedSummary?.recentConsultationResponse || '').trim() || 'Not answered'}</p>
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">Currently seeing GP or on medication?</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{String(selectedSummary?.gpMedicationHistory || '').trim() || 'Not answered'}</p>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">GP / medication details</p>
                        {hasGpMedicationHistory ? (
                          <div className="mt-2.5 border-l-2 border-slate-300 pl-3 space-y-2.5 text-sm">
                            <div>
                              <p className="text-[12px] font-semibold text-slate-500">Current GP Name</p>
                              <p className="text-[14px] font-medium leading-5 text-slate-900">{String(selectedSummary?.currentGpName || '').trim() || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="text-[12px] font-semibold text-slate-500">Current GP Email</p>
                              <p className="text-[14px] font-medium leading-5 text-slate-900">{String(selectedSummary?.currentGpEmail || '').trim() || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="text-[12px] font-semibold text-slate-500">Medicine Name</p>
                              <p className="text-[14px] font-medium leading-5 text-slate-900">{String(selectedSummary?.medicineName || '').trim() || 'Not provided'}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1 text-[14px] font-medium text-slate-600">No GP/medication sub-details provided.</p>
                        )}
                      </section>
                    </div>
                  ),
                },
                {
                  key: 'details',
                  label: 'More Details',
                  children: (
                    <div className="space-y-3">
                      <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Patient identity</p>
                        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 text-sm">
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">Patient Name</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{selectedPatientName}</p>
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">Patient Email</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{selectedAppointment?.patient?.email || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">User Type</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{selectedAppointment?.familyMember ? 'Family Member' : 'Self'}</p>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Appointment details</p>
                        <div className="mt-2.5 border-l-2 border-slate-300 pl-3 space-y-2.5 text-sm">
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">Service Name</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{String(selectedSummary?.serviceName || '').trim() || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">Service Type</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{String(selectedSummary?.serviceType || selectedAppointment?.type || '').trim() || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">Consultation Mode</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{selectedAppointment?.consultationMode || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">Queue Type</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{isGeneralQueueRecord(selectedAppointment, user?.id) ? 'General Queue' : 'Doctor Specific'}</p>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Health identifiers</p>
                        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 text-sm">
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">Medicare Card Number</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{String(selectedProfile?.medicareCardNumber || '').trim() || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">Medicare IRN</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{String(selectedProfile?.medicareIrn || '').trim() || 'Not provided'}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-[12px] font-semibold text-slate-500">Health Identifier Type</p>
                            <p className="text-[14px] font-medium leading-5 text-slate-900">{String(selectedProfile?.healthIdentifierType || '').trim() || 'Not provided'}</p>
                          </div>
                        </div>
                      </section>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Modal>

        <Modal
          title="Decline Request"
          open={declineModalOpen}
          onCancel={closeDeclineModal}
          footer={[
            <Button key="cancel" onClick={closeDeclineModal} disabled={submittingAction}>
              Cancel
            </Button>,
            <Button key="decline" danger type="primary" loading={submittingAction} onClick={handleDeclineRequest}>
              Decline Request
            </Button>,
          ]}
        >
          <Text className="!mb-2 !block !text-sm !text-slate-600">
            Add a brief reason for declining this request.
          </Text>
          <TextArea
            rows={4}
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            placeholder="Example: I am unavailable right now."
          />
        </Modal>
      </div>
    </ConfigProvider>
  );
}

