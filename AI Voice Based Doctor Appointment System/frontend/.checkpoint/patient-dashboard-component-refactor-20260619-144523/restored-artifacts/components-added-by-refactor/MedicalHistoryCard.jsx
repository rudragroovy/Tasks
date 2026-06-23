import { FileText, ExternalLink } from 'lucide-react';
import SectionCard from './SectionCard';

function formatDoctorName(name) {
  if (!name) return 'Assigned Doctor';
  return name.startsWith('Dr.') ? name : `Dr. ${name}`;
}

export default function MedicalHistoryCard({ historyRows = [], onOpenRecord, onViewAll }) {
  return (
    <SectionCard title="Medical History" subtitle="Your consultation timeline" actionLabel="View Full History" onAction={onViewAll}>
      {historyRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-600">
          No medical history found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="pb-3 font-bold">Date</th>
                <th className="pb-3 font-bold">Doctor</th>
                <th className="pb-3 font-bold">Specialization</th>
                <th className="pb-3 font-bold">Summary</th>
                <th className="pb-3 font-bold text-right">Report</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.slice(0, 6).map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-3 font-medium text-slate-600">{row.dateLabel}</td>
                  <td className="py-3 font-bold text-slate-900">{formatDoctorName(row.doctorName)}</td>
                  <td className="py-3 text-slate-600 font-medium">{row.specialization}</td>
                  <td className="py-3 text-slate-600 max-w-[360px] truncate">{row.summary}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onOpenRecord?.(row.appointment)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Open
                    </button>
                    {row.reportUrl && (
                      <a
                        href={row.reportUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

