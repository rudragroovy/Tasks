import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Booking from './pages/Booking';
import MeetingRoom from './pages/MeetingRoom';
import PatientWaitingRoom from './pages/PatientWaitingRoom';
import PaymentSuccess from './pages/PaymentSuccess';
import MockCheckout from './pages/MockCheckout';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Routes>
          <Route path="/" element={<Navigate to={user ? (user.role === 'ADMIN' ? "/admin" : "/dashboard") : "/login"} replace />} />
          <Route path="/login" element={user ? <Navigate to={user.role === 'ADMIN' ? "/admin" : "/dashboard"} replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to={user.role === 'ADMIN' ? "/admin" : "/dashboard"} replace /> : <Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/booking" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
          <Route path="/room/:appointmentId" element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />
          <Route path="/waiting-room" element={<ProtectedRoute><PatientWaitingRoom /></ProtectedRoute>} />
          <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/mock-checkout" element={<ProtectedRoute><MockCheckout /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
