import { Download, FileText } from 'lucide-react';
import SectionCard from './SectionCard';

export default function RecentPrescriptionsCard({ prescriptions = [] }) {
  return (
    <SectionCard title="Recent Prescriptions" subtitle="Daily treatment essentials">
      {prescriptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-600">
          No prescriptions available yet.
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.slice(0, 4).map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{item.medicineName || 'Prescription'}</p>
                  <p className="text-sm font-medium text-slate-600">{item.doctorName}</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  {item.issuedDate}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-500">
                  Duration: <span className="font-bold text-slate-700">{item.duration || 'As prescribed'}</span>
                </p>
                {item.downloadUrl ? (
                  <a
                    href={item.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                    <FileText className="w-3.5 h-3.5" />
                    Not available
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

