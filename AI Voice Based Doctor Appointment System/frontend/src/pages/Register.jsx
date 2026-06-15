import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, ArrowRight } from 'lucide-react';
import axios from 'axios';

export default function Register() {
  const navigate = useNavigate();
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
      // Standard registration endpoint logic for now
      await axios.post('http://localhost:5000/api/auth/register', formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white">
      {/* Left Column - Presentation */}
      <div className="hidden lg:flex w-1/2 bg-primary-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Abstract Background Patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-health-400 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary-400 blur-[120px]"></div>
        </div>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
             <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-health-300 text-sm font-bold font-heading border border-white/10 backdrop-blur-sm">
                <Activity className="w-4 h-4" /> Next-Gen Telehealth
             </span>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl lg:text-5xl font-heading font-black text-white leading-[1.1] mb-6">
              Empowering <br/>
              <span className="text-health-400">better care.</span>
            </h2>
            <p className="text-primary-100 text-lg font-medium leading-relaxed mb-12 opacity-90">
              Create an account today to access seamless virtual consultations, smart AI triage, and a secure health ecosystem.
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
            <span>© 2026 MyDrScripts</span>
            <span className="w-1 h-1 bg-primary-400 rounded-full"></span>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <span className="w-1 h-1 bg-primary-400 rounded-full"></span>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative overflow-y-auto">
        {/* Mobile-only background decorative blob */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-health-100 blur-[100px] pointer-events-none opacity-50 lg:hidden"></div>
        
        <div className="w-full max-w-md relative z-10 py-10">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 bg-primary-900 rounded-lg flex items-center justify-center relative overflow-hidden shadow-md">
                 <div className="absolute w-5 h-5 bg-white top-0 left-0 rounded-br-lg" />
                 <div className="absolute w-5 h-5 bg-health-500 bottom-0 right-0 rounded-tl-lg" />
              </div>
              <span className="font-heading font-black text-primary-900 text-2xl tracking-tight">MyDrScripts</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-primary-900 tracking-tight">
              Create an account
            </h1>
            <p className="text-primary-600 mt-3 font-medium text-base">
              Join the future of telemedicine.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-lg text-sm font-medium shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="text-red-500 font-bold text-lg">!</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-bold font-heading text-primary-900 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                className="w-full px-5 py-4 bg-gray-50/50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-primary-900 font-medium placeholder-gray-400 hover:bg-gray-50"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold font-heading text-primary-900 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                className="w-full px-5 py-4 bg-gray-50/50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-primary-900 font-medium placeholder-gray-400 hover:bg-gray-50"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold font-heading text-primary-900 mb-2">Password</label>
              <input
                type="password"
                name="password"
                className="w-full px-5 py-4 bg-gray-50/50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-primary-900 font-medium placeholder-gray-400 hover:bg-gray-50"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold font-heading text-primary-900 mb-2">I am a</label>
              <select
                name="role"
                className="w-full px-5 py-4 bg-gray-50/50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-primary-900 font-medium cursor-pointer hover:bg-gray-50"
                value={formData.role}
                onChange={handleChange}
                disabled={isLoading}
              >
                <option value="PATIENT">Patient</option>
                <option value="DOCTOR">Doctor</option>
              </select>
            </div>

            {formData.role === 'DOCTOR' && (
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 mt-2 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-sm font-bold font-heading text-primary-900 mb-2">Specialty</label>
                  <input
                    type="text"
                    name="specializationId"
                    className="w-full px-5 py-4 bg-gray-50/50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-primary-900 font-medium placeholder-gray-400 hover:bg-gray-50"
                    placeholder="Cardiologist"
                    value={formData.specializationId}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold font-heading text-primary-900 mb-2">Consultation Fee ($)</label>
                  <input
                    type="number"
                    name="fee"
                    className="w-full px-5 py-4 bg-gray-50/50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-primary-900 font-medium placeholder-gray-400 hover:bg-gray-50"
                    placeholder="100"
                    value={formData.fee}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-health-600 hover:bg-health-700 text-white font-bold font-heading text-base py-4 rounded-xl transition-all duration-200 shadow-lg shadow-health-600/20 cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Complete Registration
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm font-medium text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-900 hover:text-primary-700 font-bold transition-colors cursor-pointer border-b-2 border-transparent hover:border-primary-900 pb-0.5">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
