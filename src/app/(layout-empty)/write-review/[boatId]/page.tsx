'use client';

import { useState, useEffect, useCallback } from 'react';

export const dynamic = 'force-dynamic';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Rating } from '@smastrom/react-rating';
import { clientApi, storage } from '@/lib/api';
import type { BoatDetails } from '@/lib/api';
import BoatActivitiesSection, { resolveBoatActivities } from '@/components/boatDetails/BoatActivitiesSection';
import { FiDroplet, FiMessageCircle, FiCheckCircle, FiDollarSign } from 'react-icons/fi';
import type { IconType } from 'react-icons';

const CATEGORY_RATINGS: { key: string; Icon: IconType; label: string; desc: string }[] = [
  { key: 'cleanliness', Icon: FiDroplet, label: 'Cleanliness', desc: 'How clean was the boat?' },
  { key: 'communication', Icon: FiMessageCircle, label: 'Communication', desc: 'How responsive was the owner?' },
  { key: 'accuracy', Icon: FiCheckCircle, label: 'Accuracy', desc: 'Did it match the listing?' },
  { key: 'value', Icon: FiDollarSign, label: 'Value for Money', desc: 'Was it worth the price?' },
];

const REVIEW_GUIDELINES = [
  'Be honest and constructive in your feedback',
  'Focus on your personal experience',
  'Avoid inappropriate or offensive language',
  "Don't share personal contact information",
  'Photos should be relevant and appropriate',
];

