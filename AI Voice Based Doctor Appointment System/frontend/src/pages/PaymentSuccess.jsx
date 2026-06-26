import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, LayoutDashboard, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { TopHeader } from '../components/ui/top-header';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const sessionId = searchParams.get('session_id');
  const appointmentId = searchParams.get('appointmentId');
  const type = searchParams.get('type');
  const isOnDemand = type === 'ON_DEMAND';

  useEffect(() => {
    if (!sessionId || !appointmentId) {
      navigate('/dashboard');
      return;
    }

    let countdownInterval;
    let redirectTimeout;
    let isActive = true;

    const confirmPayment = async () => {
      try {
        await axios.post(`${API_URL}/api/payments/confirm`, {
          sessionId,
          appointmentId
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!isActive) return;
        setVerifying(false);
        setShowSuccessPopup(true);
        setRedirectCountdown(3);

        countdownInterval = setInterval(() => {
          setRedirectCountdown((current) => {
            if (current <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return current - 1;
          });
        }, 1000);

        redirectTimeout = setTimeout(() => {
          navigate(`/waiting-room?id=${appointmentId}`);
        }, 3000);
      } catch (error) {
        console.error('Payment confirmation failed:', error);
        alert('Could not verify payment. Please contact support.');
        navigate('/dashboard');
      }
    };

    confirmPayment();

    return () => {
      isActive = false;
      if (countdownInterval) clearInterval(countdownInterval);
      if (redirectTimeout) clearTimeout(redirectTimeout);
    };
  }, [sessionId, appointmentId, isOnDemand, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      <TopHeader />

      {showSuccessPopup ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/45 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-2xl"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-heading font-black text-slate-900">Payment Successful</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Redirecting you to waiting room in {redirectCountdown}s...
            </p>
          </motion.div>
        </div>
      ) : null}

      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-health-100 rounded-full blur-[120px] opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary-100 rounded-full blur-[120px] opacity-30 pointer-events-none" />

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 overflow-hidden">

            {/* Success Header */}
            <div className="bg-primary-900 px-8 py-10 flex flex-col items-center relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-40 h-40 bg-health-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-primary-600 rounded-full blur-[60px] opacity-25 pointer-events-none" />

              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
                className="relative z-10 w-20 h-20 bg-health-500/20 border-2 border-health-400/40 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-health-500/20"
              >
                <CheckCircle className="w-10 h-10 text-health-400" />
              </motion.div>

              <h1 className="relative z-10 text-2xl font-heading font-black text-white mb-1">Payment Successful!</h1>
              <p className="relative z-10 text-primary-300 text-sm font-medium">Your booking is confirmed.</p>
            </div>

            <div className="p-8 space-y-6">
              {verifying ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
                  <p className="text-sm font-bold text-slate-500">Verifying your payment securely...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-health-50 border border-health-100 rounded-2xl p-4 text-center">
                    <p className="text-sm font-bold text-health-700">
                      {isOnDemand
                        ? 'Your consultation request is now in doctor queue.'
                        : 'Your scheduled appointment is confirmed.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-400">
                    <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                    Redirecting you to waiting room...
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-6 flex gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </button>
                <button
                  onClick={() => navigate(`/waiting-room?id=${appointmentId}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors text-sm shadow-md shadow-primary-600/20"
                >
                  <Clock className="w-4 h-4" /> Go to Waiting Room
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
