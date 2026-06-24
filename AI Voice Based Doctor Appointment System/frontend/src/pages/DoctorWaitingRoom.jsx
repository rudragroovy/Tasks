import { useEffect, useMemo, useState } from 'react';
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
  Row,
  Segmented,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircle,
  ChevronRight,
  Clock3,
  TimerReset,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SharedNavbar from '../components/SharedNavbar';
import { formatDoctorName } from '../utils/doctorName';

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

export default function DoctorWaitingRoom() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [waitingTab, setWaitingTab] = useState('general');
  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));

  const today = useMemo(() => new Date(), []);
  const todayLabel = formatDateLabel(today);
  const todayWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(today);

  useEffect(() => {
    setIsOnline(Boolean(user?.doctorProfile?.isOnline));
  }, [user?.doctorProfile?.isOnline]);

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
        console.error('Failed to fetch waiting room data', error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const doctorSpecificRecords = useMemo(
    () =>
      appointments.filter(
        (appointment) => {
          const isPrimaryDoctor = appointment.doctorId === user?.id;
          const hasLegacyAssignedDoctor =
            appointment.assignedDoctorId === user?.id || appointment.invitedDoctorId === user?.id;
          const isInvitedDoctor = Array.isArray(appointment.invitedDoctors)
            ? appointment.invitedDoctors.some(
                (invite) => invite?.doctorId === user?.id && invite?.status !== 'REJECTED'
              )
            : false;
          return isPrimaryDoctor || hasLegacyAssignedDoctor || isInvitedDoctor;
        }
      ),
    [appointments, user?.id]
  );

  const scopedRecords = waitingTab === 'general' ? appointments : doctorSpecificRecords;

  const pendingRecords = useMemo(
    () => scopedRecords.filter((appointment) => appointment.status === 'PENDING'),
    [scopedRecords]
  );

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
  const highlightedCardName =
    highlightedPatient?.familyMember?.name || highlightedPatient?.patient?.name || doctorDisplayName;
  const highlightedConsultationKind =
    highlightedPatient?.type === 'SCHEDULED' ? 'Scheduled Consultation' : 'On-Demand Consultation';
  const highlightedServiceName =
    highlightedPatient?.doctor?.doctorProfile?.specialization?.name ||
    highlightedPatient?.doctor?.specialization?.name ||
    'General Consultation';
  const highlightedDateRaw =
    highlightedPatient?.scheduledFor || highlightedPatient?.createdAt || highlightedPatient?.updatedAt;
  const highlightedDate = highlightedDateRaw ? new Date(highlightedDateRaw) : null;
  const highlightedTimeLabel =
    highlightedDate && !Number.isNaN(highlightedDate.getTime())
      ? highlightedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '--';

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
    userType: appointment.familyMember ? 'Family' : 'Self',
    serviceType: appointment.type || 'ON_DEMAND',
    consultationFor: appointment.familyMember ? 'Family Member' : 'Self',
    serviceName:
      appointment.doctor?.doctorProfile?.specialization?.name ||
      appointment.doctor?.specialization?.name ||
      '-',
    consultationMode: appointment.consultationMode || '-',
    appointment,
  }));

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80, render: (id) => <Text strong>#{id}</Text> },
    { title: 'Patient Name', dataIndex: 'patientName', key: 'patientName', width: 220 },
    { title: 'User Type', dataIndex: 'userType', key: 'userType', width: 120 },
    { title: 'Service Type', dataIndex: 'serviceType', key: 'serviceType', width: 140 },
    { title: 'Consultation For', dataIndex: 'consultationFor', key: 'consultationFor', width: 170 },
    { title: 'Service Name', dataIndex: 'serviceName', key: 'serviceName', width: 180 },
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
      width: 130,
      render: (_, row) => (
        <Button
          type="primary"
          size="small"
          icon={<ChevronRight size={14} />}
          onClick={() => navigate(getSessionRoute(row.appointment))}
        >
          Open
        </Button>
      ),
    },
  ];

  const doctorNavItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'waiting-room', label: 'Waiting Room' },
    { key: 'appointments', label: 'My Appointment' },
    { key: 'patients', label: 'My Patients' },
    { key: 'chat', label: 'Chat' },
    { key: 'more', label: 'More Options' },
  ];

  const handleDoctorNavClick = (key) => {
    if (key === 'dashboard') navigate('/dashboard');
    if (key === 'waiting-room') navigate('/doctor/waiting-room');
    if (key === 'appointments') navigate('/doctor/appointments');
    if (key === 'patients') navigate('/doctor/patients');
    if (key === 'chat') navigate('/doctor/chat');
    if (key === 'pay-out') navigate('/doctor/payouts');
    if (key === 'medical-documents') navigate('/doctor/medical-documents');
    if (key === 'invoices') navigate('/doctor/invoices');
    if (key === 'my-profile') navigate('/doctor/profile');
    if (key === 'change-password') navigate('/doctor/profile?tab=settings');
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
          fontFamily: '"Noto Sans", sans-serif',
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
        <SharedNavbar
          user={user}
          brandLabel="MyDrScripts"
          onLogoClick={() => navigate('/dashboard')}
          navItems={doctorNavItems}
          activeTab="waiting-room"
          onTabClick={handleDoctorNavClick}
          isOnline={isOnline}
          onToggleOnline={handleToggleOnline}
          pendingCount={appointments.filter((appointment) => appointment.status === 'PENDING').length}
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
                      <Text className="!block !text-white/95">
                        {highlightedConsultationKind} - {highlightedTimeLabel}
                      </Text>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Text className="!text-base !font-black !text-white">{todayLabel}</Text>
                    <Text className="!text-base !font-black !text-white">{todayWeekday}</Text>
                  </div>
                </Card>
              </Col>

              {[
                { title: 'Total Appointments', value: scopedRecords.length, icon: <Users size={16} color="#fff" />, bg: '#0e7490' },
                { title: 'Waiting Room', value: pendingRecords.length, icon: <Clock3 size={16} color="#fff" />, bg: '#0891b2' },
                { title: 'Completed Today', value: completedToday.length, icon: <CheckCircle size={16} color="#fff" />, bg: '#059669' },
                { title: 'Avg. Wait Time', value: `${avgWaitMinutes} Minutes`, icon: <TimerReset size={16} color="#fff" />, bg: '#155e75' },
              ].map((item) => (
                <Col xs={24} sm={12} lg={4} key={item.title}>
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
              style={{ marginTop: 12, marginBottom: 16 }}
              type="info"
              message={`${waitingTab === 'general' ? 'General Queue' : 'Doctor Specific Queue'}: ${scopedRecords.length} total, ${pendingRecords.length} waiting, ${completedToday.length} completed today (${todayLabel}).`}
              showIcon
            />

            <Segmented
              block={false}
              value={waitingTab}
              onChange={setWaitingTab}
              options={[
                { label: 'General Waiting Room', value: 'general' },
                { label: 'Doctor Specific Requests', value: 'doctor' },
              ]}
              style={{ marginBottom: 14, padding: 4, borderRadius: 12 }}
            />

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
      </div>
    </ConfigProvider>
  );
}

