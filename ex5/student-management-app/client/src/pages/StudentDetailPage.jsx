// StudentDetailPage.jsx — Full profile view for a single student
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Trash2, Mail, BookOpen,
  Calendar, Award, Clock, User, Loader2, ServerCrash,
} from 'lucide-react';
import { fetchStudentById, deleteStudent } from '../services/studentService';
import DeleteModal from '../components/DeleteModal';

function StudentDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [student,  setStudent]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [showDel,  setShowDel]  = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchStudentById(id);
        setStudent(data);
      } catch {
        setError('Student not found or server unavailable.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    try {
      await deleteStudent(id);
      navigate('/', { state: { toast: `${student.first_name} deleted successfully` } });
    } catch {
      alert('Failed to delete student.');
      setShowDel(false);
    }
  };

  const fmt = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const gpaClass = (gpa) => {
    if (!gpa) return '';
    const g = parseFloat(gpa);
    if (g >= 3) return 'bg-white/10 text-[#e5e5e5] border border-white/15';
    if (g >= 2) return 'bg-white/5 text-[#a3a3a3] border border-white/10';
    return 'bg-white/5 text-[#6b6b6b] border border-white/10';
  };

  if (loading) return (
    <div className="max-w-[760px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      <div className="flex flex-col items-center gap-4 py-20 px-4 text-center text-text-muted">
        <Loader2 className="animate-spin text-accent-2" size={42} strokeWidth={1.5} />
        <p>Loading student…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-[760px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      <div className="flex flex-col items-center gap-4 py-20 px-4 text-center text-text-muted">
        <ServerCrash size={40} strokeWidth={1.3} />
        <p>{error}</p>
        <Link to="/" className="inline-flex items-center gap-1.5 no-underline text-[0.82rem] font-medium text-text-muted px-3.5 py-1.5 rounded-full transition-all duration-200 bg-white/5 border border-white/10 shadow-neu-sm hover:text-text-secondary hover:bg-white/10 hover:-translate-x-0.5"><ArrowLeft size={14} /> Back</Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-[760px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      {/* Back + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 no-underline text-[0.82rem] font-medium text-text-muted px-3.5 py-1.5 rounded-full transition-all duration-200 bg-white/5 border border-white/10 shadow-neu-sm hover:text-text-secondary hover:bg-white/10 hover:-translate-x-0.5">
          <ArrowLeft size={14} strokeWidth={2.5} /> Back to Students
        </Link>
        <div className="flex gap-2.5">
          <Link to={`/edit/${student.id}`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full no-underline text-[0.82rem] font-semibold text-accent transition-all duration-200 bg-white/5 border border-white/10 shadow-neu-sm hover:bg-white/10 hover:text-white hover:-translate-y-px">
            <Pencil size={14} strokeWidth={2.2} /> Edit
          </Link>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-sans text-[0.82rem] font-semibold cursor-pointer transition-all duration-200 text-accent-2 bg-white/5 border border-white/10 shadow-neu-sm hover:bg-white/10 hover:text-accent hover:-translate-y-px" onClick={() => setShowDel(true)}>
            <Trash2 size={14} strokeWidth={2.2} /> Delete
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="relative overflow-hidden bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-neu-lg before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent">
        {/* Hero */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] rounded-full flex items-center justify-center text-[1.1rem] sm:text-[1.5rem] font-black text-black shrink-0 uppercase bg-gradient-to-br from-[#e5e5e5] to-[#8a8a8a] shadow-[inset_2px_2px_5px_rgba(255,255,255,0.4),0_0_20px_rgba(255,255,255,0.07)]">
            {student.first_name[0]}{student.last_name[0]}
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-[clamp(1.3rem,4vw,1.8rem)] font-black tracking-[-0.02em] bg-gradient-to-br from-white to-[#a3a3a3] bg-clip-text text-transparent">
              {student.first_name} {student.last_name}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.8rem] font-semibold bg-white/5 border border-white/10 text-accent-2 w-fit">
              <BookOpen size={13} strokeWidth={2} />
              {student.course}
            </span>
            {student.gpa && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.8rem] font-semibold w-fit shadow-neu-sm ${gpaClass(student.gpa)}`}>
                <Award size={13} strokeWidth={2} />
                GPA {parseFloat(student.gpa).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="h-px bg-white/5 my-7" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <InfoRow icon={<Mail size={16} strokeWidth={1.8} />}     label="Email"           value={student.email} />
          <InfoRow icon={<User size={16} strokeWidth={1.8} />}     label="Student ID"      value={`#${String(student.id).padStart(4, '0')}`} />
          <InfoRow icon={<Calendar size={16} strokeWidth={1.8} />} label="Date of Birth"   value={fmt(student.date_of_birth)} />
          <InfoRow icon={<Calendar size={16} strokeWidth={1.8} />} label="Enrolled On"     value={fmt(student.enrollment_date)} />
          <InfoRow icon={<Clock size={16} strokeWidth={1.8} />}    label="Record Created"  value={fmt(student.created_at)} />
          <InfoRow icon={<Clock size={16} strokeWidth={1.8} />}    label="Last Updated"    value={fmt(student.updated_at)} />
        </div>
      </div>

      {showDel && (
        <DeleteModal
          studentName={`${student.first_name} ${student.last_name}`}
          onConfirm={handleDelete}
          onCancel={() => setShowDel(false)}
        />
      )}
    </div>
  );
}

// Small helper component for each info row
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-md bg-white/5 border border-white/5 shadow-neu-in">
      <span className="text-text-muted mt-0.5 shrink-0">{icon}</span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.07em] text-text-muted">{label}</span>
        <span className="text-[0.9rem] font-medium text-text-primary break-all">{value || '—'}</span>
      </div>
    </div>
  );
}

export default StudentDetailPage;