export default function WriteReviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const boatId = Number(params.boatId);
  const editReviewId = searchParams.get('edit');

  const [boatData, setBoatData] = useState<BoatDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({
    cleanliness: 0,
    communication: 0,
    accuracy: 0,
    value: 0,
  });
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');

  const fetchBoatData = useCallback(async () => {
    try {
      const res = await clientApi.getBoatById(boatId);
      if (res.success && res.data) {
        setBoatData(res.data);

        // If editing, prefill form
        if (editReviewId && res.data.user_review) {
          const r = res.data.user_review;
          setOverallRating(r.rating);
          setReviewText(r.comment || '');
        }
      } else {
        setError('Boat not found');
      }
    } catch {
      setError('Failed to load boat details');
    } finally {
      setLoading(false);
    }
  }, [boatId, editReviewId]);

  useEffect(() => {
    const user = storage.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    fetchBoatData();
  }, [fetchBoatData, router]);

  const computedOverallRating = () => {
    const cats = Object.values(categoryRatings);
    const filled = cats.filter((v) => v > 0);
    if (filled.length === 0) return overallRating;
    return Math.round(filled.reduce((a, b) => a + b, 0) / filled.length);
  };

  const canSubmit =
    overallRating > 0 && reviewText.trim().length >= 10 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');

    const finalRating = computedOverallRating() || overallRating;
    const data = {
      rating: finalRating,
      comment: `${title ? title + '\n' : ''}${reviewText}`.trim(),
    };

    try {
      let res;
      if (editReviewId && boatData?.user_review) {
        res = await clientApi.updateBoatReview(boatId, boatData.user_review.id, data);
      } else {
        res = await clientApi.createBoatReview(boatId, data);
      }

      if (res.success) {
        router.push(`/boat-details/${boatId}`);
      } else {
        setError(res.error || 'Failed to submit review');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#093b77]" />
      </div>
    );
  }

  if (error && !boatData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  const boat = boatData?.boat;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white font-poppins">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-black/10 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 md:px-16 lg:px-28 py-3 sm:py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-[#0a0a0a]">
              {editReviewId ? 'Edit Review' : 'Write a Review'}
            </h1>
            <p className="text-xs sm:text-sm text-[#4a5565]">
              Share your experience with {boat?.name || 'this boat'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 md:px-16 lg:px-28 py-6 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column — Form */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Overall Rating Card */}
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0a0a0a] mb-1">Overall Rating</h2>
              <p className="text-sm sm:text-base text-[#4a5565] mb-6">How would you rate your experience?</p>
              <div className="flex justify-center">
                <Rating
                  style={{ maxWidth: 250 }}
                  value={overallRating}
                  onChange={setOverallRating}
                />
              </div>
            </div>

            {/* Rate by Category Card */}
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0a0a0a] mb-1">Rate by Category</h2>
              <p className="text-sm sm:text-base text-[#4a5565] mb-6">Help others by rating these specific aspects</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CATEGORY_RATINGS.map((cat) => (
                  <div key={cat.key} className="bg-[#f9fafb] rounded-[10px] p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <cat.Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#093b77]" />
                      <div>
                        <p className="text-base sm:text-lg font-semibold text-[#0a0a0a]">{cat.label}</p>
                        <p className="text-xs sm:text-sm text-[#4a5565]">{cat.desc}</p>
                      </div>
                    </div>
                    <Rating
                      style={{ maxWidth: 130 }}
                      value={categoryRatings[cat.key]}
                      onChange={(val: number) =>
                        setCategoryRatings((prev) => ({ ...prev, [cat.key]: val }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Review Title Card */}
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0a0a0a] mb-0">
                Review Title <span className="text-sm font-normal text-[#6a7282]">(Optional)</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4a5565] mt-1 mb-4">Summarize your experience in one sentence</p>
              <input
                type="text"
                placeholder="e.g., Amazing boat trip on the Nile!"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                className="w-full border border-gray-200 rounded-[10px] px-4 py-3 text-base sm:text-lg text-[#0a0a0a] placeholder-[#0a0a0a]/50 outline-none focus:border-[#093b77] focus:ring-1 focus:ring-[#093b77] transition"
              />
              <p className="text-sm text-[#6a7282] mt-2">{title.length}/100 characters</p>
            </div>

            {/* Your Review Card */}
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0a0a0a] mb-1">Your Review</h2>
              <p className="text-sm sm:text-base text-[#4a5565] mb-4">Share the details of your experience</p>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={`Tell us about your experience...\n\n- What made your trip special?\n- How was the boat condition?\n- How was the crew/service?\n- What could be improved?\n- Would you recommend to others?`}
                className="w-full bg-[#f3f3f5] rounded-[8px] px-3 py-2 text-sm sm:text-base text-[#0a0a0a] placeholder-[#717182] outline-none focus:ring-1 focus:ring-[#093b77] min-h-[200px] sm:min-h-[300px] resize-y"
              />
              {reviewText.length < 10 && reviewText.length > 0 && (
                <p className="text-sm text-red-500 mt-2 font-medium">
                  {10 - reviewText.length} more characters needed (minimum 10)
                </p>
              )}
            </div>

            {/* Add Photos Card (V1 placeholder) */}
            <div className="bg-white border border-gray-200 rounded-[14px] p-4 sm:p-6 md:p-8 opacity-60">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0a0a0a] mb-0">
                Add Photos <span className="text-sm font-normal text-[#6a7282]">(Optional)</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4a5565] mt-1 mb-4">Share photos from your trip to help others (max 10 photos)</p>
              <div className="w-[134px] h-[134px] border border-dashed border-gray-300 rounded-[10px] flex flex-col items-center justify-center gap-2 cursor-not-allowed">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6a7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-sm text-[#6a7282] font-medium">Coming Soon</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.back()}
                className="flex-1 h-10 bg-white border border-black/10 rounded-[8px] text-sm font-medium text-[#0a0a0a] hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`flex-1 h-10 rounded-[8px] text-sm font-medium text-white transition ${
                  canSubmit
                    ? 'bg-[#093b77] hover:bg-[#0a4a94]'
                    : 'bg-[#093b77] opacity-50 cursor-not-allowed'
                }`}
              >
                {submitting ? 'Submitting...' : editReviewId ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[384px] flex-shrink-0">
            <div className="lg:sticky lg:top-24 flex flex-col gap-6">
              {/* Booking Details Card */}
              <div className="bg-white border border-black/10 rounded-[14px] p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-[#0a0a0a] mb-6">Booking Details</h3>
                {boat?.images?.[0] && (
                  <div className="relative h-40 rounded-[10px] overflow-hidden mb-3">
                    <Image
                      src={boat.images[0]}
                      alt={boat.name}
                      fill
                      className="object-cover"
                      sizes="384px"
                    />
                  </div>
                )}
                <h4 className="text-lg font-semibold text-[#0a0a0a] mb-1">{boat?.name}</h4>
                <div className="bg-[#f0fdf4] rounded-[10px] px-2 py-2 flex items-center gap-2 mt-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00a63e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-sm font-medium text-[#00a63e]">Verified Booking</span>
                </div>
                {boat && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <BoatActivitiesSection activities={resolveBoatActivities(boat)} />
                  </div>
                )}
              </div>

              {/* Review Guidelines Card */}
              <div className="bg-white border border-black/10 rounded-[14px] p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <h4 className="text-base font-semibold text-[#0a0a0a]">Review Guidelines</h4>
                </div>
                <ul className="space-y-2">
                  {REVIEW_GUIDELINES.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#4a5565]">
                      <span className="text-[#093b77] mt-0.5">&bull;</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
