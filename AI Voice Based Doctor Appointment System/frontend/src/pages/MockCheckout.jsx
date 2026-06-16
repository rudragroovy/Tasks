import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CreditCard, ShieldCheck, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
    // Simulate secure network delay
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
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle className="w-12 h-12 text-green-500" />
        </motion.div>
        <h2 className="text-2xl font-bold font-heading text-slate-900 mb-2">Payment Successful</h2>
        <p className="text-slate-500 font-medium">Redirecting you to the confirmation page...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200 blur-[150px] pointer-events-none opacity-40"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-blue-900/5 border border-slate-100 overflow-hidden relative z-10"
      >
        <div className="px-8 py-8 border-b border-slate-100 bg-slate-50/50 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4 shadow-sm border border-blue-200">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-heading font-black text-slate-900">Secure Checkout</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Powered by MyDrScripts Payments</p>
        </div>

        <div className="p-8">
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-8 flex justify-between items-center">
            <div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wide mb-1">Total Due</p>
              <p className="text-3xl font-heading font-black text-slate-900">${parseFloat(fee).toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
          </div>

          <div className="space-y-4 mb-8">
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Card Information</label>
               <div className="w-full h-12 border border-slate-200 rounded-xl bg-slate-50 flex items-center px-4 gap-3">
                 <CreditCard className="w-5 h-5 text-slate-400 shrink-0" />
                 <span className="text-slate-700 font-medium tracking-widest text-sm font-mono flex-1">•••• •••• •••• 4242</span>
                 <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/1200px-Visa_Inc._logo.svg.png" className="h-4 object-contain opacity-50" alt="Visa" />
               </div>
             </div>
             <div className="flex gap-4">
               <div className="flex-1">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Expiry</label>
                 <div className="w-full h-12 border border-slate-200 rounded-xl bg-slate-50 flex items-center px-4">
                   <span className="text-slate-700 font-medium font-mono">12 / 28</span>
                 </div>
               </div>
               <div className="flex-1">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">CVC</label>
                 <div className="w-full h-12 border border-slate-200 rounded-xl bg-slate-50 flex items-center px-4">
                   <span className="text-slate-700 font-medium font-mono">•••</span>
                 </div>
               </div>
             </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePay}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold font-heading py-4 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Pay ${parseFloat(fee).toFixed(2)} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
          
          <p className="text-center text-xs font-medium text-slate-400 mt-6 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Payments are secure and encrypted
          </p>
        </div>
      </motion.div>
    </div>
  );
}
