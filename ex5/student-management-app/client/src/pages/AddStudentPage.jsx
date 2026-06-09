// AddStudentPage.jsx — Add new student with Lucide icons
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { createStudent } from '../services/studentService';
import StudentForm from '../components/StudentForm';

function AddStudentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setApiError('');
      await createStudent(formData);
      navigate('/', { state: { toast: 'Student added successfully!' } });
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.join(', ')
        || 'Failed to add student. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[860px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      <div className="mb-8">
        {/* ArrowLeft — navigate back */}
        <Link to="/" className="inline-flex items-center gap-1.5 no-underline text-[0.82rem] font-medium text-text-muted mb-5 px-3.5 py-1.5 rounded-full transition-all duration-200 bg-white/5 border border-white/10 shadow-neu-sm hover:text-text-secondary hover:bg-white/10 hover:border-white/15 hover:shadow-neu-out hover:-translate-x-0.5">
          <ArrowLeft size={14} strokeWidth={2.5} />
          Back to Students
        </Link>
        <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-black tracking-[-0.03em] mt-1.5 mb-2 bg-gradient-to-br from-white to-[#8a8a8a] bg-clip-text text-transparent">Add New Student</h1>
        <p className="text-text-muted text-[0.875rem] m-0 leading-relaxed">Fill in the details below to enrol a new student.</p>
      </div>

      {/* AlertCircle — signals a form/API validation error */}
      {apiError && (
        <div className="flex items-start gap-2 py-3 px-4 rounded-lg text-[0.85rem] font-medium mb-5 leading-relaxed text-accent-2 bg-white/5 border border-white/10 shadow-neu-sm">
          <AlertCircle size={15} strokeWidth={2} />
          {apiError}
        </div>
      )}

      <StudentForm
        onSubmit={handleSubmit}
        buttonLabel="Add Student"
        loading={loading}
      />
    </div>
  );
}

export default AddStudentPage;
