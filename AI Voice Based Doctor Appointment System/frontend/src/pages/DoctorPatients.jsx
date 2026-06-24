import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Avatar,
  Button,
  Card,
  Col,
  ConfigProvider,
  Empty,
  Input,
  Pagination,
  Row,
  Space,
  Typography,
} from 'antd';
import { CalendarDays, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SharedNavbar from '../components/SharedNavbar';
import { formatDoctorName } from '../utils/doctorName';

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function isPastStatus(status) {
  return status === 'COMPLETED' || status === 'REJECTED' || status === 'CANCELLED';
}

export default function DoctorPatients() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));
  const pageSize = 9;

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
        console.error('Failed to fetch doctor patients data', error);
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

  const patients = useMemo(() => {
    const map = new Map();

    appointments.forEach((appointment) => {
      const patient = appointment?.patient;
      const patientId = patient?.id || appointment?.patientId;
      if (!patientId) return;

      const current = map.get(patientId) || {
        id: patientId,
        name: patient?.name || 'Unknown Patient',
        email: patient?.email || 'No email',
        image: patient?.avatar || patient?.image || patient?.photo || null,
        totalAppointments: 0,
        pastAppointments: 0,
      };

      current.totalAppointments += 1;
      if (isPastStatus(appointment?.status)) {
        current.pastAppointments += 1;
      }

      map.set(patientId, current);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.totalAppointments !== a.totalAppointments) return b.totalAppointments - a.totalAppointments;
      return a.name.localeCompare(b.name);
    });
  }, [appointments]);

  const filteredPatients = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((patient) => {
      return patient.name.toLowerCase().includes(q) || patient.email.toLowerCase().includes(q);
    });
  }, [patients, searchText]);

  const maxPage = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const currentPage = Math.min(page, maxPage);
  const pagedPatients = filteredPatients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0e7490',
          colorSuccess: '#059669',
          borderRadius: 12,
          fontFamily: '"Noto Sans", sans-serif',
        },
      }}
    >
      <div className="min-h-screen bg-[#f5f8ff] text-slate-900">
        <SharedNavbar
          user={user}
          brandLabel="MyDrScripts"
          onLogoClick={() => navigate('/dashboard')}
          navItems={doctorNavItems}
          activeTab="patients"
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
                My Patients
              </Title>
              <Input
                allowClear
                prefix={<Search size={14} />}
                placeholder="Search By Name"
                style={{ width: 270 }}
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            {pagedPatients.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20">
                <Empty description={<span className="text-base font-semibold text-slate-500">No patients found</span>} />
              </div>
            ) : (
              <Row gutter={[14, 14]}>
                {pagedPatients.map((patient) => (
                  <Col key={patient.id} xs={24} md={12} xl={8}>
                    <Card
                      bordered
                      className="group h-full overflow-hidden rounded-2xl border-slate-200 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <Space align="start" size={12} style={{ width: '100%' }}>
                        <Avatar
                          size={58}
                          src={
                            patient.image ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                              patient.name
                            )}&backgroundColor=f1f5f9`
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <Text className="!block !truncate !text-lg !font-black !text-slate-900">{patient.name}</Text>
                          <Text className="!block !truncate !text-sm !text-slate-500">{patient.email}</Text>
                        </div>
                      </Space>

                      <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50/60 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">Total Appointments</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xl font-black text-cyan-900">
                          <CalendarDays className="h-4 w-4" />
                          {patient.totalAppointments}
                        </p>
                      </div>

                      <Button
                        block
                        type="default"
                        className="mt-4 !h-10 !rounded-xl !border-cyan-700 !text-sm !font-bold !text-cyan-800 hover:!border-cyan-800 hover:!text-cyan-900"
                        onClick={() =>
                          navigate(
                            `/doctor/appointments?tab=past&patientId=${encodeURIComponent(patient.id)}&q=${encodeURIComponent(
                              patient.name
                            )}`
                          )
                        }
                      >
                        View All Past Appointment
                      </Button>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}

            <div className="mt-5 flex items-center justify-end gap-3 text-sm text-slate-500">
              <span>
                {filteredPatients.length === 0 ? '0' : (currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(filteredPatients.length, currentPage * pageSize)} of {filteredPatients.length}
              </span>
              <Pagination
                simple
                current={currentPage}
                pageSize={pageSize}
                total={filteredPatients.length}
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
