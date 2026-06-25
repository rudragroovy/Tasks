import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Search, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SharedNavbar from '../components/SharedNavbar';
import { DOCTOR_NAV_ITEMS, handleDoctorNavClick as navigateDoctorNavClick } from '../utils/doctorNavigation';
import { formatDoctorName } from '../utils/doctorName';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PAGE_SIZE = 8;

function ReviewStars({ rating }) {
  return (
    <div className="flex items-center gap-1 text-amber-500">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} className="h-4 w-4" fill={value <= rating ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

export default function DoctorReviews() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    averageRating: 0,
    reviewCount: 0,
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('ANY');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    setIsOnline(Boolean(user?.doctorProfile?.isOnline));
  }, [user?.doctorProfile?.isOnline]);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page,
          pageSize: PAGE_SIZE,
          sort,
        };
        if (query.trim()) params.q = query.trim();
        if (ratingFilter !== 'ANY') params.rating = Number(ratingFilter);

        const response = await axios.get(`${API_URL}/api/reviews/doctor/me`, {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        setReviews(Array.isArray(response.data?.reviews) ? response.data.reviews : []);
        setSummary(response.data?.summary || {
          averageRating: 0,
          reviewCount: 0,
          ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        });
        setTotalPages(Math.max(1, Number(response.data?.pagination?.totalPages || 1)));
      } catch (fetchError) {
        console.error(fetchError);
        setReviews([]);
        setError(fetchError?.response?.data?.error || 'Failed to fetch reviews.');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [page, query, ratingFilter, sort]);

  const handleDoctorNavClick = (key) => {
    navigateDoctorNavClick(key, navigate);
  };

  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    try {
      await axios.put(
        `${API_URL}/api/doctors/me/online`,
        { isOnline: nextStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (toggleError) {
      console.error('Failed to update doctor online status', toggleError);
      setIsOnline(!nextStatus);
    }
  };

  const fiveStarShare = useMemo(() => {
    const total = Number(summary?.reviewCount || 0);
    if (!total) return 0;
    const fiveStarCount = Number(summary?.ratingBreakdown?.[5] || 0);
    return Math.round((fiveStarCount / total) * 100);
  }, [summary?.ratingBreakdown, summary?.reviewCount]);

  const doctorName = formatDoctorName(user?.name, 'Doctor');

  return (
    <div className="min-h-screen bg-[#f5f8ff] text-slate-900">
      <SharedNavbar
        user={user}
        brandLabel="CareBridge"
        onLogoClick={() => navigate('/dashboard')}
        navItems={DOCTOR_NAV_ITEMS}
        activeTab="more"
        onTabClick={handleDoctorNavClick}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        doctorName={doctorName}
        onLogout={logout}
        showMobileTabs
      />

      <main className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Patient Feedback</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Reviews</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Feedback shared by patients after completed consultations.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Average Rating</p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-3xl font-black text-slate-900">{Number(summary.averageRating || 0).toFixed(1)}</p>
                <ReviewStars rating={Math.round(Number(summary.averageRating || 0))} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Total Reviews</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{summary.reviewCount || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">5-Star Share</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{fiveStarShare}%</p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[320px_1fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Rating Breakdown</h2>
            <div className="mt-4 space-y-3">
              {[5, 4, 3, 2, 1].map((score) => {
                const count = Number(summary?.ratingBreakdown?.[score] || 0);
                const total = Number(summary?.reviewCount || 0);
                const width = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={score}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">{score} Star</span>
                      <span className="text-xs font-semibold text-slate-500">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-amber-500 transition-all" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search patient name or review message"
                  className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                />
              </label>

              <select
                value={ratingFilter}
                onChange={(event) => {
                  setRatingFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="ANY">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>

              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>

            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <Star className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-base font-bold text-slate-600">No reviews found</p>
                <p className="text-sm font-medium text-slate-500">Patient reviews will appear here after completed consultations.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-900">{review?.patient?.name || 'Patient'}</p>
                      <p className="text-xs font-semibold text-slate-500">
                        {new Date(review.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <ReviewStars rating={Number(review.rating || 0)} />
                      <span className="text-xs font-bold text-slate-500">{Number(review.rating || 0)}/5</span>
                    </div>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                      {review.message || 'No additional message provided.'}
                    </p>
                  </div>
                ))}

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
