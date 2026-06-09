// DashboardPage.jsx — Stats overview with cards and course distribution chart
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, TrendingUp, BookOpen, CalendarCheck,
  Loader2, ServerCrash, ArrowRight,
} from 'lucide-react';
import { fetchStats } from '../services/studentService';
import './DashboardPage.css';

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
    if (g >= 3) return 'gpa-high';
    if (g >= 2) return 'gpa-mid';
    return 'gpa-low';
  };

  if (loading) return (
    <div className="dash-page">
      <div className="dash-loading">
        <Loader2 className="spin-icon" size={42} strokeWidth={1.5} />
        <p>Loading dashboard…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="dash-page">
      <div className="dash-error">
        <ServerCrash size={40} strokeWidth={1.3} />
        <p>{error}</p>
      </div>
    </div>
  );

  // Find max course count for normalising bar widths
  const maxCount = Math.max(...(stats.courses.map(c => parseInt(c.count))), 1);

  return (
    <div className="dash-page">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-sub">Real-time overview of your student records</p>
        </div>
        <Link to="/" className="dash-cta">
          View All Students <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </div>

      {/* ── Stat Cards ────────────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap stat-blue">
            <Users size={22} strokeWidth={1.7} />
          </div>
          <div className="stat-body">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Students</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-green">
            <TrendingUp size={22} strokeWidth={1.7} />
          </div>
          <div className="stat-body">
            <span className="stat-value">{stats.avg_gpa ?? '—'}</span>
            <span className="stat-label">Average GPA</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-purple">
            <BookOpen size={22} strokeWidth={1.7} />
          </div>
          <div className="stat-body">
            <span className="stat-value">{stats.courses.length}</span>
            <span className="stat-label">Active Courses</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-orange">
            <CalendarCheck size={22} strokeWidth={1.7} />
          </div>
          <div className="stat-body">
            <span className="stat-value">{stats.this_month}</span>
            <span className="stat-label">Enrolled This Month</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: Chart + Recent ───────────────────── */}
      <div className="dash-bottom">
        {/* Course Distribution — CSS bar chart */}
        <div className="dash-card">
          <h2 className="card-title">
            <BookOpen size={16} strokeWidth={2} />
            Students per Course
          </h2>
          <div className="course-chart">
            {stats.courses.length === 0
              ? <p className="chart-empty">No course data yet.</p>
              : stats.courses.map((c) => (
                <div className="chart-row" key={c.course}>
                  <span className="chart-label" title={c.course}>{c.course}</span>
                  <div className="chart-bar-wrap">
                    <div
                      className="chart-bar"
                      style={{ width: `${(parseInt(c.count) / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="chart-count">{c.count}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Recent Enrollments */}
        <div className="dash-card">
          <h2 className="card-title">
            <CalendarCheck size={16} strokeWidth={2} />
            Recent Enrollments
          </h2>
          <div className="recent-list">
            {stats.recent.length === 0
              ? <p className="chart-empty">No students yet.</p>
              : stats.recent.map((s) => (
                <Link to={`/students/${s.id}`} className="recent-row" key={s.id}>
                  <div className="recent-avatar">
                    {s.first_name[0]}{s.last_name[0]}
                  </div>
                  <div className="recent-info">
                    <span className="recent-name">{s.first_name} {s.last_name}</span>
                    <span className="recent-course">{s.course}</span>
                  </div>
                  <div className="recent-right">
                    {s.gpa && (
                      <span className={`recent-gpa ${gpaColor(s.gpa)}`}>
                        {parseFloat(s.gpa).toFixed(2)}
                      </span>
                    )}
                    <span className="recent-date">{formatDate(s.enrollment_date)}</span>
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
