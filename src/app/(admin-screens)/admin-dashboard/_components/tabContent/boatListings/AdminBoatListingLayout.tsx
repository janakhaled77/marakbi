"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { adminApi, AdminBoat, AdminCategory, AdminActivity, AdminUser, AdminReview, BoatServiceAssignment, BoatServiceDef, BoatFacilityDef } from "@/lib/api";
import { FiEdit2, FiTrash2, FiSearch, FiImage, FiX, FiUpload, FiEye, FiUsers, FiAnchor, FiCalendar, FiStar, FiMapPin, FiDownload, FiMap, FiCheck, FiChevronLeft, FiChevronRight, FiHelpCircle, FiPlay, FiDollarSign } from "react-icons/fi";
import Image from "next/image";
import { useToast } from "../../ToastProvider";
import ConfirmModal from "../../ConfirmModal";

interface BoatFormData {
  name: string;
  price_per_hour: number | null;
  price_per_day: number | null;
  sale_price: number | null;
  max_seats: number;
  max_seats_stay: number;
  description: string;
  location_url: string;
  address: string;
  price_mode: string;
  show_guests_badge: boolean;
  categories: number[];
  cities: number[];
  trips: number[];
  // Per-trip custom price overrides keyed by trip_id (null = use trip default)
  trip_prices: Record<number, number | null>;
  user_id: number;
  services: BoatServiceAssignment[];
  facilities: BoatFacilityDef[];
  video_urls: string[];
  removed_videos: string[];
  activities: number[];
}
interface BoatStats {
  total_fleet: number;
  total_revenue: number;
  total_bookings: number;
}

interface BoatDetailsData extends AdminBoat {
  categories_full?: { id: number; name: string }[];
  trips_full?: { id: number; name: string }[];
  owner?: { id: number; username: string; email: string } | null;
  reviews?: AdminReview[];
  bookings_count?: number;
  revenue?: number;
  average_rating?: number;
}

