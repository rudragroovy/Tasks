import { Suspense, lazy, useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import axios from 'axios';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/auth/AuthModal';
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DoctorsList = lazy(() => import('./pages/DoctorsList'));
const Booking = lazy(() => import('./pages/Booking'));
const MeetingRoom = lazy(() => import('./pages/MeetingRoom'));
const DoctorInPersonSession = lazy(() => import('./pages/DoctorInPersonSession'));
const PatientInPersonSession = lazy(() => import('./pages/PatientInPersonSession'));
const PatientWaitingRoom = lazy(() => import('./pages/PatientWaitingRoom'));
const DoctorWaitingRoom = lazy(() => import('./pages/DoctorWaitingRoom'));
const DoctorAppointments = lazy(() => import('./pages/DoctorAppointments'));
const DoctorPatients = lazy(() => import('./pages/DoctorPatients'));
const DoctorChat = lazy(() => import('./pages/DoctorChat'));
const PatientChat = lazy(() => import('./pages/PatientChat'));
const DoctorPayouts = lazy(() => import('./pages/DoctorPayouts'));
const DoctorMedicalDocuments = lazy(() => import('./pages/DoctorMedicalDocuments'));
const DoctorInvoices = lazy(() => import('./pages/DoctorInvoices'));
const DoctorReviews = lazy(() => import('./pages/DoctorReviews'));
const DoctorProfile = lazy(() => import('./pages/DoctorProfile'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const MockCheckout = lazy(() => import('./pages/MockCheckout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage'));
const PatientDoctorReviews = lazy(() => import('./pages/PatientDoctorReviews'));
const PatientAccount = lazy(() => import('./pages/PatientAccount'));
const ServiceTypePage = lazy(() => import('./pages/ServiceTypePage'));
const BookingFlowPage = lazy(() => import('./pages/BookingFlowPage'));
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getDefaultPostAuthPath(user) {
  if (user?.role === 'ADMIN') return '/admin';
  if (user?.role === 'DOCTOR') return '/dashboard';
  return '/';
}

function AuthRouteRedirect({ mode }) {
  const { user, openAuthModal } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(getDefaultPostAuthPath(user), { replace: true });
      return;
    }

    const params = new URLSearchParams(location.search);
    const redirectTo = params.get('redirectTo') || '/dashboard';
    openAuthModal({ mode, redirectTo });
    navigate('/', { replace: true });
  }, [location.search, mode, navigate, openAuthModal, user]);

  return null;
}

function RequireAuthRedirect({ redirectTo }) {
  const { openAuthModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    openAuthModal({ mode: 'login', redirectTo });
    navigate('/', { replace: true });
  }, [navigate, openAuthModal, redirectTo]);

  return null;
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <RequireAuthRedirect redirectTo={`${location.pathname}${location.search}`} />;
  }
  return children;
}

function getJoinRouteForAppointment(appointment, role) {
  if (!appointment?.id) return '/dashboard';
  const mode = String(appointment.consultationMode || '').toUpperCase();
  if (mode === 'IN_PERSON') {
    if (role === 'DOCTOR') return `/doctor/in-person/${appointment.id}`;
    return `/patient/in-person/${appointment.id}`;
  }
  return `/room/${appointment.id}`;
}

function isOngoingAppointment(appointment) {
  if (!appointment || String(appointment.status || '').toUpperCase() !== 'ACCEPTED') return false;

  if (!appointment.scheduledFor) {
    return true; // on-demand accepted appointments are considered live until completed/cancelled.
  }

  const start = new Date(appointment.scheduledFor);
  if (Number.isNaN(start.getTime())) return false;

  const scheduledUntil = appointment.scheduledUntil ? new Date(appointment.scheduledUntil) : null;
  const fallbackEnd = new Date(start.getTime() + 90 * 60 * 1000);
  const end = scheduledUntil && !Number.isNaN(scheduledUntil.getTime()) ? scheduledUntil : fallbackEnd;

  const now = Date.now();
  const startsSoonMs = 15 * 60 * 1000;
  const staleWindowMs = 8 * 60 * 60 * 1000;
  return now >= (start.getTime() - startsSoonMs) && now <= (end.getTime() + staleWindowMs);
}

