import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);

  const sessionId = searchParams.get('session_id');
  const appointmentId = searchParams.get('appointmentId');
  const type = searchParams.get('type');

  useEffect(() => {
    if (!sessionId || !appointmentId) {
      navigate('/dashboard');
      return;
    }

    const confirmPayment = async () => {
      try {
        await axios.post('http://localhost:5000/api/payments/confirm', {
          sessionId,
          appointmentId
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        setVerifying(false);

        // Wait 3 seconds, then redirect
        setTimeout(() => {
          if (type === 'ON_DEMAND') {
            navigate(`/waiting-room?id=${appointmentId}`);
          } else {
            navigate('/dashboard');
          }
        }, 3000);

      } catch (error) {
        console.error('Payment confirmation failed:', error);
        alert('Could not verify payment. Please contact support.');
        navigate('/dashboard');
      }
    };

    confirmPayment();
  }, [sessionId, appointmentId, type, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful!</h2>
        
        {verifying ? (
          <p className="text-slate-500">Verifying your payment securely...</p>
        ) : (
          <div>
            <p className="text-slate-600 mb-6">
              Your appointment has been successfully booked.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              Redirecting you...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
