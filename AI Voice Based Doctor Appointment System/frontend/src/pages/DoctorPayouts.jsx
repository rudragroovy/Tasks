import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Avatar, Button, Card, ConfigProvider, DatePicker, Empty, Pagination, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { CalendarDays, Download, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SharedNavbar from '../components/SharedNavbar';
import { formatDoctorName } from '../utils/doctorName';
import { DOCTOR_NAV_ITEMS, handleDoctorNavClick as navigateDoctorNavClick } from '../utils/doctorNavigation';

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

function formatDateTime(rawDate) {
  if (!rawDate) return '--';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPayoutAmount(appointment) {
  const fee = Number.parseFloat(appointment?.doctor?.doctorProfile?.fee ?? appointment?.doctor?.fee ?? 0);
  return Number.isFinite(fee) ? fee : 0;
}

function getPayoutStatus(appointment) {
  if (appointment?.paymentStatus !== 'PAID') return 'UNPAID';
  return 'PENDING';
}

function getPayoutStatusToken(status) {
  if (status === 'PENDING') {
    return {
      label: 'Pending',
      className: 'bg-amber-100 text-amber-700 border border-amber-200',
    };
  }
  return {
    label: status === 'FAILED' ? 'Failed' : 'Unpaid',
    className: 'bg-rose-100 text-rose-700 border border-rose-200',
  };
}

function downloadPayoutSlip(payout) {
  const lines = [
    `Payout #${payout.payoutNumber}`,
    `Patient: ${payout.patientName}`,
    `Appointment Type: ${payout.appointmentType}`,
    `Consultation: ${payout.consultationLabel}`,
    `Appointment Date: ${formatDateTime(payout.appointmentDate)}`,
    `Payout Date: ${formatDateTime(payout.payoutDate)}`,
    `Status: ${payout.status}`,
    `Amount: ${payout.amount.toFixed(2)}`,
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `payout-${payout.payoutNumber}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function DoctorPayouts() {
  const PAGE_SIZE = 15;
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

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
        console.error('Failed to fetch payouts data', error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const doctorName = formatDoctorName(user?.name, 'Doctor');

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

  const payoutRows = useMemo(() => {
    const authenticatedDoctorId = user?.id;

    return appointments
      .filter((appointment) => {
        if (!authenticatedDoctorId) return false;
        const appointmentDoctorId = appointment?.doctorId || appointment?.doctor?.id;
        return appointmentDoctorId === authenticatedDoctorId && appointment?.paymentStatus === 'PAID';
      })
      .map((appointment) => {
        const appointmentDate = getAppointmentDate(appointment);
        const payoutDate = appointment?.updatedAt || appointment?.createdAt || appointmentDate;
        const patientName = appointment?.familyMember?.name || appointment?.patient?.name || 'Unknown Patient';
        const consultationLabel =
          appointment?.doctor?.doctorProfile?.specialization?.name ||
          appointment?.doctor?.specialization?.name ||
          'Standard Consultation';

        return {
          id: appointment.id,
          payoutNumber: appointment.id,
          patientName,
          avatarSeed: patientName,
          appointmentType: appointment?.type || 'ON_DEMAND',
          consultationLabel,
          appointmentDate,
          payoutDate,
          amount: getPayoutAmount(appointment),
          status: getPayoutStatus(appointment),
        };
      })
      .sort((a, b) => (b.appointmentDate?.getTime() || 0) - (a.appointmentDate?.getTime() || 0));
  }, [appointments, user?.id]);

  const filteredPayouts = useMemo(() => {
    return payoutRows.filter((payout) => {
      if (appointmentTypeFilter !== 'ALL' && payout.appointmentType !== appointmentTypeFilter) return false;
      if (statusFilter !== 'ALL' && payout.status !== statusFilter) return false;

      if (dateFilter) {
        if (!payout.appointmentDate) return false;
        const selected = dayjs(dateFilter);
        const apptDate = dayjs(payout.appointmentDate);
        if (!selected.isSame(apptDate, 'day')) return false;
      }

      return true;
    });
  }, [payoutRows, appointmentTypeFilter, statusFilter, dateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [appointmentTypeFilter, statusFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPayouts.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPayouts = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredPayouts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredPayouts, currentPage, PAGE_SIZE]);

  const pendingCount = appointments.filter((appointment) => appointment.status === 'PENDING').length;

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
            <div className="mb-4 border-b border-slate-100 pb-3">
              <Title level={3} style={{ margin: 0 }} className="!font-heading !font-black !text-slate-900">
                Pay-outs
              </Title>
            </div>

            <Space wrap size={12} className="mb-5 !flex">
              <Select
                value={appointmentTypeFilter}
                onChange={setAppointmentTypeFilter}
                options={[
                  { value: 'ALL', label: 'Appointment Type' },
                  { value: 'ON_DEMAND', label: 'On-Demand' },
                  { value: 'SCHEDULED', label: 'Scheduled' },
                ]}
                style={{ width: 320 }}
              />
              <DatePicker
                value={dateFilter}
                onChange={setDateFilter}
                placeholder="Select Date"
                style={{ width: 320 }}
                suffixIcon={<CalendarDays size={14} />}
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'ALL', label: 'Status' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'UNPAID', label: 'Unpaid' },
                ]}
                style={{ width: 320 }}
              />
            </Space>

            {filteredPayouts.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20">
                <Empty description={<span className="text-base font-semibold text-slate-500">No payout records found</span>} />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedPayouts.map((payout) => (
                    <Card
                      key={payout.id}
                      bordered
                      className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                      styles={{ body: { padding: 14 } }}
                    >
                      <div className="mb-3 flex items-center gap-2.5">
                        <Avatar
                          size={52}
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            payout.avatarSeed
                          )}&backgroundColor=f1f5f9`}
                        />
                        <Text className="!text-lg !font-black !leading-tight !text-primary-900">{payout.patientName}</Text>
                      </div>

                      <div className="mb-3 rounded-xl bg-slate-50 p-3">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500">
                            <FileText size={16} />
                          </span>
                          <div>
                            <p className="text-base font-black leading-tight text-primary-900">{payout.consultationLabel}</p>
                            <p className="text-sm font-medium leading-tight text-slate-500">{formatDateTime(payout.appointmentDate)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3 rounded-xl bg-slate-50 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-sm font-semibold leading-tight text-slate-500">Status :</p>
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-black ${getPayoutStatusToken(payout.status).className}`}
                          >
                            {getPayoutStatusToken(payout.status).label}
                          </span>
                        </div>
                        <div className="mb-1 flex items-center justify-between gap-3 leading-tight">
                          <p className="text-sm font-semibold text-slate-500">Payout number :</p>
                          <p className="min-w-[120px] text-right text-base font-bold text-slate-800">{payout.payoutNumber}</p>
                        </div>
                        <div className="mb-1 flex items-center justify-between gap-3 leading-tight">
                          <p className="text-sm font-semibold text-slate-500">Payout Date :</p>
                          <p className="text-base font-bold text-slate-800">{formatDateTime(payout.payoutDate)}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3 leading-tight">
                          <p className="text-sm font-semibold text-slate-500">Amount :</p>
                          <p className="text-lg font-black text-slate-900">{payout.amount.toFixed(2)}</p>
                        </div>
                      </div>

                      <Button
                        block
                        type="primary"
                        icon={<Download size={14} />}
                        className="!h-10 !rounded-lg !bg-primary-700 !text-sm !font-bold hover:!bg-primary-800"
                        onClick={() => downloadPayoutSlip(payout)}
                      >
                        Download
                      </Button>
                    </Card>
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={filteredPayouts.length}
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

