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
  if (sort.key !== col) return <ChevronsUpDown size={12} className="opacity-30 ml-1 inline-block align-middle" />;
  return sort.dir === 'asc'
    ? <ChevronUp size={12} className="text-text-primary ml-1 inline-block align-middle" />
    : <ChevronDown size={12} className="text-text-primary ml-1 inline-block align-middle" />;
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
    <div className="max-w-[1200px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      <div className="flex flex-col items-center gap-5 py-20 px-4 text-text-muted">
        <Loader2 className="animate-spin text-accent-2" size={40} strokeWidth={1.5} />
        <p className="text-[0.875rem]">Loading students…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-[1200px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      <div className="flex flex-col items-center gap-3.5 py-12 px-6 text-center rounded-lg bg-white/5 border border-white/10 shadow-neu-lg">
        <ServerCrash size={38} strokeWidth={1.4} className="text-text-muted" />
        <p className="text-text-secondary text-[0.875rem]">{error}</p>
        <button className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-[0.85rem] font-semibold cursor-pointer text-text-primary bg-white/5 border border-white/10 shadow-neu-sm transition-all hover:bg-white/10 hover:shadow-neu-out" onClick={loadStudents}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-4 sm:right-6 max-w-[340px] px-5 py-3 rounded-md text-[0.875rem] font-medium z-[200] text-text-primary flex items-center gap-2.5 bg-[#121212]/95 backdrop-blur-md border border-white/10 shadow-neu-lg animate-[toastIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
          {toast.type === 'success'
            ? <CheckCircle2 size={16} className="text-semantic-success" />
            : <XCircle size={16} className="text-semantic-danger" />}
          {toast.msg}
        </div>
      )}

      {/* ── Top Bar ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-[clamp(1.5rem,4vw,2.2rem)] font-black tracking-[-0.03em] bg-gradient-to-br from-white to-[#8a8a8a] bg-clip-text text-transparent">Students</h1>
          <span className="bg-white/5 text-accent-2 text-[0.76rem] font-bold px-2.5 py-1 rounded-full border border-white/10 whitespace-nowrap">{filtered.length} / {students.length}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex items-center flex-1 min-w-0 sm:flex-none sm:w-[260px]">
            <Search className="absolute left-3.5 opacity-35 pointer-events-none" size={15} strokeWidth={2} />
            <input id="search-input" type="text" className="w-full py-2.5 pr-8 pl-10 text-[0.875rem] text-text-primary rounded-full outline-none bg-white/5 border border-white/10 shadow-neu-in transition-all duration-200 focus:bg-white/5 focus:border-white/20 focus:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.75),inset_-3px_-3px_8px_rgba(255,255,255,0.04),0_0_0_3px_rgba(255,255,255,0.05)] placeholder:text-text-muted"
              placeholder="Search name, email, course…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="absolute right-2.5 bg-transparent border-none text-text-muted cursor-pointer p-0.5 flex rounded transition-colors hover:text-text-secondary" onClick={() => setSearch('')}><X size={12}/></button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            className={`w-9 h-9 flex items-center justify-center rounded-md bg-white/5 border border-white/10 text-text-secondary cursor-pointer transition-all duration-200 shadow-neu-sm relative shrink-0 hover:bg-white/10 hover:text-text-primary hover:shadow-neu-out ${filterOpen ? 'bg-white/10 border-white/20 text-text-primary' : ''} ${hasActiveFilters ? 'border-white/30' : ''}`}
            onClick={() => setFilterOpen(f => !f)} title="Advanced Filters"
          >
            <SlidersHorizontal size={16} strokeWidth={2} />
            {hasActiveFilters && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-text-primary" />}
          </button>

          {/* Export CSV */}
          <button className="w-9 h-9 flex items-center justify-center rounded-md bg-white/5 border border-white/10 text-text-secondary cursor-pointer transition-all duration-200 shadow-neu-sm shrink-0 hover:bg-white/10 hover:text-text-primary hover:shadow-neu-out" onClick={() => exportToCSV(filtered)} title="Export CSV">
            <Download size={16} strokeWidth={2} />
          </button>

          {/* Bulk Import */}
          <button className="w-9 h-9 flex items-center justify-center rounded-md bg-white/5 border border-white/10 text-text-secondary cursor-pointer transition-all duration-200 shadow-neu-sm shrink-0 hover:bg-white/10 hover:text-text-primary hover:shadow-neu-out" onClick={() => setShowImport(true)} title="Bulk Import CSV">
            <Upload size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Filter Panel ───────────────────────────────────── */}
      {filterOpen && (
        <div className="p-5 mb-4 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 shadow-neu-out animate-[panelSlide_0.2s_ease]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.68rem] font-bold uppercase tracking-[0.07em] text-text-muted">Course</label>
              <select className="px-3 py-2 text-[0.82rem] text-text-primary outline-none rounded-md transition-all duration-200 bg-white/5 border border-white/10 shadow-neu-in focus:border-white/20 focus:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.75),inset_-3px_-3px_8px_rgba(255,255,255,0.04),0_0_0_2px_rgba(255,255,255,0.05)]" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                <option value="" className="bg-[#141414]">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.name} className="bg-[#141414]">{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.68rem] font-bold uppercase tracking-[0.07em] text-text-muted">GPA Min</label>
              <input className="px-3 py-2 text-[0.82rem] text-text-primary outline-none rounded-md transition-all duration-200 bg-white/5 border border-white/10 shadow-neu-in focus:border-white/20 focus:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.75),inset_-3px_-3px_8px_rgba(255,255,255,0.04),0_0_0_2px_rgba(255,255,255,0.05)] placeholder:text-text-muted" type="number" step="0.1" min="0" max="5"
                placeholder="0.00" value={filterGpaMin}
                onChange={e => setFilterGpaMin(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.68rem] font-bold uppercase tracking-[0.07em] text-text-muted">GPA Max</label>
              <input className="px-3 py-2 text-[0.82rem] text-text-primary outline-none rounded-md transition-all duration-200 bg-white/5 border border-white/10 shadow-neu-in focus:border-white/20 focus:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.75),inset_-3px_-3px_8px_rgba(255,255,255,0.04),0_0_0_2px_rgba(255,255,255,0.05)] placeholder:text-text-muted" type="number" step="0.1" min="0" max="5"
                placeholder="5.00" value={filterGpaMax}
                onChange={e => setFilterGpaMax(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.68rem] font-bold uppercase tracking-[0.07em] text-text-muted">Enrollment Year</label>
              <input className="px-3 py-2 text-[0.82rem] text-text-primary outline-none rounded-md transition-all duration-200 bg-white/5 border border-white/10 shadow-neu-in focus:border-white/20 focus:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.75),inset_-3px_-3px_8px_rgba(255,255,255,0.04),0_0_0_2px_rgba(255,255,255,0.05)] placeholder:text-text-muted" type="number" placeholder="e.g. 2023"
                value={filterYear} onChange={e => setFilterYear(e.target.value)} />
            </div>
          </div>
          {hasActiveFilters && (
            <button className="inline-flex items-center gap-1.5 mt-3.5 px-3.5 py-1.5 rounded-full text-[0.75rem] font-semibold cursor-pointer text-text-muted bg-white/5 border border-white/10 transition-all duration-200 hover:text-text-primary hover:bg-white/10" onClick={clearFilters}>
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Empty State ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 px-6 text-center">
          <UserX className="text-text-muted opacity-45" size={52} strokeWidth={1.2} />
          <p className="text-text-muted text-[0.9rem]">{hasActiveFilters ? 'No students match your filters.' : 'No students yet. Add the first one!'}</p>
          {hasActiveFilters
            ? <button className="btn-primary" onClick={clearFilters}><X size={14}/> Clear Filters</button>
            : <Link to="/add" className="btn-primary"><PlusCircle size={15} /> Add First Student</Link>
          }
        </div>
      ) : (
        /* ── Student Table ───────────────────────────────── */
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5 backdrop-blur-md shadow-neu-lg">
          <table className="block w-full sm:table border-collapse text-[0.875rem] sm:min-w-[680px]">
            <thead className="bg-white/5 border-b border-white/5 hidden sm:table-header-group">
              <tr>
                <th className="p-3.5 text-left text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-text-muted whitespace-nowrap select-none">#</th>
                <th className="p-3.5 text-left text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-text-muted whitespace-nowrap select-none cursor-pointer hover:text-text-secondary" onClick={() => toggleSort('first_name')}>
                  Name <SortIcon col="first_name" sort={sort} />
                </th>
                <th className="p-3.5 text-left text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-text-muted whitespace-nowrap select-none">Email</th>
                <th className="p-3.5 text-left text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-text-muted whitespace-nowrap select-none cursor-pointer hover:text-text-secondary" onClick={() => toggleSort('course')}>
                  Course <SortIcon col="course" sort={sort} />
                </th>
                <th className="p-3.5 text-left text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-text-muted whitespace-nowrap select-none cursor-pointer hover:text-text-secondary" onClick={() => toggleSort('gpa')}>
                  GPA <SortIcon col="gpa" sort={sort} />
                </th>
                <th className="p-3.5 text-left text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-text-muted whitespace-nowrap select-none cursor-pointer hover:text-text-secondary" onClick={() => toggleSort('enrollment_date')}>
                  Enrolled <SortIcon col="enrollment_date" sort={sort} />
                </th>
                <th className="p-3.5 text-left text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-text-muted whitespace-nowrap select-none">Actions</th>
              </tr>
            </thead>
            <tbody className="flex flex-col sm:table-row-group">
              {filtered.map((student, idx) => (
                <tr key={student.id} className="flex flex-col sm:table-row p-4 sm:p-0 gap-2.5 sm:gap-0 mb-4 sm:mb-0 border border-white/10 sm:border-0 border-b-white/5 rounded-lg sm:rounded-none bg-white/5 sm:bg-transparent shadow-neu-sm sm:shadow-none transition-colors duration-150 hover:bg-white/5">
                  <td className="hidden sm:table-cell p-3.5 text-text-muted text-[0.75rem] w-9 align-middle">{idx + 1}</td>
                  <td className="flex sm:table-cell justify-between sm:justify-normal items-center p-0 sm:p-3.5 border-b sm:border-0 border-white/5 pb-1.5 sm:pb-3.5 mb-0.5 sm:mb-0 align-middle">
                    <span className="sm:hidden text-[0.65rem] font-extrabold text-text-muted uppercase tracking-[0.05em]">Name</span>
                    <div className="flex items-center gap-3 font-semibold text-text-primary min-w-0">
                      <div className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-full flex items-center justify-center text-[0.6rem] sm:text-[0.68rem] font-extrabold text-black shrink-0 uppercase bg-gradient-to-br from-[#e5e5e5] to-[#8a8a8a] shadow-neu-sm">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                      <Link to={`/students/${student.id}`} className="text-text-primary no-underline font-semibold transition-colors duration-150 hover:text-white hover:underline hover:underline-offset-2 break-words">
                        {student.first_name} {student.last_name}
                      </Link>
                    </div>
                  </td>
                  <td className="flex sm:table-cell justify-between items-center p-0 sm:p-3.5 text-text-muted sm:text-[0.8rem] text-[0.85rem] align-middle">
                    <span className="sm:hidden text-[0.65rem] font-extrabold text-text-muted uppercase tracking-[0.05em]">Email</span>
                    {student.email}
                  </td>
                  <td className="flex sm:table-cell justify-between items-center p-0 sm:p-3.5 align-middle text-[0.85rem] sm:text-[0.875rem]">
                    <span className="sm:hidden text-[0.65rem] font-extrabold text-text-muted uppercase tracking-[0.05em]">Course</span>
                    <span className="inline-block px-2.5 py-1 sm:px-2.5 sm:py-1 rounded-full text-[0.7rem] sm:text-[0.74rem] font-semibold whitespace-nowrap bg-white/5 border border-white/10 text-accent-2">{student.course}</span>
                  </td>
                  <td className="flex sm:table-cell justify-between items-center p-0 sm:p-3.5 align-middle text-[0.85rem] sm:text-[0.875rem]">
                    <span className="sm:hidden text-[0.65rem] font-extrabold text-text-muted uppercase tracking-[0.05em]">GPA</span>
                    {student.gpa !== null && student.gpa !== undefined
                      ? <span className={`inline-block px-2 py-1 rounded shadow-neu-sm text-[0.8rem] font-extrabold ${Math.floor(student.gpa) >= 3 ? 'bg-white/10 text-[#e5e5e5] border border-white/15' : Math.floor(student.gpa) === 2 ? 'bg-white/5 text-[#a3a3a3] border border-white/10' : 'bg-white/5 text-[#6b6b6b] border border-white/10'}`}>{parseFloat(student.gpa).toFixed(2)}</span>
                      : <span className="text-text-muted">—</span>}
                  </td>
                  <td className="flex sm:table-cell justify-between items-center p-0 sm:p-3.5 text-text-secondary align-middle text-[0.85rem] sm:text-[0.875rem]">
                    <span className="sm:hidden text-[0.65rem] font-extrabold text-text-muted uppercase tracking-[0.05em]">Enrolled</span>
                    {formatDate(student.enrollment_date)}
                  </td>
                  <td className="flex sm:table-cell justify-end sm:justify-normal items-center p-0 sm:p-3.5 pt-2 sm:pt-3.5 mt-0.5 sm:mt-0 border-t sm:border-0 border-white/5 gap-2 sm:gap-1.5 align-middle">
                    <span className="sm:hidden mr-auto text-[0.65rem] font-extrabold text-text-muted uppercase tracking-[0.05em]">Actions</span>
                    <Link to={`/edit/${student.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full no-underline text-[0.74rem] font-semibold whitespace-nowrap transition-all duration-200 bg-white/5 border border-white/10 text-accent shadow-neu-sm hover:bg-white/10 hover:text-white hover:-translate-y-px" id={`edit-btn-${student.id}`}>
                      <Pencil size={13} strokeWidth={2.2} /> Edit
                    </Link>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.74rem] font-semibold cursor-pointer whitespace-nowrap transition-all duration-200 bg-white/5 border border-white/10 text-accent-2 shadow-neu-sm hover:bg-white/10 hover:text-accent hover:-translate-y-px" id={`delete-btn-${student.id}`}
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
