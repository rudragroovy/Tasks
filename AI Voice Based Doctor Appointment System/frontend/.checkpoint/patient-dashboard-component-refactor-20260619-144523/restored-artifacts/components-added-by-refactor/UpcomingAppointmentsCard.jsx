import { CalendarClock, ChevronRight, Video } from 'lucide-react';
import SectionCard from './SectionCard';

function formatDoctorName(name) {
  if (!name) return 'Assigned Doctor';
  return name.startsWith('Dr.') ? name : `Dr. ${name}`;
}

function formatDateTime(value) {
  if (!value) return { date: 'Date pending', time: '--:--' };
  const d = new Date(value);
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function UpcomingAppointmentsCard({
  appointments = [],
  onViewAppointment,
  onJoinAppointment,
}) {
  return (
    <SectionCard
      title="Upcoming Appointments"
      subtitle="Stay on top of your next consultations"
      actionLabel={appointments.length > 5 ? 'View All' : undefined}
      onAction={appointments.length > 5 ? () => onViewAppointment?.(null) : undefined}
    >
      {appointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-600">
          No upcoming appointments yet.
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.slice(0, 5).map((apt) => {
            const dt = formatDateTime(apt.scheduledFor || apt.createdAt);
            const specialization =
              apt?.doctor?.doctorProfile?.specialization?.name ||
              apt?.doctor?.specialization?.name ||
              'Specialist';
            const isReady = apt.status === 'ACCEPTED';

            return (
              <div
                key={apt.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">{formatDoctorName(apt?.doctor?.name)}</p>
                    <p className="text-sm font-medium text-slate-600">{specialization}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    {isReady ? 'Ready' : apt.status || 'Confirmed'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                    <CalendarClock className="w-4 h-4 text-slate-400" />
                    {dt.date} at {dt.time}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewAppointment?.(apt)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      View
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    {isReady && (
                      <button
                        onClick={() => onJoinAppointment?.(apt)}
                        className="inline-flex items-center gap-1 rounded-lg bg-health-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-health-700 transition-colors cursor-pointer"
                      >
                        <Video className="w-3 h-3" />
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

