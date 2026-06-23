import { CalendarClock, Video, UserRound, Clock3 } from 'lucide-react';
import SectionCard from './SectionCard';

function formatDoctorName(name) {
  if (!name) return 'Assigned Doctor';
  return name.startsWith('Dr.') ? name : `Dr. ${name}`;
}

function formatDate(value) {
  if (!value) return 'Date pending';
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ActiveCareCard({
  activeAppointment,
  scheduledAppointment,
  onFindDoctor,
  onJoinConsultation,
  onViewDetails,
}) {
  if (!activeAppointment && !scheduledAppointment) {
    return (
      <SectionCard title="Active Care" subtitle="No active consultations">
        <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500">
              <CalendarClock className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-600">You are currently not in an active care session.</p>
          </div>
          <button
            onClick={onFindDoctor}
            className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 transition-colors cursor-pointer"
          >
            Find a Doctor
          </button>
        </div>
      </SectionCard>
    );
  }

  if (activeAppointment?.status === 'ACCEPTED') {
    const doctorName = formatDoctorName(activeAppointment.doctor?.name);
    const specialization =
      activeAppointment.doctor?.doctorProfile?.specialization?.name ||
      activeAppointment.doctor?.specialization?.name ||
      'Specialist';

    return (
      <SectionCard title="Active Care" subtitle="Consultation Ready">
        <div className="rounded-2xl border border-health-200 bg-health-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900">{doctorName}</p>
              <p className="text-sm font-medium text-slate-600">{specialization}</p>
            </div>
            <span className="rounded-full bg-health-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-health-700">
              Online
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 font-medium">
            <Clock3 className="w-4 h-4 text-slate-400" />
            Estimated wait time: 1-2 mins
          </div>
          <button
            onClick={() => onJoinConsultation(activeAppointment)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-health-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-health-700 transition-colors cursor-pointer"
          >
            <Video className="w-4 h-4" />
            Join Consultation
          </button>
        </div>
      </SectionCard>
    );
  }

  const doctorName = formatDoctorName(scheduledAppointment?.doctor?.name);
  const specialization =
    scheduledAppointment?.doctor?.doctorProfile?.specialization?.name ||
    scheduledAppointment?.doctor?.specialization?.name ||
    'Specialist';
  const scheduledFor = scheduledAppointment?.scheduledFor || scheduledAppointment?.createdAt;

  return (
    <SectionCard title="Active Care" subtitle="Consultation Scheduled">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-amber-200 text-amber-700 flex items-center justify-center">
            <UserRound className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">{doctorName}</p>
            <p className="text-sm font-medium text-slate-600">{specialization}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Date</p>
            <p className="font-bold text-slate-800">{formatDate(scheduledFor)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Time</p>
            <p className="font-bold text-slate-800">{formatTime(scheduledFor)}</p>
          </div>
        </div>
        <button
          onClick={() => onViewDetails(scheduledAppointment)}
          className="mt-4 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
        >
          View Details
        </button>
      </div>
    </SectionCard>
  );
}

