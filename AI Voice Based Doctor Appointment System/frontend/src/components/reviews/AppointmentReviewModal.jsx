import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Star, X } from 'lucide-react';
import { formatDoctorName } from '../../utils/doctorName';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function StarButton({ value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-xl p-2 transition-colors ${active ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
      aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
    >
      <Star className="h-7 w-7" fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}

export default function AppointmentReviewModal({ appointment, open, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setRating(appointment?.review?.rating || 0);
    setMessage(appointment?.review?.message || '');
    setError('');
    setSubmitting(false);
  }, [appointment?.review?.message, appointment?.review?.rating, open]);

  const doctorLabel = useMemo(
    () => formatDoctorName(appointment?.doctor?.name, 'Doctor'),
    [appointment?.doctor?.name]
  );

  if (!open || !appointment) return null;

  const isReadOnly = Boolean(appointment.review);

  const submitReview = async () => {
    if (isReadOnly) {
      onClose?.();
      return;
    }
    if (!rating) {
      setError('Please choose a star rating before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const { data } = await axios.post(
        `${API_URL}/api/reviews`,
        {
          appointmentId: appointment.id,
          rating,
          message: message.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (onSubmitted) onSubmitted(data?.review || null);
      onClose?.();
    } catch (submitError) {
      setError(submitError?.response?.data?.error || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              {isReadOnly ? 'Your Submitted Review' : 'Rate Consultation'}
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">{doctorLabel}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200"
            aria-label="Close review dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-600">
            {isReadOnly
              ? 'Patients can submit one review per completed appointment.'
              : 'Share your feedback to help other patients choose the right doctor.'}
          </p>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-sm font-bold text-slate-700">Rating</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <StarButton
                key={value}
                value={value}
                active={value <= rating}
                onClick={isReadOnly ? () => {} : setRating}
              />
            ))}
            {!!rating && <span className="ml-1 text-sm font-semibold text-slate-500">{rating}/5</span>}
          </div>
        </div>

        <div className="mb-2">
          <p className="mb-2 text-sm font-bold text-slate-700">Message</p>
          <textarea
            rows={4}
            maxLength={1000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            readOnly={isReadOnly}
            placeholder="Tell others about your consultation experience..."
            className="w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
          />
          <p className="mt-1 text-right text-xs font-medium text-slate-400">{message.length}/1000</p>
        </div>

        {error && (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
          >
            {isReadOnly ? 'Close' : 'Cancel'}
          </button>
          {!isReadOnly && (
            <button
              type="button"
              disabled={submitting}
              onClick={submitReview}
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
