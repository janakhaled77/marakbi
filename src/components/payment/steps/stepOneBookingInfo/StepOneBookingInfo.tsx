"use client";

import React from "react";
import { useRouter } from "next/navigation";
import TripDetails from "./tripDetails/TripDetails";
import useFormStep from "@/hooks/useFormStep";
import useBookingStore from "@/hooks/useBookingStore";
import Image from "next/image";
import { IoArrowBack } from "react-icons/io5";

export default function StepOneBookingInfo() {
  const router = useRouter();
  const { setStep, completeStep } = useFormStep();
  const bookingData = useBookingStore((s) => s.bookingData);

  if (!bookingData) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-900"></div>
      </div>
    );
  }
  const handleBack = () => {
    // Navigate explicitly to boat details page instead of router.back(),
    // because history may point to /login in the login-redirect flow.
    let url = `/boat-details/${bookingData.boat_id}`;
    if (bookingData.trip_id) {
      url += `?trip_id=${bookingData.trip_id}`;
    }
    router.push(url);
  };

  return (
    <div
      className="
        flex flex-col-reverse lg:flex-row 
        justify-between 
        gap-8 md:gap-12 lg:gap-24 xl:gap-32 
        w-full 
        px-4 sm:px-6 lg:px-0
      "
    >
      {/* Left side: Booking details */}
      <div className="w-full lg:w-[60%]">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-600 hover:text-sky-900"
            aria-label="Go back"
          >
            <IoArrowBack size={22} />
          </button>
          <h2 className="text-2xl font-bold font-poppins">Booking Information</h2>
        </div>

        {/* Booking Details */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <div className="flex gap-4">
            {typeof bookingData.boat_image === 'string' && bookingData.boat_image && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={bookingData.boat_image}
                  alt={String(bookingData.boat_name || 'Boat')}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2 font-poppins ">{String(bookingData.boat_name || '')}</h3>
              <div className="space-y-1 text-gray-600">
                <p>
                  Rental Type: {
                    bookingData.rental_type === 'hourly' ? 'Per Hour' :
                      bookingData.rental_type === 'trip' ? 'Trip' : 'Per Day'
                  }
                </p>
                {!!bookingData.hours && (
                  <p>Duration: {String(bookingData.hours)} hour{Number(bookingData.hours) > 1 ? 's' : ''}</p>
                )}
                {!!bookingData.days && (
                  <p>Duration: {String(bookingData.days)} day{Number(bookingData.days) > 1 ? 's' : ''}</p>
                )}
                <p>Adults: {String(bookingData.guest_count)}</p>
                {!!bookingData.children_count && Number(bookingData.children_count) > 0 && (
                  <p>Children: {String(bookingData.children_count)}</p>
                )}
                <p className="text-sm">
                  {new Date(String(bookingData.start_date)).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Pricing */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-4 font-poppins">Price Breakdown</h3>
          <div className="space-y-2">
            {typeof bookingData.base_price === 'number' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Base Price</span>
                <span className="font-semibold">{bookingData.base_price.toFixed(0)} EGP</span>
              </div>
            )}
            {/* Selected Services Breakdown */}
            {Array.isArray(bookingData.selected_services) && bookingData.selected_services.length > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Add-on Services</span>
                  <span className="font-semibold">{typeof bookingData.services_total === 'number' ? bookingData.services_total.toFixed(0) : '0'} EGP</span>
                </div>                {bookingData.selected_services.map((svc: { service_id: number; name: string; price: number; price_mode: string; calculated_price: number; person_count?: number }) => (
                  <div key={svc.service_id} className="flex justify-between pl-4">
                    <span className="text-gray-400 text-sm">
                      {svc.name}
                      {svc.price_mode !== 'per_trip' && svc.person_count && (
                        <span className="text-gray-300 text-xs ml-1">
                          ({svc.price} × {svc.person_count}{svc.price_mode === 'per_person_per_time' && svc.price > 0 && svc.person_count > 0 ? ` × ${Math.round(svc.calculated_price / (svc.price * svc.person_count))}h` : ''})
                        </span>
                      )}
                    </span>
                    <span className="text-gray-500 text-sm">{svc.calculated_price.toFixed(0)} EGP</span>
                  </div>
                ))}
              </>
            )}
            {typeof bookingData.service_fee === 'number' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee </span>
                <span className="font-semibold">{bookingData.service_fee.toFixed(0)} EGP</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold text-sky-900">
                  {typeof bookingData.total_price === 'number' ? bookingData.total_price.toFixed(0) : (typeof bookingData.base_price === 'number' ? bookingData.base_price.toFixed(0) : '0')} EGP
                </span>
              </div>
            </div>
          </div>        </div>        <button
            onClick={() => { completeStep(1); setStep(2); }}
            className="mt-6 w-full px-6 py-3 bg-sky-900 text-white rounded-lg hover:bg-sky-800 transition-colors"
          >
          Continue
        </button>
      </div>

      {/* Right side: Trip details */}
      <div className="w-full lg:w-[40%]">
        <TripDetails />
      </div>
    </div >
  );
}
