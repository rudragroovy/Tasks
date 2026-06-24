import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  ConfigProvider,
  DatePicker,
  Empty,
  Input,
  Pagination,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { CalendarDays, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SharedNavbar from '../components/SharedNavbar';
import { formatDoctorName } from '../utils/doctorName';

const { RangePicker } = DatePicker;
const { Title } = Typography;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getAppointmentDate(appointment) {
  const rawDate =
    appointment?.scheduledAt ||
    appointment?.startTime ||
    appointment?.appointmentTime ||
    appointment?.createdAt ||
    appointment?.updatedAt;
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getSessionRoute(appointment) {
  if (appointment?.consultationMode === 'IN_PERSON') return `/doctor/in-person/${appointment.id}`;
  return `/room/${appointment.id}`;
}

function getStatusTag(status) {
  if (status === 'ACCEPTED') return <Tag color="cyan">IN PROGRESS</Tag>;
  if (status === 'PENDING') return <Tag color="gold">PENDING</Tag>;
  if (status === 'COMPLETED') return <Tag color="green">COMPLETED</Tag>;
  if (status === 'REJECTED' || status === 'CANCELLED') return <Tag color="red">CANCELLED</Tag>;
  return <Tag color="default">{status || 'UNKNOWN'}</Tag>;
}

export default function DoctorAppointments() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTab = searchParams.get('tab');
  const initialSearch = searchParams.get('q') || '';
  const selectedPatientId = searchParams.get('patientId');

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    initialTab === 'past' || initialTab === 'upcoming' || initialTab === 'current' ? initialTab : 'current'
  );
  const [search, setSearch] = useState(initialSearch);
  const [dateRange, setDateRange] = useState(null);
  const [page, setPage] = useState(1);
  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));
  const pageSize = 8;

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
        console.error('Failed to fetch doctor appointments', error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const doctorName = formatDoctorName(user?.name, 'Doctor');

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

  const tabbedAppointments = useMemo(() => {
    if (activeTab === 'current') {
      return appointments.filter(
        (appointment) =>
          appointment.status === 'ACCEPTED' ||
          (appointment.status === 'PENDING' && appointment.type === 'ON_DEMAND')
      );
    }

    if (activeTab === 'upcoming') {
      return appointments.filter(
        (appointment) =>
          appointment.type === 'SCHEDULED' &&
          appointment.status !== 'COMPLETED' &&
          appointment.status !== 'REJECTED' &&
          appointment.status !== 'CANCELLED'
      );
    }

    return appointments.filter(
      (appointment) =>
        appointment.status === 'COMPLETED' ||
        appointment.status === 'REJECTED' ||
        appointment.status === 'CANCELLED'
    );
  }, [appointments, activeTab]);

  const filteredAppointments = useMemo(() => {
    return tabbedAppointments.filter((appointment) => {
      const patientName = (appointment.familyMember?.name || appointment.patient?.name || '').toLowerCase();
      const nameMatch = !search.trim() || patientName.includes(search.trim().toLowerCase());
      const patientMatch =
        !selectedPatientId || (appointment?.patient?.id || appointment?.patientId) === selectedPatientId;

      if (!nameMatch || !patientMatch) return false;
      if (!dateRange || !dateRange[0] || !dateRange[1]) return true;

      const appointmentDate = getAppointmentDate(appointment);
      if (!appointmentDate) return false;

      const value = dayjs(appointmentDate);
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');

      return (value.isAfter(start) || value.isSame(start)) && (value.isBefore(end) || value.isSame(end));
    });
  }, [tabbedAppointments, search, dateRange, selectedPatientId]);

  const maxPage = Math.max(1, Math.ceil(filteredAppointments.length / pageSize));
  const currentPage = Math.min(page, maxPage);
  const paginatedAppointments = filteredAppointments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (id) => <span className="font-semibold">#{id}</span>,
    },
    {
      title: 'Patient Name',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 220,
    },
    {
      title: 'Date & Time',
      dataIndex: 'date',
      key: 'date',
      width: 200,
    },
    {
      title: 'Consultation Mode',
      dataIndex: 'mode',
      key: 'mode',
      width: 180,
      render: (mode) => <Tag color="blue">{mode}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 160,
    },
  ];

  const tableData = paginatedAppointments.map((appointment) => {
    const date = getAppointmentDate(appointment);
    const canOpen = appointment.status === 'ACCEPTED' || appointment.consultationMode === 'IN_PERSON';

    return {
      key: appointment.id,
      id: appointment.id,
      patientName: appointment.familyMember?.name || appointment.patient?.name || 'Unknown Patient',
      date: date
        ? date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Not scheduled',
      mode: appointment.consultationMode || 'VIDEO',
      status: appointment.status,
      action: canOpen ? (
        <Button type="primary" size="small" onClick={() => navigate(getSessionRoute(appointment))}>
          Open Session
        </Button>
      ) : (
        <span className="text-xs text-slate-400">-</span>
      ),
    };
  });

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
          activeTab="appointments"
          onTabClick={handleDoctorNavClick}
          isOnline={isOnline}
          onToggleOnline={handleToggleOnline}
          pendingCount={appointments.filter((appointment) => appointment.status === 'PENDING').length}
          doctorName={doctorName}
          onLogout={logout}
          showMobileTabs
        />

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <Card bordered={false} className="shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Title level={3} style={{ margin: 0 }}>
                My Appointment
              </Title>
              <Segmented
                value={activeTab}
                onChange={(value) => {
                  setActiveTab(value);
                  setPage(1);
                }}
                options={[
                  { value: 'current', label: 'Current Appointments' },
                  { value: 'upcoming', label: 'Upcoming Appointments' },
                  { value: 'past', label: 'Past Appointments' },
                ]}
                style={{ padding: 4, borderRadius: 12 }}
              />
            </div>

            <Space wrap size={12} className="mb-5">
              <Input
                allowClear
                prefix={<Search size={14} />}
                placeholder="Search By Name"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                style={{ width: 270 }}
              />
              <RangePicker
                value={dateRange}
                onChange={(value) => {
                  setDateRange(value);
                  setPage(1);
                }}
                placeholder={['Start Date', 'End Date']}
                suffixIcon={<CalendarDays size={14} />}
              />
            </Space>

            {tableData.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16">
                <Empty
                  description={<span className="text-base font-semibold text-slate-500">No appointment Found</span>}
                />
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={tableData}
                loading={loading}
                pagination={false}
                scroll={{ x: 980 }}
                size="middle"
              />
            )}

            <div className="mt-5 flex items-center justify-end gap-3 text-sm text-slate-500">
              <span>
                {filteredAppointments.length === 0 ? '0' : (currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(filteredAppointments.length, currentPage * pageSize)} of {filteredAppointments.length}
              </span>
              <Pagination
                simple
                current={currentPage}
                pageSize={pageSize}
                total={filteredAppointments.length}
                onChange={setPage}
                showSizeChanger={false}
              />
            </div>
          </Card>
        </main>
      </div>
    </ConfigProvider>
  );
}
