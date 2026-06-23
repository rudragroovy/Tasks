import { Plus, CalendarPlus, FileText } from 'lucide-react';
import SectionCard from './SectionCard';

export default function FamilyMembersCard({ familyMembers = [], onAddMember, onBookForMember, onViewRecords }) {
  return (
    <SectionCard title="Family Members" subtitle="Manage care for your family" actionLabel="Add Member" onAction={onAddMember}>
      {familyMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-600">
          No family members added yet.
          <button
            onClick={onAddMember}
            className="ml-3 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Family Member
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {familyMembers.map((member) => (
            <div key={member.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-health-100 text-health-700 flex items-center justify-center font-black">
                  {member.name?.charAt(0)?.toUpperCase() || 'F'}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{member.name}</p>
                  <p className="text-xs font-medium text-slate-500">{member.relation || 'Family'}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onBookForMember?.(member)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-primary-700 transition-colors cursor-pointer"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  Book
                </button>
                <button
                  onClick={() => onViewRecords?.(member)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Records
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