export default function AdminBoatListingLayout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [boats, setBoats] = useState<AdminBoat[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [allActivities, setAllActivities] = useState<AdminActivity[]>([]);
  const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [trips, setTrips] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [cityFilter, setCityFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [editingBoat, setEditingBoat] = useState<AdminBoat | null>(null);
  const [saving, setSaving] = useState(false);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
  // Modal UI State
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'trips' | 'services' | 'facilities' | 'sell'>('details');
  const [primaryNewImageIndex, setPrimaryNewImageIndex] = useState<number>(0);
  const [primaryExistingUrl, setPrimaryExistingUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Available services for assignment (no longer fetched from global catalog)
  // Inline service creation state
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  const [creatingService, setCreatingService] = useState(false);
  const [newServiceData, setNewServiceData] = useState<{
    name: string;
    description: string;
    price: number | null;
    price_mode: 'per_trip' | 'per_person' | 'per_person_per_time';
    icon: File | null;
  }>({ name: '', description: '', price: null, price_mode: 'per_trip', icon: null });
  const resetNewServiceData = () => {
    setNewServiceData({ name: '', description: '', price: null, price_mode: 'per_trip', icon: null });
  };

  // Inline service editing state
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [editServiceData, setEditServiceData] = useState<{
    name: string;
    description: string;
    price_mode: 'per_trip' | 'per_person' | 'per_person_per_time';
    icon: File | null;
  }>({ name: '', description: '', price_mode: 'per_trip', icon: null });
  const [savingService, setSavingService] = useState(false);

  const startEditingService = (svc: BoatServiceDef) => {
    setEditingServiceId(svc.id);
    setEditServiceData({
      name: svc.name,
      description: svc.description || '',
      price_mode: svc.price_mode,
      icon: null,
    });
  };

  const cancelEditingService = () => {
    setEditingServiceId(null);
    setEditServiceData({ name: '', description: '', price_mode: 'per_trip', icon: null });
  };

  const handleSaveServiceEdit = async () => {
    if (!editingServiceId || !editServiceData.name) return;
    setSavingService(true);
    try {
      const response = await adminApi.updateService(editingServiceId, {
        name: editServiceData.name,
        description: editServiceData.description || '',
        price_mode: editServiceData.price_mode,
      }, editServiceData.icon || undefined);
      if (response.success && response.data) {
        const updatedService = response.data.service;
        // Update the service in formData.services
        setFormData(prev => ({
          ...prev,
          services: prev.services.map(s =>
            s.service_id === editingServiceId ? { ...s, service: updatedService } : s
          )
        }));
        cancelEditingService();
        showSuccess('Service updated');
      } else {
        showError(response.error || 'Failed to update service');
      }
    } catch {
      showError('Failed to update service');
    }
    setSavingService(false);
  };

  const handleCreateInlineService = async () => {
    if (!newServiceData.name) return;
    setCreatingService(true);
    try {
      const servicePayload = {
        name: newServiceData.name,
        description: newServiceData.description || undefined,
        default_price: newServiceData.price,
        price_mode: newServiceData.price_mode,
      };
      const response = await adminApi.createService(servicePayload, newServiceData.icon || undefined);
      if (response.success && response.data) {
        const createdService = response.data.service;
        // Auto-assign to this boat
        setFormData(prev => ({
          ...prev,
          services: [...prev.services, {
            service_id: createdService.id,
            service: createdService,
            price: newServiceData.price,
            is_badge: false,
            badge_display_name: null,
            per_person_all_required: true,
          }]
        }));
        resetNewServiceData();
        setShowNewServiceForm(false);
        showSuccess('Service created and added');
      } else {
        showError(response.error || 'Failed to create service');
      }
    } catch {
      showError('Failed to create service');
    }
    setCreatingService(false);
  };

  const startEditingFacility = (fac: BoatFacilityDef) => {
    setEditingFacilityId(fac.id);
    setEditFacilityData({
      name: fac.name,
      description: fac.description || '',
      icon: null,
    });
  };

  const cancelEditingFacility = () => {
    setEditingFacilityId(null);
    setEditFacilityData({ name: '', description: '', icon: null });
  };

  const handleSaveFacilityEdit = async () => {
    if (!editingFacilityId || !editFacilityData.name) return;
    setSavingFacility(true);
    try {
      const response = await adminApi.updateFacility(editingFacilityId, {
        name: editFacilityData.name,
        description: editFacilityData.description || '',
      }, editFacilityData.icon || undefined);
      if (response.success && response.data) {
        const updatedFacility = response.data.facility;

        setFormData(prev => ({
          ...prev,
          facilities: prev.facilities.map(f =>
            f.id === editingFacilityId ? updatedFacility : f
          )
        }));
        cancelEditingFacility();
        showSuccess('Facility updated');
      } else {
        showError(response.error || 'Failed to update facility');
      }
    } catch {
      showError('Failed to update facility');
    }
    setSavingFacility(false);
  };

  const handleCreateInlineFacility = async () => {
    if (!newFacilityData.name) return;
    setCreatingFacility(true);
    try {
      const facilityPayload = {
        name: newFacilityData.name,
        description: newFacilityData.description || undefined,
      };
      const response = await adminApi.createFacility(facilityPayload, newFacilityData.icon || undefined);
      if (response.success && response.data) {
        const createdFacility = response.data.facility;

        setFormData(prev => ({
          ...prev,
          facilities: [...prev.facilities, createdFacility]
        }));
        resetNewFacilityData();
        setShowNewFacilityForm(false);
        showSuccess('Facility created and added');
      } else {
        showError(response.error || 'Failed to create facility');
      }
    } catch {
      showError('Failed to create facility');
    }
    setCreatingFacility(false);
  };

  // View Details Modal State
  const [viewDetailsBoat, setViewDetailsBoat] = useState<BoatDetailsData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviewsRatingFilter, setReviewsRatingFilter] = useState<number | "">("");

  // Stats
  const [stats, setStats] = useState<BoatStats>({ total_fleet: 0, total_revenue: 0, total_bookings: 0 });

  // Confirm Delete Modal
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; boatId: number | null }>({ isOpen: false, boatId: null });
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<BoatFormData>({
    name: "",
    price_per_hour: 0,
    price_per_day: null,
    sale_price: null,
    max_seats: 10,
    max_seats_stay: 6,
    description: "",
    location_url: "",
    address: "",
    price_mode: "per_hour",
    show_guests_badge: false,
    categories: [],
    cities: [],
    trips: [],
    trip_prices: {},
    user_id: 1,
    services: [],
    facilities: [],
    video_urls: [],
    removed_videos: [],
  });

  // Inline facility creation state
  const [showNewFacilityForm, setShowNewFacilityForm] = useState(false);
  const [creatingFacility, setCreatingFacility] = useState(false);
  const [newFacilityData, setNewFacilityData] = useState<{
    name: string;
    description: string;
    icon: File | null;
  }>({ name: '', description: '', icon: null });
  const resetNewFacilityData = () => {
    setNewFacilityData({ name: '', description: '', icon: null });
  };

  // Inline facility editing state
  const [editingFacilityId, setEditingFacilityId] = useState<number | null>(null);
  const [editFacilityData, setEditFacilityData] = useState<{
    name: string;
    description: string;
    icon: File | null;
  }>({ name: '', description: '', icon: null });
  const [savingFacility, setSavingFacility] = useState(false);

  // User filter from URL
  const [userFilter, setUserFilter] = useState<number | undefined>(() => {
    const userId = searchParams.get("user");
    return userId ? parseInt(userId, 10) : undefined;
  });
  const [userFilterName, setUserFilterName] = useState<string>("");

  // Read user param from URL on updates
  useEffect(() => {
    const userId = searchParams.get("user");
    if (userId && !searchParams.get("action")) {
      const uid = parseInt(userId, 10);
      if (uid !== userFilter) {
        setUserFilter(uid);
      }
      adminApi.getUser(uid).then((res) => {
        if (res.success && res.data) {
          setUserFilterName(res.data.username);
        }
      });
    } else if (userFilter !== undefined && !searchParams.get("action")) {
      setUserFilter(undefined);
    }
  }, [searchParams]);

  // Reset image index when opening details modal
  useEffect(() => {
    if (viewDetailsBoat) {
      setCurrentImageIndex(0);
    }
  }, [viewDetailsBoat]);

  // Check for boatId to open details modal
  useEffect(() => {
    const boatIdParam = searchParams.get("boatId");
    if (boatIdParam) {
      const boatId = Number(boatIdParam);
      if (!isNaN(boatId)) {
        // Fetch boat details
        const fetchBoatDetails = async () => {
          setLoadingDetails(true);
          const response = await adminApi.getBoat(boatId);
          if (response.success && response.data) {
            setViewDetailsBoat(response.data);
          }
          setLoadingDetails(false);
        };
        fetchBoatDetails();
      }
    }
  }, [searchParams]);

  const fetchBoats = useCallback(async () => {
    setLoading(true);
    const filters: { search?: string; category_id?: number; city_id?: number; user_id?: number } = {};
    if (search) filters.search = search;
    if (categoryFilter) filters.category_id = categoryFilter;
    if (cityFilter) filters.city_id = cityFilter;
    if (userFilter) filters.user_id = userFilter;

    const response = await adminApi.getBoats(page, 9, filters);
    if (response.success && response.data) {
      setBoats(response.data.boats);
      setTotalPages(response.data.pages);
    }
    setLoading(false);
  }, [page, search, categoryFilter, cityFilter, userFilter]);

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();

    // Handle navigation back or clear params
    const returnToCityId = searchParams.get('returnToCityId');
    const returnToCategoryId = searchParams.get('returnToCategoryId');
    const returnTab = searchParams.get('returnTab');
    const returnOrderId = searchParams.get('returnOrderId');

    if (returnToCityId) {
      router.push(`/admin-dashboard?tab=cities&openCityId=${returnToCityId}`);
    } else if (returnToCategoryId) {
      router.push(`/admin-dashboard?tab=categories&openCategoryId=${returnToCategoryId}`);
    } else if (returnTab && returnOrderId) {
      router.push(`/admin-dashboard?tab=${returnTab}&openOrderId=${returnOrderId}`);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get('boatId') || params.get('action')) {
        params.delete('boatId');
        params.delete('action');
        router.push(`/admin-dashboard?${params.toString()}`);
      }
    }
  };

  const handleCloseDetailsModal = () => {
    setViewDetailsBoat(null);
    setReviewsRatingFilter("");
    const returnToCityId = searchParams.get('returnToCityId');
    const returnToCategoryId = searchParams.get('returnToCategoryId');
    const returnTab = searchParams.get('returnTab');
    const returnOrderId = searchParams.get('returnOrderId');

    if (returnToCityId) {
      router.push(`/admin-dashboard?tab=cities&openCityId=${returnToCityId}`);
    } else if (returnToCategoryId) {
      router.push(`/admin-dashboard?tab=categories&openCategoryId=${returnToCategoryId}`);
    } else if (returnTab && returnOrderId) {
      router.push(`/admin-dashboard?tab=${returnTab}&openOrderId=${returnOrderId}`);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get('boatId')) {
        params.delete('boatId');
        router.push(`/admin-dashboard?${params.toString()}`);
      }
    }
  };

  const fetchStats = async () => {
    const response = await adminApi.getStats();
    if (response.success && response.data) {
      setStats({
        total_fleet: response.data.total_boats,
        total_revenue: response.data.total_revenue,
        total_bookings: response.data.total_bookings
      });
    }
  };

  const fetchCategories = async () => {
    const response = await adminApi.getCategories();
    if (response.success && response.data) {
      setCategories(response.data.categories);
    }
  };

  const fetchCities = async () => {
    const response = await adminApi.getCities();
    if (response.success && response.data) {
      setCities(response.data.cities);
    }
  };

  const fetchActivities = async () => {
    const response = await adminApi.getActivities();
    if (response.success && response.data) {
      setAllActivities(response.data.activities);
    }
  };

  const fetchTrips = async () => {
    const response = await adminApi.getTrips(1, 1000);
    if (response.success && response.data) {
      setTrips(response.data.trips);
    }
  };

  const fetchUsers = async () => {
    const response = await adminApi.getUsers(1, 100);
    if (response.success && response.data) {
      setUsers(response.data.users);
    }
  };

  // Aggregated stats per boat
  const [boatStats, setBoatStats] = useState<Record<number, {
    bookings: number;
    revenue: number;
    rating: number;
    reviewCount: number;
    reviews: AdminReview[];
  }>>({});

  const fetchRealStats = async () => {
    try {
      const ordersRes = await adminApi.getOrders(1, 1000);
      const allOrders = ordersRes.success && ordersRes.data ? ordersRes.data.orders : [];

      const reviewsRes = await adminApi.getBoatReviews(1, 1000);
      const allReviews = reviewsRes.success && reviewsRes.data ? reviewsRes.data.reviews : [];

      const statsMap: Record<number, { bookings: number; revenue: number; rating: number; reviewCount: number; reviews: AdminReview[] }> = {};

      allOrders.forEach(order => {
        if (!statsMap[order.boat_id]) {
          statsMap[order.boat_id] = { bookings: 0, revenue: 0, rating: 0, reviewCount: 0, reviews: [] };
        }
        if (order.status !== 'cancelled') {
          statsMap[order.boat_id].bookings += 1;
          statsMap[order.boat_id].revenue += order.total_price || 0;
        }
      });

      allReviews.forEach(review => {
        if (!statsMap[review.boat_id]) {
          statsMap[review.boat_id] = { bookings: 0, revenue: 0, rating: 0, reviewCount: 0, reviews: [] };
        }
        statsMap[review.boat_id].reviews.push(review);
      });

      Object.values(statsMap).forEach(data => {
        const totalRating = data.reviews.reduce((sum, r) => sum + r.rating, 0);
        data.reviewCount = data.reviews.length;
        data.rating = data.reviewCount > 0 ? totalRating / data.reviewCount : 0;
      });

      setBoatStats(statsMap);
    } catch (err) {
      console.error("Failed to fetch real stats aggregation", err);
    }
  };
  useEffect(() => {
    fetchBoats();
    fetchCategories();
    fetchCities();
    fetchTrips();
    fetchUsers();
    fetchStats();
    fetchRealStats();
    fetchActivities();
  }, [fetchBoats]);

  // Handle URL parameters - auto-open Add Boat modal when action=add&user=X
  useEffect(() => {
    const action = searchParams.get("action");
    const userId = searchParams.get("user");
    if (action === "add" && userId) {
      setEditingBoat(null);
      setFormData({
        name: "",
        price_per_hour: 0,
        price_per_day: null,
        sale_price: null,
        max_seats: 10,
        max_seats_stay: 6,
        description: "",
        location_url: "",
        address: "",
        price_mode: "per_hour",
        show_guests_badge: false,
        categories: [],
        cities: [],
        trips: [],
        trip_prices: {},
        user_id: parseInt(userId, 10),
        services: [],
        facilities: [],
        video_urls: [],
        removed_videos: [],
        activities: [],
      });
      setNewImages([]);
      setImagePreviews([]);
      setShowModal(true);
      router.replace("/admin-dashboard?tab=boat-listings", { scroll: false });
    }
  }, [searchParams, router]);
  const resetForm = () => {
    setFormData({
      name: "",
      price_per_hour: 0,
      price_per_day: null,
      sale_price: null,
      max_seats: 10,
      max_seats_stay: 6,
      description: "",
      location_url: "",
      address: "",
      price_mode: "per_time",
      show_guests_badge: false,
      categories: [],
      cities: [],
      trips: [],
      trip_prices: {},
      user_id: 1,
      services: [],
      facilities: [],
      video_urls: [],
      removed_videos: [],
      activities: [],
    });
    setNewImages([]);
    setImagePreviews([]);
    setRemovedImageUrls([]);
    setActiveTab('details');
    setPrimaryNewImageIndex(0);
    setPrimaryExistingUrl(null);
    setShowNewServiceForm(false);
    resetNewServiceData();
    cancelEditingService();
    setShowNewFacilityForm(false);
    resetNewFacilityData();
    cancelEditingFacility();
  };
  // ...
  const openEditModal = async (boat: AdminBoat) => {
    setEditingBoat(boat);
    setRemovedImageUrls([]);
    const response = await adminApi.getBoat(boat.id);
    if (response.success && response.data) {
      const data = response.data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cityIds = ((data as any).cities as { id: number; name: string }[])?.map((c) => c.id) || [];
      setFormData({
        name: data.name,
        price_per_hour: data.price_per_hour,
        price_per_day: data.price_per_day,
        sale_price: data.sale_price ?? null,
        max_seats: data.max_seats,
        max_seats_stay: data.max_seats_stay,
        description: data.description || "",
        location_url: data.location_url || "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        address: (data as any).address || "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        price_mode: (data as any)['price_mode'] || "per_time",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        show_guests_badge: (data as any).show_guests_badge || false,
        categories: data.categories_full && data.categories_full.length > 0 ? [data.categories_full[0].id] : [],
        cities: cityIds,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trips: data.trips?.map((t: any) => t.id) || [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trip_prices: (data.trips || []).reduce((acc: Record<number, number | null>, t: any) => {
          // Backend returns custom_price (null if no override). Keep null for
          // unset overrides so the UI shows an empty input for those rows.
          acc[t.id] = t.custom_price ?? null;
          return acc;
        }, {}),
        user_id: data.owner_username ? 0 : 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        services: (data as any).services_full || data.services || [],
        facilities: data.facilities || [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        video_urls: (data as any).video_urls || [],
        removed_videos: [],
        activities: data.activities_id || [],
      });
      setImagePreviews(data.images || []);

      // Set primary image logic (first image is primary by default in this basic implementation for existing)
      if (data.images && data.images.length > 0) {
        setPrimaryExistingUrl(data.images[0]);
      }
    }
    setActiveTab('details');
    setShowModal(true);
  };

  const openViewDetails = async (boat: AdminBoat) => {
    setLoadingDetails(true);
    setReviewsRatingFilter("");
    setViewDetailsBoat(boat as BoatDetailsData);

    const response = await adminApi.getBoat(boat.id);
    if (response.success && response.data) {
      // Use real aggregated stats from the pre-fetched boatStats
      const realStats = boatStats[boat.id] || { bookings: 0, revenue: 0, rating: 0, reviewCount: 0, reviews: [] };

      setViewDetailsBoat({
        ...response.data,
        reviews: realStats.reviews,
        average_rating: realStats.rating,
        bookings_count: realStats.bookings,
        revenue: realStats.revenue,
      });
    }
    setLoadingDetails(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewImages((prev) => {
      // If this is the first batch of images and we don't have a primary set, default to 0
      if (prev.length === 0 && files.length > 0 && !primaryExistingUrl) {
        setPrimaryNewImageIndex(0);
      }
      return [...prev, ...files];
    });

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = async (index: number) => {
    const imageUrl = imagePreviews[index];
    const existingImagesCount = editingBoat?.images?.length || 0;
    const removedExistingCount = removedImageUrls.length;
    const remainingExistingCount = existingImagesCount - removedExistingCount;

    // Handle Primary Image Removal Logic
    if (imageUrl === primaryExistingUrl) {
      setPrimaryExistingUrl(null);
      // Default to first new image if available, else 0
      setPrimaryNewImageIndex(0);
    }

    // Check if we are removing a new image that was selected as primary
    if (index >= remainingExistingCount) {
      const newIndex = index - remainingExistingCount;
      if (newIndex === primaryNewImageIndex) {
        setPrimaryNewImageIndex(0); // Reset to first if current primary new is deleted
      } else if (newIndex < primaryNewImageIndex) {
        setPrimaryNewImageIndex(prev => prev - 1); // Shift index if preceding image is deleted
      }
    }

    if (index < remainingExistingCount && editingBoat?.images?.includes(imageUrl)) {
      setRemovedImageUrls((prev) => [...prev, imageUrl]);
    }

    setImagePreviews((prev) => prev.filter((_, i) => i !== index));

    if (index >= remainingExistingCount) {
      const newIndex = index - remainingExistingCount;
      setNewImages((prev) => prev.filter((_, i) => i !== newIndex));
    }
  };

  const handleSubmit = async () => {
    // Validation: Name required
    if (!formData.name) {
      showError("Please fill in the boat name");
      return;
    }

    // Validation: At least one price required
    const hasHourlyPrice = formData.price_per_hour && formData.price_per_hour > 0;
    const hasDailyPrice = formData.price_per_day && formData.price_per_day > 0;

    if (!hasHourlyPrice && !hasDailyPrice) {
      showError("Please provide at least one price (per hour or per day)");
      return;
    }

    setSaving(true);

    const boatData = {
      name: formData.name,
      price_per_hour: formData.price_per_hour,
      price_per_day: formData.price_per_day,
      sale_price: formData.sale_price,
      max_seats: formData.max_seats,
      max_seats_stay: formData.max_seats_stay,
      description: formData.description,
      location_url: formData.location_url,
      address: formData.address,
      price_mode: formData.price_mode,
      show_guests_badge: formData.show_guests_badge,
      categories: formData.categories,
      cities: formData.cities,
      trips: formData.trips,
      // Send custom prices in the same order as `trips` so the backend can
      // pair them by index. null at an index = "no override" (use trip default).
      trip_prices: formData.trips.map(tripId => formData.trip_prices[tripId] ?? null),
      boat_images: newImages.length > 0 ? newImages : undefined,
      removed_images: removedImageUrls.length > 0 ? removedImageUrls : undefined,
      primary_image_url: primaryExistingUrl || undefined,
      primary_new_image_index: !primaryExistingUrl ? primaryNewImageIndex : undefined,
      services: formData.services,
      facilities: formData.facilities.map(f => f.id),
      activities: formData.activities,
      video_urls: formData.video_urls.length > 0 ? formData.video_urls : undefined,
      removed_videos: formData.removed_videos.length > 0 ? formData.removed_videos : undefined,
    };

    let response;
    if (editingBoat) {
      response = await adminApi.updateBoat(editingBoat.id, boatData);
    } else {
      response = await adminApi.createBoat(formData.user_id, boatData);
    }

    if (response.success) {
      setShowModal(false);
      resetForm();
      fetchBoats();
      fetchStats();
      showSuccess(editingBoat ? "Boat updated successfully" : "Boat created successfully");
    } else {
      showError(response.error || "Failed to save boat");
    }
    setSaving(false);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete.boatId) return;
    setDeleting(true);
    const response = await adminApi.deleteBoat(confirmDelete.boatId);
    if (response.success) {
      fetchBoats();
      fetchStats();
      showSuccess("Boat deleted successfully");
      if (viewDetailsBoat?.id === confirmDelete.boatId) {
        setViewDetailsBoat(null);
      }
    } else {
      showError(response.error || "Failed to delete boat");
    }
    setDeleting(false);
    setConfirmDelete({ isOpen: false, boatId: null });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getYear = (dateString: string) => {
    return new Date(dateString).getFullYear();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getItemName = (item: string | { name: string } | any) => {
    if (!item) return "";
    if (typeof item === 'string') return item;
    return item.name || "";
  };

  const handleExport = () => {
    const csv = [
      ["ID", "Name", "Owner", "Price/Hour", "Seats", "Year", "Categories", "Cities"].join(","),
      ...boats.map(b => [
        b.id,
        `"${b.name}"`,
        `"${b.owner_username || ''}"`,
        b.price_per_hour,
        b.max_seats,
        getYear(b.created_at),
        `"${b.categories?.map(getItemName).join(', ') || ''}"`,
        `"${b.cities?.map(getItemName).join(', ') || ''}"`,
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fleet_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
      {/* 1. Header & Stats Section */}
      <div>
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[#0A0A0A] font-bold text-xl">Boat Listings</p>
            <p className="text-[#717182] font-normal text-sm">Manage and monitor all boats in your fleet</p>
          </div>
          {/* <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#1E293B] text-white px-4 py-2 rounded-lg hover:bg-black transition-colors text-sm font-medium"
          >
            <FiDownload /> Export Report
          </button> */}
        </div>

        {/* Stats Cards Row */}

      </div>

      {/* 2. Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="bg-gray-50 flex items-center gap-3 px-4 py-2.5 rounded-lg flex-1 border border-transparent focus-within:border-gray-200 transition-colors">
          <FiSearch className="text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search boats..."
            className="bg-transparent outline-none text-sm text-gray-900 w-full placeholder:text-gray-500"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <select
            value={categoryFilter || ""}
            onChange={(e) => {
              setCategoryFilter(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
            className="bg-gray-50 px-4 py-2.5 rounded-lg text-sm text-gray-700 outline-none border border-transparent focus:border-gray-200 min-w-[140px] cursor-pointer"
          >
            <option value="">All Types</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 px-4 py-2.5 rounded-lg text-sm text-gray-700 outline-none border border-transparent focus:border-gray-200 min-w-[140px] cursor-pointer"
          >
            <option value="active">All Status</option>
            <option value="active">Active</option>
          </select>

          <select
            value={cityFilter || ""}
            onChange={(e) => {
              setCityFilter(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
            className="bg-gray-50 px-4 py-2.5 rounded-lg text-sm text-gray-700 outline-none border border-transparent focus:border-gray-200 min-w-[140px] cursor-pointer"
          >
            <option value="">All Locations</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>{city.name}</option>
            ))}
          </select>

          {/* Add Boat Button aligned with filters for better usability, though design shows it in header
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            <FiPlus /> Add Boat
          </button> */}
        </div>
      </div>

      {/* 3. Boat Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border text-gray-100 border-gray-100 rounded-2xl overflow-hidden h-[400px] animate-pulse">
              <div className="h-52 bg-gray-200" />
              <div className="p-5 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="space-y-2 pt-4">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : boats.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-gray-400">
            <FiAnchor size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No boats found</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">
            We couldn&apos;t find any boats matching your filters.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setCategoryFilter(undefined);
              setCityFilter(undefined);
              router.replace("/admin-dashboard?tab=boat-listings", { scroll: false });
            }}
            className="text-blue-600 font-medium hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boats.map((boat) => {
            // Real Stats
            const stats = boatStats[boat.id] || { bookings: 0, revenue: 0, rating: 0, reviewCount: 0 };

            return (
              <div key={boat.id} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                {/* Card Image area */}
                <div className="relative h-52 bg-gray-200">
                  {boat.images?.[0] ? (
                    <Image src={boat.images[0]} alt={boat.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                      <FiImage size={32} />
                    </div>
                  )}

                  {/* Status Badge - Top Right */}
                  <div className="absolute top-3 right-3">
                    <span className="bg-white/95 backdrop-blur-sm text-green-600 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
                    </span>
                  </div>

                  {/* Category Badge - Bottom Left */}
                  <div className="absolute bottom-3 left-3">
                    <span className="bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-sm">
                      {getItemName(boat.categories?.[0]) || "Boat"}
                    </span>
                  </div>

                  {/* Price Badge - Bottom Right */}
                  <div className="absolute bottom-3 right-3">
                    <span className="bg-white/95 backdrop-blur-sm text-gray-900 text-xs px-3 py-1.5 rounded-lg font-bold shadow-sm">
                      {formatCurrency(boat.price_per_hour)}<span className="font-normal text-gray-500">/hr</span>
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5">
                  <h3 className="text-[17px] font-bold text-gray-900 truncate mb-1" title={boat.name}>{boat.name}</h3>
                  <div className="flex items-center gap-1.5 mb-4 text-gray-500 text-xs font-medium">
                    <FiMapPin size={12} />
                    <span>{getItemName(boat.cities?.[0]) || "Unknown City"}</span>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-8 mb-5">
                    <div className="text-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-600 mb-1 mx-auto">
                        <FiUsers size={14} />
                      </div>
                      <p className="text-xs font-semibold text-gray-900">{boat.max_seats}</p>
                      <p className="text-[10px] text-gray-400">Seats</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-600 mb-1 mx-auto">
                        <FiCalendar size={14} />
                      </div>
                      <p className="text-xs font-semibold text-gray-900">{getYear(boat.created_at)}</p>
                      <p className="text-[10px] text-gray-400">Year</p>
                    </div>
                  </div>

                  {/* Detailed Stats / Owner Info List */}
                  <div className="space-y-2.5 py-4 border-t border-dashed border-gray-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Owner</span>
                      <span className="font-medium text-gray-700 truncate max-w-[120px]">{boat.owner_username || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Bookings</span>
                      <span className="font-medium text-gray-900">{stats.bookings}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Revenue</span>
                      <span className="font-medium text-green-600">{formatCurrency(stats.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Rating</span>
                      <div className="flex items-center gap-1 text-gray-900 font-medium">
                        <FiStar size={10} className="text-orange-400" fill="currentColor" />
                        {stats.rating > 0 ? stats.rating.toFixed(1) : "N/A"} <span className="text-gray-400 font-normal">({stats.reviewCount})</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => openViewDetails(boat)}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 text-xs uppercase tracking-wide font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <FiEye size={14} /> View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-gray-600 px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* 4. View Details Modal */}
      {viewDetailsBoat && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseDetailsModal();
            }
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 pb-2 border-b border-gray-100 flex-shrink-0">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-gray-900">{viewDetailsBoat.name}</h2>
                  <span className="bg-green-100 text-green-700 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                </div>
                <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                  {getItemName(viewDetailsBoat.categories?.[0]) || "Boat"} • {getItemName(viewDetailsBoat.cities?.[0]) || "Unknown City"}
                </p>
              </div>
              <button onClick={handleCloseDetailsModal} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                <FiX size={24} />
              </button>
            </div>

            {loadingDetails ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-3 flex-1 overflow-y-auto">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
                <p className="text-sm text-gray-500">Loading boat details...</p>
              </div>
            ) : (
              <div className="p-6 pt-4 flex-1 overflow-y-auto">
                {/* Modal Gallery Image */}
                {/* Modal Gallery Image Slider */}
                <div className="relative w-full h-80 rounded-2xl overflow-hidden mb-8 bg-gray-100 group">
                  {viewDetailsBoat.images && viewDetailsBoat.images.length > 0 ? (
                    <>
                      <Image
                        src={viewDetailsBoat.images[currentImageIndex]}
                        alt={`${viewDetailsBoat.name} - Image ${currentImageIndex + 1}`}
                        fill
                        className="object-cover transition-opacity duration-300"
                        priority
                      />

                      {/* Navigation Arrows (Only if > 1 image) */}
                      {viewDetailsBoat.images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex((prev) => (prev - 1 + viewDetailsBoat.images.length) % viewDetailsBoat.images.length);
                            }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-900 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-105 z-10"
                          >
                            <FiChevronLeft size={24} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex((prev) => (prev + 1) % viewDetailsBoat.images.length);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-900 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-105 z-10"
                          >
                            <FiChevronRight size={24} />
                          </button>

                          {/* Indicators */}
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                            {viewDetailsBoat.images.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentImageIndex(idx);
                                }}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex
                                  ? "bg-white w-4"
                                  : "bg-white/50 hover:bg-white/80"
                                  }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <FiImage size={48} />
                    </div>
                  )}
                  {/* Image Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 pointer-events-none"></div>
                </div>

                {/* 2-Column Stats Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Left Col: Specs */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">Specifications</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Price per Hour</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(viewDetailsBoat.price_per_hour)}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Guest Capacity</p>
                        <p className="text-lg font-bold text-gray-900">{viewDetailsBoat.max_seats} People</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Registered Year</p>
                        <p className="text-lg font-bold text-gray-900">{getYear(viewDetailsBoat.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Col: Performance */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">Performance</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <span className="text-sm text-gray-600">Total Bookings</span>
                        <span className="text-base font-bold text-gray-900">{viewDetailsBoat.bookings_count}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <span className="text-sm text-gray-600">Total Revenue</span>
                        <span className="text-base font-bold text-green-600">{formatCurrency(viewDetailsBoat.revenue || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <span className="text-sm text-gray-600">Average Rating</span>
                        <div className="flex items-center gap-1.5">
                          <FiStar className="text-orange-400" fill="currentColor" />
                          <span className="text-base font-bold text-gray-900">{viewDetailsBoat.average_rating?.toFixed(1) || "N/A"}</span>
                          <span className="text-xs text-gray-400">({viewDetailsBoat.reviews?.length || 0} reviews)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description - separated */}
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2 mb-3">Description</h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {viewDetailsBoat.description || "No description provided for this boat."}
                  </p>
                </div>

                {/* Owner Info Card */}
                <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Owner Information</p>
                      <p className="text-base font-bold text-gray-900">{viewDetailsBoat.owner?.username || viewDetailsBoat.owner_username || "Unknown Owner"}</p>
                      <p className="text-sm text-gray-500">{viewDetailsBoat.owner?.email || "No email available"}</p>
                    </div>
                    {/* <button className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg transition-colors">
                      View Profile
                    </button> */}
                  </div>
                </div>

                {/* Reviews Section */}
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Reviews</h3>
                    <select
                      value={reviewsRatingFilter}
                      onChange={(e) => setReviewsRatingFilter(e.target.value === "" ? "" : Number(e.target.value))}
                      className="bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 outline-none border border-transparent hover:border-gray-200 focus:border-gray-300 transition-all cursor-pointer"
                    >
                      <option value="">All Ratings</option>
                      <option value="5">5 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="3">3 Stars</option>
                      <option value="2">2 Stars</option>
                      <option value="1">1 Star</option>
                    </select>
                  </div>
                  {viewDetailsBoat.reviews && viewDetailsBoat.reviews.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {viewDetailsBoat.reviews
                        .filter(review => reviewsRatingFilter === "" || review.rating === reviewsRatingFilter)
                        .map((review) => (
                          <div key={review.id} className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-sm text-gray-900">{review.username}</span>
                              <div className="flex items-center gap-[1px]">
                                {[...Array(5)].map((_, i) => (
                                  <FiStar key={i} size={10} className={i < review.rating ? "text-orange-400 fill-orange-400" : "text-gray-300"} />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-3 italic">&quot;{review.comment}&quot;</p>
                            <p className="text-[10px] text-gray-400 mt-2 text-right">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      {viewDetailsBoat.reviews.filter(review => reviewsRatingFilter === "" || review.rating === reviewsRatingFilter).length === 0 && (
                        <div className="col-span-full py-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                          <p className="text-sm text-gray-500">No reviews found with this rating.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-sm text-gray-500">No reviews have been submitted for this boat yet.</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex-shrink-0">
              <button
                onClick={handleCloseDetailsModal}
                className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewDetailsBoat(null);
                  openEditModal(viewDetailsBoat);
                }}
                className="px-6 py-2.5 text-sm font-medium bg-[#0F172A] text-white rounded-xl hover:bg-black transition-colors shadow-lg shadow-gray-200 flex items-center gap-2"
              >
                <FiEdit2 size={16} /> Edit Boat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal (Standard Form) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
              <div className="flex gap-4 items-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'details' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    <FiEdit2 className="inline mr-2" /> Details
                  </button>
                  <button
                    onClick={() => setActiveTab('trips')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'trips' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    <FiMap className="inline mr-2" /> Trips                  </button>
                  <button
                    onClick={() => setActiveTab('photos')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'photos' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    <FiImage className="inline mr-2" /> Photos
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'services' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    <FiHelpCircle className="inline mr-2" /> Services
                  </button>
                  <button
                    onClick={() => setActiveTab('facilities')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'facilities' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    <FiCheck className="inline mr-2" /> Facilities
                  </button>
                  <button
                    onClick={() => setActiveTab('sell')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'sell' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    <FiDollarSign className="inline mr-2" /> Sell
                  </button>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
              {activeTab === 'details' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Basic Information</h3>
                    <p className="text-sm text-gray-500 mb-6">Update the basic details of your boat listing</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Boat Name *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                          placeholder="e.g. Ocean Dream Luxury Yacht"
                        />
                      </div>

                      {/* Categories (Boat Type) — strict single-select */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Boat Type *
                          <span className="text-gray-400 font-normal text-xs ml-1">(select exactly one)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {categories.map((cat) => {
                            const selected = formData.categories[0] === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, categories: [cat.id] });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${selected ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                              >
                                {cat.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Activities — multi-select */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Activities
                          <span className="text-gray-400 font-normal text-xs ml-1">(select one or more)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {allActivities.map((act) => {
                            const selected = formData.activities.includes(act.id);
                            return (
                              <button
                                key={act.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    activities: selected
                                      ? prev.activities.filter(id => id !== act.id)
                                      : [...prev.activities, act.id]
                                  }));
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${selected
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                  }`}
                              >
                                {act.name}
                              </button>
                            );
                          })}
                          {allActivities.length === 0 && (
                            <p className="text-xs text-gray-400">No activities created yet. Add them from the Activities tab.</p>
                          )}
                        </div>
                      </div>

                      {/* Price Mode */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Pricing Model *</label>
                        <select
                          value={formData.price_mode}
                          onChange={(e) => {
                            const mode = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              price_mode: mode,
                              // Keep stored prices consistent with the chosen mode so the
                              // booking page only offers the tab the admin intends.
                              price_per_day: mode === 'per_hour' ? null : prev.price_per_day,
                              price_per_hour: mode === 'per_day' ? null : prev.price_per_hour,
                            }));
                          }}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                        >
                          <option value="per_hour">Per Hour</option>
                          <option value="per_day">Per Day</option>
                          <option value="per_person">Per Person (Fixed)</option>
                          <option value="per_person_per_time">Per Person Per Hour</option>
                          <option value="per_trip">Per Trip (flat fee)</option>
                          <option value="per_session">Per Session</option>
                          {/* Legacy combined mode — only shown for boats already saved as per_time */}
                          {formData.price_mode === 'per_time' && (
                            <option value="per_time">Per Hour &amp; Per Day (legacy)</option>
                          )}
                        </select>
                      </div>

                      {/* Price Value (Hour) — hidden when the boat is priced Per Day only */}
                      {formData.price_mode !== 'per_day' && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {formData.price_mode === 'per_person' ? 'Price per Person (EGP)' :
                              formData.price_mode === 'per_person_per_time' ? 'Price per Person/Hour (EGP)' :
                                'Price per Hour (EGP)'}
                            {formData.price_mode === 'per_time' && (
                              <span className="text-gray-400 font-normal text-xs ml-1">(Optional if day price set)</span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={formData.price_per_hour || ''}
                            onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value ? Number(e.target.value) : null })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            min="0"
                            placeholder="e.g. 500"
                          />
                        </div>
                      )}

                      {/* Price Value (Day) — hidden when the boat is priced Per Hour only */}
                      {formData.price_mode !== 'per_hour' && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Price per Day (EGP)
                            {formData.price_mode === 'per_time' && (
                              <span className="text-gray-400 font-normal text-xs ml-1">(Optional if hour price set)</span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={formData.price_per_day || ''}
                            onChange={(e) => setFormData({ ...formData, price_per_day: e.target.value ? Number(e.target.value) : null })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            min="0"
                            placeholder="e.g. 5000"
                          />
                        </div>
                      )}

                      {/* Location (Cities) */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Location *</label>
                        <div className="flex flex-wrap gap-2">
                          {cities.map((city) => (
                            <button
                              key={city.id}
                              type="button"
                              onClick={() => {
                                const newCities = formData.cities.includes(city.id)
                                  ? formData.cities.filter((id) => id !== city.id)
                                  : [...formData.cities, city.id];

                                // Auto-deselect trips that don't belong to the selected cities anymore
                                const newSelectedTrips = formData.trips.filter(tripId => {
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  const trip = trips.find((t: any) => t.id === tripId);
                                  return trip && newCities.includes(trip.city_id);
                                });
                                // Drop custom prices for trips that just got auto-deselected
                                const newTripPrices: Record<number, number | null> = {};
                                newSelectedTrips.forEach(id => {
                                  if (id in formData.trip_prices) newTripPrices[id] = formData.trip_prices[id];
                                });

                                setFormData({ ...formData, cities: newCities, trips: newSelectedTrips, trip_prices: newTripPrices });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${formData.cities.includes(city.id) ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                            >
                              <FiMapPin className="inline mr-1" size={12} />{city.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Meet Location URL */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Meet Location URL (Google Maps)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.location_url}
                            onChange={(e) => setFormData({ ...formData, location_url: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            placeholder="https://maps.google.com/..."
                          />
                          <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Paste the Google Maps link to the meeting point.</p>
                      </div>

                      {/* Boat Address */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Boat Address</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            placeholder="Enter boat address..."
                          />
                          <FiMap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Physical address of the boat location.</p>
                      </div>

                      {/* Guest Capacity */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Guest Capacity *</label>
                        <input
                          type="number"
                          value={formData.max_seats}
                          onChange={(e) => setFormData({ ...formData, max_seats: Number(e.target.value) })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                          min="1"
                        />
                      </div>


                      {/* Max Stay Capacity */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Max Stay Capacity</label>
                        <input
                          type="number"
                          value={formData.max_seats_stay}
                          onChange={(e) => setFormData({ ...formData, max_seats_stay: Number(e.target.value) })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                          min="1"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mt-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
                        rows={4}
                        placeholder="Describe your boat in detail. Include amenities, features, and what makes it special..."
                      />
                      <p className="text-right text-xs text-gray-400 mt-1">{formData.description.length} / 500 characters</p>
                    </div>

                    {/* Danger Zone - Only show when editing */}
                    {editingBoat && (
                      <div className="mt-8 pt-8 border-t border-gray-100">
                        <h3 className="text-sm font-bold text-red-600 mb-2">Danger Zone</h3>
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Delete this boat</p>
                            <p className="text-xs text-red-500">This action cannot be undone.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ isOpen: true, boatId: editingBoat.id })}
                            className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors shadow-sm flex items-center gap-2"
                          >
                            <FiTrash2 size={16} />
                            Delete Boat
                          </button>
                        </div>
                      </div>
                    )}



                  </div>
                </div>
              )}

              {activeTab === 'sell' && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <FiDollarSign size={20} className="text-gray-900" />
                    <h3 className="text-lg font-bold text-gray-900">Sell This Boat</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">Set a sale price to list this boat in the Buy/Sell marketplace. Leave empty if the boat is not for sale.</p>

                  <div className="max-w-md">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sale Price (EGP)
                      <span className="text-gray-400 font-normal text-xs ml-1">(Optional — shows in Buy/Sell)</span>
                    </label>
                    <input
                      type="number"
                      value={formData.sale_price || ''}
                      onChange={(e) => setFormData({ ...formData, sale_price: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      min="0"
                      placeholder="e.g. 500000"
                    />
                    {formData.sale_price ? (
                      <p className="text-xs text-emerald-600 mt-2">This boat will appear in the Buy/Sell marketplace at EGP {formData.sale_price}.</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">Not listed for sale.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'trips' && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <FiMap size={20} className="text-gray-900" />
                    <h3 className="text-lg font-bold text-gray-900">Available Trips</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">Select trips available for this boat. Only trips from the selected cities are shown.</p>

                  <div className="space-y-4">
                    {/* Selected Trips First, then others */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {trips
                        .filter(trip => formData.cities.includes(trip.city_id)) // Filter by city
                        .sort((a, b) => { // Sort selected first
                          const isASelected = formData.trips.includes(a.id);
                          const isBSelected = formData.trips.includes(b.id);
                          if (isASelected && !isBSelected) return -1;
                          if (!isASelected && isBSelected) return 1;
                          return 0;
                        })
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .map((trip: any) => { // Assuming trip has image now?
                          const isSelected = formData.trips.includes(trip.id);
                          // Find full trip data to get image if available, else placeholder
                          const customPrice = formData.trip_prices[trip.id];
                          return (
                            <div
                              key={trip.id}
                              className={`rounded-xl border-2 p-3 transition-all flex gap-4 items-center group relative overflow-hidden ${isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300 cursor-pointer'}`}
                              onClick={() => {
                                // Toggle on the card itself only when NOT yet selected.
                                // Once selected, the user clicks the price input or the
                                // checkmark to deselect, so accidental clicks on the card
                                // body don't blow away their custom price.
                                if (!isSelected) {
                                  setFormData(prev => ({ ...prev, trips: [...prev.trips, trip.id] }));
                                }
                              }}
                            >
                              {/* Checkmark when selected (also acts as deselect button) */}
                              {isSelected && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFormData(prev => {
                                      const nextPrices = { ...prev.trip_prices };
                                      delete nextPrices[trip.id];
                                      return {
                                        ...prev,
                                        trips: prev.trips.filter(id => id !== trip.id),
                                        trip_prices: nextPrices,
                                      };
                                    });
                                  }}
                                  className="absolute top-2 right-2 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center text-white z-10 hover:bg-red-600 transition-colors"
                                  title="Remove this trip"
                                >
                                  <FiCheck size={14} />
                                </button>
                              )}

                              {/* Image container */}
                              <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden relative">
                                {trip.images && trip.images.length > 0 ? (
                                  <Image src={trip.images[0]} alt={trip.name} fill className="object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <FiImage size={24} />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className={`font-bold text-sm mb-1 truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{trip.name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                  <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px]">{trip.trip_type}</span>
                                  <span>•</span>
                                  <span>{trip.voyage_hours}h</span>
                                  <span>•</span>
                                  <span className="font-semibold text-gray-900">Default {trip.total_price.toLocaleString()} EGP</span>
                                </div>
                                {/* Per-boat custom price input — only meaningful when the
                                    boat's Pricing Model is "Per Trip (flat fee)". For other
                                    pricing modes (per_time / per_person / per_person_per_time)
                                    we leave the field hidden because the override has no
                                    effect on the booking math. */}
                                {isSelected && formData.price_mode === 'per_trip' && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-2 mt-1"
                                  >
                                    <label className="text-[11px] font-medium text-gray-600 whitespace-nowrap">
                                      Your price (EGP)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={customPrice ?? ''}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        const parsed = raw === '' ? null : Number(raw);
                                        const value = parsed !== null && Number.isFinite(parsed) ? parsed : null;
                                        setFormData(prev => ({
                                          ...prev,
                                          trip_prices: { ...prev.trip_prices, [trip.id]: value },
                                        }));
                                      }}
                                      placeholder={trip.total_price.toLocaleString()}
                                      className="w-28 px-2 py-1 text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none"
                                    />
                                    <span className="text-[10px] text-gray-400">
                                      {customPrice == null ? 'Using default' : 'Override'}
                                    </span>
                                  </div>
                                )}
                                {isSelected && formData.price_mode !== 'per_trip' && (
                                  <p className="text-[10px] text-gray-400 italic mt-1">
                                    Switch Pricing Model to &quot;Per Trip&quot; to set a custom price for this trip.
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}

                      {trips.filter(trip => formData.cities.includes(trip.city_id)).length === 0 && (
                        <div className="col-span-full py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <p className="text-gray-500 text-sm">No trips available for the selected cities.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'services' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <FiHelpCircle size={20} className="text-gray-900" />
                      <h3 className="text-lg font-bold text-gray-900">Boat Services</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewServiceForm(true)}
                      className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      + Add Service
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">Create and manage services for this boat. Toggle badges to show on the boat card.</p>

                  {/* Show Guests Badge Toggle */}
                  <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.show_guests_badge}
                        onChange={(e) => setFormData(prev => ({ ...prev, show_guests_badge: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Show &quot;Max Guests&quot; badge on boat card</span>
                        <p className="text-xs text-gray-400">Displays &quot;{formData.max_seats} Guests&quot; as a badge alongside service badges</p>
                      </div>
                    </label>
                  </div>

                  {/* Inline Add New Service Form */}
                  {showNewServiceForm && (
                    <div className="mb-6 rounded-xl border-2 border-blue-200 bg-blue-50/30 p-5">
                      <h4 className="font-bold text-sm text-gray-900 mb-4">New Service</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Service Name *</label>
                          <input
                            type="text"
                            value={newServiceData.name}
                            onChange={(e) => setNewServiceData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            placeholder="e.g. Fishing Equipment"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Pricing Model *</label>
                          <select
                            value={newServiceData.price_mode}
                            onChange={(e) => setNewServiceData(prev => ({ ...prev, price_mode: e.target.value as 'per_trip' | 'per_person' | 'per_person_per_time' }))}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          >
                            <option value="per_trip">Per Trip (flat fee)</option>
                            <option value="per_person">Per Person</option>
                            <option value="per_person_per_time">Per Person / Hour</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Price (EGP)</label>
                          <input
                            type="number"
                            value={newServiceData.price ?? ''}
                            onChange={(e) => setNewServiceData(prev => ({ ...prev, price: e.target.value ? Number(e.target.value) : null }))}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            placeholder="e.g. 200"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Icon (optional)</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setNewServiceData(prev => ({ ...prev, icon: e.target.files?.[0] || null }))}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                        <textarea
                          value={newServiceData.description}
                          onChange={(e) => setNewServiceData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                          rows={2}
                          placeholder="Describe what this service includes..."
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={creatingService || !newServiceData.name}
                          onClick={handleCreateInlineService}
                          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                          {creatingService ? 'Creating...' : 'Create & Add'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowNewServiceForm(false); resetNewServiceData(); }}
                          className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {formData.services.length === 0 && !showNewServiceForm ? (
                    <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <FiHelpCircle size={24} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500 text-sm">No services added yet. Click &quot;Add Service&quot; to create one.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.services.map((assignment, idx) => {
                        const svc = assignment.service;
                        const isEditing = svc && editingServiceId === svc.id;
                        return (
                          <div key={assignment.service_id || `new-${idx}`} className={`rounded-xl border-2 ${isEditing ? 'border-blue-400 bg-blue-50/20' : 'border-gray-900 bg-gray-50'} p-4 transition-all`}>
                            {isEditing ? (
                              /* ── Inline Edit Mode ── */
                              <div>
                                <h4 className="font-bold text-sm text-blue-700 mb-3 flex items-center gap-1.5">
                                  <FiEdit2 size={13} /> Editing Service
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Service Name *</label>
                                    <input
                                      type="text"
                                      value={editServiceData.name}
                                      onChange={(e) => setEditServiceData(prev => ({ ...prev, name: e.target.value }))}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Pricing Model *</label>
                                    <select
                                      value={editServiceData.price_mode}
                                      onChange={(e) => setEditServiceData(prev => ({ ...prev, price_mode: e.target.value as 'per_trip' | 'per_person' | 'per_person_per_time' }))}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    >
                                      <option value="per_trip">Per Trip (flat fee)</option>
                                      <option value="per_person">Per Person</option>
                                      <option value="per_person_per_time">Per Person / Hour</option>
                                    </select>
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                                    <textarea
                                      value={editServiceData.description}
                                      onChange={(e) => setEditServiceData(prev => ({ ...prev, description: e.target.value }))}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                                      rows={2}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Replace Icon (optional)</label>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => setEditServiceData(prev => ({ ...prev, icon: e.target.files?.[0] || null }))}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    disabled={savingService || !editServiceData.name}
                                    onClick={handleSaveServiceEdit}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                  >
                                    {savingService ? 'Saving...' : 'Save Changes'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditingService}
                                    className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* ── View Mode ── */
                              <>
                                <div className="flex items-start gap-4">
                                  {/* Service Icon */}
                                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                                    {svc?.icon_url ? (
                                      <Image src={svc.icon_url} alt={svc.name} fill className="object-cover" />
                                    ) : (
                                      <FiHelpCircle size={20} className="text-gray-400" />
                                    )}
                                  </div>

                                  {/* Service Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="font-bold text-sm text-gray-900">{svc?.name || 'Service'}</h4>
                                      <div className="flex items-center gap-2">
                                        {svc && (
                                          <button
                                            type="button"
                                            onClick={() => startEditingService(svc)}
                                            className="px-3 py-1 rounded-lg text-xs font-medium border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition-all"
                                          >
                                            <FiEdit2 className="inline mr-1" size={12} />Edit
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFormData(prev => ({
                                              ...prev,
                                              services: prev.services.filter((_, i) => i !== idx)
                                            }));
                                          }}
                                          className="px-3 py-1 rounded-lg text-xs font-medium border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-all"
                                        >
                                          <FiTrash2 className="inline mr-1" size={12} />Remove
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-1">{svc?.description || assignment.badge_display_name || 'No description'}</p>
                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                                      {svc?.price_mode === 'per_trip' ? 'Per Trip' : svc?.price_mode === 'per_person' ? 'Per Person' : 'Per Person/Hour'}
                                    </span>
                                  </div>
                                </div>

                                {/* Assignment Controls */}
                                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  {/* Price */}
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Price (EGP)</label>
                                    <input
                                      type="number"
                                      value={assignment.price ?? ''}
                                      onChange={(e) => {
                                        setFormData(prev => ({
                                          ...prev,
                                          services: prev.services.map((s, i) =>
                                            i === idx ? { ...s, price: e.target.value ? Number(e.target.value) : null } : s
                                          )
                                        }));
                                      }}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                      placeholder="0"
                                      min="0"
                                    />
                                  </div>

                                  {/* Badge Display Name */}
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Badge Label</label>
                                    <input
                                      type="text"
                                      value={assignment.badge_display_name ?? ''}
                                      onChange={(e) => {
                                        setFormData(prev => ({
                                          ...prev,
                                          services: prev.services.map((s, i) =>
                                            i === idx ? { ...s, badge_display_name: e.target.value || null } : s
                                          )
                                        }));
                                      }}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                      placeholder={svc?.name || 'Label'}
                                    />
                                  </div>

                                  {/* Show as Badge */}
                                  <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={assignment.is_badge}
                                        onChange={(e) => {
                                          setFormData(prev => ({
                                            ...prev,
                                            services: prev.services.map((s, i) =>
                                              i === idx ? { ...s, is_badge: e.target.checked } : s
                                            )
                                          }));
                                        }}
                                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                                      />
                                      <span className="text-xs font-semibold text-gray-700">Show as Badge on Card</span>
                                    </label>
                                  </div>

                                  {/* Per-Person All Required (only for per_person/per_person_per_time services) */}
                                  {(svc?.price_mode === 'per_person' || svc?.price_mode === 'per_person_per_time') && (
                                    <div className="sm:col-span-3 flex items-center pt-2">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={assignment.per_person_all_required !== false}
                                          onChange={(e) => {
                                            setFormData(prev => ({
                                              ...prev,
                                              services: prev.services.map((s, i) =>
                                                i === idx ? { ...s, per_person_all_required: e.target.checked } : s
                                              )
                                            }));
                                          }}
                                          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                                        />
                                        <div>
                                          <span className="text-xs font-semibold text-gray-700">Apply to all guests (mandatory)</span>
                                          <p className="text-[10px] text-gray-400">
                                            {assignment.per_person_all_required !== false
                                              ? 'All guests will be charged for this service'
                                              : 'Customer can choose how many persons want this service'}
                                          </p>
                                        </div>
                                      </label>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'facilities' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <FiCheck size={20} className="text-gray-900" />
                      <h3 className="text-lg font-bold text-gray-900">Boat Facilities</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewFacilityForm(true)}
                      className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      + Add Facility
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">Manage facilities available on this boat.</p>

                  {showNewFacilityForm && (
                    <div className="mb-6 rounded-xl border-2 border-green-200 bg-green-50/30 p-5">
                      <h4 className="font-bold text-sm text-gray-900 mb-4">New Facility</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Facility Name *</label>
                          <input
                            type="text"
                            value={newFacilityData.name}
                            onChange={(e) => setNewFacilityData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                            placeholder="e.g. WiFi, Air Conditioning"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Facility Icon</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setNewFacilityData(prev => ({ ...prev, icon: e.target.files![0] }));
                              }
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                        <textarea
                          value={newFacilityData.description}
                          onChange={(e) => setNewFacilityData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none"
                          rows={2}
                          placeholder="Describe this facility..."
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={creatingFacility || !newFacilityData.name}
                          onClick={handleCreateInlineFacility}
                          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                          {creatingFacility ? 'Creating...' : 'Create & Add'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowNewFacilityForm(false); resetNewFacilityData(); }}
                          className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {formData.facilities.length === 0 && !showNewFacilityForm ? (
                    <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <FiCheck size={24} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500 text-sm">No facilities added yet. Click &quot;Add Facility&quot; to create one.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.facilities.map((fac, idx) => {
                        const isEditing = editingFacilityId === fac.id;
                        return (
                          <div key={fac.id || `new-fac-${idx}`} className={`rounded-xl border-2 ${isEditing ? 'border-green-400 bg-green-50/20' : 'border-gray-900 bg-gray-50'} p-4 transition-all`}>
                            {isEditing ? (
                              <div>
                                <h4 className="font-bold text-sm text-green-700 mb-3 flex items-center gap-1.5">
                                  <FiEdit2 size={13} /> Editing Facility
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Facility Name *</label>
                                    <input
                                      type="text"
                                      value={editFacilityData.name}
                                      onChange={(e) => setEditFacilityData(prev => ({ ...prev, name: e.target.value }))}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Facility Icon (Optional)</label>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          setEditFacilityData(prev => ({ ...prev, icon: e.target.files![0] }));
                                        }
                                      }}
                                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                                    <textarea
                                      value={editFacilityData.description}
                                      onChange={(e) => setEditFacilityData(prev => ({ ...prev, description: e.target.value }))}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none"
                                      rows={2}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    disabled={savingFacility || !editFacilityData.name}
                                    onClick={handleSaveFacilityEdit}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    {savingFacility ? 'Saving...' : 'Save Changes'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditingFacility}
                                    className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                                  {fac.image_url ? (
                                    <Image src={fac.image_url} alt={fac.name} fill className="object-cover" />
                                  ) : (
                                    <FiCheck size={20} className="text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-bold text-sm text-gray-900">{fac.name}</h4>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => startEditingFacility(fac)}
                                        className="px-3 py-1 rounded-lg text-xs font-medium border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition-all"
                                      >
                                        <FiEdit2 className="inline mr-1" size={12} />Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFormData(prev => ({
                                            ...prev,
                                            facilities: prev.facilities.filter(f => f.id !== fac.id)
                                          }));
                                        }}
                                        className="px-3 py-1 rounded-lg text-xs font-medium border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-all"
                                      >
                                        <FiTrash2 className="inline mr-1" size={12} />Remove
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-500">{fac.description || 'No description'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'photos' && (
                // Photos Tab
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <FiImage size={20} className="text-gray-900" />
                    <h3 className="text-lg font-bold text-gray-900">Manage Photos for {formData.name || "Boat"}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">Upload high-quality photos of your boat. The primary photo will be shown in search results. You can upload up to 10 photos.</p>

                  {/* Upload Area */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group mb-8"
                  >
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4 group-hover:scale-110 transition-transform">
                      <FiUpload size={24} />
                    </div>
                    <h4 className="text-base font-semibold text-gray-900 mb-1">Drag and drop photos here, or <span className="text-blue-600">browse</span></h4>
                    <p className="text-xs text-gray-400">Supports: JPG, PNG, WebP (max 5MB per file)</p>
                    <button className="mt-4 px-6 py-2 bg-[#0F172A] text-white rounded-lg text-sm font-medium shadow-sm group-hover:shadow-md transition-all">
                      + Choose Photos
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                  </div>

                  {/* Photo Gallery */}
                  <div className="mb-8">
                    <p className="font-bold text-gray-900 mb-4 flex justify-between items-center">
                      Your Photos ({imagePreviews.length})
                      <span className="text-xs font-normal text-gray-500 flex items-center gap-1"><FiStar className="text-orange-400 fill-orange-400" /> = Primary photo</span>
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, i) => {
                        const isSelectedPrimary = (primaryExistingUrl && preview === primaryExistingUrl) || (!primaryExistingUrl && (i - (imagePreviews.length - newImages.length)) === primaryNewImageIndex);

                        return (
                          <div key={i} className={`relative aspect-[4/3] rounded-xl overflow-hidden group border-2 ${isSelectedPrimary ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-100'}`}>
                            <Image src={preview} alt="Preview" fill className="object-cover" />
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                                className="p-1.5 bg-white/90 text-red-500 rounded-lg hover:bg-red-50"
                                title="Remove photo"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>

                            <div className="absolute bottom-2 left-2 right-2">
                              {isSelectedPrimary ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-400 text-white text-[10px] font-bold rounded shadow-sm">
                                  <FiStar size={10} fill="currentColor" /> Primary
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (preview.startsWith('data:')) {
                                      setPrimaryExistingUrl(null);
                                      const newImgIndex = i - (imagePreviews.length - newImages.length);
                                      setPrimaryNewImageIndex(newImgIndex);
                                    } else {
                                      setPrimaryExistingUrl(preview);
                                    }
                                  }}
                                  className="w-full py-1.5 bg-white/90 text-gray-900 text-xs font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                                >
                                  Set Primary
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* YouTube Videos Section */}
                  <div className="mt-8 border-t pt-8">
                    <div className="flex items-center gap-2 mb-4">
                      <FiPlay size={20} className="text-gray-900" />
                      <h3 className="text-lg font-bold text-gray-900">YouTube Videos</h3>
                    </div>
                    <div className="flex gap-2 mb-6">
                      <input
                        type="text"
                        placeholder="Paste YouTube video URL here"
                        id="new-video-url"
                        className="flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.currentTarget;
                            const url = input.value.trim();
                            if (url) {
                              setFormData(prev => ({
                                ...prev,
                                video_urls: [...prev.video_urls, url]
                              }));
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById('new-video-url') as HTMLInputElement;
                          const url = input.value.trim();
                          if (url) {
                            setFormData(prev => ({
                              ...prev,
                              video_urls: [...prev.video_urls, url]
                            }));
                            input.value = '';
                          }
                        }}
                        className="px-6 py-2 bg-[#0F172A] text-white rounded-xl text-sm font-medium"
                      >
                        Add Video
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.video_urls.map((url, i) => {
                        let videoId = "";
                        if (url.includes("youtu.be/")) {
                          videoId = url.split("youtu.be/")[1].split("?")[0];
                        } else if (url.includes("youtube.com/watch")) {
                          videoId = new URL(url).searchParams.get("v") || "";
                        }
                        const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

                        return (
                          <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                            <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                              {thumbnail ? (
                                <Image src={thumbnail} alt="Video thumbnail" fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <FiPlay size={20} />
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <FiPlay className="text-white text-sm" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 truncate">{url}</p>
                            </div>
                            <button
                              onClick={() => {
                                if (editingBoat && !url.startsWith('blob:') && !url.includes('data:')) {
                                  // If it's an existing video, we should probably track it for removal
                                  // But our current schema doesn't distinguish between new and old video_urls in state as clearly as images.
                                  // Assuming video_urls in state contains ALL videos.
                                  setFormData(prev => {
                                    const newVideos = prev.video_urls.filter((_, idx) => idx !== i);
                                    return {
                                      ...prev,
                                      video_urls: newVideos,
                                      removed_videos: [...prev.removed_videos, url]
                                    };
                                  });
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    video_urls: prev.video_urls.filter((_, idx) => idx !== i)
                                  }));
                                }
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-6 border-t bg-gray-50/50">
              <div>
                {/* Progress/Step info passed if needed */}
              </div>
              <div className="flex gap-3">
                <button onClick={handleCloseModal} className="px-6 py-2.5 text-gray-700 font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 bg-[#1E293B] text-white font-medium rounded-xl hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-gray-200">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )
      }

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Delete Boat"
        message="Are you sure you want to delete this boat?"
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete({ isOpen: false, boatId: null })}
        isLoading={deleting}
      />
    </div >
  );
}
