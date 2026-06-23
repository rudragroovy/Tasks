import { AlertTriangle, Sparkles, Stethoscope } from 'lucide-react';
import SectionCard from './SectionCard';

function getRiskTone(level = 'LOW') {
  const normalized = String(level).toUpperCase();
  if (normalized === 'HIGH') return 'bg-red-100 text-red-700 border-red-200';
  if (normalized === 'MEDIUM') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-health-100 text-health-700 border-health-200';
}

export default function LatestAssessmentCard({
  assessment,
  onStartAssessment,
  onBookConsultation,
}) {
  if (!assessment) {
    return (
      <SectionCard title="Latest AI Assessment" subtitle="No AI assessment yet" actionLabel="Start Assessment" onAction={onStartAssessment}>
        <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/50 p-4">
          <p className="text-sm text-slate-600 font-medium">
            Start your first AI health assessment to get symptom-based recommendations and specialist suggestions.
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Latest AI Assessment" subtitle="AI-generated health summary">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Risk Level</span>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${getRiskTone(assessment.riskLevel)}`}>
            {assessment.riskLevel}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Detected Symptoms</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(assessment.symptoms || []).slice(0, 4).map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Recommendation</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{assessment.recommendation}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-100 bg-white p-3">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-primary-700">
              <Stethoscope className="w-4 h-4" />
              Suggested Specialist: {assessment.suggestedSpecialist}
            </div>
            <button
              onClick={() => onBookConsultation(assessment)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-xs font-bold text-white hover:bg-primary-700 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Book Consultation
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

