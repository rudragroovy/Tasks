// StudentDetailPage.jsx — Full profile view for a single student
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Trash2, Mail, BookOpen,
  Calendar, Award, Clock, User, Loader2, ServerCrash,
} from 'lucide-react';
import { fetchStudentById, deleteStudent } from '../services/studentService';
import DeleteModal from '../components/DeleteModal';
import './StudentDetailPage.css';

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
    if (g >= 3) return 'gpa-high';
    if (g >= 2) return 'gpa-mid';
    return 'gpa-low';
  };

  if (loading) return (
    <div className="detail-page">
      <div className="detail-loading">
        <Loader2 className="spin-icon" size={42} strokeWidth={1.5} />
        <p>Loading student…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="detail-page">
      <div className="detail-error">
        <ServerCrash size={40} strokeWidth={1.3} />
        <p>{error}</p>
        <Link to="/" className="back-link"><ArrowLeft size={14} /> Back</Link>
      </div>
    </div>
  );

  return (
    <div className="detail-page">
      {/* Back + Actions */}
      <div className="detail-topbar">
        <Link to="/" className="back-link">
          <ArrowLeft size={14} strokeWidth={2.5} /> Back to Students
        </Link>
        <div className="detail-actions">
          <Link to={`/edit/${student.id}`} className="btn-edit-detail">
            <Pencil size={14} strokeWidth={2.2} /> Edit
          </Link>
          <button className="btn-delete-detail" onClick={() => setShowDel(true)}>
            <Trash2 size={14} strokeWidth={2.2} /> Delete
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="detail-card">
        {/* Hero */}
        <div className="detail-hero">
          <div className="detail-avatar">
            {student.first_name[0]}{student.last_name[0]}
          </div>
          <div className="detail-hero-info">
            <h1 className="detail-name">
              {student.first_name} {student.last_name}
            </h1>
            <span className="detail-course-tag">
              <BookOpen size={13} strokeWidth={2} />
              {student.course}
            </span>
            {student.gpa && (
              <span className={`detail-gpa-badge ${gpaClass(student.gpa)}`}>
                <Award size={13} strokeWidth={2} />
                GPA {parseFloat(student.gpa).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="detail-divider" />
        <div className="detail-grid">
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
    <div className="info-row">
      <span className="info-icon">{icon}</span>
      <div className="info-text">
        <span className="info-label">{label}</span>
        <span className="info-value">{value || '—'}</span>
      </div>
    </div>
  );
}

export default StudentDetailPage;
