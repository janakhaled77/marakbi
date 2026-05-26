"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import BoatCard from "../BoatCard";
import FilterButton from "./FilterButton";
import FiltersPanel from "./FiltersPanel";
import { MdOutlineTune } from "react-icons/md";
import { clientApi, Boat, City } from "@/lib/api";
import { useRouter } from "next/navigation";
import { normalizeImageUrl } from "@/lib/imageUtils";

export default function BoatListingLayout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [allBoats, setAllBoats] = useState<Boat[]>([]); // Store all boats before filtering
  const [loading, setLoading] = useState(true);
  const [totalBoats, setTotalBoats] = useState(0);
  const [cities, setCities] = useState<City[]>([]);

  // Filter states
  // Upper bound of the price slider. Defaults to 2500 but is recomputed from
  // the actual boats once they load (see effect below) so boats priced higher
  // than the old hard-coded 2500 are no longer cut off by the filter.
  const [maxPrice, setMaxPrice] = useState(2500);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2500]);
  const [selectedBoatTypes, setSelectedBoatTypes] = useState<string[]>([]);
  const [selectedCabins, setSelectedCabins] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedRentalTypes, setSelectedRentalTypes] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<number[]>([]);
  const [priceSortOrder, setPriceSortOrder] = useState<'none' | 'high-to-low' | 'low-to-high'>('none');

  // Dropdown states
  const [boatsDropdownOpen, setBoatsDropdownOpen] = useState(false);
  const [activitiesDropdownOpen, setActivitiesDropdownOpen] = useState(false);

  // جلب الفلاتر من URL
  const cityId = searchParams.get('city_id');
  const categoryId = searchParams.get('category_id');
  const rentalType = searchParams.get('rental_type');
  const searchQuery = searchParams.get('search');
  const minPassengers = searchParams.get('min_passengers');

  // Mapping for common Arabic city names to English (for search)
  const cityNameMapping: Record<string, string[]> = {
    'أسوان': ['aswan', 'asuan', 'asswan'],
    'الأقصر': ['luxor', 'al uqsur', 'al uqsor', 'el uqsur'],
    'القاهرة': ['cairo', 'al qahira', 'el qahira'],
    'الإسكندرية': ['alexandria', 'al iskandariyah', 'el iskandariya'],
    'الغردقة': ['hurghada', 'al ghardaqah', 'el ghardaqa'],
    'شرم الشيخ': ['sharm el sheikh', 'sharm el sheik', 'sharm'],
    'مرسى مطروح': ['marsa matruh', 'marsa matrouh'],
    'دهب': ['dahab', 'dahb'],
    'نويبع': ['nuweiba', 'nueiba'],
    'طابا': ['taba'],
  };

  // Mapping for common Arabic category names to English
  const categoryNameMapping: Record<string, string[]> = {
    'مناسبات': ['occasion', 'occasions', 'event', 'events'],
    'أنشطة مائية': ['water activities', 'water activity', 'water sports'],
    'مراكب صيد': ['fishing', 'fishing boats', 'fish'],
    'مراكب خاصة': ['private', 'private boats'],
    'رحلات مشتركة': ['sharing', 'sharing trips', 'shared'],
    'مراكب سفر': ['travel', 'travel boats'],
    'دهبية': ['felucca', 'feluka', 'فلوكة'],
    'يخت': ['yacht', 'yachts'],
  };

  // Normalize Arabic text for better search
  const normalizeArabic = (text: string) =>
    text
      .toLowerCase()
      .replace(/أ|إ|آ|ء/g, 'ا')
      .replace(/ى|ئ/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/[ًٌٍَُِّْ]/g, '') // Remove diacritics
      .replace(/\s+/g, ' ') // collapse spaces
      .trim();

  // Check if query matches with Arabic-English mapping
  const matchesWithMapping = (query: string, source: string, mapping: Record<string, string[]>): boolean => {
    const normalizedQuery = normalizeArabic(query);
    const normalizedSource = normalizeArabic(source);

    // Direct match
    if (normalizedSource.includes(normalizedQuery)) return true;

    // Check Arabic query against English source using mapping
    for (const [arabicName, englishNames] of Object.entries(mapping)) {
      if (normalizeArabic(arabicName).includes(normalizedQuery)) {
        // If query matches Arabic name, check if source matches any English equivalent
        if (englishNames.some(en => normalizedSource.includes(en.toLowerCase()))) {
          return true;
        }
      }
    }

    // Check English query against Arabic source using mapping
    for (const [arabicName, englishNames] of Object.entries(mapping)) {
      if (englishNames.some(en => normalizedQuery.includes(en.toLowerCase()))) {
        // If query matches English name, check if source matches Arabic equivalent
        if (normalizeArabic(arabicName).includes(normalizedSource) || normalizedSource.includes(normalizeArabic(arabicName))) {
          return true;
        }
      }
    }

    return false;
  };

  // Boat categories: Motor Boat, Felucca, Occasion, Sharing (exclude Travel, Fishing, and Water Activities)
  // Activity categories: Water Activities, Fishing
  // const boatCategories = ['Motor Boat', 'Felucca', 'Occasion', 'Sharing'];
  // const activityCategories = ['Water Activities', 'Fishing'];

  // Extract unique boat types (only boats, not activities or travel)
  const getUniqueBoatTypes = () => {
    const types = new Set<string>();
    allBoats.forEach(boat => {
      boat.categories?.forEach(cat => {

        types.add(cat);

      });
    });
    return Array.from(types).sort();
  };

  // Extract unique activities from the new activities field
  const getUniqueActivities = () => {
    const types = new Set<string>();
    allBoats.forEach(boat => {
      boat.activities?.forEach(act => {
        types.add(act);
      });
    });
    return Array.from(types).sort();
  };

  // Apply all filters
  const applyFilters = () => {
    let filtered = [...allBoats];

    // Search query filter (if provided)
    if (searchQuery) {
      const normalizedQuery = normalizeArabic(searchQuery);
      filtered = filtered.filter(boat => {
        // Search in boat name (normalized)
        const normalizedName = normalizeArabic(boat.name);
        const nameMatch = normalizedName.includes(normalizedQuery);

        // Search in categories (normalized with mapping)
        const categoryMatch = boat.categories?.some(cat => {
          const normalizedCat = normalizeArabic(cat);
          return normalizedCat.includes(normalizedQuery) ||
            matchesWithMapping(searchQuery, cat, categoryNameMapping);
        });

        // Search in cities (normalized with mapping)
        const cityMatch = boat.cities?.some(city => {
          const normalizedCity = normalizeArabic(city);
          return normalizedCity.includes(normalizedQuery) ||
            matchesWithMapping(searchQuery, city, cityNameMapping);
        });

        return nameMatch || categoryMatch || cityMatch;
      });
    }

    // Price filter
    filtered = filtered.filter(boat => {
      const price = boat.price_per_hour || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Boat types filter (only boat categories)
    if (selectedBoatTypes.length > 0) {
      filtered = filtered.filter(boat =>
        boat.categories?.some(cat => selectedBoatTypes.includes(cat))
      );
    }

    // Activities filter (uses the dedicated activities field)
    if (selectedActivities.length > 0) {
      filtered = filtered.filter(boat =>
        boat.activities?.some(act => selectedActivities.includes(act))
      );
    }

    // Cabins filter (disabled for now, but keep the logic)
    if (selectedCabins.length > 0) {
      filtered = filtered.filter(boat => {
        const cabinCount = boat.max_seats_stay || 0;
        return selectedCabins.some(cabin => {
          if (cabin === '1-2 Cabins') return cabinCount <= 2;
          if (cabin === '3-4 Cabins') return cabinCount >= 3 && cabinCount <= 4;
          if (cabin === '5-6 Cabins') return cabinCount >= 5 && cabinCount <= 6;
          if (cabin === '7+ Cabins') return cabinCount >= 7;
          return false;
        });
      });
    }

    // Rental type filter
    if (selectedRentalTypes.length > 0) {
      filtered = filtered.filter(boat => {
        return selectedRentalTypes.some(type => {
          if (type === 'hourly') {
            return boat.price_per_hour && boat.price_per_hour > 0;
          } else if (type === 'daily') {
            return boat.price_per_day && boat.price_per_day > 0;
          }
          return false;
        });
      });
    }

    // City filter - apply when cities are selected from filter panel
    // If only one city is selected and no cityId in URL, data is already fetched from API for that city (no need to filter)
    // If multiple cities are selected, or if cityId in URL differs from selectedCities, filter client-side
    if (selectedCities.length > 0) {
      // Only filter if we have multiple cities, or if cityId in URL doesn't match selectedCities
      const needsFiltering = selectedCities.length > 1 ||
        (cityId && selectedCities.length === 1 && selectedCities[0] !== parseInt(cityId));

      if (needsFiltering) {
        filtered = filtered.filter(boat => {
          // Check if boat has at least one trip in one of the selected cities
          return boat.trips?.some((trip: { city_id?: number }) =>
            selectedCities.includes(trip.city_id || 0)
          );
        });
      }
    }

    // Price sorting
    if (priceSortOrder !== 'none') {
      filtered.sort((a, b) => {
        const priceA = a.price_per_hour || 0;
        const priceB = b.price_per_hour || 0;
        return priceSortOrder === 'high-to-low' ? priceB - priceA : priceA - priceB;
      });
    }

    // Exclude boats with no valid price (neither hourly nor daily)
    filtered = filtered.filter(boat => {
      const hasHourly = boat.price_per_hour !== null && boat.price_per_hour !== undefined;
      const hasDaily = boat.price_per_day !== null && boat.price_per_day !== undefined;
      return hasHourly || hasDaily;
    });

    setBoats(filtered);
    setTotalBoats(filtered.length);
  };

  // Apply filters when they change
  useEffect(() => {
    if (allBoats.length > 0) {
      applyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceRange, selectedBoatTypes, selectedCabins, selectedActivities, selectedRentalTypes, selectedCities, priceSortOrder, searchQuery, allBoats]);

  // Derive the price slider's upper bound from the actual boat prices so the
  // filter never cuts off the most expensive boats. Ceil to the nearest 10 for
  // a tidy number, and reset the selected range to span the full new max.
  useEffect(() => {
    if (allBoats.length === 0) return;
    const prices = allBoats
      .flatMap((b) => [b.price_per_hour, b.price_per_day])
      .filter((p): p is number => typeof p === 'number' && p > 0);
    const computed = prices.length > 0
      ? Math.max(100, Math.ceil(Math.max(...prices) / 10) * 10)
      : 2500;
    setMaxPrice(computed);
    setPriceRange([0, computed]);
  }, [allBoats]);

  // Load cities on mount
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await clientApi.getCities();
        if (response.success && response.data) {
          setCities(response.data.cities);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    };
    fetchCities();
  }, []);

  // Reset filters when category_id changes (to ensure clean state when navigating from Footer)
  useEffect(() => {
    // Reset all filters when category_id changes
    setPriceRange([0, maxPrice]);
    setSelectedBoatTypes([]);
    setSelectedCabins([]);
    setSelectedActivities([]);
    setSelectedRentalTypes([]);
    setSelectedCities([]);
    setPriceSortOrder('none');
  }, [categoryId]); // Run when categoryId changes to reset filters

  // Initialize filters from URL params
  useEffect(() => {
    // Set rental type filter from URL
    if (rentalType) {
      setSelectedRentalTypes([rentalType.toLowerCase()]);
    } else {
      setSelectedRentalTypes([]);
    }

    // Set city filter from URL (only if cityId exists in URL, don't override selectedCities from panel)
    if (cityId) {
      const cityIdNum = parseInt(cityId);
      if (!isNaN(cityIdNum)) {
        setSelectedCities([cityIdNum]);
      } else {
        setSelectedCities([]);
      }
    }
    // Note: If no cityId in URL, selectedCities remains as user selected from panel
  }, [rentalType, cityId]); // Run when URL params change

  // Set category filter from URL - get category name from API after cities are loaded
  useEffect(() => {
    if (categoryId && cities.length > 0) {
      const getCategoryName = async () => {
        try {
          const catResponse = await clientApi.getCategoriesByCity(cities[0].id);
          if (catResponse.success && catResponse.data) {
            const data = catResponse.data;
            const categories = Array.isArray(data)
              ? data
              : Array.isArray((data as { categories?: unknown[] }).categories)
                ? (data as { categories: { id: number; name: string }[] }).categories
                : [];
            const category = categories.find((cat: { id: number }) => cat.id === parseInt(categoryId));
            if (category) {
              const categoryName = (category as { name: string }).name;
              // Categories now always represent boat types
              setSelectedBoatTypes([categoryName]);
              setSelectedActivities([]);
            }
          }
        } catch (error) {
          console.error('Error getting category name:', error);
        }
      };
      getCategoryName();
    } else if (!categoryId) {
      // If no categoryId, clear category filters
      setSelectedBoatTypes([]);
      setSelectedActivities([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, cities]); // Run when categoryId or cities change

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-dropdown')) {
        setBoatsDropdownOpen(false);
        setActivitiesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle price sort toggle
  const handlePriceSort = () => {
    if (priceSortOrder === 'none') {
      setPriceSortOrder('high-to-low');
    } else if (priceSortOrder === 'high-to-low') {
      setPriceSortOrder('low-to-high');
    } else {
      setPriceSortOrder('none');
    }
  };



  useEffect(() => {
    const fetchBoats = async () => {
      try {
        setLoading(true);
        let response;

        // Determine which city to use: URL cityId takes precedence, otherwise use first selectedCity from panel
        const effectiveCityId = cityId ? parseInt(cityId) : (selectedCities.length === 1 ? selectedCities[0] : null);

        // Fetch boats - use specific endpoint if available for better performance
        // According to API documentation:
        // - /client/boats/category/{categoryId}/city/{cityId} - filter by both category and city
        // - /client/boats/category/{categoryId} - filter by category only
        // - When only cityId is provided, fetch all categories for that city, then get boats for each category
        if (categoryId && effectiveCityId) {
          // Both category and city provided - use API endpoint
          const categoryIdNum = parseInt(categoryId);
          if (!isNaN(categoryIdNum) && !isNaN(effectiveCityId)) {
            response = await clientApi.getBoatsByCategoryAndCity(categoryIdNum, effectiveCityId);
          } else {
            // Invalid IDs, fallback to all boats
            response = await clientApi.getBoats(1, 100);
          }
        } else if (categoryId) {
          // Only category provided - use API endpoint
          const categoryIdNum = parseInt(categoryId);
          if (!isNaN(categoryIdNum)) {
            response = await clientApi.getBoatsByCategory(categoryIdNum);
          } else {
            // Invalid ID, fallback to all boats
            response = await clientApi.getBoats(1, 100);
          }
        } else if (effectiveCityId) {
          // Only city provided (from URL or selected from panel) - fetch all categories for that city, then get boats for each
          // Get all categories for this city
          const categoriesResponse = await clientApi.getCategoriesByCity(effectiveCityId);
          if (categoriesResponse.success && categoriesResponse.data) {
            const data = categoriesResponse.data;
            // API might return an array directly or wrapped in an object (e.g. { categories: [...] })
            const categories = Array.isArray(data)
              ? data
              : Array.isArray((data as { categories?: unknown[] }).categories)
                ? (data as { categories: { id: number; name: string; description?: string }[] }).categories
                : [];

            // Fetch boats for each category and combine results
            const allBoatsPromises = categories.map((cat: { id: number }) =>
              clientApi.getBoatsByCategoryAndCity(cat.id, effectiveCityId)
            );

            const allResponses = await Promise.all(allBoatsPromises);

            // Combine all boats and remove duplicates
            const boatsMap = new Map<number, Boat>();
            allResponses.forEach(res => {
              if (res.success && res.data && res.data.boats) {
                res.data.boats.forEach((boat: Boat) => {
                  boatsMap.set(boat.id, boat);
                });
              }
            });

            // Create combined response
            const combinedBoats = Array.from(boatsMap.values());
            response = {
              success: true,
              data: {
                boats: combinedBoats,
                page: 1,
                pages: 1,
                per_page: combinedBoats.length,
                total: combinedBoats.length
              }
            };
          } else {
            // If categories fetch fails, fallback to all boats
            response = await clientApi.getBoats(1, 100);
          }
        } else {
          // No category or city - fetch all boats
          response = await clientApi.getBoats(1, 100);
        }

        if (response.success && response.data) {
          let filteredBoats = response.data.boats || [];

          // Extract city names from trips array and add to boat object (for display purposes)
          filteredBoats = filteredBoats.map(boat => {
            // Get unique city names from trips
            const cityNames = boat.trips?.map((trip: { city_name?: string }) => trip.city_name).filter((name): name is string => Boolean(name)) || [];
            const uniqueCities = [...new Set(cityNames)];

            return {
              ...boat,
              cities: uniqueCities.length > 0 ? uniqueCities : (boat.cities || [])
            };
          });

          // Note: City filtering is already handled by API when cityId is provided
          // No need for additional client-side filtering in that case

          // Filter by rental type if provided
          if (rentalType) {
            if (rentalType.toLowerCase() === 'hourly') {
              // Show boats with hourly pricing
              filteredBoats = filteredBoats.filter(boat =>
                boat.price_per_hour && boat.price_per_hour > 0
              );
            } else if (rentalType.toLowerCase() === 'daily') {
              // Show boats with daily pricing
              filteredBoats = filteredBoats.filter(boat =>
                boat.price_per_day && boat.price_per_day > 0
              );
            }
          }

          // Filter by minimum passengers if provided via URL
          if (minPassengers) {
            const minPassengersNum = parseInt(minPassengers);
            if (!isNaN(minPassengersNum)) {
              filteredBoats = filteredBoats.filter(boat =>
                boat.max_seats >= minPassengersNum
              );
            }
          }

          // Store all boats for filtering (before search query filter)
          // Note: Search query filtering will be handled in applyFilters via allBoats
          setAllBoats(filteredBoats);
        }
      } catch (error) {
        console.error('Error fetching boats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBoats();
  }, [cityId, categoryId, rentalType, selectedCities, minPassengers]);

  return (
    <div className="relative mt-10 sm:mt-12 lg:mt-16 z-0">
      {/* Filter Bar Background + Buttons */}
      <div className="relative z-10 bg-white border-b border-[rgba(0,0,0,0.1)]">
        <div className="flex flex-wrap gap-3 sm:gap-4 px-4 sm:px-8 lg:px-16 py-3 relative">
          {/* Price Sort Button */}
          <FilterButton
            onClick={handlePriceSort}
            label={`Price${priceSortOrder === 'high-to-low' ? ' (High-Low)' : priceSortOrder === 'low-to-high' ? ' (Low-High)' : ''}`}
          />

          {/* Boats Filter */}
          <div className="relative filter-dropdown">
            <FilterButton
              onClick={() => {
                setBoatsDropdownOpen(!boatsDropdownOpen);
                setActivitiesDropdownOpen(false);
              }}
              label={`Boats${selectedBoatTypes.length > 0 ? ` (${selectedBoatTypes.length})` : ''}`}
            />
            {boatsDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
                <div className="space-y-2">
                  {getUniqueBoatTypes().length > 0 ? (
                    getUniqueBoatTypes().map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedBoatTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBoatTypes([...selectedBoatTypes, type]);
                            } else {
                              setSelectedBoatTypes(selectedBoatTypes.filter(t => t !== type));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 py-2">No boat types available</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cabins Filter - Disabled */}
          <button
            disabled
            className="flex items-center border-[#A0A0A0] text-gray-400 hover:bg-gray-100 gap-2 px-4 sm:px-6 py-2 border rounded-md text-sm sm:text-base font-medium transition-all duration-200 cursor-not-allowed opacity-50 whitespace-nowrap flex-shrink-0"
          >
            <span className="truncate">Cabins</span>
          </button>

          {/* Activities Filter */}
          <div className="relative filter-dropdown">
            <FilterButton
              onClick={() => {
                setActivitiesDropdownOpen(!activitiesDropdownOpen);
                setBoatsDropdownOpen(false);
              }}
              label={`Activities${selectedActivities.length > 0 ? ` (${selectedActivities.length})` : ''}`}
            />
            {activitiesDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
                <div className="space-y-2">
                  {getUniqueActivities().length > 0 ? (
                    getUniqueActivities().map(activity => (
                      <label key={activity} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedActivities.includes(activity)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedActivities([...selectedActivities, activity]);
                            } else {
                              setSelectedActivities(selectedActivities.filter(a => a !== activity));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{activity}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 py-2">No activities available</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* More Filters */}
          <FilterButton
            icon={MdOutlineTune}
            onClick={() => setIsFiltersOpen(true)}
            label="More Filters"
          />

          {/* Reset Button */}
          <FilterButton
            onClick={() => {
              setPriceRange([0, maxPrice]);
              setSelectedBoatTypes([]);
              setSelectedCabins([]);
              setSelectedActivities([]);
              setSelectedRentalTypes([]);
              setSelectedCities([]);
              setPriceSortOrder('none');
              router.push('/boat-listing');
            }}
            label="Reset"
          />
        </div>
      </div>

      {/* Filters Panel */}
      <FiltersPanel
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        maxPrice={maxPrice}
        selectedBoatTypes={selectedBoatTypes}
        setSelectedBoatTypes={setSelectedBoatTypes}
        selectedCabins={selectedCabins}
        setSelectedCabins={setSelectedCabins}
        selectedActivities={selectedActivities}
        setSelectedActivities={setSelectedActivities}
        selectedRentalTypes={selectedRentalTypes}
        setSelectedRentalTypes={setSelectedRentalTypes}
        selectedCities={selectedCities}
        setSelectedCities={setSelectedCities}
        cities={cities}
        boats={allBoats}
      />

      {/* Heading */}
      <div className="relative z-0 px-4 sm:px-8 lg:px-16 pt-6 md:pt-8">
        <p className="hidden md:block text-2xl sm:text-3xl lg:text-[32px] mb-6 font-medium">
          {searchQuery ? `Search results for "${searchQuery}"` : 'Available Boats'}
          <span className="text-[#7D7D7D] ml-3 text-sm sm:text-base font-normal">
            ({totalBoats} found)
          </span>
        </p>

        {/* Boat Cards Grid */}
        <div className="relative z-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 xl:gap-10 pb-24 max-w-6xl lg:max-w-7xl mx-auto place-items-center sm:place-items-stretch">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-900 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading boats...</p>
            </div>
          ) : boats.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600 text-lg">No boats found matching your criteria.</p>
            </div>
          ) : (
            boats.map((boat) => {
              const displayPrice = (boat.price_per_hour !== null && boat.price_per_hour !== undefined)
                ? boat.price_per_hour
                : (boat.price_per_day ?? 0);

              const displayMode = (boat.price_per_hour !== null && boat.price_per_hour !== undefined)
                ? boat.price_mode
                : 'per_day';

              return (
                <BoatCard
                  key={boat.id}
                  boatId={boat.id}
                  imageUrl={normalizeImageUrl(boat.images?.[0])}
                  name={boat.name}
                  category={boat.categories?.[0]}
                  price={`${displayPrice}`}
                  location={boat.cities?.[0] || "Aswan - Egypt"}
                  guests={boat.max_seats}
                  rooms={boat.max_seats_stay}
                  status="Available"
                  rating={boat.average_rating ?? 0}
                  reviewsCount={boat.total_reviews || 0}
                  guestCount={minPassengers ? parseInt(minPassengers) : undefined}
                  priceMode={displayMode}
                  badgeServices={boat.badge_services}
                  showGuestsBadge={boat.show_guests_badge}
                  maxGuests={boat.max_seats}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
