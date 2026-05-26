// ===== DAFFA API SERVICE =====
// Comprehensive API integration for Daffa boat rental platform
// Base URL: https://yasershaban.pythonanywhere.com

// ===== BASE CONFIGURATION =====
// Updated to the new Heroku backend
// API base URL — read from NEXT_PUBLIC_API_URL at build time so dev can
// point to localhost via a .env.local file without editing source.
// Falls back to the production Heroku URL when the env var is unset.
// (NEXT_PUBLIC_API_URL is inlined client-side by Next.js, so this works
// in both server and browser contexts.)
const DEFAULT_API_URL = 'https://marakbi-e0870d98592a.herokuapp.com';
// const DEFAULT_API_URL = 'http://127.0.0.1:8787';

export const BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  DEFAULT_API_URL;


// Toggle for verbose API logging in the console
const ENABLE_API_LOGS = false;

// ===== TYPE DEFINITIONS =====

// Base API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

// Authentication Types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: number;
  username: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email?: string;
  role?: string;
}

// Boat Service Types
export interface BoatServiceDef {
  id: number;
  name: string;
  description: string | null;
  default_price: number | null;
  price_mode: 'per_trip' | 'per_person' | 'per_person_per_time';
  icon_url: string | null;
  created_at: string;
}

export interface BoatServiceAssignment {
  service_id: number;
  service: BoatServiceDef | null;
  price: number | null;
  is_badge: boolean;
  badge_display_name: string | null;
  per_person_all_required?: boolean;
}

// Boat Facility Types
export interface BoatFacilityDef {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

// Boat Types
export interface Boat {
  id: number;
  name: string;
  description: string;
  categories: string[];
  activities?: string[];
  cities?: string[];
  images: string[];
  price_per_hour: number;
  price_per_day?: number;
  max_seats: number;
  max_seats_stay: number;
  location_url?: string;
  address?: string;
  price_mode?: string;
  total_reviews: number;
  average_rating?: number;
  user_id: number;
  owner_username?: string; created_at: string;
  services?: BoatServiceAssignment[];
  badge_services?: BoatServiceAssignment[];
  show_guests_badge?: boolean;
  sale_price?: number | null;
  facilities?: BoatFacilityDef[];
  trips?: Array<{
    id: number;
    city_id: number;
    city_name: string;
    name: string;
    description: string;
    trip_type: string;
    voyage_hours: number;
    total_price: number;
  }>;
  media?: Array<{
    url: string;
    type: 'image' | 'video';
    is_primary: boolean;
    thumbnail_url: string;
  }>;
  // Children pricing
  children_allowed?: boolean;
  child_price?: number | null;
  min_child_age?: number;
  max_child_age?: number;
}

// ... (omitted unrelated parts)

// Admin Types
export interface AddBoatData {
  name: string;
  price_per_hour: number | null;
  price_per_day?: number | null;
  max_seats?: number;
  max_seats_stay?: number;
  description: string;
  location_url?: string;
  address?: string;
  price_mode?: string;
  show_guests_badge?: boolean;
  categories: number[];
  cities: number[];
  activities?: number[];
  trips?: number[];
  // Per-trip custom price overrides (parallel to `trips`, same index).
  // Use null/undefined at an index to mean "use the trip's default total_price".
  trip_prices?: (number | null)[];
  boat_images?: File[];
  video_urls?: string[];
  primary_new_image_index?: number;
  services?: BoatServiceAssignment[];
  facilities?: number[];
  // Children pricing
  children_allowed?: boolean;
  child_price?: number | null;
  min_child_age?: number;
  max_child_age?: number;
}

export interface EditBoatData {
  name?: string;
  price_per_hour?: number | null;
  price_per_day?: number | null;
  max_seats?: number;
  max_seats_stay?: number;
  description?: string;
  location_url?: string;
  address?: string;
  price_mode?: string;
  show_guests_badge?: boolean;
  categories?: number[];
  cities?: number[];
  activities?: number[];
  trips?: number[];
  // Per-trip custom price overrides (parallel to `trips`, same index).
  // Use null/undefined at an index to mean "use the trip's default total_price".
  trip_prices?: (number | null)[];
  boat_images?: File[];
  video_urls?: string[];
  removed_images?: string[];
  removed_videos?: string[];
  primary_image_url?: string;
  primary_new_image_index?: number;
  services?: BoatServiceAssignment[];
  facilities?: number[];
  // Children pricing
  children_allowed?: boolean;
  child_price?: number | null;
  min_child_age?: number;
  max_child_age?: number;
}


export interface BoatOwner {
  username: string;
  bio: string;
  phone: string;
  address: string;
  avatar_url: string | null;
  member_since: string;
}

export interface BoatReview {
  id: number;
  boat_id: number;
  user_id: number;
  username: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface BoatDetails {
  boat: Boat;
  owner: BoatOwner;
  reviews: BoatReview[];
  service_fee_rate: number; // Service fee rate from backend
  user_review?: BoatReview | null; // The current user's review if they have one
  reviews_summary: {
    average_rating: number;
    total_reviews: number;
    star_breakdown: {
      '1_stars': number;
      '2_stars': number;
      '3_stars': number;
      '4_stars': number;
      '5_stars': number;
    };
  };
  reviews_pagination: {
    page: number;
    pages: number;
    per_page: number;
    total: number;
  };
}

// City Types
export interface City {
  id: number;
  name: string;
}

// Trip Types
export interface Trip {
  id: number;
  name: string;
  description: string;
  city_id: number;
  city_name: string;
  total_price: number;
  trip_type: string;
  voyage_hours: number;
  images: string[];
  guests_on_board: number | null;
  pax: number | null;
  rooms_available: number | null;
  created_at: string;
}

export interface TripBooking {
  boat_id: number;
  start_date: string;
  guest_count: number;
  payment_method: 'card' | 'cash';
  platform: 'web' | 'mobile';
}

export interface BookingResponse {
  booking: {
    id: number;
    user_id: number;
    username: string;
    boat_id: number;
    boat_name: string;
    trip_id: number;
    trip_name: string;
    voyage_id: number | null;
    booking_type: string;
    start_date: string;
    end_date: string;
    guest_count: number;
    price_per_hour: number;
    status: string;
    created_at: string;
  };
  trip: Trip;
  total_price: number;
  duration_hours: number;
  message: string;
}

export interface TripBookingRequest {
  boat_id: number;
  start_date: string;
  guest_count: number;
  payment_method: 'card' | 'cash';
  platform: 'web' | 'mobile';
  trip_id: number;
  // Contact info
  booking_for?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_phone?: string;
  booking_notes?: string;
  children_count?: number;
}

export interface TripBookingResponse {
  message: string;
  booking: {
    id: number;
    user_id: number;
    username: string;
    boat_id: number;
    boat_name: string;
    trip_id: number;
    trip_name: string;
    voyage_id: number | null;
    booking_type: string;
    start_date: string;
    end_date: string;
    guest_count: number;
    price_per_hour: number;
    status: string;
    created_at: string;
  };
  trip: Trip;
  total_price: number;
  duration_hours: number;
  payment_method: string;
  payment_status: string;
  payment?: {
    payment_url: string;
    invoice_id: unknown;
    invoice_key: unknown;
  };
}

// Home Data Types
export interface HomeData {
  new_joiners: Boat[];
  fishing_trips: Trip[];
  water_games: Trip[];
  nile_cruises: Trip[];
  occasions: Trip[];
  trending_voyages: Trip[];
  upcoming_shares: SharingVoyage[];
  summary: {
    total_new_joiners: number;
    total_fishing_trips: number;
    total_water_games: number;
    total_nile_cruises: number;
    total_occasions: number;
    total_trending_voyages: number;
    total_upcoming_shares: number;
  };
}

// Profile Types
export interface CustomerProfile {
  bio: string;
  phone: string;
  address: string;
}

export interface ProfileResponse {
  user_id: number;
  username: string;
  email: string;
  bio?: string;
  phone?: string;
  address?: string;
}

// Voyage Types
export interface SharingVoyage {
  id: number;
  boat_id: number;
  boat: Boat;
  start_date: string;
  end_date: string;
  max_seats: number;
  current_seats_taken: number;
  available_seats: number;
  price_per_hour: number;
  voyage_type: string;
  status: string;
  users_in_voyage: Array<{
    user_id: number;
    username: string;
    guest_count: number;
  }>;
  created_at: string;
}

export interface VoyageJoinData {
  guest_count: number;
  payment_method: 'card' | 'cash';
  platform: 'web' | 'mobile';
}

// Review Types
export interface ReviewData {
  rating: number;
  comment: string;
}

export interface ReviewResponse {
  message: string;
  review: BoatReview;
}

// Order Types
export interface Order {
  id: number;
  boat_id: number;
  user_id: number;
  booking_type: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  price_per_hour: number;
  price_per_day?: number;
  price_mode?: string;
  location_url?: string;
  // Contact info snapshot
  booking_for?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_phone?: string;
  booking_notes?: string;
  total_price: number;
  service_fee?: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status?: 'unpaid' | 'paid' | 'pending' | 'failed' | 'expired';
  payment_method?: 'card' | 'cash';
  trip_id: number | null;
  voyage_id: number | null;
  created_at: string;
  boat?: {
    id: number;
    name: string;
    description: string;
    max_seats: number;
    max_seats_stay: number;
    price_per_hour: number;
    price_per_day: number;
    total_reviews: number;
    created_at: string;
    images?: string[];
    cities?: string[];
    location_url?: string;
    price_mode?: string;
    average_rating?: number;
    owner?: {
      username: string;
      avatar_url: string | null;
      bio?: string | null;
      phone?: string | null;
      member_since?: string | null;
    };
  };
  trip?: {
    id: number;
    name: string;
    description: string;
    trip_type: string;
    voyage_hours: number;
    total_price: number;
    city_id: number;
    city_name: string;
    images: string[];
    pax?: number | null;
    guests_on_board?: number | null;
    rooms_available?: number | null;
  };
  voyage?: {
    id: number;
    voyage_type: string;
    status: string;
    max_seats: number;
    current_seats_taken: number;
    available_seats: number;
  };
  profile?: Record<string, unknown>;
  // Selected services snapshot
  selected_services?: Array<{
    service_id: number;
    name: string;
    description?: string | null;
    icon_url?: string | null;
    price: number;
    price_mode: string;
    calculated_price: number;
    person_count?: number | null;
  }>;
  services_total?: number;
  // Children
  children_count?: number;
  child_price_snapshot?: number | null;
}


export interface AddBoatResponse {
  message: string;
  boat: Boat;
}

export interface EditBoatResponse {
  message: string;
  boat: Boat;
}

export interface OrderData {
  boat_id: number;
  start_date: string;
  end_date: string;
  rental_type: 'daily' | 'hourly';
  guest_count: number;
  payment_method: 'card' | 'cash';
  platform: 'web' | 'mobile';
  voyage_type: 'Private' | 'Sharing' | 'Travel' | 'Stay' | 'Fishing' | 'Occasion' | 'Water_activities';
  selected_services?: { service_id: number; name: string; price: number; price_mode: string; calculated_price: number; person_count?: number }[];
}

export interface CreateOrderResponse {
  message: string;
  order_id: number;
  payment_data?: {
    invoice_id: number;
    invoice_key: string;
    payment_url: string;
  };
  payment_method: 'card' | 'cash';
  payment_status: 'unpaid' | 'paid' | 'pending' | 'failed' | 'expired';
  rental_type: 'daily' | 'hourly';
  total_price: number;
  voyage: {
    available_seats: number;
    boat_id: number;
    created_at: string;
    current_seats_taken: number;
    end_date: string;
    id: number;
    max_seats: number;
    price_per_hour: number;
    start_date: string;
    status: string;
    users_in_voyage: number[];
    voyage_type: string;
  };
  voyage_id: number;
}

// ===== TOKEN MANAGEMENT =====
export const storage = {
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  },

  setToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  },

  getRefreshToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  },

  setRefreshToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', token);
    }
  },

  setTokens: (tokens: { access_token: string; refresh_token: string }): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }
  },

  clearTokens: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      // Also expire the access_token cookie that the Next.js middleware
      // reads — without this, a stale cookie keeps the middleware thinking
      // we're authenticated, so it redirects /login back to / and the user
      // can't escape the home page after a 401.
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
  },

  getUser: (): AuthUser | null => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  setUser: (user: AuthUser): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  clearUser: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  },

  clearAll: (): void => {
    storage.clearTokens();
    storage.clearUser();
  }
};

// ===== HTTP CLIENT =====
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;

  // Add authorization header if token exists
  const token = storage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    if (ENABLE_API_LOGS) {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (ENABLE_API_LOGS) {
      console.log(`📡 API Response: ${response.status} ${response.statusText}`);
    }

    // Handle non-JSON responses (e.g. Flask's HTML 500 error page).
    // Don't spam DevTools with the entire HTML body — log one summary
    // line behind the API_LOGS flag and surface a status-aware message.
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (ENABLE_API_LOGS) {
        console.warn(`API ${response.status} non-JSON response from ${endpoint}`);
      }
      return {
        success: false,
        error:
          response.status >= 500
            ? 'Server error. Please try again later.'
            : `Unexpected response from server (HTTP ${response.status}).`,
      };
    }

    const data = await response.json();
    if (ENABLE_API_LOGS) {
      console.log('📦 API Data:', data);
    }

    if (!response.ok) {
      // Handle different error types
      if (response.status === 401) {
        // Token expired or invalid
        // Don't redirect if we're on login/signup pages
        const isAuthPage = typeof window !== 'undefined' &&
          (window.location.pathname === '/login' ||
            window.location.pathname === '/signup' ||
            endpoint.includes('/auth/login') ||
            endpoint.includes('/auth/register'));

        if (!isAuthPage) {
          storage.clearAll();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }

        // Extract error message from response
        const errorMessage = data?.message || data?.error || 'Invalid credentials. Please check your username and password.';

        return {
          success: false,
          error: errorMessage
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: 'You do not have permission to perform this action.'
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          error: 'The requested resource was not found.'
        };
      }

      if (response.status >= 500) {
        return {
          success: false,
          error: 'Server error. Please try again later.'
        };
      }

      return {
        success: false,
        error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
        fieldErrors: data.errors || undefined,
      };
    }

    // Handle successful responses
    if (data.status === 'success' && data.data) {
      return {
        success: true,
        data: data.data
      };
    }

    // Handle direct data responses
    if (data) {
      return {
        success: true,
        data: data
      };
    }

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('🚨 API Error:', error);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.'
    };
  }
}

