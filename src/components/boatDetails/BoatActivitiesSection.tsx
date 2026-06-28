"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FiActivity } from "react-icons/fi";
import { BoatActivityItem } from "@/lib/api";
import { normalizeImageUrl } from "@/lib/imageUtils";

const ITEMS_PER_PAGE = 3;

function getActivityImage(name: string, image?: string | null) {
  if (image) return normalizeImageUrl(image);

  const title = name.toLowerCase();
  if (title.includes("kayak") || title.includes("kayaking")) {
    return "/images/hero-2.webp";
  }
  if (title.includes("fishing")) {
    return "/images/hero-1.webp";
  }
  if (title.includes("sunset") || title.includes("sail") || title.includes("boat")) {
    return "/images/hero-3.webp";
  }
  if (title.includes("carnaval") || title.includes("carnival")) {
    return "/images/carnaval.png";
  }
  return "/images/hero-1.webp";
}

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
            className="text-left bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition"
          >
            <div className="relative h-36 sm:h-40">
              <Image
                src={getActivityImage(activity.name, activity.image)}
                alt={activity.name}
                fill
                className="object-cover"
                sizes="300px"
              />
            </div>
            <div className="p-3 sm:p-4">
              <p className="font-semibold text-sm sm:text-base text-black truncate">{activity.name}</p>
              <p className="text-xs text-gray-500 mt-2 line-clamp-2">Enjoy this operator-led activity with a boat experience tailored to your trip.</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-[#093b77] font-semibold">Included</span>
                <span className="text-xs text-gray-500">Operator-led</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
