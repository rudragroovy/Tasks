import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import AppIcon from '../components/branding/AppIcon';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError('');
      const loggedInUser = await login(email, password);
      if (loggedInUser.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white">
      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative">
        {/* Mobile-only background decorative blob */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-100 blur-[100px] pointer-events-none opacity-50 lg:hidden"></div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-8">
              <AppIcon size={40} />
              <span className="font-heading font-black text-primary-900 text-2xl tracking-tight">CareBridge</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-primary-900 tracking-tight">
              Welcome back
            </h1>
            <p className="text-primary-600 mt-3 font-medium text-base">
              Securely access your telemedicine portal.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-bold font-heading text-primary-900 mb-2">Email Address</label>
              <input
                id="login-email"
                type="email"
                className="w-full px-5 py-4 bg-gray-50/50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-primary-900 font-medium placeholder-gray-400 hover:bg-gray-50"
                placeholder="doctor@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="login-password" className="block text-sm font-bold font-heading text-primary-900">Password</label>
                <button type="button" className="text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors cursor-pointer">
                  Forgot password?
                </button>
              </div>
              <input
                id="login-password"
                type="password"
                className="w-full px-5 py-4 bg-gray-50/50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-primary-900 font-medium placeholder-gray-400 hover:bg-gray-50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-primary-900 hover:bg-primary-800 text-white font-bold font-heading text-base py-4 rounded-xl transition-all duration-200 shadow-lg shadow-primary-900/20 cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In 
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm font-medium text-gray-500">
              New to CareBridge?{' '}
              <Link to="/register" className="text-health-600 hover:text-health-700 font-bold transition-colors cursor-pointer border-b-2 border-transparent hover:border-health-600 pb-0.5">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Presentation */}
      <div className="hidden lg:flex w-1/2 bg-primary-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Abstract Background Patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-health-400 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-400 blur-[120px]"></div>
        </div>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
             <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-health-300 text-sm font-bold font-heading border border-white/10 backdrop-blur-sm">
                <Activity className="w-4 h-4" /> Telehealth Platform 2.0
             </span>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl lg:text-5xl font-heading font-black text-white leading-[1.1] mb-6">
              Healthcare, <br/>
              <span className="text-health-400">reimagined.</span>
            </h2>
            <p className="text-primary-100 text-lg font-medium leading-relaxed mb-12 opacity-90">
              Join thousands of providers and patients connecting instantly through our AI-powered triage and video consultation platform.
            </p>

            {/* Feature List */}
            <div className="space-y-5">
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
                 <div className="w-12 h-12 bg-health-500/20 text-health-400 rounded-xl flex items-center justify-center shrink-0">
                    <Activity className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-white font-bold font-heading text-lg">AI Voice Triage</h3>
                    <p className="text-primary-200 text-sm font-medium mt-0.5">Automated symptom collection before you connect.</p>
                 </div>
              </div>

              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
                 <div className="w-12 h-12 bg-primary-500/20 text-primary-300 rounded-xl flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-white font-bold font-heading text-lg">Secure & Private</h3>
                    <p className="text-primary-200 text-sm font-medium mt-0.5">End-to-end encrypted video rooms and data.</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-primary-200 text-sm font-medium pt-8 border-t border-white/10">
            <span>© 2026 CareBridge</span>
            <span className="w-1 h-1 bg-primary-400 rounded-full"></span>
            <button type="button" className="hover:text-white transition-colors cursor-pointer">Privacy Policy</button>
            <span className="w-1 h-1 bg-primary-400 rounded-full"></span>
            <button type="button" className="hover:text-white transition-colors cursor-pointer">Terms of Service</button>
          </div>
        </div>
      </div>
    </div>
  );
}
