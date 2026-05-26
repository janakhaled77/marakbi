"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import { IoMdThumbsUp } from "react-icons/io";
import { IoStarSharp } from "react-icons/io5";
import TripDetailsCell from "./TripDetailsCell";
import TripDetailsCellItem from "./TripDetailsCellItem";
import { MdOutlineGroups2 } from "react-icons/md";
import { FaRegClock, FaAnchor } from "react-icons/fa";
import { HiLockOpen } from "react-icons/hi";
import { FiChevronLeft } from "react-icons/fi";
import useBookingStore from "@/hooks/useBookingStore";

export default function TripDetails() {
  const bookingData = useBookingStore((s) => s.bookingData);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // Auto-advance slider for trip images
  useEffect(() => {
    const images = bookingData?.trip_images as string[] | undefined;
    if (bookingData?.rental_type !== 'trip' || !images || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [bookingData?.rental_type, bookingData?.trip_images]);

  if (!bookingData) {
    return (
      <div className="border-2 w-full border-[#C0C0C0] rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate duration text
  const getDurationText = () => {
    if (bookingData.rental_type === 'trip' && bookingData.trip_duration) {
      const hours = Number(bookingData.trip_duration);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (bookingData.rental_type === 'hourly' && bookingData.hours) {
      const hours = Number(bookingData.hours);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (bookingData.days) {
      const days = Number(bookingData.days);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    return 'Duration not specified';
  };

  return (
    <div className="border-2 w-full overflow-hidden border-[#C0C0C0] rounded-lg text-sm sm:text-base">
      {/* === 1. Main Image & Header === */}
      <TripDetailsCell>
        {bookingData.rental_type === 'trip' && bookingData.trip_name ? (
          <>
            {/* Trip Image Slider */}
            <div className="relative h-[160px] sm:h-[200px] md:h-[240px] overflow-hidden rounded-md group">
              {(bookingData.trip_images as string[]) && (bookingData.trip_images as string[]).length > 0 ? (
                <>
                  <Image
                    src={(bookingData.trip_images as string[])[currentImageIndex]}
                    alt={String(bookingData.trip_name)}
                    fill
                    className="object-cover transition-all duration-700"
                    priority
                  />
                  {/* Slider Arrows */}
                  {(bookingData.trip_images as string[]).length > 1 && (
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const len = (bookingData.trip_images as string[]).length;
                          setCurrentImageIndex((prev) => (prev - 1 + len) % len);
                        }}
                        className="p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition"
                      >
                        <FiChevronLeft size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const len = (bookingData.trip_images as string[]).length;
                          setCurrentImageIndex((prev) => (prev + 1) % len);
                        }}
                        className="p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition rotate-180"
                      >
                        <FiChevronLeft size={18} />
                      </button>
                    </div>
                  )}
                  {/* Slider Dots */}
                  {(bookingData.trip_images as string[]).length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {(bookingData.trip_images as string[]).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(idx);
                          }}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? "bg-white w-3" : "bg-white/50 hover:bg-white/80"}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Image
                  alt={String(bookingData.trip_name)}
                  src={typeof bookingData.trip_image === 'string' ? bookingData.trip_image : "/paymentBg.jpg"}
                  fill
                  className="object-cover"
                  priority
                />
              )}
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-sky-900 shadow-sm">
                Trip
              </div>
            </div>

            <p className="text-[22px] sm:text-[26px] md:text-[28px] mt-3 mb-1 font-semibold leading-tight">
              {String(bookingData.trip_name)}
            </p>

            <div className="flex flex-col gap-1 mb-2">
              <span className="text-sm font-medium text-gray-600">Boat: {String(bookingData.boat_name)}</span>
              {/* Rating under Boat Name */}
              <div className="flex flex-wrap text-[#CEAF6E] items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <IoStarSharp key={i} size={16} className={`sm:size-[18px] ${i < Math.floor(Number(bookingData.boat_rating || 0)) ? "opacity-100" : "opacity-30"}`} />
                  ))}
                </div>
                <IoMdThumbsUp size={18} className="ml-1 text-[#CEAF6E]" />
                <div className="flex gap-1 text-[#7D7D7D] text-xs sm:text-sm">
                  <span>{Number(bookingData.boat_rating || 0).toFixed(1)}</span>
                  <span>({Number(bookingData.boat_total_reviews || 0)})</span>
                </div>
              </div>
            </div>

            {bookingData.trip_description && (
              <p className="text-sm text-gray-500 mb-2 line-clamp-3 leading-relaxed">
                {String(bookingData.trip_description)}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="relative h-[160px] sm:h-[200px] md:h-[240px] overflow-hidden rounded-md">
              <Image
                alt={String(bookingData.boat_name || 'Boat')}
                src={typeof bookingData.boat_image === 'string' ? bookingData.boat_image : "/paymentBg.jpg"}
                fill
                className="object-cover"
                priority
              />
            </div>

            <p className="text-[22px] sm:text-[26px] md:text-[28px] mt-3 mb-2 font-semibold leading-tight">
              {String(bookingData.boat_name || '')}
            </p>

            {/* Default Boat Rating (Non-trip) */}
            <div className="flex flex-wrap text-[#CEAF6E] items-center gap-2 mb-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <IoStarSharp key={i} size={18} className={`sm:size-[20px] ${i < Math.floor(Number(bookingData.boat_rating || 0)) ? "opacity-100" : "opacity-30"}`} />
                ))}
              </div>
              <IoMdThumbsUp size={22} className="ml-1 sm:ml-2 text-[#CEAF6E]" />
              <div className="flex gap-1 text-[#7D7D7D] text-sm sm:text-base">
                <span>{Number(bookingData.boat_rating || 0).toFixed(1)}</span>
                <span>({Number(bookingData.boat_total_reviews || 0)})</span>
              </div>
            </div>
          </>
        )}
      </TripDetailsCell>

      {/* === 2. Booking Details === */}
      <TripDetailsCell>
        <div className="flex flex-col gap-3 sm:gap-4">
          <TripDetailsCellItem
            Icon={FaRegClock}
            description={`${formatDate(String(bookingData.start_date))} - ${getDurationText()}`}
          />
          <TripDetailsCellItem
            Icon={MdOutlineGroups2}
            description={(() => {
              const adults = `${String(bookingData.guest_count)} Adult${Number(bookingData.guest_count) !== 1 ? 's' : ''}`;
              const children = bookingData.children_count && Number(bookingData.children_count) > 0
                ? `, ${String(bookingData.children_count)} Child${Number(bookingData.children_count) !== 1 ? 'ren' : ''}`
                : '';
              return `${adults}${children}`;
            })()}
          />
        </div>
      </TripDetailsCell>

      {/* === 3. Cancellation Policy === */}
      <TripDetailsCell>
        <TripDetailsCellItem
          Icon={HiLockOpen}
          description="Free cancellation"
          details="Until 24 hours before trip"
        />
      </TripDetailsCell>

      {/* === 4. Total Section === */}
      <TripDetailsCell grayBg>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
          <p className="text-base sm:text-lg font-semibold">Total</p>
          <div className="text-right sm:text-left">
            <p className="text-lg sm:text-xl mb-0.5 font-semibold">
              {typeof bookingData.total_price === 'number' ? bookingData.total_price.toFixed(0) : (typeof bookingData.base_price === 'number' ? bookingData.base_price.toFixed(0) : '0')} EGP
            </p>
            <p className="text-[#A0A0A0] text-xs sm:text-sm font-normal">
              {typeof bookingData.service_fee === 'number' && `Including service fee: ${bookingData.service_fee.toFixed(0)} EGP`}
            </p>
          </div>
        </div>
      </TripDetailsCell>
    </div>
  );
}
