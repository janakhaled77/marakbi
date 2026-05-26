"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Boat, City } from "@/lib/api";

interface FiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  maxPrice: number;
  selectedBoatTypes: string[];
  setSelectedBoatTypes: (types: string[] | ((prev: string[]) => string[])) => void;
  selectedCabins: string[];
  setSelectedCabins: (cabins: string[] | ((prev: string[]) => string[])) => void;
  selectedActivities: string[];
  setSelectedActivities: (activities: string[] | ((prev: string[]) => string[])) => void;
  selectedRentalTypes: string[];
  setSelectedRentalTypes: (types: string[] | ((prev: string[]) => string[])) => void;
  selectedCities: number[];
  setSelectedCities: (cities: number[] | ((prev: number[]) => number[])) => void;
  cities: City[];
  boats: Boat[];
}

export default function FiltersPanel({ 
  isOpen, 
  onClose,
  priceRange,
  setPriceRange,
  maxPrice,
  selectedBoatTypes,
  setSelectedBoatTypes,
  selectedCabins,
  setSelectedCabins,
  selectedActivities,
  setSelectedActivities,
  selectedRentalTypes,
  setSelectedRentalTypes,
  selectedCities,
  setSelectedCities,
  cities,
  boats
}: FiltersPanelProps) {

  // Dynamically extract unique boat types from boat.categories
  const getBoatTypes = () => {
    const typeMap = new Map<string, number>();
    boats.forEach(boat => {
      boat.categories?.forEach(cat => {
        typeMap.set(cat, (typeMap.get(cat) || 0) + 1);
      });
    });
    return Array.from(typeMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const boatTypes = getBoatTypes();

  // Get cabin counts - always show all cabin ranges (not conditional)
  const getCabins = () => {
    const cabinRanges = ['1-2 Cabins', '3-4 Cabins', '5-6 Cabins', '7+ Cabins'];
    return cabinRanges.map(range => {
      let count = 0;
      boats.forEach(boat => {
        const cabins = boat.max_seats_stay || 0;
        if (range === '1-2 Cabins' && cabins <= 2) count++;
        else if (range === '3-4 Cabins' && cabins >= 3 && cabins <= 4) count++;
        else if (range === '5-6 Cabins' && cabins >= 5 && cabins <= 6) count++;
        else if (range === '7+ Cabins' && cabins >= 7) count++;
      });
      return { name: range, count };
    });
  };

  const cabins = getCabins();

  // Dynamically extract unique activities from boat.activities
  const getActivities = () => {
    const actMap = new Map<string, number>();
    boats.forEach(boat => {
      boat.activities?.forEach(act => {
        actMap.set(act, (actMap.get(act) || 0) + 1);
      });
    });
    return Array.from(actMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const activities = getActivities();

  const toggleBoatType = (name: string) => {
    setSelectedBoatTypes((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const toggleCabin = (name: string) => {
    setSelectedCabins((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const toggleActivity = (name: string) => {
    setSelectedActivities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const toggleRentalType = (name: string) => {
    setSelectedRentalTypes((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const toggleCity = (cityId: number) => {
    setSelectedCities((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]
    );
  };

  const handleClearAll = () => {
    setPriceRange([0, maxPrice]);
    setSelectedBoatTypes([]);
    setSelectedCabins([]);
    setSelectedActivities([]);
    setSelectedRentalTypes([]);
    setSelectedCities([]);
  };

  const handleApplyFilters = () => {
    // Filters are already applied via useEffect in parent component
    onClose();
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const panelContent = (
    <div className="fixed inset-0 z-[99999] pointer-events-none" style={{ zIndex: 99999 }}>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 pointer-events-auto"
        onClick={onClose}
        />

      {/* Filters Panel */}
      <div className="fixed right-0 top-0 h-full w-[352px] bg-white border-l border-[rgba(0,0,0,0.1)] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] overflow-y-auto pointer-events-auto">
        {/* Header */}
        <div className="px-4 py-4 border-b border-[rgba(0,0,0,0.1)]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-base font-poppins font-semibold text-neutral-950 mb-1">
                Filter Boats
              </h2>
              <p className="text-sm font-poppins font-normal text-[#717182]">
                Refine your search with filters
              </p>
            </div>
            <button
              onClick={onClose}
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters Content */}
        <div className="px-4 py-6 pb-24 space-y-6">
          {/* Price Range */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                      stroke="#030213"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <label className="text-sm font-poppins font-medium text-neutral-950">
                  Price Range
                </label>
              </div>
              <span className="text-sm font-poppins font-normal text-[#717182]">
                EGP {priceRange[0]} - EGP {priceRange[1]}
              </span>
            </div>

            {/* Slider */}
            {(() => {
              const leftPct = (priceRange[0] / maxPrice) * 100;
              const rightPct = (priceRange[1] / maxPrice) * 100;

              // Compute value from a pointer event relative to the track
              const getValueFromEvent = (e: React.MouseEvent | MouseEvent, track: HTMLElement) => {
                const rect = track.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const step = 50;
                return Math.round((pct * maxPrice) / step) * step;
              };

              // Start dragging the thumb closest to the click
              const handlePointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
                const track = e.currentTarget;
                const clickedValue = getValueFromEvent(e, track);

                // Determine which thumb is closest
                const distToMin = Math.abs(clickedValue - priceRange[0]);
                const distToMax = Math.abs(clickedValue - priceRange[1]);
                const dragging: 'min' | 'max' = distToMin <= distToMax ? 'min' : 'max';

                // Apply immediately
                if (dragging === 'min') {
                  setPriceRange([Math.min(clickedValue, priceRange[1]), priceRange[1]]);
                } else {
                  setPriceRange([priceRange[0], Math.max(clickedValue, priceRange[0])]);
                }

                // Track current range in a mutable ref-like closure
                let current: [number, number] = dragging === 'min'
                  ? [Math.min(clickedValue, priceRange[1]), priceRange[1]]
                  : [priceRange[0], Math.max(clickedValue, priceRange[0])];

                const onMove = (ev: MouseEvent) => {
                  const val = getValueFromEvent(ev, track);
                  if (dragging === 'min') {
                    const clamped = Math.min(val, current[1]);
                    current = [clamped, current[1]];
                  } else {
                    const clamped = Math.max(val, current[0]);
                    current = [current[0], clamped];
                  }
                  setPriceRange([...current]);
                };

                const onUp = () => {
                  document.removeEventListener('mousemove', onMove);
                  document.removeEventListener('mouseup', onUp);
                };

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              };

              return (
                <div
                  className="relative h-2 rounded-full cursor-pointer select-none"
                  style={{ background: '#e5e7eb' }}
                  onMouseDown={handlePointerDown}
                >
                  {/* Active range (colored segment between thumbs) */}
                  <div
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      left: `${leftPct}%`,
                      width: `${rightPct - leftPct}%`,
                      background: '#030213',
                    }}
                  />

                  {/* Left Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#030213] rounded-full shadow-md z-10 pointer-events-none"
                    style={{ left: `calc(${leftPct}% - 10px)` }}
                  />

                  {/* Right Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#030213] rounded-full shadow-md z-10 pointer-events-none"
                    style={{ left: `calc(${rightPct}% - 10px)` }}
                  />
                </div>
              );
            })()}

            <div className="flex items-center justify-between text-xs font-poppins font-normal text-[#717182]">
              <span>EGP 0</span>
              <span>EGP {maxPrice}</span>
            </div>
          </div>

          {/* Boat Types */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v0M9 15v0M15 11v0"
                    stroke="#030213"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <label className="text-sm font-poppins font-medium text-neutral-950">
                Boat Types
              </label>
            </div>

            <div className="space-y-2">
              {boatTypes.map((type) => (
                <div
                  key={type.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBoatType(type.name)}
                      className={`w-4 h-4 rounded border ${
                        selectedBoatTypes.includes(type.name)
                          ? "bg-[#093b77] border-[#093b77]"
                          : "bg-[#f3f3f5] border-[rgba(0,0,0,0.1)]"
                      } flex items-center justify-center`}
                    >
                      {selectedBoatTypes.includes(type.name) && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm font-poppins font-medium text-neutral-950">
                      {type.name}
                    </span>
                  </div>
                  <span className="text-xs font-poppins font-normal text-[#717182]">
                    ({type.count})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Number of Cabins */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                    stroke="#030213"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 22V12h6v10"
                    stroke="#030213"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <label className="text-sm font-poppins font-medium text-neutral-950">
                Number of Cabins
              </label>
            </div>

            <div className="space-y-2">
              {cabins.map((cabin) => (
                <div
                  key={cabin.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCabin(cabin.name)}
                      className={`w-4 h-4 rounded border ${
                        selectedCabins.includes(cabin.name)
                          ? "bg-[#093b77] border-[#093b77]"
                          : "bg-[#f3f3f5] border-[rgba(0,0,0,0.1)]"
                      } flex items-center justify-center`}
                    >
                      {selectedCabins.includes(cabin.name) && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm font-poppins font-medium text-neutral-950">
                      {cabin.name}
                    </span>
                  </div>
                  <span className="text-xs font-poppins font-normal text-[#717182]">
                    ({cabin.count})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rental Type */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                    stroke="#030213"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <label className="text-sm font-poppins font-medium text-neutral-950">
                Rental Type
              </label>
            </div>

            <div className="space-y-2">
              {['Hourly', 'Daily'].map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRentalType(type.toLowerCase())}
                      className={`w-4 h-4 rounded border ${
                        selectedRentalTypes.includes(type.toLowerCase())
                          ? "bg-[#093b77] border-[#093b77]"
                          : "bg-[#f3f3f5] border-[rgba(0,0,0,0.1)]"
                      } flex items-center justify-center`}
                    >
                      {selectedRentalTypes.includes(type.toLowerCase()) && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm font-poppins font-medium text-neutral-950">
                      {type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cities */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                    stroke="#030213"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
                    stroke="#030213"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <label className="text-sm font-poppins font-medium text-neutral-950">
                Cities
              </label>
            </div>

            <div className="space-y-2">
              {cities.map((city) => {
                const cityBoatCount = boats.filter(boat =>
                  boat.trips?.some((trip: { city_id?: number }) => trip.city_id === city.id)
                ).length;
                return (
                  <div
                    key={city.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCity(city.id)}
                        className={`w-4 h-4 rounded border ${
                          selectedCities.includes(city.id)
                            ? "bg-[#093b77] border-[#093b77]"
                            : "bg-[#f3f3f5] border-[rgba(0,0,0,0.1)]"
                        } flex items-center justify-center`}
                      >
                        {selectedCities.includes(city.id) && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M20 6L9 17l-5-5"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                      <span className="text-sm font-poppins font-medium text-neutral-950">
                        {city.name}
                      </span>
                    </div>
                    <span className="text-xs font-poppins font-normal text-[#717182]">
                      ({cityBoatCount})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activities Available */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"
                    stroke="#030213"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <label className="text-sm font-poppins font-medium text-neutral-950">
                Activities Available
              </label>
            </div>

            <div className="space-y-2">
              {activities.map((activity) => (
                <div
                  key={activity.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActivity(activity.name)}
                      className={`w-4 h-4 rounded border ${
                        selectedActivities.includes(activity.name)
                          ? "bg-[#093b77] border-[#093b77]"
                          : "bg-[#f3f3f5] border-[rgba(0,0,0,0.1)]"
                      } flex items-center justify-center`}
                    >
                      {selectedActivities.includes(activity.name) && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm font-poppins font-medium text-neutral-950">
                      {activity.name}
                    </span>
                  </div>
                  <span className="text-xs font-poppins font-normal text-[#717182]">
                    ({activity.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 left-0 right-0 border-t border-[rgba(0,0,0,0.1)] bg-white p-4 flex gap-2 mt-6">
          <button
            onClick={handleClearAll}
            className="flex-1 h-9 px-4 py-2 bg-white border border-[rgba(0,0,0,0.1)] rounded-lg text-sm font-poppins font-medium text-neutral-950 hover:bg-gray-50 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={handleApplyFilters}
            className="flex-1 h-9 px-4 py-2 bg-[#093b77] rounded-lg text-sm font-poppins font-medium text-white hover:bg-[#0a4489] transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
}

