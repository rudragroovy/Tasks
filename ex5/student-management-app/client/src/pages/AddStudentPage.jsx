// AddStudentPage.jsx — Add new student with Lucide icons
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { createStudent } from '../services/studentService';
import StudentForm from '../components/StudentForm';
import './FormPage.css';

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
    <div className="form-page">
      <div className="form-page-header">
        {/* ArrowLeft — navigate back */}
        <Link to="/" className="back-link">
          <ArrowLeft size={14} strokeWidth={2.5} />
          Back to Students
        </Link>
        <h1 className="form-page-title">Add New Student</h1>
        <p className="form-page-sub">Fill in the details below to enrol a new student.</p>
      </div>

      {/* AlertCircle — signals a form/API validation error */}
      {apiError && (
        <div className="api-error">
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
