import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, ArrowRight } from 'lucide-react';
import AppIcon from '../components/branding/AppIcon';
import { useAuth } from '../context/AuthContext';

export default function Register({ embedded = false, onOpenLogin = null, onAuthSuccess = null }) {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PATIENT',
    specializationId: '',
    fee: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError('');
      const registeredUser = await register(formData);
      if (typeof onAuthSuccess === 'function') {
        onAuthSuccess(registeredUser);
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setIsLoading(false);
    }
  };

  const presentationClass = embedded
    ? 'hidden lg:flex w-1/2 bg-primary-900 relative overflow-hidden flex-col justify-between p-8'
    : 'hidden lg:flex w-1/2 bg-primary-900 relative overflow-hidden flex-col justify-between p-12';

  const formShellClass = embedded
    ? 'w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-6 lg:p-8 relative overflow-y-auto'
    : 'w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative overflow-y-auto';

  const contentWrapClass = embedded ? 'w-full max-w-md relative z-10 py-3' : 'w-full max-w-md relative z-10 py-10';
  const brandWrapClass = embedded ? 'mb-6' : 'mb-10';
  const brandRowClass = embedded ? 'flex items-center gap-2 mb-5' : 'flex items-center gap-2 mb-8';
  const brandIconSize = embedded ? 34 : 40;
  const brandTitleClass = embedded
    ? 'font-heading font-black text-primary-900 text-xl tracking-tight'
    : 'font-heading font-black text-primary-900 text-2xl tracking-tight';

  const headingClass = embedded
    ? 'text-2xl sm:text-3xl font-heading font-bold text-primary-900 tracking-tight'
    : 'text-3xl sm:text-4xl font-heading font-bold text-primary-900 tracking-tight';

  const subHeadingClass = embedded
    ? 'text-primary-600 mt-2 font-medium text-sm'
    : 'text-primary-600 mt-3 font-medium text-base';

  const inputClass = embedded
    ? 'w-full px-4 py-3 bg-gray-50/50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-primary-900 font-medium placeholder-gray-400 hover:bg-gray-50'
    : 'w-full px-5 py-4 bg-gray-50/50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-primary-900 font-medium placeholder-gray-400 hover:bg-gray-50';

  const submitClass = embedded
    ? 'w-full mt-3 bg-health-600 hover:bg-health-700 text-white font-bold font-heading text-sm py-3 rounded-xl transition-all duration-200 shadow-lg shadow-health-600/20 cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-70'
    : 'w-full mt-6 bg-health-600 hover:bg-health-700 text-white font-bold font-heading text-base py-4 rounded-xl transition-all duration-200 shadow-lg shadow-health-600/20 cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-70';

  return (
    <div className={`${embedded ? 'h-full' : 'min-h-screen'} flex font-sans bg-white`}>
      <div className={presentationClass}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-health-400 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary-400 blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-health-300 text-sm font-bold font-heading border border-white/10 backdrop-blur-sm">
              <Activity className="w-4 h-4" /> {embedded ? 'CareBridge Access' : 'Next-Gen Telehealth'}
            </span>
          </div>

          <div className="max-w-md">
            <h2
              className={
                embedded
                  ? 'text-3xl lg:text-4xl font-heading font-black text-white leading-[1.15] mb-4'
                  : 'text-4xl lg:text-5xl font-heading font-black text-white leading-[1.1] mb-6'
              }
            >
              {embedded ? (
                <>
                  Start fast, <br />
                  <span className="text-health-400">scale with confidence.</span>
                </>
              ) : (
                <>
                  Empowering <br />
                  <span className="text-health-400">better care.</span>
                </>
              )}
            </h2>
            <p
              className={
                embedded
                  ? 'text-primary-100 text-base font-medium leading-relaxed mb-7 opacity-90'
                  : 'text-primary-100 text-lg font-medium leading-relaxed mb-12 opacity-90'
              }
            >
              {embedded
                ? 'Create your account to manage appointments, records, and consultations from one platform.'
                : 'Create an account today to access seamless virtual consultations, smart AI triage, and a secure health ecosystem.'}
            </p>

            <div className={embedded ? 'space-y-4' : 'space-y-5'}>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
                <div className="w-12 h-12 bg-health-500/20 text-health-400 rounded-xl flex items-center justify-center shrink-0">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={embedded ? 'text-white font-bold font-heading text-base' : 'text-white font-bold font-heading text-lg'}>
                    {embedded ? 'Unified Consult Flow' : 'AI Voice Triage'}
                  </h3>
                  <p className="text-primary-200 text-sm font-medium mt-0.5">
                    {embedded ? 'Run video, clinic, and phone visits from one place.' : 'Automated symptom collection before you connect.'}
                  </p>
                </div>
              </div>

              {!embedded && (
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
                  <div className="w-12 h-12 bg-primary-500/20 text-primary-300 rounded-xl flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold font-heading text-lg">Secure & Private</h3>
                    <p className="text-primary-200 text-sm font-medium mt-0.5">End-to-end encrypted video rooms and data.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!embedded && (
            <div className="flex items-center gap-4 text-primary-200 text-sm font-medium pt-8 border-t border-white/10">
              <span>(c) 2026 CareBridge</span>
              <span className="w-1 h-1 bg-primary-400 rounded-full" />
              <button type="button" className="hover:text-white transition-colors cursor-pointer">
                Privacy Policy
              </button>
              <span className="w-1 h-1 bg-primary-400 rounded-full" />
              <button type="button" className="hover:text-white transition-colors cursor-pointer">
                Terms of Service
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={formShellClass}>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-health-100 blur-[100px] pointer-events-none opacity-50 lg:hidden" />

        <div className={contentWrapClass}>
          <div className={brandWrapClass}>
            <div className={brandRowClass}>
              <AppIcon size={brandIconSize} />
              <span className={brandTitleClass}>CareBridge</span>
            </div>
            <h1 className={headingClass}>Create an account</h1>
            <p className={subHeadingClass}>Set up your CareBridge access in less than a minute.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="text-red-500 font-bold text-lg">!</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className={embedded ? 'space-y-4' : 'space-y-5'}>
            <div>
              <label htmlFor="register-name" className="block text-sm font-bold font-heading text-primary-900 mb-2">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                name="name"
                className={inputClass}
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="register-email" className="block text-sm font-bold font-heading text-primary-900 mb-2">
                Email Address
              </label>
              <input
                id="register-email"
                type="email"
                name="email"
                className={inputClass}
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-bold font-heading text-primary-900 mb-2">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                name="password"
                className={inputClass}
                placeholder="********"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <button type="submit" disabled={isLoading} className={submitClass}>
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Complete Registration
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className={embedded ? 'mt-7 text-center' : 'mt-10 text-center'}>
            <p className="text-sm font-medium text-gray-500">
              Already have an account?{' '}
              {typeof onOpenLogin === 'function' ? (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="text-primary-900 hover:text-primary-700 font-bold transition-colors cursor-pointer border-b-2 border-transparent hover:border-primary-900 pb-0.5"
                >
                  Sign in instead
                </button>
              ) : (
                <Link
                  to="/login"
                  className="text-primary-900 hover:text-primary-700 font-bold transition-colors cursor-pointer border-b-2 border-transparent hover:border-primary-900 pb-0.5"
                >
                  Sign in instead
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
