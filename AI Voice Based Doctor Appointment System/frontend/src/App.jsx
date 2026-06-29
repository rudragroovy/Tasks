import { Suspense, lazy, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
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
