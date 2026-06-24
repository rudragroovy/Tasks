import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Avatar, Button, Card, ConfigProvider, Empty, Pagination, Typography } from 'antd';
import { Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SharedNavbar from '../components/SharedNavbar';
import { formatDoctorName } from '../utils/doctorName';

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PAGE_SIZE = 12;

function getAppointmentDate(appointment) {
  const rawDate =
    appointment?.scheduledFor ||
    appointment?.scheduledAt ||
    appointment?.appointmentTime ||
    appointment?.updatedAt ||
    appointment?.createdAt;
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatHeaderDate(rawDate) {
  if (!rawDate) return '-- | --';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return '-- | --';
  const dateLabel = date.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeLabel = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateLabel} | ${timeLabel}`;
}

function formatInvoiceDate(rawDate) {
  if (!rawDate) return '--';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInvoiceAmount(appointment) {
  const fee = Number.parseFloat(appointment?.doctor?.doctorProfile?.fee ?? appointment?.doctor?.fee ?? 0);
  return Number.isFinite(fee) ? fee : 0;
}

function generateInvoiceNumber(rawId) {
  const base = String(rawId || '0');
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  const numeric = String(hash).padStart(8, '0').slice(0, 8);
  const suffix = ((hash * 2654435761) >>> 0).toString(36).toUpperCase().padStart(5, '0').slice(0, 5);
  return `IN-${numeric}-${suffix}`;
}

function buildInvoiceText(invoice) {
  return [
    `Invoice Number: ${invoice.invoiceNumber}`,
    `Patient: ${invoice.patientName}`,
    `Invoice Date: ${formatInvoiceDate(invoice.invoiceDate)}`,
    `Appointment Date: ${formatHeaderDate(invoice.appointmentDate).replace(' | ', ' ')}`,
    `Amount: $${invoice.amount.toFixed(2)}`,
  ].join('\n');
}

function downloadInvoice(invoice) {
  const blob = new Blob([buildInvoiceText(invoice)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `invoice-${invoice.invoiceNumber}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function viewInvoice(invoice) {
  const opened = window.open('', '_blank', 'noopener,noreferrer');
  if (!opened) {
    downloadInvoice(invoice);
    return;
  }

  opened.document.write(`
    <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { font-size: 22px; margin-bottom: 8px; }
          .row { margin: 8px 0; font-size: 16px; }
          .label { font-weight: 700; }
          .amount { font-size: 22px; font-weight: 800; margin-top: 16px; color: #312e81; }
        </style>
      </head>
      <body>
        <h1>Invoice</h1>
        <div class="row"><span class="label">Invoice Number:</span> ${invoice.invoiceNumber}</div>
        <div class="row"><span class="label">Patient:</span> ${invoice.patientName}</div>
        <div class="row"><span class="label">Invoice Date:</span> ${formatInvoiceDate(invoice.invoiceDate)}</div>
        <div class="row"><span class="label">Appointment Date:</span> ${formatHeaderDate(invoice.appointmentDate)}</div>
        <div class="amount">Total: $${invoice.amount.toFixed(2)}</div>
      </body>
    </html>
  `);
  opened.document.close();
}

export default function DoctorInvoices() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));
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
        console.error('Failed to fetch invoices', error);
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

  const invoices = useMemo(() => {
    const authenticatedDoctorId = user?.id;
    if (!authenticatedDoctorId) return [];

    return appointments
      .filter((appointment) => {
        const appointmentDoctorId = appointment?.doctorId || appointment?.doctor?.id;
        return appointmentDoctorId === authenticatedDoctorId && appointment?.paymentStatus === 'PAID';
      })
      .map((appointment) => {
        const patientName = appointment?.familyMember?.name || appointment?.patient?.name || 'Unknown Patient';
        const invoiceDate = appointment?.updatedAt || appointment?.createdAt || getAppointmentDate(appointment);
        return {
          id: appointment.id,
          patientName,
          invoiceNumber: generateInvoiceNumber(appointment.id),
          invoiceDate,
          appointmentDate: getAppointmentDate(appointment) || invoiceDate,
          amount: getInvoiceAmount(appointment),
        };
      })
      .sort((a, b) => (new Date(b.invoiceDate).getTime() || 0) - (new Date(a.invoiceDate).getTime() || 0));
  }, [appointments, user?.id]);

  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return invoices.slice(startIndex, startIndex + PAGE_SIZE);
  }, [invoices, currentPage]);

  const pendingCount = appointments.filter((appointment) => appointment.status === 'PENDING').length;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0e7490',
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
            <div className="mb-5">
              <Title level={3} style={{ margin: 0 }} className="!font-heading !font-black !text-slate-900">
                Invoices
              </Title>
            </div>

            {paginatedInvoices.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20">
                <Empty description={<span className="text-base font-semibold text-slate-500">No invoices found</span>} />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {paginatedInvoices.map((invoice) => (
                    <Card
                      key={invoice.id}
                      bordered
                      className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                      styles={{ body: { padding: 14 } }}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                          <p className="truncate text-[15px] font-bold tracking-tight text-slate-900">
                            {formatHeaderDate(invoice.invoiceDate)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadInvoice(invoice)}
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary-600 text-primary-700 transition-colors hover:bg-primary-50"
                          aria-label={`Download invoice ${invoice.invoiceNumber}`}
                        >
                          <Download size={20} />
                        </button>
                      </div>

                      <div className="mb-3 flex items-center gap-2.5">
                        <Avatar
                          size={44}
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            invoice.patientName
                          )}&backgroundColor=f1f5f9`}
                        />
                        <Text className="!truncate !text-base !font-bold !leading-tight !tracking-tight !text-primary-900">
                          {invoice.patientName}
                        </Text>
                      </div>

                      <div className="mb-3 space-y-1.5 rounded-xl bg-white">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-tight text-slate-900">Invoice Number:</p>
                          <p className="break-all text-right text-sm font-bold leading-tight tracking-tight text-primary-700">
                            {invoice.invoiceNumber}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold leading-tight text-slate-900">Invoice Date:</p>
                          <p className="text-right text-sm font-bold leading-tight tracking-tight text-primary-700">
                            {formatInvoiceDate(invoice.invoiceDate)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold leading-tight text-slate-900">Amount:</p>
                          <p className="text-right text-2xl font-black leading-tight tracking-tight text-primary-700">
                            ${invoice.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <Button
                        block
                        type="primary"
                        className="!h-10 !rounded-md !bg-primary-700 !text-sm !font-black hover:!bg-primary-800"
                        onClick={() => viewInvoice(invoice)}
                      >
                        VIEW INVOICE
                      </Button>
                    </Card>
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={invoices.length}
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

