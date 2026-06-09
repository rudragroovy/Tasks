// HomePage.jsx — Full student list with Sort, Advanced Filter, Export CSV, Bulk Import
import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search, Pencil, Trash2, UserX, ServerCrash, RefreshCw,
  CheckCircle2, XCircle, Loader2, PlusCircle,
  Download, Upload, ChevronUp, ChevronDown, ChevronsUpDown,
  SlidersHorizontal, X,
} from 'lucide-react';
import { fetchStudents, deleteStudent } from '../services/studentService';
import { fetchCourses } from '../services/courseService';
import DeleteModal    from '../components/DeleteModal';
import BulkImportModal from '../components/BulkImportModal';
import './HomePage.css';

// ── CSV Export helper ────────────────────────────────────────────────────────
function exportToCSV(data) {
  const headers = ['ID','First Name','Last Name','Email','Date of Birth','Course','Enrollment Date','GPA'];
  const rows = data.map(s => [
    s.id, s.first_name, s.last_name, s.email,
    s.date_of_birth?.split('T')[0] || '',
    s.course,
    s.enrollment_date?.split('T')[0] || '',
    s.gpa ?? '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'students.csv' });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Sort helper ──────────────────────────────────────────────────────────────
function sortData(data, { key, dir }) {
  if (!key) return data;
  return [...data].sort((a, b) => {
    let av = a[key] ?? ''; let bv = b[key] ?? '';
    if (key === 'gpa') { av = parseFloat(av) || 0; bv = parseFloat(bv) || 0; }
    if (av < bv) return dir === 'asc' ? -1 :  1;
    if (av > bv) return dir === 'asc' ?  1 : -1;
    return 0;
  });
}

// ── SortIcon component ───────────────────────────────────────────────────────
function SortIcon({ col, sort }) {
  if (sort.key !== col) return <ChevronsUpDown size={12} className="sort-icon-neutral" />;
  return sort.dir === 'asc'
    ? <ChevronUp size={12} className="sort-icon-active" />
    : <ChevronDown size={12} className="sort-icon-active" />;
}

// ════════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const [students,     setStudents]     = useState([]);
  const [courses,      setCourses]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showImport,   setShowImport]   = useState(false);
  const [toast,        setToast]        = useState(null);

  // ── Filter state ──────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterGpaMin, setFilterGpaMin] = useState('');
  const [filterGpaMax, setFilterGpaMax] = useState('');
  const [filterYear,   setFilterYear]   = useState('');

  // ── Sort state ────────────────────────────────────────────
  const [sort, setSort] = useState({ key: '', dir: 'asc' });

  const location = useLocation();

  useEffect(() => { 
    loadStudents(); 
    loadCourses();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const courseParam = params.get('course');
    if (courseParam) {
      setFilterCourse(courseParam);
      setFilterOpen(true);
    }
  }, [location.search]);

  const loadCourses = async () => {
    try { setCourses(await fetchCourses()); }
    catch { console.error('Could not load courses'); }
  };

  const loadStudents = async () => {
    try { setLoading(true); setError(null); setStudents(await fetchStudents()); }
    catch { setError('Could not reach the server. Is it running on port 5000?'); }
    finally { setLoading(false); }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteStudent(deleteTarget.id);
      setStudents(prev => prev.filter(s => s.id !== deleteTarget.id));
      showToast(`${deleteTarget.first_name} deleted`, 'success');
    } catch { showToast('Failed to delete student', 'error'); }
    finally { setDeleteTarget(null); }
  };

  const clearFilters = () => {
    setSearch(''); setFilterCourse('');
    setFilterGpaMin(''); setFilterGpaMax(''); setFilterYear('');
  };

  const hasActiveFilters = search || filterCourse || filterGpaMin || filterGpaMax || filterYear;

  // ── Handle column sort toggle ─────────────────────────────
  const toggleSort = (key) => {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }
    );
  };

  // ── Compute filtered + sorted list (memoised) ─────────────
  const filtered = useMemo(() => {
    let data = students.filter(s => {
      const text = `${s.first_name} ${s.last_name} ${s.email} ${s.course}`.toLowerCase();
      if (search && !text.includes(search.toLowerCase())) return false;
      if (filterCourse && s.course !== filterCourse) return false;
      if (filterGpaMin !== '' && (s.gpa === null || parseFloat(s.gpa) < parseFloat(filterGpaMin))) return false;
      if (filterGpaMax !== '' && (s.gpa === null || parseFloat(s.gpa) > parseFloat(filterGpaMax))) return false;
      if (filterYear && s.enrollment_date?.split('T')[0].split('-')[0] !== filterYear) return false;
      return true;
    });
    return sortData(data, sort);
  }, [students, search, filterCourse, filterGpaMin, filterGpaMax, filterYear, sort]);

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' });
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading) return (
    <div className="page">
      <div className="loading-spinner">
        <Loader2 className="spin-icon" size={40} strokeWidth={1.5} />
        <p>Loading students…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="page">
      <div className="error-banner">
        <ServerCrash size={38} strokeWidth={1.4} className="error-icon" />
        <p>{error}</p>
        <button className="btn-retry" onClick={loadStudents}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success'
            ? <CheckCircle2 size={16} className="toast-icon" />
            : <XCircle size={16} className="toast-icon" />}
          {toast.msg}
        </div>
      )}

      {/* ── Top Bar ────────────────────────────────────────── */}
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Students</h1>
          <span className="count-badge">{filtered.length} / {students.length}</span>
        </div>
        <div className="header-right">
          {/* Search */}
          <div className="search-wrapper">
            <Search className="search-icon" size={15} strokeWidth={2} />
            <input id="search-input" type="text" className="search-input"
              placeholder="Search name, email, course…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}><X size={12}/></button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            className={`btn-icon ${filterOpen ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
            onClick={() => setFilterOpen(f => !f)} title="Advanced Filters"
          >
            <SlidersHorizontal size={16} strokeWidth={2} />
            {hasActiveFilters && <span className="filter-dot" />}
          </button>

          {/* Export CSV */}
          <button className="btn-icon" onClick={() => exportToCSV(filtered)} title="Export CSV">
            <Download size={16} strokeWidth={2} />
          </button>

          {/* Bulk Import */}
          <button className="btn-icon" onClick={() => setShowImport(true)} title="Bulk Import CSV">
            <Upload size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Filter Panel ───────────────────────────────────── */}
      {filterOpen && (
        <div className="filter-panel">
          <div className="filter-grid">
            <div className="filter-group">
              <label>Course</label>
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                <option value="">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>GPA Min</label>
              <input type="number" step="0.1" min="0" max="5"
                placeholder="0.00" value={filterGpaMin}
                onChange={e => setFilterGpaMin(e.target.value)} />
            </div>
            <div className="filter-group">
              <label>GPA Max</label>
              <input type="number" step="0.1" min="0" max="5"
                placeholder="5.00" value={filterGpaMax}
                onChange={e => setFilterGpaMax(e.target.value)} />
            </div>
            <div className="filter-group">
              <label>Enrollment Year</label>
              <input type="number" placeholder="e.g. 2023"
                value={filterYear} onChange={e => setFilterYear(e.target.value)} />
            </div>
          </div>
          {hasActiveFilters && (
            <button className="btn-clear-filters" onClick={clearFilters}>
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Empty State ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <UserX className="empty-icon" size={52} strokeWidth={1.2} />
          <p>{hasActiveFilters ? 'No students match your filters.' : 'No students yet. Add the first one!'}</p>
          {hasActiveFilters
            ? <button className="btn-primary" onClick={clearFilters}><X size={14}/> Clear Filters</button>
            : <Link to="/add" className="btn-primary"><PlusCircle size={15} /> Add First Student</Link>
          }
        </div>
      ) : (
        /* ── Student Table ───────────────────────────────── */
        <div className="table-wrapper">
          <table className="student-table">
            <thead>
              <tr>
                <th>#</th>
                <th className="sortable" onClick={() => toggleSort('first_name')}>
                  Name <SortIcon col="first_name" sort={sort} />
                </th>
                <th>Email</th>
                <th className="sortable" onClick={() => toggleSort('course')}>
                  Course <SortIcon col="course" sort={sort} />
                </th>
                <th className="sortable" onClick={() => toggleSort('gpa')}>
                  GPA <SortIcon col="gpa" sort={sort} />
                </th>
                <th className="sortable" onClick={() => toggleSort('enrollment_date')}>
                  Enrolled <SortIcon col="enrollment_date" sort={sort} />
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student, idx) => (
                <tr key={student.id} className="table-row">
                  <td className="td-index" data-label="#">{idx + 1}</td>
                  <td className="td-name" data-label="Name">
                    <div className="avatar">{student.first_name[0]}{student.last_name[0]}</div>
                    {/* Click name → detail page */}
                    <Link to={`/students/${student.id}`} className="student-name-link">
                      {student.first_name} {student.last_name}
                    </Link>
                  </td>
                  <td className="td-email" data-label="Email">{student.email}</td>
                  <td data-label="Course"><span className="course-tag">{student.course}</span></td>
                  <td data-label="GPA">
                    {student.gpa !== null && student.gpa !== undefined
                      ? <span className={`gpa-badge gpa-${Math.floor(student.gpa)}`}>{parseFloat(student.gpa).toFixed(2)}</span>
                      : <span className="gpa-none">—</span>}
                  </td>
                  <td className="td-enrolled" data-label="Enrolled">{formatDate(student.enrollment_date)}</td>
                  <td className="td-actions" data-label="Actions">
                    <Link to={`/edit/${student.id}`} className="btn-edit" id={`edit-btn-${student.id}`}>
                      <Pencil size={13} strokeWidth={2.2} /> Edit
                    </Link>
                    <button className="btn-delete" id={`delete-btn-${student.id}`}
                      onClick={() => setDeleteTarget(student)}>
                      <Trash2 size={13} strokeWidth={2.2} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {deleteTarget && (
        <DeleteModal
          studentName={`${deleteTarget.first_name} ${deleteTarget.last_name}`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {showImport && (
        <BulkImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { loadStudents(); showToast('Students imported successfully!'); }}
        />
      )}
    </div>
  );
}
