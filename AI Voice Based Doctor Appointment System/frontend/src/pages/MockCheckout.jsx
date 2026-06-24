import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CreditCard, ShieldCheck, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { TopHeader } from '../components/ui/top-header';

export default function MockCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const sessionId = searchParams.get('session_id');
  const appointmentId = searchParams.get('appointmentId');
  const type = searchParams.get('type');
  const fee = searchParams.get('fee') || '150.00';

  const handlePay = async () => {
    setLoading(true);
    setTimeout(async () => {
      try {
        await axios.post('http://localhost:5000/api/payments/confirm', {
          sessionId,
          appointmentId
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setSuccess(true);
        setTimeout(() => {
          navigate(`/payment-success?session_id=${sessionId}&appointmentId=${appointmentId}&type=${type}`);
        }, 1500);
      } catch (err) {
        console.error(err);
        alert('Payment processing failed. Please try again.');
        setLoading(false);
      }
    }, 1500);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-24 h-24 bg-health-100 rounded-full flex items-center justify-center shadow-lg shadow-health-500/20">
            <CheckCircle className="w-12 h-12 text-health-600" />
          </div>
          <h2 className="text-2xl font-heading font-black text-slate-900">Payment Successful!</h2>
          <p className="text-slate-500 font-medium">Redirecting to confirmation...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      <TopHeader />

      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-100 rounded-full blur-[120px] opacity-40 pointer-events-none -z-0" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-health-100 rounded-full blur-[120px] opacity-30 pointer-events-none -z-0" />

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 overflow-hidden">

            {/* Header */}
            <div className="bg-primary-900 px-8 py-7 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-health-500 rounded-full blur-[60px] opacity-25 pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-primary-700 rounded-full blur-[60px] opacity-30 pointer-events-none" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-heading font-black text-white">Secure Checkout</h1>
                  <p className="text-primary-300 text-xs font-medium mt-0.5">CareBridge Payments · SSL Encrypted</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">

              {/* Amount Due */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Due</p>
                  <p className="text-4xl font-heading font-black text-slate-900">${parseFloat(fee).toFixed(2)}</p>
                </div>
                <div className="w-14 h-14 bg-health-50 border border-health-100 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-health-600" />
                </div>
              </div>

              {/* Card Fields (mock, read-only) */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Card Number</label>
                  <div className="w-full h-12 border border-slate-200 rounded-xl bg-slate-50 flex items-center px-4 gap-3">
                    <CreditCard className="w-5 h-5 text-slate-400 shrink-0" />
                    <span className="text-slate-700 font-medium tracking-widest text-sm font-mono flex-1">•••• •••• •••• 4242</span>
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/1200px-Visa_Inc._logo.svg.png"
                      className="h-4 object-contain opacity-40"
                      alt="Visa"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Expiry</label>
                    <div className="w-full h-12 border border-slate-200 rounded-xl bg-slate-50 flex items-center px-4">
                      <span className="text-slate-700 font-medium font-mono text-sm">12 / 28</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">CVC</label>
                    <div className="w-full h-12 border border-slate-200 rounded-xl bg-slate-50 flex items-center px-4">
                      <span className="text-slate-700 font-medium font-mono text-sm">•••</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pay Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePay}
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold font-heading py-4 rounded-2xl transition-all shadow-lg shadow-primary-600/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-base"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Pay ${parseFloat(fee).toFixed(2)}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-6 pt-2">
                <p className="text-center text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> 256-bit SSL Encryption
                </p>
                <p className="text-center text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> PCI Compliant
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
