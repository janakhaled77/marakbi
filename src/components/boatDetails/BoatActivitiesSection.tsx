"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FiActivity } from "react-icons/fi";
import { BoatActivityItem } from "@/lib/api";
import { normalizeImageUrl } from "@/lib/imageUtils";

const ITEMS_PER_PAGE = 3;

export function resolveBoatActivities(boat: {
  activities_full?: BoatActivityItem[];
  activities?: string[];
}): BoatActivityItem[] {
  if (boat.activities_full && boat.activities_full.length > 0) {
    return boat.activities_full;
  }

  if (boat.activities && boat.activities.length > 0) {
    return boat.activities.map((name, index) => ({
      id: index,
      name,
      image: null,
    }));
  }

  return [];
}

interface BoatActivitiesSectionProps {
  activities: BoatActivityItem[];
  variant?: "public" | "admin";
}

export default function BoatActivitiesSection({
  activities,
  variant = "public",
}: BoatActivitiesSectionProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(activities.length / ITEMS_PER_PAGE));
  const start = (page - 1) * ITEMS_PER_PAGE;
  const visibleActivities = activities.slice(start, start + ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [activities]);

  if (activities.length === 0) {
    return null;
  }

  const showPagination = activities.length > ITEMS_PER_PAGE;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        {variant === "admin" ? (
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Boat Activities
          </h3>
        ) : (
          <h2 className="text-2xl font-semibold font-poppins text-[#0a0a0a]">
            Boat Activities
          </h2>
        )}

        {showPagination && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => current - 1)}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 disabled:opacity-30 hover:bg-gray-100 transition"
              aria-label="Previous activities"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 disabled:opacity-30 hover:bg-gray-100 transition"
              aria-label="Next activities"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleActivities.map((activity) => (
          <div
            key={activity.id}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4 hover:shadow-lg transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-white shadow-sm flex-shrink-0">
                {activity.image ? (
                  <Image
                    src={normalizeImageUrl(activity.image)}
                    alt={activity.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FiActivity size={24} className="text-emerald-400" />
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                {activity.name}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
