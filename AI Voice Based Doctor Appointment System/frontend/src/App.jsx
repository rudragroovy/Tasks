import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { useAuth } from './context/AuthContext';
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
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
const DoctorPayouts = lazy(() => import('./pages/DoctorPayouts'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const MockCheckout = lazy(() => import('./pages/MockCheckout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const MedicalHistory = lazy(() => import('./pages/MedicalHistory'));
const FamilyMembers = lazy(() => import('./pages/FamilyMembers'));

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const { user } = useAuth();

  return (
    <MotionConfig reducedMotion="user">
      <Router>
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm font-semibold text-slate-500">Loading...</div>}>
            <Routes>
              <Route path="/" element={user ? <Navigate to={user.role === 'ADMIN' ? "/admin" : "/dashboard"} replace /> : <LandingPage />} />
              <Route path="/home" element={user ? <Navigate to={user.role === 'ADMIN' ? "/admin" : "/dashboard"} replace /> : <LandingPage />} />
              <Route path="/login" element={user ? <Navigate to={user.role === 'ADMIN' ? "/admin" : "/dashboard"} replace /> : <Login />} />
              <Route path="/register" element={user ? <Navigate to={user.role === 'ADMIN' ? "/admin" : "/dashboard"} replace /> : <Register />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/doctors" element={<ProtectedRoute><DoctorsList /></ProtectedRoute>} />
              <Route path="/booking" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
              <Route path="/room/:appointmentId" element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />
              <Route path="/doctor/in-person/:appointmentId" element={<ProtectedRoute><DoctorInPersonSession /></ProtectedRoute>} />
              <Route path="/doctor/waiting-room" element={<ProtectedRoute><DoctorWaitingRoom /></ProtectedRoute>} />
              <Route path="/doctor/appointments" element={<ProtectedRoute><DoctorAppointments /></ProtectedRoute>} />
              <Route path="/doctor/patients" element={<ProtectedRoute><DoctorPatients /></ProtectedRoute>} />
              <Route path="/doctor/chat" element={<ProtectedRoute><DoctorChat /></ProtectedRoute>} />
              <Route path="/doctor/payouts" element={<ProtectedRoute><DoctorPayouts /></ProtectedRoute>} />
              <Route path="/patient/in-person/:appointmentId" element={<ProtectedRoute><PatientInPersonSession /></ProtectedRoute>} />
              <Route path="/waiting-room" element={<ProtectedRoute><PatientWaitingRoom /></ProtectedRoute>} />
              <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
              <Route path="/mock-checkout" element={<ProtectedRoute><MockCheckout /></ProtectedRoute>} />
              <Route path="/medical-history" element={<ProtectedRoute><MedicalHistory /></ProtectedRoute>} />
              <Route path="/family-members" element={<ProtectedRoute><FamilyMembers /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </MotionConfig>
  );
}

export default App;
