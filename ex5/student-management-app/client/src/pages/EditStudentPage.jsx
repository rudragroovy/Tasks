// EditStudentPage.jsx — Edit existing student with Lucide icons
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { fetchStudentById, updateStudent } from '../services/studentService';
import StudentForm from '../components/StudentForm';

function EditStudentPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [student,  setStudent]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const data = await fetchStudentById(id);
        setStudent({
          ...data,
          date_of_birth:   data.date_of_birth?.split('T')[0]   || '',
          enrollment_date: data.enrollment_date?.split('T')[0] || '',
        });
      } catch {
        alert('Student not found. Redirecting back.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    loadStudent();
  }, [id, navigate]);

  const handleSubmit = async (formData) => {
    try {
      setSaving(true);
      setApiError('');
      await updateStudent(id, formData);
      navigate('/', { state: { toast: 'Student updated successfully!' } });
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.join(', ')
        || 'Failed to update student. Please try again.';
      setApiError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[860px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
        <div className="flex items-center justify-center gap-3 py-20 px-4 text-text-muted text-[0.9rem] before:content-[''] before:w-[18px] before:h-[18px] before:rounded-full before:border-2 before:border-white/10 before:border-t-white/40 before:animate-[spin_0.8s_linear_infinite] before:shrink-0">Loading student data…</div>
      </div>
    );
  }

  return (
    <div className="max-w-[860px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      <div className="mb-8">
        {/* ArrowLeft — navigate back */}
        <Link to="/" className="inline-flex items-center gap-1.5 no-underline text-[0.82rem] font-medium text-text-muted mb-5 px-3.5 py-1.5 rounded-full transition-all duration-200 bg-white/5 border border-white/10 shadow-neu-sm hover:text-text-secondary hover:bg-white/10 hover:border-white/15 hover:shadow-neu-out hover:-translate-x-0.5">
          <ArrowLeft size={14} strokeWidth={2.5} />
          Back to Students
        </Link>
        <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-black tracking-[-0.03em] mt-1.5 mb-2 bg-gradient-to-br from-white to-[#8a8a8a] bg-clip-text text-transparent">Edit Student</h1>
        <p className="text-text-muted text-[0.875rem] m-0 leading-relaxed">
          Editing: <strong className="text-text-secondary">{student?.first_name} {student?.last_name}</strong>
        </p>
      </div>

      {/* AlertCircle — signals a validation or API error */}
      {apiError && (
        <div className="flex items-start gap-2 py-3 px-4 rounded-lg text-[0.85rem] font-medium mb-5 leading-relaxed text-accent-2 bg-white/5 border border-white/10 shadow-neu-sm">
          <AlertCircle size={15} strokeWidth={2} />
          {apiError}
        </div>
      )}

      <StudentForm
        initialData={student}
        onSubmit={handleSubmit}
        buttonLabel="Update Student"
        loading={saving}
      />
    </div>
  );
}

export default EditStudentPage;
