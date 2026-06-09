import { useState, useEffect } from 'react';
import { BookOpen, ServerCrash, RefreshCw, Loader2, Users, GraduationCap, ArrowRight, PlusCircle, Pencil, Trash2, XCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchCourses, createCourse, updateCourse, deleteCourse } from '../services/courseService';

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
    <div className="max-w-[1200px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      <div className="flex flex-col items-center gap-4 py-20 px-4 text-center text-text-muted">
        <Loader2 className="animate-spin text-accent-2" size={44} strokeWidth={1.5} />
        <p>Loading course data…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-[1200px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      <div className="flex flex-col items-center gap-4 py-20 px-4 text-center text-text-muted">
        <ServerCrash size={40} strokeWidth={1.4} className="text-text-muted" />
        <p>{error}</p>
        <button className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-full no-underline text-[0.85rem] font-semibold text-text-primary bg-white/5 border border-white/10 shadow-neu-sm transition-all duration-200 cursor-pointer hover:bg-white/10 hover:-translate-y-[2px]" onClick={loadData}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-4 sm:right-6 max-w-[340px] px-5 py-3 rounded-md text-[0.875rem] font-medium z-[200] text-text-primary flex items-center gap-2.5 bg-[#121212]/95 backdrop-blur-md border border-white/10 shadow-neu-lg animate-[toastIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-[#d4d4d4]" /> : <XCircle size={16} className="text-[#9a9a9a]" />}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[clamp(1.5rem,4vw,2.2rem)] font-black tracking-[-0.03em] bg-gradient-to-br from-white to-[#8a8a8a] bg-clip-text text-transparent mb-1">Course Management</h1>
          <p className="text-text-muted text-[0.875rem]">Monitor student enrollment and manage academic programs.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-full no-underline text-[0.85rem] font-semibold text-black bg-gradient-to-br from-white to-[#c8c8c8] shadow-neu-sm transition-all duration-200 whitespace-nowrap self-start cursor-pointer hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(255,255,255,0.12)]" onClick={() => { setFormName(''); setFormError(''); setIsAddOpen(true); }}>
          <PlusCircle size={16} strokeWidth={2} /> Add Course
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((c) => {
          const stat = stats[c.name] || { count: 0, avg_gpa: '0.00' };
          return (
            <div className="p-7 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-neu-sm flex flex-col gap-5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-neu-lg relative group" key={c.id}>
              <div className="flex items-center gap-4 relative">
                <div className="w-[46px] h-[46px] rounded-lg flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5 text-white shadow-neu-in shrink-0">
                  <BookOpen size={20} strokeWidth={2} />
                </div>
                <h3 className="text-[1.1rem] font-extrabold text-text-primary leading-tight pr-10">{c.name}</h3>
                
                <div className="absolute top-0 right-0 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <button className="bg-transparent border-none cursor-pointer text-text-muted p-1.5 rounded-sm transition-all duration-200 hover:text-white hover:bg-white/10" onClick={() => { setEditCourse(c); setFormName(c.name); setFormError(''); }}>
                    <Pencil size={14} />
                  </button>
                  <button className="bg-transparent border-none cursor-pointer text-text-muted p-1.5 rounded-sm transition-all duration-200 hover:text-white hover:bg-white/10" onClick={() => setDeleteCourseTarget(c)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <div className="flex gap-4 py-5 border-y border-white/5">
                <div className="flex-1 flex flex-col gap-1">
                  <Users size={14} className="text-text-muted mb-1" />
                  <span className="text-[1.5rem] font-black text-white leading-none tracking-[-0.03em]">{stat.count}</span>
                  <span className="text-[0.7rem] text-text-secondary font-bold uppercase tracking-[0.05em]">Students</span>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <GraduationCap size={15} className="text-text-muted mb-1" />
                  <span className="text-[1.5rem] font-black text-white leading-none tracking-[-0.03em]">{parseFloat(stat.avg_gpa).toFixed(2)}</span>
                  <span className="text-[0.7rem] text-text-secondary font-bold uppercase tracking-[0.05em]">Avg GPA</span>
                </div>
              </div>
              
              <div className="flex justify-end">
                {stat.count > 0 ? (
                  <Link to={`/?course=${encodeURIComponent(c.name)}`} className="inline-flex items-center gap-1.5 text-[0.85rem] font-bold text-text-secondary no-underline transition-colors duration-200 bg-transparent py-1 hover:text-white">
                    View Students <ArrowRight size={14} />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-bold text-text-secondary no-underline transition-colors duration-200 bg-transparent py-1 opacity-50 cursor-not-allowed">No Students Enrolled</span>
                )}
              </div>
            </div>
          );
        })}
        {courses.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-4 py-16 px-4 text-text-muted text-center">
            <BookOpen size={40} opacity={0.3} />
            <p>No courses found. Add a course to get started!</p>
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {isAddOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="mb-4">
              <h2 className="text-[1.25rem] font-extrabold mb-4">Add New Course</h2>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="mb-4">
                <div className="flex flex-col gap-2 mb-4">
                  <label className="text-[0.85rem] font-semibold text-text-secondary">Course Name</label>
                  <input className="p-3 rounded-md border border-white/10 bg-white/5 text-white outline-none focus:border-white/20" type="text" value={formName} onChange={e => setFormName(e.target.value)} required autoFocus placeholder="e.g. Graphic Design" />
                </div>
                {formError && <div className="text-[#ff6b6b] text-[0.85rem]">{formError}</div>}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="px-5 py-2.5 rounded-full bg-white/10 text-white border-none cursor-pointer font-semibold transition-colors hover:bg-white/20" onClick={() => setIsAddOpen(false)}>Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-full bg-white text-black border-none cursor-pointer font-bold transition-transform hover:-translate-y-[2px] shadow-neu-sm hover:shadow-[0_4px_14px_rgba(255,255,255,0.15)]">Add Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editCourse && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="mb-4">
              <h2 className="text-[1.25rem] font-extrabold mb-4">Edit Course</h2>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <div className="flex flex-col gap-2 mb-4">
                  <label className="text-[0.85rem] font-semibold text-text-secondary">Course Name</label>
                  <input className="p-3 rounded-md border border-white/10 bg-white/5 text-white outline-none focus:border-white/20" type="text" value={formName} onChange={e => setFormName(e.target.value)} required autoFocus />
                  <small className="text-text-muted text-[0.75rem]">Updating the name will update all currently enrolled students.</small>
                </div>
                {formError && <div className="text-[#ff6b6b] text-[0.85rem]">{formError}</div>}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="px-5 py-2.5 rounded-full bg-white/10 text-white border-none cursor-pointer font-semibold transition-colors hover:bg-white/20" onClick={() => setEditCourse(null)}>Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-full bg-white text-black border-none cursor-pointer font-bold transition-transform hover:-translate-y-[2px] shadow-neu-sm hover:shadow-[0_4px_14px_rgba(255,255,255,0.15)]">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteCourseTarget && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="mb-4">
              <h2 className="text-[1.25rem] font-extrabold mb-4">Delete Course</h2>
            </div>
            <div className="mb-4">
              <p className="text-[0.95rem] text-text-secondary mb-3 leading-relaxed">Are you sure you want to delete <strong className="text-white">{deleteCourseTarget.name}</strong>?</p>
              <p className="text-[#ff6b6b] text-[0.85rem] mt-2">This action cannot be undone. Courses with enrolled students cannot be deleted.</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-5 py-2.5 rounded-full bg-white/10 text-white border-none cursor-pointer font-semibold transition-colors hover:bg-white/20" onClick={() => setDeleteCourseTarget(null)}>Cancel</button>
              <button className="px-5 py-2.5 rounded-full bg-[#ff4757] text-white border-none cursor-pointer font-bold transition-transform hover:-translate-y-[2px] shadow-neu-sm hover:shadow-[0_4px_14px_rgba(255,71,87,0.3)]" onClick={handleDeleteConfirm}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