function OngoingMeetingOverlay() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [ongoingAppointment, setOngoingAppointment] = useState(null);

  const pathname = location.pathname || '';
  const isMeetingPath =
    pathname.startsWith('/room/') ||
    pathname.startsWith('/doctor/in-person/') ||
    pathname.startsWith('/patient/in-person/');

  useEffect(() => {
    if (!user || user.role === 'ADMIN' || isMeetingPath) {
      setOngoingAppointment(null);
      return undefined;
    }

    let cancelled = false;
    const fetchAppointments = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/appointments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (cancelled) return;

        const rows = Array.isArray(data) ? data : [];
        const live = rows
          .filter(isOngoingAppointment)
          .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());

        setOngoingAppointment(live[0] || null);
      } catch {
        if (!cancelled) setOngoingAppointment(null);
      }
    };

    fetchAppointments();
    const interval = setInterval(fetchAppointments, 15000);
    const onFocus = () => { fetchAppointments(); };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isMeetingPath, user]);

  if (!ongoingAppointment || !user || user.role === 'ADMIN' || isMeetingPath) return null;

  const joinRoute = getJoinRouteForAppointment(ongoingAppointment, user.role);
  if (pathname === joinRoute) return null;

  const counterpartName = user.role === 'DOCTOR'
    ? (ongoingAppointment.familyMember?.name || ongoingAppointment.patient?.name || 'Patient')
    : (ongoingAppointment.doctor?.name || 'Doctor');

  return (
    <div className="fixed bottom-5 right-5 z-[1500] w-[min(92vw,360px)] rounded-xl border border-emerald-200 bg-white p-4 shadow-2xl">
      <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Ongoing Meeting</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">
        Your meeting with {counterpartName} is still active.
      </p>
      <button
        type="button"
        onClick={() => navigate(joinRoute)}
        className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
      >
        Join Meeting
      </button>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-slate-500">
            Loading...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/category/:categoryKey" element={<CategoryPage />} />
          <Route path="/service-type/:serviceTypeKey" element={<ServiceTypePage />} />
          <Route path="/services/:serviceSlug" element={<ServiceDetailPage />} />
          <Route path="/booking/doctor/:doctorId" element={<ProtectedRoute><PatientDoctorReviews /></ProtectedRoute>} />
          <Route path="/booking/doctor/:doctorId/steps" element={<ProtectedRoute><BookingFlowPage /></ProtectedRoute>} />
          <Route path="/login" element={<AuthRouteRedirect mode="login" />} />
          <Route path="/register" element={<AuthRouteRedirect mode="register" />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/doctors" element={<ProtectedRoute><DoctorsList /></ProtectedRoute>} />
          <Route path="/booking" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
          <Route path="/room/:appointmentId" element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />
          <Route path="/doctor/in-person/:appointmentId" element={<ProtectedRoute><DoctorInPersonSession /></ProtectedRoute>} />
          <Route path="/doctor/waiting-room" element={<ProtectedRoute><DoctorWaitingRoom /></ProtectedRoute>} />
          <Route path="/doctor/appointments" element={<ProtectedRoute><DoctorAppointments /></ProtectedRoute>} />
          <Route path="/doctor/patients" element={<ProtectedRoute><DoctorPatients /></ProtectedRoute>} />
          <Route path="/doctor/chat" element={<ProtectedRoute><DoctorChat /></ProtectedRoute>} />
          <Route path="/patient/chat" element={<ProtectedRoute><PatientChat /></ProtectedRoute>} />
          <Route path="/patient/account" element={<ProtectedRoute><PatientAccount /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><PatientAccount /></ProtectedRoute>} />
          <Route path="/doctor/payouts" element={<ProtectedRoute><DoctorPayouts /></ProtectedRoute>} />
          <Route path="/doctor/medical-documents" element={<ProtectedRoute><DoctorMedicalDocuments /></ProtectedRoute>} />
          <Route path="/doctor/invoices" element={<ProtectedRoute><DoctorInvoices /></ProtectedRoute>} />
          <Route path="/doctor/reviews" element={<ProtectedRoute><DoctorReviews /></ProtectedRoute>} />
          <Route path="/doctor/profile" element={<ProtectedRoute><DoctorProfile /></ProtectedRoute>} />
          <Route path="/patient/in-person/:appointmentId" element={<ProtectedRoute><PatientInPersonSession /></ProtectedRoute>} />
          <Route path="/waiting-room" element={<ProtectedRoute><PatientWaitingRoom /></ProtectedRoute>} />
          <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/mock-checkout" element={<ProtectedRoute><MockCheckout /></ProtectedRoute>} />
          <Route path="/family-members" element={<Navigate to="/patient/account?tab=family" replace />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </Suspense>
      <OngoingMeetingOverlay />
      <AuthModal />
    </div>
  );
}

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Router>
        <AppRoutes />
      </Router>
    </MotionConfig>
  );
}

export default App;