// ===== AUTHENTICATION API =====
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> => {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  register: async (data: RegisterData): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  forgotPassword: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  resetPassword: async (token: string, password: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });
  },

  verifyCode: async (email: string, code: string): Promise<ApiResponse<{ message: string; reset_token?: string }>> => {
    return apiRequest<{ message: string; reset_token?: string }>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
  },

  resendCode: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }
};

// ===== CLIENT API (Public Endpoints) =====
export const clientApi = {
  getHomeData: async (): Promise<ApiResponse<HomeData>> => {
    return apiRequest<HomeData>('/client/home');
  },

  getHomeSection: async (section: string, page = 1, perPage = 15): Promise<ApiResponse<{ message: string; data: Record<string, unknown> }>> => {
    return apiRequest<{ message: string; data: Record<string, unknown> }>(`/client/home/${section}?page=${page}&per_page=${perPage}`);
  },

  getBoats: async (page = 1, perPage = 10): Promise<ApiResponse<{ boats: Boat[]; page: number; pages: number; per_page: number; total: number }>> => {
    return apiRequest<{ boats: Boat[]; page: number; pages: number; per_page: number; total: number }>(`/client/boats?page=${page}&per_page=${perPage}`);
  },

  getBoatById: async (id: number): Promise<ApiResponse<BoatDetails>> => {
    return apiRequest<BoatDetails>(`/client/boats/${id}`);
  },

  getBoatBookedSlots: async (boatId: number, date: string, endDate?: string): Promise<ApiResponse<{
    boat_id: number;
    query_start: string;
    query_end: string;
    booked_slots: {
      start: string;
      end: string;
      start_date: string;
      end_date: string;
      booking_type: string;
      is_full_day: boolean;
    }[];
    booked_dates: string[];
  }>> => {
    const url = endDate
      ? `/client/boats/${boatId}/booked-slots?date=${date}&end_date=${endDate}`
      : `/client/boats/${boatId}/booked-slots?date=${date}`;
    return apiRequest(url);
  },

  getBoatBookedDates: async (boatId: number, year: number, month: number): Promise<ApiResponse<{
    boat_id: number;
    year: number;
    month: number;
    booked_dates: Record<string, {
      has_hourly: boolean;
      has_full_day: boolean;
      bookings: { start: string; end: string; type: string }[];
    }>;
  }>> => {
    return apiRequest(`/client/boats/${boatId}/booked-dates?year=${year}&month=${month}`);
  },

  getBoatsByCategory: async (categoryId: number): Promise<ApiResponse<{ boats: Boat[]; page: number; pages: number; per_page: number; total: number }>> => {
    return apiRequest<{ boats: Boat[]; page: number; pages: number; per_page: number; total: number }>(`/client/boats/category/${categoryId}`);
  },

  getBoatsByCategoryAndCity: async (categoryId: number, cityId: number): Promise<ApiResponse<{ boats: Boat[]; page: number; pages: number; per_page: number; total: number }>> => {
    return apiRequest<{ boats: Boat[]; page: number; pages: number; per_page: number; total: number }>(`/client/boats/category/${categoryId}/city/${cityId}`);
  },

  getCities: async (): Promise<ApiResponse<{ cities: City[] }>> => {
    return apiRequest<{ cities: City[] }>('/client/cities');
  },

  getCategoriesByCity: async (cityId: number): Promise<ApiResponse<{ id: number; name: string; description: string }[]>> => {
    return apiRequest<{ id: number; name: string; description: string }[]>(`/client/boats/categories/${cityId}`);
  },

  getBoatTrips: async (boatId: number): Promise<ApiResponse<{ boat_id: number; boat_name: string; trips: Trip[] }>> => {
    return apiRequest<{ boat_id: number; boat_name: string; trips: Trip[] }>(`/client/boats/${boatId}/trips`);
  },

  getTripsByCity: async (cityId: number): Promise<ApiResponse<{ city: City; trips: Trip[] }>> => {
    return apiRequest<{ city: City; trips: Trip[] }>(`/client/trips/city/${cityId}`);
  },

  getAllTrips: async (cityId?: number): Promise<ApiResponse<Trip[]>> => {
    const query = cityId ? `?city_id=${cityId}` : '';
    return apiRequest<Trip[]>(`/client/trips${query}`);
  },



  getBoatRecommendations: async (boatId: number, type: 'same' | 'other', page = 1, perPage = 3): Promise<ApiResponse<{ boat_id: number; type: string; page: number; per_page: number; total: number; has_more: boolean; boats: Boat[] }>> => {
    return apiRequest<{ boat_id: number; type: string; page: number; per_page: number; total: number; has_more: boolean; boats: Boat[] }>(`/client/boats/${boatId}/recommendations?type=${type}&page=${page}&per_page=${perPage}`);
  },

  getBoatReviewsPaginated: async (boatId: number, page = 1, perPage = 5): Promise<ApiResponse<{ boat_id: number; total_reviews: number; average_rating: number; reviews: BoatReview[]; pagination: { total: number; page: number; per_page: number; pages: number } }>> => {
    return apiRequest(`/client/boats/${boatId}/reviews?page=${page}&per_page=${perPage}`);
  },

  deleteOwnBoatReview: async (boatId: number, reviewId: number): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/client/boats/${boatId}/reviews/${reviewId}`, {
      method: 'DELETE'
    });
  },

  createBoatReview: async (boatId: number, reviewData: ReviewData): Promise<ApiResponse<ReviewResponse>> => {
    return apiRequest<ReviewResponse>(`/client/boats/${boatId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  },

  updateBoatReview: async (boatId: number, reviewId: number, reviewData: ReviewData): Promise<ApiResponse<ReviewResponse>> => {
    return apiRequest<ReviewResponse>(`/client/boats/${boatId}/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(reviewData)
    });
  },

  bookTrip: async (tripId: number, bookingData: TripBookingRequest): Promise<ApiResponse<TripBookingResponse>> => {
    return apiRequest<TripBookingResponse>(`/client/trips/${tripId}/book`, {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  }
};

// ===== CUSTOMER API (Protected Endpoints) =====
export const customerApi = {
  getProfile: async (): Promise<ApiResponse<ProfileResponse>> => {
    return apiRequest<ProfileResponse>('/customer/profile');
  },

  createProfile: async (profileData: CustomerProfile): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>('/customer/profile', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
  },

  updateProfile: async (profileData: CustomerProfile): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>('/customer/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  getOrders: async (page = 1, perPage = 10, status: 'ongoing' | 'past' = 'ongoing'): Promise<ApiResponse<{ orders: Order[]; page: number; pages: number; per_page: number; total: number }>> => {
    return apiRequest<{ orders: Order[]; page: number; pages: number; per_page: number; total: number }>(`/customer/orders?page=${page}&per_page=${perPage}&status=${status}`);
  },

  createOrder: async (orderData: OrderData): Promise<ApiResponse<CreateOrderResponse>> => {
    return apiRequest<CreateOrderResponse>('/customer/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  createReview: async (reviewData: { client_id: number; review_text: string; rating: number }): Promise<ApiResponse<{ id: number; message: string }>> => {
    return apiRequest<{ id: number; message: string }>('/customer/review', {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  },

  getReviews: async (clientId: number): Promise<ApiResponse<{ id: number; review_text: string; rating: number; created_at: string }[]>> => {
    return apiRequest<{ id: number; review_text: string; rating: number; created_at: string }[]>(`/customer/review/${clientId}`);
  },

  getOrderById: async (orderId: number): Promise<ApiResponse<{ order: Order }>> => {
    return apiRequest<{ order: Order }>(`/customer/orders/${orderId}`);
  }
};

// ===== VOYAGES API (Protected Endpoints) =====
export const voyagesApi = {
  getSharingVoyages: async (): Promise<ApiResponse<{ sharing_voyages: SharingVoyage[]; page: number; pages: number; per_page: number; total: number }>> => {
    return apiRequest<{ sharing_voyages: SharingVoyage[]; page: number; pages: number; per_page: number; total: number }>('/voyages/sharing');
  },

  joinVoyage: async (voyageId: number, joinData: VoyageJoinData): Promise<ApiResponse<{ message: string; voyage_id: number; booking_id: number; voyage: SharingVoyage }>> => {
    return apiRequest<{ message: string; voyage_id: number; booking_id: number; voyage: SharingVoyage }>(`/voyages/${voyageId}/join`, {
      method: 'POST',
      body: JSON.stringify(joinData)
    });
  }
};

// ===== ADMIN API (Protected Admin Endpoints) =====

// Admin-specific Types
export interface AdminStats {
  total_revenue: number;
  monthly_revenue: number;
  total_boats: number;
  total_bookings: number;
  total_users: number;
  pending_orders: number;
  confirmed_orders: number;
  cancelled_orders: number;
  completed_orders: number;
  active_rentals: number;
  new_boats_this_month: number;
  new_users_this_month: number;
  new_bookings_this_month: number;
  // Fleet & Content Overview stats
  total_trips?: number;
  total_voyages?: number;
  total_categories?: number;
  total_cities?: number;
  total_reviews?: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name?: string | null;
  last_name?: string | null;
  created_at: string | null;
  boats_count: number;
  bookings_count: number;
  profile_picture: string | null;
  bio: string | null;
  phone: string | null;
}

export interface AdminUserDetails extends AdminUser {
  first_name?: string | null;
  last_name?: string | null;
  updated_at: string | null;
  profile: {
    bio: string | null;
    phone: string | null;
    address: string | null;
    profile_picture: string | null;
  };
  groups: { id: number; name: string }[];
  boats: { id: number; name: string }[];
}

export interface AdminOrder {
  id: number;
  user_id: number;
  boat_id: number;
  username: string;
  user_email: string | null;
  user_phone?: string;
  boat_name: string;
  boat_description?: string;
  boat_images: string[];
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  payment_status: string;
  payment_method: string;
  booking_type: string;
  guest_count: number;
  created_at: string;
  trip_name?: string;
  // Owner Details
  owner_username?: string;
  owner_email?: string;
  owner_details?: {
    username: string;
    email: string;
    phone: string | null;
    profile_picture: string | null;
  };
  // Extended Details
  trip_type?: string;
  voyage_type?: string;
  voyage_id?: number;
  voyage_seats_taken?: number;
  voyage_max_seats?: number;
  service_fee?: number;
  price_per_hour?: number;
  price_per_day?: number;
  price_mode?: string;
  location_url?: string;
  // Contact info snapshot
  booking_for?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_phone?: string;
  booking_notes?: string;
  owner_phone?: string;

  // Full Context Objects (for single order view)
  voyage_details?: {
    id: number;
    voyage_type: string;
    max_seats: number;
    current_seats_taken: number;
    available_seats: number;
    boat_id: number;
    start_date: string;
    end_date: string;
    price_per_hour: number;
    status: string;
  };
  trip_details?: {
    id: number;
    name: string;
    trip_type: string;
    voyage_hours: number;
    description: string;
    image?: string;
  };
  voyage_participants?: Array<{
    id: number;
    username: string;
    email: string | null;
    guest_count: number;
    voyage_id: number;
    status: string;
    payment_status: string;
  }>;  // Selected services snapshot
  selected_services?: Array<{
    service_id: number;
    name: string;
    description?: string | null;
    icon_url?: string | null;
    price: number;
    price_mode: string;
    calculated_price: number;
    person_count?: number | null;
  }>;
  services_total?: number;
  // Children
  children_count?: number;
  child_price_snapshot?: number | null;
}

export interface AdminBoat {
  id: number;
  name: string;
  price_per_hour: number;
  price_per_day: number | null;
  sale_price?: number | null;
  description: string;
  categories: string[];
  categories_id?: number[];
  cities: string[];
  cities_id?: number[];
  images: string[];
  trips?: AdminTrip[];
  max_seats: number;
  max_seats_stay: number;
  location_url?: string;
  address?: string;
  price_mode?: string;
  owner_username: string | null; created_at: string;
  services?: BoatServiceAssignment[];
  badge_services?: BoatServiceAssignment[];
  services_full?: BoatServiceAssignment[];
  show_guests_badge?: boolean;
  facilities?: BoatFacilityDef[];
  activities?: string[];
  activities_id?: number[];
  activities_full?: { id: number; name: string; image: string | null }[];
  // Children pricing
  children_allowed?: boolean;
  child_price?: number | null;
  min_child_age?: number;
  max_child_age?: number;
}

export interface AdminTrip {
  id: number;
  name: string;
  description: string;
  total_price: number;
  voyage_hours: number;
  trip_type: string;
  city_id: number;
  city_name: string;
  images: string[];
  pax: number | null;
  guests_on_board: number | null;
  rooms_available: number | null;
  created_at: string;
  // Present when the trip is returned in a boat-detail context (admin GET
  // /boats/:id and the public /boats/:id endpoints). NULL custom_price means
  // no override is set; effective_price is the resolved value to display.
  custom_price?: number | null;
  effective_price?: number;
}

export interface AdminVoyage {
  id: number;
  boat_id: number;
  boat_name: string | null;
  voyage_type: string;
  start_date: string;
  end_date: string;
  price_per_hour: number;
  status: string;
  max_seats: number;
  current_seats_taken: number;
  available_seats: number;
  created_at: string;
}

export interface AdminCategory {
  id: number;
  name: string;
  image: string | null;
  boats_count?: number;
}

export interface AdminActivity {
  id: number;
  name: string;
  image: string | null;
  boats_count?: number;
  created_at?: string;
}

export interface AdminGroup {
  id: number;
  name: string;
  description: string;
  users_count: number;
}

export interface AdminReview {
  id: number;
  user_id: number;
  boat_id: number;
  username: string;
  boat_name: string | null;
  rating: number;
  comment: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  per_page: number;
  pages: number;
  has_next?: boolean;
  has_prev?: boolean;
}

// Form data helper for multipart requests
async function adminFormRequest<T>(
  endpoint: string,
  formData: FormData,
  method: 'POST' | 'PUT' = 'POST'
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;
  const token = storage.getToken();

  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });

    // Same defensive non-JSON guard as apiRequest — without this a Flask
    // 500 HTML page would crash response.json() and bubble a cryptic
    // "Unexpected token '<'" SyntaxError into the UI.
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (ENABLE_API_LOGS) {
        console.warn(`adminFormRequest ${response.status} non-JSON response from ${endpoint}`);
      }
      return {
        success: false,
        error:
          response.status >= 500
            ? 'Server error. Please try again later.'
            : `Unexpected response from server (HTTP ${response.status}).`,
      };
    }

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || data.error || 'Request failed' };
    }

    return { success: true, data: data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred.' };
  }
}

export const adminApi = {
  // Authentication
  login: async (username: string, password: string): Promise<ApiResponse<{ access_token: string; refresh_token?: string; user: AuthUser }>> => {
    return apiRequest('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  },
  logout: async (): Promise<ApiResponse<{ message: string }>> => apiRequest('/admin/logout', { method: 'POST' }),

  // Dashboard Stats
  getStats: async (): Promise<ApiResponse<AdminStats>> => apiRequest<AdminStats>('/admin/stats'),

  // Orders
  getOrders: async (page = 1, perPage = 10, filters?: { status?: string; payment_status?: string; search?: string; user_id?: number; start_date?: string; end_date?: string }): Promise<ApiResponse<{ orders: AdminOrder[] } & PaginatedResponse<AdminOrder>>> => {
    const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
    if (filters?.status) params.append('status', filters.status);
    if (filters?.payment_status) params.append('payment_status', filters.payment_status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    return apiRequest(`/admin/orders?${params.toString()}`);
  },
  getOrder: async (orderId: number): Promise<ApiResponse<AdminOrder>> => apiRequest(`/admin/orders/${orderId}`),
  updateOrderStatus: async (orderId: number, data: { status?: string; payment_status?: string }): Promise<ApiResponse<AdminOrder>> => {
    return apiRequest(`/admin/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // Users
  getUsers: async (page = 1, perPage = 10, filters?: { search?: string; role?: string }): Promise<ApiResponse<{ users: AdminUser[] } & PaginatedResponse<AdminUser>>> => {
    const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
    if (filters?.search) params.append('search', filters.search);
    if (filters?.role) params.append('role', filters.role);
    return apiRequest(`/admin/users?${params.toString()}`);
  },
  getUser: async (userId: number): Promise<ApiResponse<AdminUserDetails>> => apiRequest(`/admin/users/${userId}`),
  createUser: async (userData: { username: string; email: string; password: string; role?: string; bio?: string; phone?: string; address?: string }): Promise<ApiResponse<{ message: string; user: AdminUser }>> => {
    return apiRequest('/admin/users', { method: 'POST', body: JSON.stringify(userData) });
  },
  updateUser: async (userId: number, userData: { username?: string; email?: string; password?: string; role?: string; bio?: string; phone?: string; address?: string }, profilePicture?: File): Promise<ApiResponse<{ message: string; user: AdminUser }>> => {
    // Upload profile picture to Cloudinary first if provided
    let profilePictureUrl: string | undefined;
    if (profilePicture) {
      const { uploadToCloudinary } = await import('./cloudinaryUpload');
      profilePictureUrl = await uploadToCloudinary(profilePicture, 'daffa/profiles');
    }

    const formData = new FormData();
    Object.entries(userData).forEach(([key, value]) => { if (value !== undefined) formData.append(key, value); });
    if (profilePictureUrl) formData.append('profile_picture_url', profilePictureUrl);
    return adminFormRequest(`/admin/users/${userId}`, formData, 'PUT');
  },
  deleteUser: async (userId: number): Promise<ApiResponse<{ message: string }>> => apiRequest(`/admin/users/${userId}`, { method: 'DELETE' }),
  getUserBoats: async (userId: number): Promise<ApiResponse<{ user_id: number; username: string; boats: AdminBoat[] }>> => apiRequest(`/admin/users/${userId}/boats`),

  // Boats
  getBoats: async (page = 1, perPage = 10, filters?: { search?: string; category_id?: number; city_id?: number; user_id?: number }): Promise<ApiResponse<{ boats: AdminBoat[] } & PaginatedResponse<AdminBoat>>> => {
    const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category_id) params.append('category_id', filters.category_id.toString());
    if (filters?.city_id) params.append('city_id', filters.city_id.toString());
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    return apiRequest(`/admin/boats?${params.toString()}`);
  },
  getBoat: async (boatId: number): Promise<ApiResponse<AdminBoat & { categories_full: { id: number; name: string }[]; trips: AdminTrip[]; owner: { id: number; username: string; email: string } | null }>> => {
    return apiRequest(`/admin/boats/${boatId}`);
  },
  createBoat: async (userId: number, boatData: AddBoatData): Promise<ApiResponse<{ message: string; boat: AdminBoat }>> => {
    // Upload images to Cloudinary first
    const imageUrls: string[] = [];
    if (boatData.boat_images && boatData.boat_images.length > 0) {
      const { uploadMultipleToCloudinary } = await import('./cloudinaryUpload');
      const urls = await uploadMultipleToCloudinary(boatData.boat_images, 'daffa/boats');
      imageUrls.push(...urls);
    }

    const formData = new FormData();
    formData.append('user_id', userId.toString());
    formData.append('name', boatData.name);
    if (boatData.price_per_hour !== undefined) formData.append('price_per_hour', boatData.price_per_hour === null ? 'null' : boatData.price_per_hour.toString());
    if (boatData.price_per_day !== undefined) formData.append('price_per_day', boatData.price_per_day === null ? 'null' : boatData.price_per_day.toString());
    if (boatData.max_seats) formData.append('max_seats', boatData.max_seats.toString());
    if (boatData.max_seats_stay) formData.append('max_seats_stay', boatData.max_seats_stay.toString());
    if (boatData.location_url) formData.append('location_url', boatData.location_url);
    if (boatData.address) formData.append('address', boatData.address);
    if (boatData.price_mode) formData.append('price_mode', boatData.price_mode);
    formData.append('description', boatData.description);
    boatData.categories.forEach(id => formData.append('categories', id.toString()));
    boatData.cities.forEach(id => formData.append('cities', id.toString()));
    if (boatData.trips) {
      boatData.trips.forEach((id, idx) => {
        formData.append('trips', id.toString());
        // Backend reads `trip_prices` as a parallel multipart array indexed
        // alongside `trips`. Empty string at an index means "no override".
        const price = boatData.trip_prices?.[idx];
        formData.append('trip_prices', price === null || price === undefined ? '' : price.toString());
      });
    }
    if (boatData.show_guests_badge !== undefined) formData.append('show_guests_badge', boatData.show_guests_badge.toString());

    if (boatData.services) {
      formData.append('services', JSON.stringify(boatData.services));
    }
    if (boatData.facilities) {
      formData.append('facilities', JSON.stringify(boatData.facilities));
    }
    if (boatData.activities) {
      formData.append('activities', JSON.stringify(boatData.activities));
    }
    // Children pricing fields
    if (boatData.children_allowed !== undefined) formData.append('children_allowed', boatData.children_allowed.toString());
    if (boatData.child_price !== undefined) formData.append('child_price', boatData.child_price === null ? 'null' : boatData.child_price.toString());
    if (boatData.min_child_age !== undefined) formData.append('min_child_age', boatData.min_child_age.toString());
    if (boatData.max_child_age !== undefined) formData.append('max_child_age', boatData.max_child_age.toString());

    if (boatData.primary_new_image_index !== undefined) {
      formData.append('primary_new_image_index', boatData.primary_new_image_index.toString());
    }

    // Send Cloudinary URLs instead of files
    imageUrls.forEach(url => formData.append('image_urls', url));
    if (boatData.video_urls) boatData.video_urls.forEach(url => formData.append('video_urls', url));
    return adminFormRequest('/admin/boats', formData);
  },
  updateBoat: async (boatId: number, boatData: EditBoatData): Promise<ApiResponse<{ message: string; boat: AdminBoat }>> => {
    // Upload new images to Cloudinary first
    const imageUrls: string[] = [];
    if (boatData.boat_images && boatData.boat_images.length > 0) {
      const { uploadMultipleToCloudinary } = await import('./cloudinaryUpload');
      const urls = await uploadMultipleToCloudinary(boatData.boat_images, 'daffa/boats');
      imageUrls.push(...urls);
    }

    const formData = new FormData();
    if (boatData.name) formData.append('name', boatData.name);
    if (boatData.price_per_hour !== undefined) formData.append('price_per_hour', boatData.price_per_hour === null ? 'null' : boatData.price_per_hour.toString());
    if (boatData.price_per_day !== undefined) formData.append('price_per_day', boatData.price_per_day === null ? 'null' : boatData.price_per_day.toString());
    if (boatData.max_seats) formData.append('max_seats', boatData.max_seats.toString());
    if (boatData.max_seats_stay) formData.append('max_seats_stay', boatData.max_seats_stay.toString());
    if (boatData.location_url !== undefined) formData.append('location_url', boatData.location_url || '');
    if (boatData.address !== undefined) formData.append('address', boatData.address || '');
    if (boatData.price_mode) formData.append('price_mode', boatData.price_mode);
    if (boatData.description) formData.append('description', boatData.description);
    if (boatData.categories) boatData.categories.forEach(id => formData.append('categories', id.toString()));
    if (boatData.cities) boatData.cities.forEach(id => formData.append('cities', id.toString()));
    if (boatData.trips) {
      boatData.trips.forEach((id, idx) => {
        formData.append('trips', id.toString());
        // Backend reads `trip_prices` as a parallel multipart array indexed
        // alongside `trips`. Empty string at an index means "no override".
        const price = boatData.trip_prices?.[idx];
        formData.append('trip_prices', price === null || price === undefined ? '' : price.toString());
      });
    }
    if (boatData.show_guests_badge !== undefined) formData.append('show_guests_badge', boatData.show_guests_badge.toString());

    if (boatData.services !== undefined) {
      formData.append('services', JSON.stringify(boatData.services));
    }
    if (boatData.facilities) {
      formData.append('facilities', JSON.stringify(boatData.facilities));
    }
    if (boatData.activities) {
      formData.append('activities', JSON.stringify(boatData.activities));
    }
    // Children pricing fields
    if (boatData.children_allowed !== undefined) formData.append('children_allowed', boatData.children_allowed.toString());
    if (boatData.child_price !== undefined) formData.append('child_price', boatData.child_price === null ? 'null' : boatData.child_price.toString());
    if (boatData.min_child_age !== undefined) formData.append('min_child_age', boatData.min_child_age.toString());
    if (boatData.max_child_age !== undefined) formData.append('max_child_age', boatData.max_child_age.toString());

    if (boatData.primary_image_url) formData.append('primary_image_url', boatData.primary_image_url);
    if (boatData.primary_new_image_index !== undefined) {
      formData.append('primary_new_image_index', boatData.primary_new_image_index.toString());
    }

    // Send Cloudinary URLs instead of files
    imageUrls.forEach(url => formData.append('image_urls', url));
    if (boatData.removed_images) boatData.removed_images.forEach(url => formData.append('removed_images', url));
    if (boatData.video_urls) boatData.video_urls.forEach(url => formData.append('video_urls', url));
    if (boatData.removed_videos) boatData.removed_videos.forEach(url => formData.append('removed_videos', url));
    return adminFormRequest(`/admin/boats/${boatId}`, formData, 'PUT');
  },
  deleteBoat: async (boatId: number): Promise<ApiResponse<{ message: string }>> => apiRequest(`/admin/boats/${boatId}`, { method: 'DELETE' }),
  deleteBoatImage: async (boatId: number, imageId: number): Promise<ApiResponse<{ message: string }>> => apiRequest(`/admin/boats/${boatId}/images/${imageId}`, { method: 'DELETE' }),

  // Categories
  getCategories: async (): Promise<ApiResponse<{ categories: AdminCategory[] }>> => apiRequest('/admin/categories'),
  createCategory: async (name: string, image?: File): Promise<ApiResponse<AdminCategory>> => {
    // Upload image to Cloudinary first if provided
    let imageUrl: string | undefined;
    if (image) {
      const { uploadToCloudinary } = await import('./cloudinaryUpload');
      imageUrl = await uploadToCloudinary(image, 'daffa/categories');
    }

    const formData = new FormData();
    formData.append('name', name);
    if (imageUrl) formData.append('image_url', imageUrl);
    return adminFormRequest('/admin/categories', formData);
  },
  updateCategory: async (categoryId: number, name?: string, image?: File): Promise<ApiResponse<AdminCategory>> => {
    // Upload image to Cloudinary first if provided
    let imageUrl: string | undefined;
    if (image) {
      const { uploadToCloudinary } = await import('./cloudinaryUpload');
      imageUrl = await uploadToCloudinary(image, 'daffa/categories');
    }

    const formData = new FormData();
    if (name) formData.append('name', name);
    if (imageUrl) formData.append('image_url', imageUrl);
    return adminFormRequest(`/admin/categories/${categoryId}`, formData, 'PUT');
  },
  deleteCategory: async (categoryId: number): Promise<ApiResponse<{ message: string }>> => apiRequest(`/admin/categories/${categoryId}`, { method: 'DELETE' }),

  // Activities
  getActivities: async (): Promise<ApiResponse<{ activities: AdminActivity[] }>> => apiRequest('/admin/activities'),
  createActivity: async (name: string, image?: File): Promise<ApiResponse<AdminActivity>> => {
    let imageUrl: string | undefined;
    if (image) {
      const { uploadToCloudinary } = await import('./cloudinaryUpload');
      imageUrl = await uploadToCloudinary(image, 'daffa/activities');
    }
    const formData = new FormData();
    formData.append('name', name);
    if (imageUrl) formData.append('image_url', imageUrl);
    return adminFormRequest('/admin/activities', formData);
  },
  updateActivity: async (activityId: number, name?: string, image?: File): Promise<ApiResponse<AdminActivity>> => {
    let imageUrl: string | undefined;
    if (image) {
      const { uploadToCloudinary } = await import('./cloudinaryUpload');
      imageUrl = await uploadToCloudinary(image, 'daffa/activities');
    }
    const formData = new FormData();
    if (name) formData.append('name', name);
    if (imageUrl) formData.append('image_url', imageUrl);
    return adminFormRequest(`/admin/activities/${activityId}`, formData, 'PUT');
  },
  deleteActivity: async (activityId: number): Promise<ApiResponse<{ message: string }>> => apiRequest(`/admin/activities/${activityId}`, { method: 'DELETE' }),

  // Cities
  getCities: async (): Promise<ApiResponse<{ cities: { id: number; name: string; created_at: string }[] }>> => apiRequest('/admin/cities'),
  createCity: async (name: string): Promise<ApiResponse<{ id: number; name: string }>> => apiRequest('/admin/cities', { method: 'POST', body: JSON.stringify({ name }) }),
  updateCity: async (cityId: number, name: string): Promise<ApiResponse<{ id: number; name: string }>> => apiRequest(`/admin/cities/${cityId}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteCity: async (cityId: number): Promise<ApiResponse<{ message: string }>> => apiRequest(`/admin/cities/${cityId}`, { method: 'DELETE' }),

  // Trips
  getTrips: async (page = 1, perPage = 10, filters?: { city_id?: number; trip_type?: string }): Promise<ApiResponse<{ trips: AdminTrip[] } & PaginatedResponse<AdminTrip>>> => {
    const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
    if (filters?.city_id) params.append('city_id', filters.city_id.toString());
    if (filters?.trip_type) params.append('trip_type', filters.trip_type);
    return apiRequest(`/admin/trips?${params.toString()}`);
  },
  getTrip: async (tripId: number): Promise<ApiResponse<AdminTrip & { boats: { id: number; name: string }[] }>> => apiRequest(`/admin/trips/${tripId}`),
  createTrip: async (tripData: { name: string; description?: string; total_price: number; voyage_hours: number; trip_type: string; city_id: number; pax?: number; guests_on_board?: number; rooms_available?: number; primary_image_url?: string; primary_new_image_index?: number }, images?: File[]): Promise<ApiResponse<AdminTrip>> => {
    // Upload images to Cloudinary first
    const imageUrls: string[] = [];
    if (images && images.length > 0) {
      const { uploadMultipleToCloudinary } = await import('./cloudinaryUpload');
      const urls = await uploadMultipleToCloudinary(images, 'daffa/trips');
      imageUrls.push(...urls);
    }

    const formData = new FormData();
    Object.entries(tripData).forEach(([key, value]) => { if (value !== undefined) formData.append(key, value.toString()); });
    // Send Cloudinary URLs instead of files
    imageUrls.forEach(url => formData.append('image_urls', url));
    return adminFormRequest('/admin/trips', formData);
  },
  updateTrip: async (tripId: number, tripData: { name?: string; description?: string; total_price?: number; voyage_hours?: number; trip_type?: string; city_id?: number; pax?: number; guests_on_board?: number; rooms_available?: number; primary_image_url?: string; primary_new_image_index?: number }, images?: File[], removedImages?: string[]): Promise<ApiResponse<AdminTrip>> => {
    // Upload images to Cloudinary first
    const imageUrls: string[] = [];
    if (images && images.length > 0) {
      const { uploadMultipleToCloudinary } = await import('./cloudinaryUpload');
      const urls = await uploadMultipleToCloudinary(images, 'daffa/trips');
      imageUrls.push(...urls);
    }

    const formData = new FormData();
    Object.entries(tripData).forEach(([key, value]) => { if (value !== undefined) formData.append(key, value.toString()); });
    // Send Cloudinary URLs instead of files
    imageUrls.forEach(url => formData.append('image_urls', url));
    if (removedImages) removedImages.forEach(url => formData.append('removed_images', url));
    return adminFormRequest(`/admin/trips/${tripId}`, formData, 'PUT');
  },
  deleteTrip: async (tripId: number): Promise<ApiResponse<{ message: string }>> => apiRequest(`/admin/trips/${tripId}`, { method: 'DELETE' }),

  // Voyages
  getVoyages: async (page = 1, perPage = 10, filters?: { status?: string; voyage_type?: string }): Promise<ApiResponse<{ voyages: AdminVoyage[] } & PaginatedResponse<AdminVoyage>>> => {
    const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
    if (filters?.status) params.append('status', filters.status);
    if (filters?.voyage_type) params.append('voyage_type', filters.voyage_type);
    return apiRequest(`/admin/voyages?${params.toString()}`);
  },
  createVoyage: async (voyageData: { boat_id: number; voyage_type: string; start_date: string; end_date: string; price_per_hour: number; status?: string }): Promise<ApiResponse<AdminVoyage>> => {
    return apiRequest('/admin/voyages', { method: 'POST', body: JSON.stringify(voyageData) });
  },
  updateVoyage: async (voyageId: number, voyageData: { status?: string; voyage_type?: string; price_per_hour?: number; start_date?: string; end_date?: string }): Promise<ApiResponse<AdminVoyage>> => {
    return apiRequest(`/admin/voyages/${voyageId}`, { method: 'PUT', body: JSON.stringify(voyageData) });
  },
  deleteVoyage: async (voyageId: number): Promise<ApiResponse<{ message: string }>> => apiRequest(`/admin/voyages/${voyageId}`, { method: 'DELETE' }),

  // Reviews
  getBoatReviews: async (page = 1, perPage = 10, filters?: { user_id?: number }): Promise<ApiResponse<{ reviews: AdminReview[] } & PaginatedResponse<AdminReview>>> => {
    let query = `page=${page}&per_page=${perPage}`;
    if (filters?.user_id) query += `&user_id=${filters.user_id}`;
    return apiRequest(`/admin/reviews/boats?${query}`);
  },
  deleteBoatReview: async (reviewId: number): Promise<ApiResponse<{ message: string }>> => apiRequest(`/admin/reviews/boats/${reviewId}`, { method: 'DELETE' }),

  // Groups
  getGroups: async (): Promise<ApiResponse<{ groups: AdminGroup[] }>> => apiRequest('/admin/groups'),
  createGroup: async (name: string, description?: string): Promise<ApiResponse<AdminGroup>> => apiRequest('/admin/groups', { method: 'POST', body: JSON.stringify({ name, description }) }),
  updateGroup: async (groupId: number, name?: string, description?: string): Promise<ApiResponse<AdminGroup>> => apiRequest(`/admin/groups/${groupId}`, { method: 'PUT', body: JSON.stringify({ name, description }) }),
  deleteGroup: async (groupId: number): Promise<ApiResponse<{ message: string }>> => apiRequest(`/admin/groups/${groupId}`, { method: 'DELETE' }),

  // Legacy compatibility
  addBoat: async (userId: number, boatData: AddBoatData): Promise<ApiResponse<AddBoatResponse>> => {
    // Upload images to Cloudinary first
    const imageUrls: string[] = [];
    if (boatData.boat_images && boatData.boat_images.length > 0) {
      const { uploadMultipleToCloudinary } = await import('./cloudinaryUpload');
      const urls = await uploadMultipleToCloudinary(boatData.boat_images, 'daffa/boats');
      imageUrls.push(...urls);
    }

    const formData = new FormData();
    formData.append('name', boatData.name);
    formData.append('price_per_hour', (boatData.price_per_hour || 0).toString());
    if (boatData.price_per_day) formData.append('price_per_day', boatData.price_per_day.toString());
    if (boatData.max_seats) formData.append('max_seats', boatData.max_seats.toString());
    if (boatData.max_seats_stay) formData.append('max_seats_stay', boatData.max_seats_stay.toString());
    formData.append('description', boatData.description);
    boatData.categories.forEach(id => formData.append('categories', id.toString()));
    boatData.cities.forEach(id => formData.append('cities', id.toString()));
    imageUrls.forEach(url => formData.append('image_urls', url));
    if (boatData.video_urls) boatData.video_urls.forEach(url => formData.append('video_urls', url));
    return adminFormRequest(`/admin/users/${userId}/boats`, formData);
  },
  editBoat: async (boatId: number, boatData: EditBoatData): Promise<ApiResponse<EditBoatResponse>> => {
    // Upload images to Cloudinary first
    const imageUrls: string[] = [];
    if (boatData.boat_images && boatData.boat_images.length > 0) {
      const { uploadMultipleToCloudinary } = await import('./cloudinaryUpload');
      const urls = await uploadMultipleToCloudinary(boatData.boat_images, 'daffa/boats');
      imageUrls.push(...urls);
    }

    const formData = new FormData();
    if (boatData.name) formData.append('name', boatData.name);
    if (boatData.price_per_hour) formData.append('price_per_hour', boatData.price_per_hour.toString());
    if (boatData.price_per_day) formData.append('price_per_day', boatData.price_per_day.toString());
    if (boatData.max_seats) formData.append('max_seats', boatData.max_seats.toString());
    if (boatData.max_seats_stay) formData.append('max_seats_stay', boatData.max_seats_stay.toString());
    if (boatData.description) formData.append('description', boatData.description);
    if (boatData.categories) boatData.categories.forEach(id => formData.append('categories', id.toString()));
    if (boatData.cities) boatData.cities.forEach(id => formData.append('cities', id.toString()));
    if (boatData.trips) boatData.trips.forEach(id => formData.append('trips', id.toString()));
    imageUrls.forEach(url => formData.append('image_urls', url));
    if (boatData.video_urls) boatData.video_urls.forEach(url => formData.append('video_urls', url));
    if (boatData.removed_videos) boatData.removed_videos.forEach(url => formData.append('removed_videos', url));
    return adminFormRequest(`/admin/boats/${boatId}`, formData, 'PUT');
  },

  // Services
  getServices: async (): Promise<ApiResponse<{ services: BoatServiceDef[] }>> => apiRequest('/admin/services'),
  getService: async (serviceId: number): Promise<ApiResponse<BoatServiceDef & { boats: { id: number; name: string; is_badge: boolean; badge_display_name: string | null; price: number | null }[] }>> => apiRequest(`/admin/services/${serviceId}`),
  createService: async (serviceData: { name: string; description?: string; default_price?: number | null; price_mode: string; icon_url?: string }, iconFile?: File): Promise<ApiResponse<{ message: string; service: BoatServiceDef }>> => {
    let iconUrl = serviceData.icon_url;
    if (iconFile) {
      const { uploadToCloudinary } = await import('./cloudinaryUpload');
      iconUrl = await uploadToCloudinary(iconFile, 'daffa/services');
    }
    const formData = new FormData();
    formData.append('name', serviceData.name);
    if (serviceData.description) formData.append('description', serviceData.description);
    if (serviceData.default_price !== undefined && serviceData.default_price !== null) formData.append('default_price', serviceData.default_price.toString());
    formData.append('price_mode', serviceData.price_mode);
    if (iconUrl) formData.append('icon_url', iconUrl);
    return adminFormRequest('/admin/services', formData);
  },
  updateService: async (serviceId: number, serviceData: { name?: string; description?: string; default_price?: number | null; price_mode?: string; icon_url?: string }, iconFile?: File): Promise<ApiResponse<{ message: string; service: BoatServiceDef }>> => {
    let iconUrl = serviceData.icon_url;
    if (iconFile) {
      const { uploadToCloudinary } = await import('./cloudinaryUpload');
      iconUrl = await uploadToCloudinary(iconFile, 'daffa/services');
    }
    const formData = new FormData();
    if (serviceData.name) formData.append('name', serviceData.name);
    if (serviceData.description !== undefined) formData.append('description', serviceData.description || '');
    if (serviceData.default_price !== undefined) formData.append('default_price', serviceData.default_price === null ? 'null' : serviceData.default_price.toString());
    if (serviceData.price_mode) formData.append('price_mode', serviceData.price_mode);
    if (iconUrl) formData.append('icon_url', iconUrl);
    return adminFormRequest(`/admin/services/${serviceId}`, formData, 'PUT');
  },
  deleteService: async (serviceId: number): Promise<ApiResponse<{ message: string }>> => apiRequest(`/admin/services/${serviceId}`, { method: 'DELETE' }),

  // Facilities
  getFacilities: async (): Promise<ApiResponse<{ facilities: BoatFacilityDef[] }>> => apiRequest('/admin/facilities'),
  getFacility: async (facilityId: number): Promise<ApiResponse<BoatFacilityDef & { boats: { id: number; name: string }[] }>> => apiRequest(`/admin/facilities/${facilityId}`),
  createFacility: async (data: { name: string; description?: string; image_url?: string }, imageFile?: File): Promise<ApiResponse<{ message: string; facility: BoatFacilityDef }>> => {
    let imageUrl = data.image_url;
    if (imageFile) {
      const { uploadToCloudinary } = await import('./cloudinaryUpload');
      imageUrl = await uploadToCloudinary(imageFile, 'daffa/facilities');
    }
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (imageUrl) formData.append('image_url', imageUrl);
    return adminFormRequest('/admin/facilities', formData);
  },
  updateFacility: async (facilityId: number, data: { name?: string; description?: string; image_url?: string }, imageFile?: File): Promise<ApiResponse<{ message: string; facility: BoatFacilityDef }>> => {
    let imageUrl = data.image_url;
    if (imageFile) {
      const { uploadToCloudinary } = await import('./cloudinaryUpload');
      imageUrl = await uploadToCloudinary(imageFile, 'daffa/facilities');
    }
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (data.description !== undefined) formData.append('description', data.description || '');
    if (imageUrl) formData.append('image_url', imageUrl);
    return adminFormRequest(`/admin/facilities/${facilityId}`, formData, 'PUT');
  },
  deleteFacility: async (facilityId: number): Promise<ApiResponse<{ message: string }>> => apiRequest(`/admin/facilities/${facilityId}`, { method: 'DELETE' }),
};


// ===== DIAGNOSTIC FUNCTIONS =====
export async function diagnoseConnection(): Promise<ApiResponse<{ status: string; message: string; details: Record<string, unknown> }>> {
  return apiRequest<{ status: string; message: string; details: Record<string, unknown> }>('/diagnostics/connection');
}

export async function testConnection(): Promise<ApiResponse<{ status: string; message: string; details: Record<string, unknown> }>> {
  return apiRequest<{ status: string; message: string; details: Record<string, unknown> }>('/diagnostics/test');
}

// ===== UTILITY FUNCTIONS =====
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if token is expired
    if (payload.exp && payload.exp < currentTime) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function isAuthenticated(): boolean {
  const token = storage.getToken();
  return token ? isTokenValid(token) : false;
}

export function handleApiError(error: unknown): string {
  console.error('API Error:', error);

  if (error instanceof Error && error.message && error.message.includes('401')) {
    storage.clearAll();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return 'Session expired. Please login again.';
  }

  if (error instanceof Error && error.message && error.message.includes('403')) {
    return 'You do not have permission to perform this action.';
  }

  if (error instanceof Error && error.message && error.message.includes('404')) {
    return 'The requested resource was not found.';
  }

  if (error instanceof Error && error.message && error.message.includes('500')) {
    return 'Server error. Please try again later.';
  }

  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

// ===== LEGACY COMPATIBILITY =====
// Keep old function names for backward compatibility
export const login = authApi.login;
export const register = authApi.register;
export const getHomeData = clientApi.getHomeData;
export const getCities = clientApi.getCities;
export const getBoats = clientApi.getBoats;
export const getCustomerProfile = customerApi.getProfile;
export const updateCustomerProfile = customerApi.updateProfile;
export const createCustomerProfile = customerApi.createProfile;

// Default export
export default authApi;
