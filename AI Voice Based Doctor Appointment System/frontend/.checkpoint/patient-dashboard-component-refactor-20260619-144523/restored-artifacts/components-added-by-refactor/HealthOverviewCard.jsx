import { Activity, CalendarRange, FileText, Users } from 'lucide-react';
import SectionCard from './SectionCard';

const cardConfig = [
  { key: 'activeTreatments', label: 'Active Treatments', icon: Activity, tone: 'text-health-700 bg-health-50 border-health-100' },
  { key: 'upcomingAppointments', label: 'Upcoming Visits', icon: CalendarRange, tone: 'text-primary-700 bg-primary-50 border-primary-100' },
  { key: 'recentReports', label: 'Recent Reports', icon: FileText, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
  { key: 'familyMembers', label: 'Family Members', icon: Users, tone: 'text-slate-700 bg-slate-50 border-slate-200' },
];

export default function HealthOverviewCard({ metrics }) {
  return (
    <SectionCard title="Health Overview" subtitle="Quick snapshot of your care journey">
      <div className="grid grid-cols-2 gap-3">
        {cardConfig.map(({ key, label, icon: Icon, tone }) => (
          <div key={key} className={`rounded-2xl border p-4 ${tone}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</p>
              <Icon className="w-4 h-4 opacity-80" />
            </div>
            <p className="mt-2 text-2xl font-heading font-black text-slate-900">{metrics?.[key] ?? 0}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

