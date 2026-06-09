// DashboardPage.jsx — Stats overview with cards and course distribution chart
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, TrendingUp, BookOpen, CalendarCheck,
  Loader2, ServerCrash, ArrowRight,
} from 'lucide-react';
import { fetchStats } from '../services/studentService';

function DashboardPage() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchStats();
        setStats(data);
      } catch {
        setError('Could not load stats. Is the server running?');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const gpaColor = (gpa) => {
    if (!gpa) return '';
    const g = parseFloat(gpa);
    if (g >= 3) return 'bg-white/10 text-[#e5e5e5]';
    if (g >= 2) return 'bg-white/10 text-[#a3a3a3]';
    return 'bg-white/5 text-[#6b6b6b]';
  };

  if (loading) return (
    <div className="max-w-[1200px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      <div className="flex flex-col items-center gap-4 py-20 px-4 text-center text-text-muted">
        <Loader2 className="animate-spin text-accent-2" size={42} strokeWidth={1.5} />
        <p>Loading dashboard…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-[1200px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      <div className="flex flex-col items-center gap-4 py-20 px-4 text-center text-text-muted">
        <ServerCrash size={40} strokeWidth={1.3} />
        <p>{error}</p>
      </div>
    </div>
  );

  // Find max course count for normalising bar widths
  const maxCount = Math.max(...(stats.courses.map(c => parseInt(c.count))), 1);

  return (
    <div className="max-w-[1200px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[clamp(1.5rem,4vw,2.2rem)] font-black tracking-[-0.03em] bg-gradient-to-br from-white to-[#8a8a8a] bg-clip-text text-transparent mb-1">Dashboard</h1>
          <p className="text-text-muted text-[0.875rem]">Real-time overview of your student records</p>
        </div>
        <Link to="/" className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-full no-underline text-[0.85rem] font-semibold text-black bg-gradient-to-br from-white to-[#c8c8c8] shadow-neu-sm transition-all duration-200 whitespace-nowrap self-start hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(255,255,255,0.12)]">
          View All Students <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </div>

      {/* ── Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="flex flex-col min-[400px]:flex-row min-[400px]:items-center items-start gap-2.5 min-[400px]:gap-4 p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-neu-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-neu-lg">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-neu-sm bg-white/10 text-[#e5e5e5]">
            <Users size={22} strokeWidth={1.7} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[clamp(1.4rem,3vw,2rem)] font-black text-text-primary leading-none tracking-tight">{stats.total}</span>
            <span className="text-[0.75rem] text-text-muted font-medium whitespace-nowrap">Total Students</span>
          </div>
        </div>

        <div className="flex flex-col min-[400px]:flex-row min-[400px]:items-center items-start gap-2.5 min-[400px]:gap-4 p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-neu-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-neu-lg">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-neu-sm bg-[rgba(255,255,255,0.06)] text-[#c8c8c8]">
            <TrendingUp size={22} strokeWidth={1.7} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[clamp(1.4rem,3vw,2rem)] font-black text-text-primary leading-none tracking-tight">{stats.avg_gpa ?? '—'}</span>
            <span className="text-[0.75rem] text-text-muted font-medium whitespace-nowrap">Average GPA</span>
          </div>
        </div>

        <div className="flex flex-col min-[400px]:flex-row min-[400px]:items-center items-start gap-2.5 min-[400px]:gap-4 p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-neu-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-neu-lg">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-neu-sm bg-[rgba(255,255,255,0.05)] text-[#b0b0b0]">
            <BookOpen size={22} strokeWidth={1.7} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[clamp(1.4rem,3vw,2rem)] font-black text-text-primary leading-none tracking-tight">{stats.courses.length}</span>
            <span className="text-[0.75rem] text-text-muted font-medium whitespace-nowrap">Active Courses</span>
          </div>
        </div>

        <div className="flex flex-col min-[400px]:flex-row min-[400px]:items-center items-start gap-2.5 min-[400px]:gap-4 p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-neu-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-neu-lg">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-neu-sm bg-[rgba(255,255,255,0.04)] text-[#9a9a9a]">
            <CalendarCheck size={22} strokeWidth={1.7} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[clamp(1.4rem,3vw,2rem)] font-black text-text-primary leading-none tracking-tight">{stats.this_month}</span>
            <span className="text-[0.75rem] text-text-muted font-medium whitespace-nowrap">Enrolled This Month</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: Chart + Recent ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Course Distribution — CSS bar chart */}
        <div className="p-7 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-neu-sm">
          <h2 className="flex items-center gap-2 text-[0.875rem] font-bold text-text-secondary tracking-[0.02em] uppercase mb-5">
            <BookOpen size={16} strokeWidth={2} />
            Students per Course
          </h2>
          <div className="flex flex-col gap-3">
            {stats.courses.length === 0
              ? <p className="text-text-muted text-[0.875rem]">No course data yet.</p>
              : stats.courses.map((c) => (
                <div className="grid grid-cols-[90px_1fr_28px] sm:grid-cols-[130px_1fr_32px] items-center gap-3" key={c.course}>
                  <span className="text-[0.78rem] text-text-secondary font-medium whitespace-nowrap overflow-hidden text-ellipsis" title={c.course}>{c.course}</span>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden shadow-neu-in">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#e5e5e5] to-[#8a8a8a] transition-[width] duration-700 min-w-[4px]"
                      style={{ width: `${(parseInt(c.count) / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-[0.75rem] font-bold text-text-muted text-right">{c.count}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Recent Enrollments */}
        <div className="p-7 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-neu-sm">
          <h2 className="flex items-center gap-2 text-[0.875rem] font-bold text-text-secondary tracking-[0.02em] uppercase mb-5">
            <CalendarCheck size={16} strokeWidth={2} />
            Recent Enrollments
          </h2>
          <div className="flex flex-col gap-2">
            {stats.recent.length === 0
              ? <p className="text-text-muted text-[0.875rem]">No students yet.</p>
              : stats.recent.map((s) => (
                <Link to={`/students/${s.id}`} className="flex items-center gap-3 p-2.5 rounded-lg no-underline transition-colors duration-150 border border-transparent hover:bg-white/5 hover:border-white/10" key={s.id}>
                  <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[0.68rem] font-extrabold text-black shrink-0 uppercase bg-gradient-to-br from-[#e5e5e5] to-[#8a8a8a] shadow-neu-sm">
                    {s.first_name[0]}{s.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[0.85rem] font-semibold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">{s.first_name} {s.last_name}</span>
                    <span className="block text-[0.75rem] text-text-muted whitespace-nowrap overflow-hidden text-ellipsis">{s.course}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {s.gpa && (
                      <span className={`text-[0.78rem] font-extrabold px-1.5 py-0.5 rounded-md ${gpaColor(s.gpa)}`}>
                        {parseFloat(s.gpa).toFixed(2)}
                      </span>
                    )}
                    <span className="text-[0.7rem] text-text-muted whitespace-nowrap">{formatDate(s.enrollment_date)}</span>
                  </div>
                </Link>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
