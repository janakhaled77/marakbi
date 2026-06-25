"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";

export const dynamic = 'force-dynamic';
import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { clientApi, BoatDetails as ApiBoatDetails, Trip, BASE_URL, BoatServiceAssignment, Boat, BoatReview, storage } from "@/lib/api";
import BookingSidebar, { BookingData } from "@/components/BookingSidebar";
import BoatActivitiesSection, { resolveBoatActivities } from "@/components/boatDetails/BoatActivitiesSection";
import useBookingStore from "@/hooks/useBookingStore";
import { normalizeImageUrl, normalizeImageUrls } from "@/lib/imageUtils";
import { FiClock, FiMapPin, FiPlay } from "react-icons/fi";

export default function BoatDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [boatData, setBoatData] = useState<ApiBoatDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mobileImageIndex, setMobileImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  // Same operator recommendations
  const [sameRecPage, setSameRecPage] = useState(1);
  const [sameRecHasMore, setSameRecHasMore] = useState(false);
  const [sameRecLoading, setSameRecLoading] = useState(false);
  const [sameRecs, setSameRecs] = useState<Boat[]>([]);
  const sameRecCache = useRef<Map<number, { boats: Boat[]; hasMore: boolean }>>(new Map());

  // Other operator recommendations
  const [otherRecPage, setOtherRecPage] = useState(1);
  const [otherRecHasMore, setOtherRecHasMore] = useState(false);
  const [otherRecLoading, setOtherRecLoading] = useState(false);
  const [otherRecs, setOtherRecs] = useState<Boat[]>([]);
  const otherRecCache = useRef<Map<number, { boats: Boat[]; hasMore: boolean }>>(new Map());

  // Paginated reviews
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [paginatedReviews, setPaginatedReviews] = useState<BoatReview[]>([]);
  const reviewCacheRef = useRef<Map<number, BoatReview[]>>(new Map());
  const [deletingReview, setDeletingReview] = useState(false);

  // Trip-based booking support
  const tripId = searchParams.get("trip_id");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [currentTripImageIndex, setCurrentTripImageIndex] = useState(0);

  // Service selection state — lifted here so Available Services cards can drive selection
  // and the BookingSidebar can render the resulting list. Restore from Zustand on mount.
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(() => {
    const stored = useBookingStore.getState().bookingData;
    const currentBoatId = parseInt(params.id as string);
    if (stored?.selected_services && stored.boat_id === currentBoatId) {
      return new Set(stored.selected_services.map((svc: { service_id: number }) => svc.service_id));
    }
    return new Set();
  });
  const [servicePersonCounts, setServicePersonCounts] = useState<Map<number, number>>(() => {
    const stored = useBookingStore.getState().bookingData;
    const currentBoatId = parseInt(params.id as string);
    if (stored?.selected_services && stored.boat_id === currentBoatId) {
      const map = new Map<number, number>();
      (stored.selected_services as { service_id: number; person_count?: number }[]).forEach(svc => {
        if (svc.person_count != null) map.set(svc.service_id, svc.person_count);
      });
      return map;
    }
    return new Map();
  });

  // Auto-advance trip image slider
  useEffect(() => {
    if (!selectedTrip?.images || selectedTrip.images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentTripImageIndex((prev) => (prev + 1) % selectedTrip.images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedTrip?.images]);

  useEffect(() => {
    const fetchBoatDetails = async () => {
      try {
        setLoading(true);
        const response = await clientApi.getBoatById(parseInt(params.id as string));
        if (response.success && response.data) {
          setBoatData(response.data);

          // If trip_id is provided, find the matching trip
          if (tripId && response.data.boat.trips) {
            const topicTrip = response.data.boat.trips.find(t => t.id === parseInt(tripId));
            if (topicTrip) {
              // Initially set from boat data
              setSelectedTrip(topicTrip as unknown as Trip);

              // Fetch full trip details to get images
              try {
                const tripRes = await fetch(`${BASE_URL}/client/trips/${tripId}`);
                if (tripRes.ok) {
                  const fullTrip = await tripRes.json();
                  setSelectedTrip(fullTrip);
                }
              } catch (err) {
                console.error("Error fetching full trip details", err);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching boat details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchBoatDetails();
    }
  }, [params.id, tripId]);

  // Fetch same operator recommendations
  const fetchSameRecs = useCallback(async (page: number) => {
    const boatId = parseInt(params.id as string);
    if (!boatId) return;
    const cached = sameRecCache.current.get(page);
    if (cached) { setSameRecs(cached.boats); setSameRecHasMore(cached.hasMore); setSameRecPage(page); return; }
    setSameRecLoading(true);
    const res = await clientApi.getBoatRecommendations(boatId, 'same', page, 3);
    if (res.success && res.data) {
      sameRecCache.current.set(page, { boats: res.data.boats, hasMore: res.data.has_more });
      setSameRecs(res.data.boats); setSameRecHasMore(res.data.has_more); setSameRecPage(page);
    }
    setSameRecLoading(false);
  }, [params.id]);

  // Fetch other operator recommendations
  const fetchOtherRecs = useCallback(async (page: number) => {
    const boatId = parseInt(params.id as string);
    if (!boatId) return;
    const cached = otherRecCache.current.get(page);
    if (cached) { setOtherRecs(cached.boats); setOtherRecHasMore(cached.hasMore); setOtherRecPage(page); return; }
    setOtherRecLoading(true);
    const res = await clientApi.getBoatRecommendations(boatId, 'other', page, 3);
    if (res.success && res.data) {
      otherRecCache.current.set(page, { boats: res.data.boats, hasMore: res.data.has_more });
      setOtherRecs(res.data.boats); setOtherRecHasMore(res.data.has_more); setOtherRecPage(page);
    }
    setOtherRecLoading(false);
  }, [params.id]);

  // Fetch paginated reviews
  const fetchReviews = useCallback(async (page: number) => {
    const boatId = parseInt(params.id as string);
    if (!boatId) return;
    const cached = reviewCacheRef.current.get(page);
    if (cached) { setPaginatedReviews(cached); setReviewPage(page); return; }
    setReviewsLoading(true);
    const res = await clientApi.getBoatReviewsPaginated(boatId, page, 5);
    if (res.success && res.data) {
      reviewCacheRef.current.set(page, res.data.reviews);
      setPaginatedReviews(res.data.reviews);
      setReviewTotalPages(res.data.pagination.pages);
      setReviewPage(page);
    }
    setReviewsLoading(false);
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      sameRecCache.current.clear(); fetchSameRecs(1);
      otherRecCache.current.clear(); fetchOtherRecs(1);
      reviewCacheRef.current.clear(); fetchReviews(1);
    }
  }, [params.id, fetchSameRecs, fetchOtherRecs, fetchReviews]);

  // Scroll to top of the page when boat ID changes (e.g. on navigation to details)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.id]);

  // Handle keyboard navigation for image modal
  useEffect(() => {
    if (!isModalOpen || !boatData) return;

    const normalizedImages = normalizeImageUrls(boatData.boat.images);
    if (normalizedImages.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex((prev) => (prev + 1) % normalizedImages.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentImageIndex((prev) => (prev - 1 + normalizedImages.length) % normalizedImages.length);
      }
    };

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, boatData]);

  const handleRequestToBook = (bookingData: BookingData) => {
    const completeBookingData = {
      ...bookingData,
      boat_image: normalizeImageUrl(boatData?.boat.images[0]),
      price_per_hour: boatData?.boat.price_per_hour,
      price_per_day: boatData?.boat.price_per_day || (boatData?.boat.price_per_hour || 0) * 8,
      max_seats: boatData?.boat.max_seats,
      // Include trip data if this is a trip-based booking
      trip_id: selectedTrip?.id,
      trip_name: selectedTrip?.name,
      trip_description: selectedTrip?.description,
      trip_image: selectedTrip?.images && selectedTrip.images.length > 0 ? normalizeImageUrl(selectedTrip.images[0]) : null,
      trip_images: selectedTrip?.images ? normalizeImageUrls(selectedTrip.images) : [],
      trip_price: (() => {
        const assoc = boatData?.boat.trips?.find(t => t.id === selectedTrip?.id) as { effective_price?: number } | undefined;
        return assoc?.effective_price ?? selectedTrip?.total_price;
      })(),
      trip_duration: selectedTrip?.voyage_hours,
      is_trip_booking: !!selectedTrip,
      boat_rating: reviews_summary.average_rating,
      boat_total_reviews: reviews_summary.total_reviews,
      // Services data (already included from BookingSidebar but ensure it's persisted)
      selected_services: bookingData.selected_services || [],
      services_total: bookingData.services_total || 0,
    };

    // Check if user is authenticated
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    if (!accessToken) {
      // Save fully enriched data so payment page has everything it needs
      localStorage.setItem('pending_booking_data', JSON.stringify(completeBookingData));
      localStorage.setItem('intended_url', '/payment');
      window.location.href = '/login';
      return;
    }

    useBookingStore.getState().setBookingData(completeBookingData);
    router.push('/payment');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center font-poppins">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-sky-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading boat details...</p>
      </div>
    );
  }

  if (!boatData) {
    return (
      <div className="container mx-auto px-4 py-20 text-center font-poppins">
        <h1 className="text-3xl font-bold mb-4">Boat not found</h1>
        <p className="text-gray-600">The boat you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  const { boat, owner, reviews, reviews_summary } = boatData;
  const totalRating = reviews_summary.total_reviews;

  const normalizedMedia = boat.media && boat.media.length > 0
    ? boat.media.map(m => ({ ...m, url: m.type === 'image' ? normalizeImageUrl(m.url) : m.url }))
    : normalizeImageUrls(boat.images).map(url => ({ url, type: 'image' as const, thumbnail_url: url }));

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev + 1) % normalizedMedia.length);
  };

  const handlePrev = () => {
    setCurrentImageIndex((prev) => (prev - 1 + normalizedMedia.length) % normalizedMedia.length);
  };

  const handleMobileNext = () => {
    setMobileImageIndex((prev) => (prev + 1) % normalizedMedia.length);
  };

  const handleMobilePrev = () => {
    setMobileImageIndex((prev) => (prev - 1 + normalizedMedia.length) % normalizedMedia.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        handleMobileNext();
      } else {
        handleMobilePrev();
      }
    }
    setIsDragging(false);
  };

  return (
    <div className="bg-white">
      {/* Owner & Trip Title Section */}
      <div className="container mx-auto px-4 sm:px-8 lg:px-16 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Image
            src={owner.avatar_url || "/icons/character-3.svg"}
            alt={owner.username}
            width={48}
            height={48}
            className="rounded-full"
          />
          <div>
            <p className="font-semibold text-lg">{owner.username}</p>
            <p className="text-sm text-gray-600">Boat Owner</p>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-4 font-poppins">
          {boat.name}
        </h1>

        {/* Trip Info Banner - shown when accessing boat via trip listing */}
        {selectedTrip && (
          <div className="mb-8 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Trip Image */}
              {/* Trip Image Slider */}
              <div className="md:w-1/3 relative h-48 md:h-auto overflow-hidden bg-gray-900 group">
                {selectedTrip.images && selectedTrip.images.length > 0 ? (
                  <>
                    {selectedTrip.images.map((img, index) => (
                      <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentTripImageIndex ? "opacity-100 z-10" : "opacity-0 z-0"}`}
                      >
                        <Image
                          src={normalizeImageUrl(img)}
                          alt={`${selectedTrip.name} - Image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        {/* Overlay for text visibility if needed */}
                        <div className="absolute inset-0 bg-black/10"></div>
                      </div>
                    ))}

                    {/* Slider Indicators/Dots */}
                    {selectedTrip.images.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-20 flex gap-1.5">
                        {selectedTrip.images.map((_, index) => (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.preventDefault(); // Prevent accidental navigation if nested
                              setCurrentTripImageIndex(index);
                            }}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${index === currentTripImageIndex ? "bg-white w-4" : "bg-white/50 hover:bg-white/80"}`}
                            aria-label={`Go to slide ${index + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                <div className="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-sky-900 shadow-sm">
                  Trip
                </div>
              </div>

              {/* Trip Details */}
              <div className="p-6 md:w-2/3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-2xl font-bold text-gray-900 font-poppins">{selectedTrip.name}</h2>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Trip Price</p>
                      <p className="text-2xl font-bold text-sky-900">EGP {(() => {
                        const assoc = boatData?.boat.trips?.find(t => t.id === selectedTrip?.id) as { effective_price?: number } | undefined;
                        return assoc?.effective_price ?? selectedTrip?.total_price;
                      })()}</p>
                    </div>
                  </div>
                  <p className="text-gray-600 line-clamp-2 mb-4">{selectedTrip.description}</p>
                </div>

                <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiClock className="text-sky-700 text-lg" />
                    <span>{selectedTrip.voyage_hours} Hours</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiMapPin className="text-sky-700 text-lg" />
                    <span>{selectedTrip.city_name}</span>
                  </div>
                  {selectedTrip.trip_type && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                      <span>{selectedTrip.trip_type}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Layout: Left Content + Right Sidebar */}
      <div className="container mx-auto px-4 sm:px-8 lg:px-16 pb-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Content - Gallery + Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div>
              {/* Mobile View - Single Image Carousel */}
              <div className="block md:hidden">
                {normalizedMedia.length > 0 ? (
                  <div className="relative">
                    {/* Main Image */}
                    <div
                      className="relative w-full h-[400px] rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => handleImageClick(mobileImageIndex)}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <Image
                        src={normalizedMedia[mobileImageIndex].type === 'video' ? normalizedMedia[mobileImageIndex].thumbnail_url : normalizedMedia[mobileImageIndex].url}
                        alt={`Boat media ${mobileImageIndex + 1}`}
                        fill
                        className="object-cover"
                        priority
                      />
                      
                      {normalizedMedia[mobileImageIndex].type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="bg-white/90 rounded-full p-4 shadow-lg">
                            <FiPlay className="text-[#106BD8] text-3xl ml-1" />
                          </div>
                        </div>
                      )}

                      {/* Image Counter Overlay - Top Left */}
                      {normalizedMedia.length > 1 && (
                        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium z-10">
                          {mobileImageIndex + 1} / {normalizedMedia.length}
                        </div>
                      )}

                      {/* Remaining Images Indicator - Bottom Right */}
                      {normalizedMedia.length > 1 && (
                        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium z-10">
                          {normalizedMedia.length - mobileImageIndex - 1 > 0
                            ? `+${normalizedMedia.length - mobileImageIndex - 1} ${normalizedMedia[mobileImageIndex + 1].type === 'video' ? 'فيديو' : 'صور'}`
                            : 'آخر وسائط'}
                        </div>
                      )}

                      {/* Previous Button - FORCED LEFT */}
                      {normalizedMedia.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMobilePrev();
                          }}
                          className="absolute top-1/2 -translate-y-1/2 bg-black/70 text-white rounded-full p-2.5 hover:bg-black/90 transition-colors shadow-lg z-10"
                          style={{ left: '10px' }}
                          aria-label="Previous media"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>
                      )}

                      {/* Next Button - FORCED RIGHT */}
                      {normalizedMedia.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMobileNext();
                          }}
                          className="absolute top-1/2 -translate-y-1/2 bg-black/70 text-white rounded-full p-2.5 hover:bg-black/90 transition-colors shadow-lg z-10"
                          style={{ right: '10px' }}
                          aria-label="Next media"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Navigation Dots */}
                    {normalizedMedia.length > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-4">
                        {normalizedMedia.map((media, idx) => (
                          <button
                            key={idx}
                            onClick={() => setMobileImageIndex(idx)}
                            className={`transition-all duration-300 flex items-center justify-center ${idx === mobileImageIndex
                              ? 'w-8 h-2 bg-[#106BD8] rounded-full'
                              : 'w-2 h-2 bg-gray-300 rounded-full hover:bg-gray-400'
                              }`}
                            aria-label={`Go to media ${idx + 1}`}
                          >
                            {media.type === 'video' && idx !== mobileImageIndex && <div className="w-1 h-1 bg-white rounded-full" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-[400px] flex items-center justify-center bg-gray-200 rounded-lg">
                    <p className="text-gray-500">No media available</p>
                  </div>
                )}
              </div>

              {/* Desktop View - Grid Layout */}
              <div className="hidden md:grid grid-cols-4 gap-2 h-[400px]">
                {normalizedMedia.length > 0 ? (
                  <>
                    <div
                      className="col-span-2 row-span-2 relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                      onClick={() => handleImageClick(0)}
                    >
                      <Image
                        src={normalizedMedia[0].type === 'video' ? normalizedMedia[0].thumbnail_url : normalizedMedia[0].url}
                        alt="Main media"
                        fill
                        className="object-cover"
                        priority
                      />
                      {normalizedMedia[0].type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                          <div className="bg-white/90 rounded-full p-5 shadow-xl">
                            <FiPlay className="text-[#106BD8] text-4xl ml-1" />
                          </div>
                        </div>
                      )}
                    </div>
                    {normalizedMedia.slice(1, 5).map((media, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                        onClick={() => handleImageClick(idx + 1)}
                      >
                        <Image
                          src={media.type === 'video' ? media.thumbnail_url : media.url}
                          alt={`Gallery ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                        {media.type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                            <div className="bg-white/90 rounded-full p-2.5 shadow-lg">
                              <FiPlay className="text-[#106BD8] text-xl ml-0.5" />
                            </div>
                          </div>
                        )}
                        {idx === 3 && normalizedMedia.length > 5 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-3xl font-semibold">
                              +{normalizedMedia.length - 5}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="col-span-4 flex items-center justify-center bg-gray-200 rounded-lg">
                    <p className="text-gray-500">No media available</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Image
                      key={i}
                      src="/icons/Star Icon.svg"
                      alt="Star"
                      width={20}
                      height={20}
                      className={`${i < Math.floor(reviews_summary.average_rating) ? "opacity-100" : "opacity-30"}`}
                    />
                  ))}
                </div>
                <span className="font-medium">{reviews_summary.average_rating.toFixed(1)}</span>
                <span className="text-gray-600">({reviews_summary.total_reviews})</span>
                <span className="mx-2">•</span>
                <span className="text-gray-700">{boat.categories.join(', ')}</span>
              </div>
              {/* Address and View Location */}
              {(boat.address || boat.location_url) && (
                <div className="flex items-center gap-3 mt-3 text-gray-600">
                  {boat.address && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm">{boat.address}</span>
                    </div>
                  )}
                  {boat.location_url && (
                    <a
                      href={boat.location_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-[#0F3875] hover:text-[#0F3875]/80 font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Location
                    </a>
                  )}
                </div>
              )}
            </div>
            {/* Overview */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 font-poppins">Overview</h2>
              <p className="text-gray-700 leading-relaxed">{boat.description}</p>
            </section>

            {/* Specifications */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 font-poppins">Specifications</h2>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700 mb-1 sm:mb-0">Maximum Capacity</span>
                  <span className="text-gray-600 sm:text-right">{boat.max_seats} Guests</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700 mb-1 sm:mb-0">Sleeping Capacity</span>
                  <span className="text-gray-600 sm:text-right">{boat.max_seats_stay} Guests</span>
                </div>
                {boat.price_per_hour && (
                  <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200">
                    <span className="font-medium text-gray-700 mb-1 sm:mb-0">Price Per Hour</span>
                    <span className="text-gray-600 sm:text-right">{boat.price_per_hour} EGP</span>
                  </div>
                )}
                {boat.price_per_day && (
                  <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200">
                    <span className="font-medium text-gray-700 mb-1 sm:mb-0">Price Per Day</span>
                    <span className="text-gray-600 sm:text-right">{boat.price_per_day} EGP</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700 mb-1 sm:mb-0">Categories</span>
                  <span className="text-gray-600 sm:text-right">{boat.categories.join(', ')}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700 mb-1 sm:mb-0">Owner</span>
                  <span className="text-gray-600 sm:text-right">{owner.username}</span>                </div>
              </div>
            </section>

            {/* Boat Services */}
            {boat.services && boat.services.length > 0 && (
              <section id="services-section">
                <h2 className="text-2xl font-semibold mb-4 font-poppins">Available Services</h2>
                <p className="text-sm text-gray-500 mb-4">Tap a service to add it to your booking. Selected services appear in the sidebar.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {boat.services.map((svc: BoatServiceAssignment) => {
                    const displayPrice = svc.price ?? svc.service?.default_price;
                    const priceModeLabel =
                      svc.service?.price_mode === 'per_person'
                        ? 'Per Person'
                        : svc.service?.price_mode === 'per_person_per_time'
                          ? 'Per Person/Time'
                          : 'Per Trip';
                    const isSelected = selectedServiceIds.has(svc.service_id);
                    return (
                    <div
                      key={svc.service_id}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => {
                        setSelectedServiceIds(prev => {
                          const next = new Set(prev);
                          if (next.has(svc.service_id)) next.delete(svc.service_id);
                          else next.add(svc.service_id);
                          return next;
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          setSelectedServiceIds(prev => {
                            const next = new Set(prev);
                            if (next.has(svc.service_id)) next.delete(svc.service_id);
                            else next.add(svc.service_id);
                            return next;
                          });
                        }
                      }}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/60 border-[#0F3875] ring-1 ring-[#0F3875]/40 shadow-sm'
                          : 'bg-gray-50 border-gray-100 hover:border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isSelected ? 'bg-[#0F3875] border-[#0F3875]' : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {/* Icon (only if provided) */}
                      {svc.service?.icon_url && (
                        <div className="w-10 h-10 bg-white rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden relative border border-gray-200">
                          <Image
                            src={svc.service.icon_url}
                            alt={svc.service?.name || ''}
                            width={32}
                            height={32}
                            className="object-contain"
                          />
                        </div>
                      )}
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{svc.badge_display_name || svc.service?.name || 'Service'}</h3>
                        {svc.service?.description && (
                          <p className="text-xs text-gray-500 leading-relaxed">{svc.service.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {displayPrice != null && (
                            <span className="text-xs font-medium text-[#0F3875]">{Math.round(Number(displayPrice))} EGP</span>
                          )}
                          <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                            {priceModeLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Boat Facilities */}
            {boat.facilities && boat.facilities.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-4 font-poppins">Boat Facilities</h2>
                <div className="grid grid-cols-2 gap-3">
                  {(showAllFacilities ? boat.facilities : boat.facilities.slice(0, 6)).map((facility: { id: number; name: string; description?: string | null; image_url?: string | null }) => (
                    <div
                      key={facility.id}
                      className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-all cursor-default group/fac relative"
                    >
                      {/* Icon */}
                      <div className="w-8 h-8 bg-white rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden relative border border-gray-200">
                        {facility.image_url ? (
                          <Image
                            src={facility.image_url}
                            alt={facility.name}
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        ) : (
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {/* Name */}
                      <span className="text-sm font-medium text-gray-800 truncate">{facility.name}</span>

                      {/* Tooltip */}
                      {facility.description && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover/fac:opacity-100 transition-opacity pointer-events-none whitespace-normal max-w-[220px] text-center z-50 shadow-lg">
                          {facility.description}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {boat.facilities.length > 6 && (
                  <button
                    onClick={() => setShowAllFacilities(!showAllFacilities)}
                    className="mt-4 text-sm font-medium text-[#0F3875] hover:text-[#0F3875]/80 transition-colors flex items-center gap-1"
                  >
                    {showAllFacilities ? (
                      <>
                        Show less
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                      </>
                    ) : (
                      <>
                        Show {boat.facilities.length - 6} more
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </>
                    )}
                  </button>
                )}
              </section>
            )}

            <BoatActivitiesSection activities={resolveBoatActivities(boat)} />

            <section>
              <h2 className="text-2xl font-semibold mb-4 font-poppins">Meet Your Captain</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Image
                    src={owner.avatar_url || "/icons/character-3.svg"}
                    alt={owner.username}
                    width={80}
                    height={80}
                    className="rounded-full"
                  />
                  <div>
                    <h3 className="text-xl font-semibold font-poppins">
                      {owner.username}
                    </h3>
                    <p className="text-orange-600 text-sm mb-2">
                      Member since {new Date(owner.member_since).getFullYear()}
                    </p>
                    <div className="flex items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Image
                          key={i}
                          src="/icons/Star Icon.svg"
                          alt="Star"
                          width={16}
                          height={16}
                          className={`${i < Math.floor(reviews_summary.average_rating) ? "opacity-100" : "opacity-30"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">{owner.bio || 'No bio available.'}</p>
                <div className="space-y-2 mb-4">
                  {owner.address && (
                    <div className="flex items-center gap-2">
                      <Image
                        src="/icons/location_on.svg"
                        alt="Address"
                        width={20}
                        height={20}
                      />
                      <span className="text-sm">Address: {owner.address}</span>
                    </div>
                  )}
                </div>
                <button className="w-full sm:w-auto px-8 py-3 bg-[#0C4A8C] text-white rounded-lg hover:bg-[#0A3D7A] transition-colors">
                  Contact Owner
                </button>
              </div>
            </section>

            {/* Pricing options */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 font-poppins">Pricing Options</h2>
              <div className="space-y-3">
                {boat.price_per_hour && (
                  <div>
                    <p className="font-semibold">Per Hour Rental</p>
                    <p className="text-gray-600">From {boat.price_per_hour} EGP</p>
                  </div>
                )}
                {boat.price_per_day && (
                  <div>
                    <p className="font-semibold">Per Day Rental</p>
                    <p className="text-gray-600">From {boat.price_per_day} EGP</p>
                  </div>
                )}
              </div>
            </section>

            {/* Good to Know */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 font-poppins">Good to Know</h2>
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0C4A8C]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[#0C4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">Please arrive at the departure point at least 15 minutes before the scheduled time.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0C4A8C]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[#0C4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">Life jackets and safety equipment are provided on board for all guests.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0C4A8C]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[#0C4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">Children under 12 must be accompanied by an adult at all times.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0C4A8C]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[#0C4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">The trip may be rescheduled due to unfavorable weather conditions for your safety.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0C4A8C]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[#0C4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">Any damage to the boat or equipment during the rental period is the responsibility of the renter.</p>
                </div>
              </div>
            </section>

            {/* Withdrawal and Cancellation Policy */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 font-poppins">Withdrawal and Cancellation Policy</h2>
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium text-sm">Free cancellation up to 48 hours before the trip</p>
                    <p className="text-gray-500 text-xs mt-1">Full refund will be issued to your original payment method.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium text-sm">Cancellation within 24–48 hours</p>
                    <p className="text-gray-500 text-xs mt-1">50% of the total amount will be refunded.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium text-sm">Cancellation within less than 24 hours</p>
                    <p className="text-gray-500 text-xs mt-1">No refund will be issued for last-minute cancellations.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium text-sm">No-show policy</p>
                    <p className="text-gray-500 text-xs mt-1">If you do not show up for the trip without prior notice, no refund will be provided.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Recommendations - Same Operator */}
            {(sameRecs.length > 0 || sameRecPage > 1) && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold font-poppins text-[#0a0a0a]">From the same operator</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => fetchSameRecs(sameRecPage - 1)} disabled={sameRecPage <= 1 || sameRecLoading}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 disabled:opacity-30 hover:bg-gray-100 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <button onClick={() => fetchSameRecs(sameRecPage + 1)} disabled={!sameRecHasMore || sameRecLoading}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 disabled:opacity-30 hover:bg-gray-100 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  </div>
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${sameRecLoading ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
                  {sameRecs.map((rec) => (
                    <button key={rec.id} onClick={() => router.push(`/boat-details/${rec.id}`)}
                      className="text-left bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition">
                      <div className="relative h-36 sm:h-40">
                        {rec.images?.[0] ? <Image src={normalizeImageUrl(rec.images[0])} alt={rec.name} fill className="object-cover" sizes="300px" /> : <div className="w-full h-full bg-gray-100" />}
                      </div>
                      <div className="p-3 sm:p-4">
                        <p className="font-semibold text-sm sm:text-base text-black truncate">{rec.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-[#093b77] font-semibold">{rec.price_per_hour ? `${rec.price_per_hour} EGP/hr` : ''}</span>
                          <div className="flex items-center gap-1">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Image key={i} src="/icons/Star Icon.svg" alt="Star" width={12} height={12} className={i < Math.round(rec.average_rating || 0) ? 'opacity-100' : 'opacity-30'} />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">({rec.total_reviews})</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Recommendations - Other Operators */}
            {(otherRecs.length > 0 || otherRecPage > 1) && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold font-poppins text-[#0a0a0a]">From other operators</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => fetchOtherRecs(otherRecPage - 1)} disabled={otherRecPage <= 1 || otherRecLoading}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 disabled:opacity-30 hover:bg-gray-100 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <button onClick={() => fetchOtherRecs(otherRecPage + 1)} disabled={!otherRecHasMore || otherRecLoading}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 disabled:opacity-30 hover:bg-gray-100 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  </div>
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${otherRecLoading ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
                  {otherRecs.map((rec) => (
                    <button key={rec.id} onClick={() => router.push(`/boat-details/${rec.id}`)}
                      className="text-left bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition">
                      <div className="relative h-36 sm:h-40">
                        {rec.images?.[0] ? <Image src={normalizeImageUrl(rec.images[0])} alt={rec.name} fill className="object-cover" sizes="300px" /> : <div className="w-full h-full bg-gray-100" />}
                      </div>
                      <div className="p-3 sm:p-4">
                        <p className="font-semibold text-sm sm:text-base text-black truncate">{rec.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-[#093b77] font-semibold">{rec.price_per_hour ? `${rec.price_per_hour} EGP/hr` : ''}</span>
                          <div className="flex items-center gap-1">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Image key={i} src="/icons/Star Icon.svg" alt="Star" width={12} height={12} className={i < Math.round(rec.average_rating || 0) ? 'opacity-100' : 'opacity-30'} />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">({rec.total_reviews})</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Customer reviews */}
            <section>
              <h2 className="text-2xl font-semibold mb-6 font-poppins">Customer Reviews</h2>
              <div className="flex flex-col md:flex-row gap-8 mb-8">
                {/* Rating Summary */}
                <div className="text-center">
                  <div className="text-6xl font-bold mb-2">{reviews_summary.average_rating.toFixed(1)}</div>
                  <div className="flex justify-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Image
                        key={i}
                        src="/icons/Star Icon.svg"
                        alt="Star"
                        width={32}
                        height={32}
                        className={`${i < Math.floor(reviews_summary.average_rating) ? "opacity-100" : "opacity-30"}`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-600">
                    Based on {totalRating} Reviews
                  </p>
                </div>

                {/* Rating Breakdown */}
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = reviews_summary.star_breakdown[`${stars}_stars` as keyof typeof reviews_summary.star_breakdown] || 0;
                    return (
                      <div key={stars} className="flex items-center gap-3">
                        <span className="w-16 text-sm">{stars} Star</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-400"
                            style={{
                              width: totalRating > 0 ? `${(count / totalRating) * 100}%` : '0%',
                            }}
                          />
                        </div>
                        <span className="w-12 text-right text-sm">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Write a Review CTA + User's own review */}
              {storage.getUser() && !boatData.user_review && (
                <div className="mb-6">
                  <button
                    onClick={() => router.push(`/write-review/${boat.id}`)}
                    className="px-6 py-2.5 bg-[#0C4A8C] text-white rounded-lg hover:bg-[#0A3D7A] transition-colors"
                  >
                    Write a Review
                  </button>
                </div>
              )}

              {boatData.user_review && (
                <div className="border border-[#093b77]/20 bg-blue-50/30 rounded-lg p-4 sm:p-6 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-[#093b77]">Your Review</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/write-review/${boat.id}?edit=${boatData.user_review!.id}`)}
                        className="text-xs px-3 py-1 border border-[#093b77] text-[#093b77] rounded hover:bg-[#093b77] hover:text-white transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete your review?')) return;
                          setDeletingReview(true);
                          const res = await clientApi.deleteOwnBoatReview(boat.id, boatData.user_review!.id);
                          if (res.success) {
                            const refreshed = await clientApi.getBoatById(boat.id);
                            if (refreshed.success && refreshed.data) setBoatData(refreshed.data);
                            reviewCacheRef.current.clear();
                            fetchReviews(1);
                          }
                          setDeletingReview(false);
                        }}
                        disabled={deletingReview}
                        className="text-xs px-3 py-1 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                      >
                        {deletingReview ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Image key={i} src="/icons/Star Icon.svg" alt="Star" width={16} height={16} className={i < boatData.user_review!.rating ? 'opacity-100' : 'opacity-30'} />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(boatData.user_review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{boatData.user_review.comment}</p>
                </div>
              )}

              {/* Reviews List (paginated) */}
              <div className={`space-y-6 ${reviewsLoading ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
                {paginatedReviews.length === 0 && !boatData.user_review ? (
                  <p className="text-gray-500 text-center py-8">No reviews yet.</p>
                ) : (
                  paginatedReviews.map((review) => {
                    const currentUser = storage.getUser();
                    if (currentUser && review.user_id === currentUser.id) return null;
                    return (
                      <div key={review.id} className="border-b border-gray-200 pb-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-semibold">
                            {review.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{review.username}</p>
                            <p className="text-sm text-gray-600">{new Date(review.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Image
                              key={i}
                              src="/icons/Star Icon.svg"
                              alt="Star"
                              width={16}
                              height={16}
                              className={`${i < review.rating ? "opacity-100" : "opacity-30"}`}
                            />
                          ))}
                        </div>
                        <p className="text-gray-700 mb-3">{review.comment}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Review Pagination */}
              {reviewTotalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={() => fetchReviews(reviewPage - 1)}
                    disabled={reviewPage <= 1 || reviewsLoading}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 disabled:opacity-30 hover:bg-gray-100 transition"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <span className="text-sm text-gray-500">Page {reviewPage} of {reviewTotalPages}</span>
                  <button
                    onClick={() => fetchReviews(reviewPage + 1)}
                    disabled={reviewPage >= reviewTotalPages || reviewsLoading}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 disabled:opacity-30 hover:bg-gray-100 transition"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* Right Sidebar - Booking (Fixed Position) */}
          <div className="lg:col-span-1">
            <div>              <BookingSidebar
              boatId={boat.id}
              boatName={boat.name}
              pricePerHour={boat.price_per_hour}
              pricePerDay={boat.price_per_day}
              maxGuests={boat.max_seats}
              serviceFeeRate={boatData?.service_fee_rate ?? 0.01}
              onBookingRequest={handleRequestToBook}
              isTripBooking={!!selectedTrip}
              tripDuration={selectedTrip?.voyage_hours}
              tripPrice={(() => {
                const assoc = boatData?.boat.trips?.find(t => t.id === selectedTrip?.id) as { effective_price?: number } | undefined;
                return assoc?.effective_price ?? selectedTrip?.total_price;
              })()}
              initialGuestCount={searchParams.get("guest_count") ? parseInt(searchParams.get("guest_count")!) : (searchParams.get("min_passengers") ? parseInt(searchParams.get("min_passengers")!) : 2)}
              locationUrl={boat.location_url}
              priceMode={boat.price_mode as "per_time" | "per_hour" | "per_day" | "per_person" | "per_person_per_time"}
              boatServices={boat.services}
              selectedServiceIds={selectedServiceIds}
              setSelectedServiceIds={setSelectedServiceIds}
              servicePersonCounts={servicePersonCounts}
              setServicePersonCounts={setServicePersonCounts}
              childrenAllowed={boat.children_allowed}
              childPrice={boat.child_price}
              minChildAge={boat.min_child_age}
              maxChildAge={boat.max_child_age}
            />
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {isModalOpen && normalizedMedia.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={() => setIsModalOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, direction: 'ltr' }}
        >
          {/* Close Button - FORCED RIGHT */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(false);
            }}
            className="absolute top-6 text-white hover:text-gray-300 transition-colors bg-black/60 rounded-full p-2 hover:bg-black/80"
            style={{ right: '24px', zIndex: 10000 }}
            aria-label="Close modal"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Media Container - Centered */}
          <div
            className="relative w-full h-full flex items-center justify-center px-4 sm:px-20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button - FORCED LEFT */}
            {normalizedMedia.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute text-white hover:text-gray-300 transition-colors bg-black/60 rounded-full p-4 hover:bg-black/80 flex items-center justify-center"
                style={{ left: '16px', zIndex: 10000 }}
                aria-label="Previous media"
              >
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}

            {/* Main Media */}
            <div className="relative w-full max-w-6xl h-full max-h-[90vh] flex items-center justify-center">
              {normalizedMedia[currentImageIndex].type === 'video' ? (
                <iframe
                  width="100%"
                  height="100%"
                  className="aspect-video max-w-full max-h-full"
                  src={(() => {
                    const url = normalizedMedia[currentImageIndex].url;
                    let videoId = "";
                    if (url.includes("youtu.be/")) {
                      videoId = url.split("youtu.be/")[1].split("?")[0];
                    } else if (url.includes("youtube.com/watch")) {
                      videoId = new URL(url).searchParams.get("v") || "";
                    } else if (url.includes("youtube.com/embed/")) {
                      return url;
                    }
                    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                  })()}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <Image
                  src={normalizedMedia[currentImageIndex].url}
                  alt={`Boat media ${currentImageIndex + 1}`}
                  width={1200}
                  height={800}
                  className="object-contain max-w-full max-h-full"
                  priority
                />
              )}
            </div>

            {/* Next Button - FORCED RIGHT */}
            {normalizedMedia.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute text-white hover:text-gray-300 transition-colors bg-black/60 rounded-full p-4 hover:bg-black/80 flex items-center justify-center"
                style={{ right: '16px', zIndex: 10000 }}
                aria-label="Next media"
              >
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Media Counter - Bottom Center */}
          {normalizedMedia.length > 1 && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[10000] bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
              {currentImageIndex + 1} / {normalizedMedia.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}