import { Sparkles, CalendarPlus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SmartWelcomeHero({ userName, onStartAssessment, onBookAppointment }) {
  const firstName = userName?.split(' ')?.[0] || 'there';

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      className="relative overflow-hidden rounded-3xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/40 to-health-50/50 p-6 sm:p-8"
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-primary-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-8 h-44 w-44 rounded-full bg-health-200/40 blur-3xl" />

      <div className="relative z-10 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-widest text-primary-700">Your Healthcare Command Center</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-heading font-black text-slate-900">
          Welcome back, {firstName}. How are you feeling today?
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 font-medium">
          Our AI assistant can understand symptoms, prioritize urgency, and connect you with the right specialist.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onStartAssessment}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Start AI Assessment
          </button>
          <button
            onClick={onBookAppointment}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            Book Appointment
          </button>
        </div>
      </div>
    </motion.section>
  );
}

