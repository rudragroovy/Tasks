import { useState, useEffect } from 'react';
import { BookOpen, ServerCrash, RefreshCw, Loader2, Users, GraduationCap, ArrowRight, PlusCircle, Pencil, Trash2, XCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchCourses, createCourse, updateCourse, deleteCourse } from '../services/courseService';
import './CourseManagementPage.css';

export default function CourseManagementPage() {
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [deleteCourseTarget, setDeleteCourseTarget] = useState(null);
  
  const [formName, setFormName] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch both courses and stats concurrently
      const [coursesData, statsRes] = await Promise.all([
        fetchCourses(),
        fetch('http://localhost:5000/api/students/stats')
      ]);
      const statsJson = await statsRes.json();
      
      const statsMap = {};
      if (statsJson.success) {
        statsJson.data.courses.forEach(c => {
          statsMap[c.course] = { count: c.count, avg_gpa: c.avg_gpa };
        });
      }
      setStats(statsMap);
      setCourses(coursesData || []);
    } catch (err) {
      setError('Could not reach the server to load courses.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await createCourse(formName.trim());
      showToast('Course added successfully');
      setIsAddOpen(false);
      setFormName('');
      loadData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await updateCourse(editCourse.id, editCourse.name, formName.trim());
      showToast('Course updated successfully');
      setEditCourse(null);
      setFormName('');
      loadData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteCourse(deleteCourseTarget.id, deleteCourseTarget.name);
      showToast('Course deleted successfully');
      setDeleteCourseTarget(null);
      loadData();
    } catch (err) {
      alert(err.message);
      setDeleteCourseTarget(null);
    }
  };

  if (loading) return (
    <div className="dash-page">
      <div className="dash-loading">
        <Loader2 className="spin-icon" size={44} strokeWidth={1.5} />
        <p>Loading course data…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="dash-page">
      <div className="dash-error">
        <ServerCrash size={40} strokeWidth={1.4} className="error-icon" />
        <p>{error}</p>
        <button className="btn-retry" onClick={loadData}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="dash-page">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} className="toast-icon" /> : <XCircle size={16} className="toast-icon" />}
          {toast.msg}
        </div>
      )}

      <div className="dash-header">
        <div>
          <h1 className="dash-title">Course Management</h1>
          <p className="dash-sub">Monitor student enrollment and manage academic programs.</p>
        </div>
        <button className="dash-cta" onClick={() => { setFormName(''); setFormError(''); setIsAddOpen(true); }}>
          <PlusCircle size={16} strokeWidth={2} /> Add Course
        </button>
      </div>

      <div className="courses-grid">
        {courses.map((c) => {
          const stat = stats[c.name] || { count: 0, avg_gpa: '0.00' };
          return (
            <div className="course-card" key={c.id}>
              <div className="course-card-header">
                <div className="course-icon-wrap">
                  <BookOpen size={20} strokeWidth={2} />
                </div>
                <h3 className="course-title">{c.name}</h3>
                
                <div className="course-actions">
                  <button className="btn-icon" onClick={() => { setEditCourse(c); setFormName(c.name); setFormError(''); }}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn-icon" onClick={() => setDeleteCourseTarget(c)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <div className="course-stats">
                <div className="c-stat">
                  <Users size={14} className="c-stat-icon" />
                  <span className="c-stat-val">{stat.count}</span>
                  <span className="c-stat-label">Students</span>
                </div>
                <div className="c-stat">
                  <GraduationCap size={15} className="c-stat-icon" />
                  <span className="c-stat-val">{parseFloat(stat.avg_gpa).toFixed(2)}</span>
                  <span className="c-stat-label">Avg GPA</span>
                </div>
              </div>
              
              <div className="course-card-footer">
                {stat.count > 0 ? (
                  <Link to={`/?course=${encodeURIComponent(c.name)}`} className="btn-view-students">
                    View Students <ArrowRight size={14} />
                  </Link>
                ) : (
                  <span className="btn-view-students disabled">No Students Enrolled</span>
                )}
              </div>
            </div>
          );
        })}
        {courses.length === 0 && (
          <div className="empty-courses">
            <BookOpen size={40} opacity={0.3} />
            <p>No courses found. Add a course to get started!</p>
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {isAddOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Course</h2>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Course Name</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required autoFocus placeholder="e.g. Graphic Design" />
                </div>
                {formError && <div className="form-error">{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editCourse && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Course</h2>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Course Name</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required autoFocus />
                  <small className="help-text">Updating the name will update all currently enrolled students.</small>
                </div>
                {formError && <div className="form-error">{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditCourse(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteCourseTarget && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Delete Course</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{deleteCourseTarget.name}</strong>?</p>
              <p className="warning-text">This action cannot be undone. Courses with enrolled students cannot be deleted.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteCourseTarget(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
