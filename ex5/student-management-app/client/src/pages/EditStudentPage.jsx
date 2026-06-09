// EditStudentPage.jsx — Edit existing student with Lucide icons
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { fetchStudentById, updateStudent } from '../services/studentService';
import StudentForm from '../components/StudentForm';
import './FormPage.css';

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
      <div className="form-page">
        <div className="loading-text">Loading student data…</div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="form-page-header">
        {/* ArrowLeft — navigate back */}
        <Link to="/" className="back-link">
          <ArrowLeft size={14} strokeWidth={2.5} />
          Back to Students
        </Link>
        <h1 className="form-page-title">Edit Student</h1>
        <p className="form-page-sub">
          Editing: <strong>{student?.first_name} {student?.last_name}</strong>
        </p>
      </div>

      {/* AlertCircle — signals a validation or API error */}
      {apiError && (
        <div className="api-error">
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
