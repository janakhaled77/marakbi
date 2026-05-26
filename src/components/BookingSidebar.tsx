"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { clientApi, BoatServiceAssignment } from "@/lib/api";
import useBookingStore from "@/hooks/useBookingStore";

interface BookedSlot {
    start: string;
    end: string;
    start_date: string;
    end_date: string;
    booking_type: string; // 'hourly', 'daily', 'trip'
    is_full_day: boolean;
}

interface BookingSidebarProps {
    boatId: number;
    boatName: string;
    pricePerHour: number | null;
    pricePerDay?: number | null;
    maxGuests: number;
    serviceFeeRate: number;
    onBookingRequest: (bookingData: BookingData) => void;
    // New props for Trip Booking
    isTripBooking?: boolean;
    tripDuration?: number;
    tripPrice?: number;
    initialGuestCount?: number;
    locationUrl?: string;
    priceMode?: "per_time" | "per_hour" | "per_day" | "per_person" | "per_person_per_time";
    // Boat services
    boatServices?: BoatServiceAssignment[];
    // Service selection state lifted to parent so Available Services cards can drive it
    selectedServiceIds: Set<number>;
    setSelectedServiceIds: React.Dispatch<React.SetStateAction<Set<number>>>;
    servicePersonCounts: Map<number, number>;
    setServicePersonCounts: React.Dispatch<React.SetStateAction<Map<number, number>>>;
    // Children pricing props
    childrenAllowed?: boolean;
    childPrice?: number | null;
    minChildAge?: number;
    maxChildAge?: number;
}

export interface SelectedServiceItem {
    service_id: number;
    name: string;
    price: number;
    price_mode: string;
    calculated_price: number;
    person_count?: number;
}

export interface BookingData {
    boat_id: number;
    boat_name: string;
    guest_count: number;
    children_count?: number;
    rental_type: "hourly" | "daily" | "trip";
    hours?: number;
    start_date: string;
    end_date: string;
    days?: number;
    base_price: number;
    service_fee: number;
    total_price: number;
    trip_id?: number;
    selected_services?: SelectedServiceItem[];
    services_total?: number;
}

type RentalType = "hour" | "day" | "trip";

export default function BookingSidebar({
    boatId,
    boatName,
    pricePerHour,
    pricePerDay,
    maxGuests,
    serviceFeeRate,
    onBookingRequest,
    isTripBooking = false,
    tripDuration = 0,
    tripPrice = 0,
    initialGuestCount = 2,
    locationUrl,
    priceMode = "per_time",
    boatServices = [],
    selectedServiceIds,
    setSelectedServiceIds,
    servicePersonCounts,
    setServicePersonCounts,
    childrenAllowed = true,
    childPrice = null,
    minChildAge = 0,
    maxChildAge = 12,
}: BookingSidebarProps) {
    // Restore previous selections from Zustand store (e.g. when navigating back from payment)
    const getStoredBooking = () => {
        const stored = useBookingStore.getState().bookingData;
        if (stored && stored.boat_id === boatId) return stored;
        return null;
    };

    const [rentalType, setRentalType] = useState<RentalType>(() => {
        const s = getStoredBooking();
        if (s) {
            if (s.rental_type === 'hourly') return 'hour';
            if (s.rental_type === 'daily') return 'day';
            if (s.rental_type === 'trip') return 'trip';
        }
        if (isTripBooking) return "trip";
        if (pricePerHour) return "hour";
        return "day";
    });
    const [guestCount, setGuestCount] = useState(() => {
        const s = getStoredBooking();
        return s ? s.guest_count : initialGuestCount;
    });
    const [includeChildren, setIncludeChildren] = useState(false);
    const [childrenCount, setChildrenCount] = useState(0);
    // Service selection state is owned by parent (boat-details page) so service cards drive it
    // const [hours, setHours] = useState(1); // Removed in favor of start/end time
    const [startTime, setStartTime] = useState<string>(() => {
        const s = getStoredBooking();
        if (s?.start_date) {
            const d = new Date(s.start_date as string);
            return `${d.getUTCHours().toString().padStart(2, '0')}:00`;
        }
        return "";
    });
    const [endTime, setEndTime] = useState<string>(() => {
        const s = getStoredBooking();
        if (s?.end_date && (s.rental_type === 'hourly' || s.rental_type === 'trip')) {
            const d = new Date(s.end_date as string);
            return `${d.getUTCHours().toString().padStart(2, '0')}:00`;
        }
        return "";
    });
    const [selectedDates, setSelectedDates] = useState<Date[]>(() => {
        const s = getStoredBooking();
        if (s?.start_date) {
            const start = new Date(s.start_date as string);
            const startLocal = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
            if (s.rental_type === 'daily' && s.end_date) {
                const end = new Date(s.end_date as string);
                const endLocal = new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
                if (startLocal.getTime() !== endLocal.getTime()) {
                    return [startLocal, endLocal];
                }
            }
            return [startLocal];
        }
        return [];
    });
    const [currentMonth, setCurrentMonth] = useState(() => {
        const s = getStoredBooking();
        if (s?.start_date) {
            const d = new Date(s.start_date as string);
            return new Date(d.getUTCFullYear(), d.getUTCMonth(), 1);
        }
        return new Date();
    });
    const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Calendar booked dates state
    const [calendarBookedDates, setCalendarBookedDates] = useState<Record<string, {
        has_hourly: boolean;
        has_full_day: boolean;
        bookings: { start: string; end: string; type: string }[];
    }>>({});
    const [loadingCalendar, setLoadingCalendar] = useState(false);

    // Fetch booked dates for the calendar when month changes
    useEffect(() => {
        const fetchCalendarDates = async () => {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1; // 1-indexed

            setLoadingCalendar(true);
            try {
                const response = await clientApi.getBoatBookedDates(boatId, year, month);
                if (response.success && response.data) {
                    setCalendarBookedDates(response.data.booked_dates || {});
                } else {
                    setCalendarBookedDates({});
                }
            } catch (error) {
                console.error("Failed to fetch calendar dates:", error);
                setCalendarBookedDates({});
            } finally {
                setLoadingCalendar(false);
            }
        };

        fetchCalendarDates();
    }, [boatId, currentMonth]);

    // Fetch booked slots when a date is selected (for hourly bookings)
    useEffect(() => {
        const fetchBookedSlots = async () => {
            if (selectedDates.length === 0) {
                setBookedSlots([]);
                return;
            }

            // Helper for local date string
            const formatDateLocal = (d: Date) => {
                const y = d.getFullYear();
                const m = (d.getMonth() + 1).toString().padStart(2, '0');
                const day = d.getDate().toString().padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            const selectedDate = selectedDates[0];
            const dateStr = formatDateLocal(selectedDate);

            // For daily bookings with range, use end date too
            let endDateStr: string | undefined;
            if (rentalType === "day" && selectedDates.length === 2) {
                endDateStr = formatDateLocal(selectedDates[1]);
            } else if (rentalType === "trip") {
                // For trip, calculate potential end date based on duration to fetch all relevant bookings
                // Add buffer days potentially covered by the trip
                // tripDuration is in hours
                const daysCovered = Math.ceil(tripDuration / 24);
                if (daysCovered > 0) {
                    const endDate = new Date(selectedDate);
                    endDate.setDate(endDate.getDate() + daysCovered);
                    endDateStr = formatDateLocal(endDate);
                }
            }

            setLoadingSlots(true);
            try {
                const response = await clientApi.getBoatBookedSlots(boatId, dateStr, endDateStr);
                if (response.success && response.data) {
                    setBookedSlots(response.data.booked_slots || []);
                } else {
                    setBookedSlots([]);
                }
            } catch (error) {
                console.error("Failed to fetch booked slots:", error);
                setBookedSlots([]);
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchBookedSlots();
    }, [selectedDates, boatId, rentalType, tripDuration]);

    // Check if a date is fully booked (has daily/trip booking or hourly rental not available)
    const isDateFullyBooked = (date: Date): boolean => {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const info = calendarBookedDates[dateStr];
        if (!info) return false;

        // Date is fully booked if it has a daily or trip booking
        return info.has_full_day;
    };

    // Check if date has any booking (for visual indicator)
    const dateHasBooking = (date: Date): { hasBooking: boolean; isFullDay: boolean } => {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const info = calendarBookedDates[dateStr];
        if (!info) return { hasBooking: false, isFullDay: false };

        return {
            hasBooking: info.has_hourly || info.has_full_day,
            isFullDay: info.has_full_day
        };
    };

    // Helper to check if a time overlaps with any booked slot
    const isTimeBooked = (time: string, isEndTime: boolean = false): boolean => {
        const timeHour = parseInt(time.split(":")[0]);

        // Special validation for Trip Booking
        if (rentalType === "trip") {
            // For Trip, we need to check if the Trip Start Time + Duration overlaps with ANY booked slot
            if (selectedDates.length === 0) return false;

            const tripStart = new Date(selectedDates[0]);
            const [h, m] = time.split(':');
            tripStart.setHours(parseInt(h), parseInt(m), 0, 0);

            const tripEnd = new Date(tripStart);
            tripEnd.setHours(tripStart.getHours() + Number(tripDuration));

            // Check against all booked slots
            for (const slot of bookedSlots) {
                // Parse slot start/end to Date objects
                // slot.start_date is YYYY-MM-DD
                // slot.start is HH:MM
                const slotStart = new Date(`${slot.start_date}T${slot.start}:00`);
                const slotEnd = new Date(`${slot.end_date}T${slot.end}:00`);

                // Check overlap: start1 < end2 AND start2 < end1
                if (tripStart < slotEnd && slotStart < tripEnd) {
                    return true;
                }
            }
            return false;
        }

        // Standard validation for Hourly/Daily (intra-day checks usually)
        for (const slot of bookedSlots) {
            // If checking simple hourly within single day, we can use simple hour comparison
            // BUT bookedSlots now contains multi-day slots potentially.
            // So we should be careful.
            // If rentalType is 'hour', selectedDates has 1 day. bookedSlots filtered by that day?
            // getBoatBookedSlots response includes `start_date` and `end_date`.

            // Simplification: checking hour overlap on the SELECTED date
            if (selectedDates.length === 0) continue;

            const sd = selectedDates[0];
            const y = sd.getFullYear();
            const m = (sd.getMonth() + 1).toString().padStart(2, '0');
            const d = sd.getDate().toString().padStart(2, '0');
            const selectedDateStr = `${y}-${m}-${d}`;

            if (slot.start_date && slot.end_date && slot.start_date <= selectedDateStr && slot.end_date >= selectedDateStr) {
                // This slot covers (partially or fully) the selected date

                // If full day booking, everything is booked
                if (slot.is_full_day) return true;

                // If hourly booking on the same day, check hours
                // Need to parse hours relative to the day
                const slotStartHour = parseInt(slot.start.split(":")[0]);
                const slotEndHour = parseInt(slot.end.split(":")[0]);

                // Adjust for multi-day hourly bookings? (Unlikely for 'hourly' rental type booking to be multi-day but backend supports it)
                // Assuming hourly bookings are within a day for comparison simplicty on frontend map

                if (isEndTime) {
                    if (startTime) {
                        const selectedStart = parseInt(startTime.split(":")[0]);
                        if (selectedStart < slotEndHour && timeHour > slotStartHour) {
                            return true;
                        }
                    }
                } else {
                    if (timeHour >= slotStartHour && timeHour < slotEndHour) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    // Get available end time options based on start time and booked slots
    const getEndTimeOptions = () => {
        if (!startTime) return [];

        const startHour = parseInt(startTime.split(":")[0]);
        const endOptions: string[] = [];

        // Find the next booked slot after the start time on the same day
        let maxEndHour = 24;

        if (selectedDates.length > 0) {
            const sd = selectedDates[0];
            const y = sd.getFullYear();
            const m = (sd.getMonth() + 1).toString().padStart(2, '0');
            const d = sd.getDate().toString().padStart(2, '0');
            const selectedDateStr = `${y}-${m}-${d}`;

            for (const slot of bookedSlots) {
                // Only care about slots on this day
                if (slot.start_date && slot.end_date && (slot.start_date > selectedDateStr || slot.end_date < selectedDateStr)) continue;

                const slotStart = parseInt(slot.start.split(":")[0]);
                if (slotStart > startHour && slotStart < maxEndHour) {
                    maxEndHour = slotStart;
                }
            }
        }

        // Generate end time options from start+1 to maxEndHour
        for (let h = startHour + 1; h <= maxEndHour; h++) {
            endOptions.push(`${h.toString().padStart(2, "0")}:00`);
        }

        return endOptions;
    };    useEffect(() => {
        if (isTripBooking) {
            setRentalType("trip");
        } else {
            // Reset to defaults if switching back (though unlikely in this flow)
            if (rentalType === 'trip') setRentalType('hour');
        }
    }, [isTripBooking]);    useEffect(() => {
        // Don't override guest count if restoring from Zustand store
        const stored = useBookingStore.getState().bookingData;
        if (stored && stored.boat_id === boatId) return;
        if (initialGuestCount) {
            setGuestCount(initialGuestCount);
        }
    }, [initialGuestCount, boatId]);

    useEffect(() => {
        // Ensure guestCount is within valid range upon initialization
        if (initialGuestCount > maxGuests) {
            setGuestCount(maxGuests);
        }
    }, [initialGuestCount, maxGuests]);

    // Reset end time when start time changes or booked slots change
    useEffect(() => {
        if (startTime && bookedSlots.length > 0) {
            const endOptions = getEndTimeOptions();
            if (endTime && !endOptions.includes(endTime)) {
                setEndTime("");
            }
        }
    }, [startTime, bookedSlots]);


    // Generate time options (24h format, e.g., "08:00", "09:00")
    const timeOptions = Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, "0");
        return `${hour}:00`;
    });

    // Helper to check if a date should be disabled (today or past)
    const isDateDisabled = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Disable past dates AND today (must be at least tomorrow)
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return date < tomorrow;
    };

    // Calculate price
    const calculatePrice = () => {
        let basePrice = 0;
        let days = 0;
        let calculatedHours = 0;

        if (rentalType === "trip") {
            basePrice = tripPrice;
            // Set duration for display/logic
            calculatedHours = tripDuration;
        } else if (rentalType === "hour") {
            if (startTime && endTime) {
                const startHour = parseInt(startTime.split(":")[0]);
                const endHour = parseInt(endTime.split(":")[0]);
                if (endHour > startHour) {
                    calculatedHours = endHour - startHour;

                    if (priceMode === 'per_person') {
                        basePrice = (pricePerHour || 0) * guestCount;
                    } else if (priceMode === 'per_person_per_time') {
                        basePrice = (pricePerHour || 0) * guestCount * calculatedHours;
                    } else {
                        basePrice = (pricePerHour || 0) * calculatedHours;
                    }
                }
            }
        } else if (rentalType === "day") {
            if (selectedDates.length > 0) {
                if (selectedDates.length === 2) {
                    const start = selectedDates[0];
                    const end = selectedDates[1];
                    days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                } else {
                    days = 1;
                }
                const effectivePriceCalc = pricePerDay || (pricePerHour ? pricePerHour * 8 : 0);

                if (priceMode === 'per_person' || priceMode === 'per_person_per_time') {
                    basePrice = effectivePriceCalc * days * guestCount;
                } else {
                    basePrice = effectivePriceCalc * days;
                }
            }
        }

        // Children pricing calculation
        let childrenTotal = 0;
        if (includeChildren && childrenCount > 0 && childPrice && childPrice > 0) {
            if (priceMode === 'per_person') {
                childrenTotal = childPrice * childrenCount;
            } else if (priceMode === 'per_person_per_time') {
                if (rentalType === 'day') {
                    childrenTotal = childPrice * childrenCount * (days || 1);
                } else {
                    childrenTotal = childPrice * childrenCount * (calculatedHours || 1);
                }
            }
            // For per_time / per_trip modes, no extra charge for children
        }
        basePrice += childrenTotal;

        // Calculate selected services total
        let servicesTotal = 0;
        const selectedServicesArr: SelectedServiceItem[] = [];
        boatServices.forEach(svcAssign => {
            if (!selectedServiceIds.has(svcAssign.service_id)) return;
            const svc = svcAssign.service;
            const svcPrice = svcAssign.price ?? svc?.default_price ?? 0;
            const svcPriceMode = svc?.price_mode || 'per_trip';
            let calculatedSvcPrice = 0;

            const perPersonAllRequired = svcAssign.per_person_all_required !== false;
            const isPerPerson = svcPriceMode === 'per_person' || svcPriceMode === 'per_person_per_time';
            const maxPeople = guestCount + (includeChildren ? childrenCount : 0);
            let svcPersonCount = (!perPersonAllRequired && isPerPerson)
                ? (servicePersonCounts.get(svcAssign.service_id) ?? maxPeople)
                : maxPeople;
            if (svcPersonCount > maxPeople) {
                svcPersonCount = maxPeople;
            }

            if (svcPriceMode === 'per_trip') {
                calculatedSvcPrice = svcPrice;
            } else if (svcPriceMode === 'per_person') {
                calculatedSvcPrice = svcPrice * svcPersonCount;
            } else if (svcPriceMode === 'per_person_per_time') {
                const hrs = calculatedHours || (days * 8) || 1;
                calculatedSvcPrice = svcPrice * svcPersonCount * hrs;
            }

            servicesTotal += calculatedSvcPrice;
            selectedServicesArr.push({
                service_id: svcAssign.service_id,
                name: svc?.name || 'Service',
                price: svcPrice,
                price_mode: svcPriceMode,
                calculated_price: calculatedSvcPrice,
                person_count: isPerPerson ? svcPersonCount : undefined,
            });
        });

        // Service fee calculation based on base price + services
        const totalBeforeFee = basePrice + servicesTotal;
        const serviceFee = Math.round(totalBeforeFee * serviceFeeRate);
        const total = totalBeforeFee + serviceFee;

        return { basePrice, serviceFee, total, days, calculatedHours, servicesTotal, selectedServicesArr, childrenTotal };
    };

    const { basePrice, serviceFee, total, days, calculatedHours, servicesTotal, selectedServicesArr, childrenTotal } = calculatePrice();

    // Calendar helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth(); // Keep as number (0-11)
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

    const handleDateClick = (day: number) => {
        const clickedDate = new Date(year, month, day);

        if (isDateDisabled(clickedDate)) return;

        if (rentalType === "day") {
            // Range selection for daily
            if (selectedDates.length === 0 || selectedDates.length === 2) {
                // Starting a new selection
                setSelectedDates([clickedDate]);
            } else if (selectedDates.length === 1) {
                // Completing a range
                const start = selectedDates[0];
                let rangeStart = start;
                let rangeEnd = clickedDate;

                if (clickedDate < start) {
                    rangeStart = clickedDate;
                    rangeEnd = start;
                }

                // VALIDATE RANGE
                // Rule: For Daily rental, days AFTER the start day must be fully free.
                let isValidRange = true;

                // Iterate from (rangeStart + 1 day) to rangeEnd
                const current = new Date(rangeStart);
                current.setDate(current.getDate() + 1);

                while (current <= rangeEnd) {
                    const check = dateHasBooking(current);
                    if (check.hasBooking) {
                        isValidRange = false;
                        break;
                    }
                    current.setDate(current.getDate() + 1);
                }

                if (!isValidRange) {
                    toast.error("Selection contains booked dates. Continuous days must be free.");
                    return;
                }

                if (clickedDate < start) {
                    setSelectedDates([clickedDate, start]);
                } else {
                    setSelectedDates([start, clickedDate]);
                }
            }
        } else {
            // Single date selection for hourly OR trip
            setSelectedDates([clickedDate]);
        }
    };

    const isDateSelected = (day: number) => {
        return selectedDates.some(
            (selectedDate) =>
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year
        );
    };

    const isDateInRange = (day: number) => {
        if (selectedDates.length !== 2) return false;
        const date = new Date(year, month, day);
        const [start, end] = selectedDates;
        return date >= start && date <= end;
    };

    const handleRequestToBook = () => {
        if (selectedDates.length === 0) {
            toast.error("Please select a date");
            return;
        }

        if (rentalType === "hour") {
            if (!startTime || !endTime) {
                toast.error("Please select start and end time");
                return;
            }
            const startHour = parseInt(startTime.split(":")[0]);
            const endHour = parseInt(endTime.split(":")[0]);
            if (endHour <= startHour) {
                toast.error("End time must be after start time");
                return;
            }
        }

        if ((rentalType === "day" || rentalType === "trip") && !startTime) {
            toast.error("Please select start time");
            return;
        }

        // Check for overlaps before proceeding
        if (rentalType === "day") {
            // For daily rental, check if the selected RANGE (startTime -> End of Trip) overlaps with any booking.
            // This allows "Partial Day" bookings if the start time is after existing slots.

            const hasOverlap = bookedSlots.some(slot => {
                // If slot is fully booked day, it overlaps
                if (slot.is_full_day) return true;

                // Check if slot overlaps with [StartDateTime, EndDateTime]
                const bookingStart = new Date(selectedDates[0]);
                const [h, m] = startTime.split(':');
                bookingStart.setHours(parseInt(h), parseInt(m), 0, 0);

                // End date is set to 23:59 of the target date (last selected date)
                const targetDate = selectedDates.length === 2 ? selectedDates[1] : selectedDates[0];
                const bookingEnd = new Date(targetDate);
                bookingEnd.setHours(23, 59, 59, 999);

                const slotStart = new Date(`${slot.start_date}T${slot.start}:00`);
                const slotEnd = new Date(`${slot.end_date}T${slot.end}:00`);

                return bookingStart < slotEnd && slotStart < bookingEnd;
            });

            if (hasOverlap) {
                toast.error("Selected time range overlaps with existing bookings.");
                return;
            }

        } else if (rentalType === "trip") {
            // For trip, check if the specific start time + duration has overlap
            if (isTimeBooked(startTime)) {
                toast.error("The selected trip duration overlaps with existing bookings.");
                return;
            }
        } else {
            // For hourly, check if start/end time overlaps
            // Start time validity
            if (isTimeBooked(startTime)) {
                toast.error("Start time is not available.");
                return;
            }
            // End time validity (check if range overlaps)
            // Simplified: if getting end time options respects bookings, then just checking valid range helps
            // But let's be safe: iterate hours between start and end
            const startH = parseInt(startTime.split(':')[0]);
            const endH = parseInt(endTime.split(':')[0]);
            for (let h = startH; h < endH; h++) {
                const timeStr = `${h.toString().padStart(2, '0')}:00`;
                if (isTimeBooked(timeStr)) {
                    toast.error("Selected time range overlaps with existing bookings.");
                    return;
                }
            }
        }

        // Combine date and time
        const formatDateAsUTC = (date: Date, timeStr: string) => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const [hours, minutes] = timeStr.split(':');

            return `${year}-${month}-${day}T${hours}:${minutes}:00.000Z`;
        };

        const startDateIso = formatDateAsUTC(selectedDates[0], startTime);

        let endDateIso: string;
        if (rentalType === "hour") {
            endDateIso = formatDateAsUTC(selectedDates[0], endTime);
        } else if (rentalType === "trip") {
            // Calculate end date based on duration
            const startDateTime = new Date(selectedDates[0]);
            const [hours, minutes] = startTime.split(':');
            startDateTime.setHours(parseInt(hours), parseInt(minutes));
            // Add duration hours
            const endDateTime = new Date(startDateTime.getTime() + tripDuration * 60 * 60 * 1000);

            const endYear = endDateTime.getFullYear();
            const endMonth = (endDateTime.getMonth() + 1).toString().padStart(2, '0');
            const endDay = endDateTime.getDate().toString().padStart(2, '0');
            const endH = endDateTime.getHours().toString().padStart(2, '0');
            const endM = endDateTime.getMinutes().toString().padStart(2, '0');
            endDateIso = `${endYear}-${endMonth}-${endDay}T${endH}:${endM}:00.000Z`;

        } else {
            // For daily, use the end date (or start date if single day selected)
            const targetDate = selectedDates.length === 2 ? selectedDates[1] : selectedDates[0];

            // Force end time to 23:59:59 for daily bookings (as per user request)
            const year = targetDate.getFullYear();
            const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
            const day = targetDate.getDate().toString().padStart(2, '0');
            endDateIso = `${year}-${month}-${day}T23:59:59.000Z`;
        }        const bookingData: BookingData = {
            boat_id: boatId,
            boat_name: boatName,
            guest_count: guestCount,
            children_count: includeChildren && childrenCount > 0 ? childrenCount : undefined,
            rental_type: rentalType === "hour" ? "hourly" : rentalType === "day" ? "daily" : "trip",
            hours: (rentalType === "hour" || rentalType === "trip") ? calculatedHours : undefined,
            start_date: startDateIso,
            end_date: endDateIso,
            days: days > 0 ? days : undefined,
            base_price: basePrice,
            service_fee: serviceFee,
            total_price: total,
            trip_id: isTripBooking ? undefined : undefined,
            selected_services: selectedServicesArr.length > 0 ? selectedServicesArr : undefined,
            services_total: servicesTotal > 0 ? servicesTotal : undefined,
        };

        onBookingRequest(bookingData);
    };

    // Reset start time if it becomes invalid (e.g. date changed to a booked one)
    useEffect(() => {
        if (startTime) {
            // If rental type is trip or hour, check isTimeBooked
            if ((rentalType === 'hour' || rentalType === 'trip') && isTimeBooked(startTime)) {
                setStartTime("");
            }
            // For daily, if bookedSlots > 0, maybe clear?
            if (rentalType === 'day' && bookedSlots.length > 0) {
                // For daily we assume if slots exist, the day is invalid. 
                // But we don't have a "time" to clear really, just the date selection is "bad".
                // We rely on toast error.
            }
        }
    }, [bookedSlots, rentalType, startTime]);

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const effectivePrice = rentalType === "hour"
        ? (pricePerHour || 0)
        : (pricePerDay || (pricePerHour ? pricePerHour * 8 : 0));

    // Determine Labels based on Price Mode
    let priceUnitLabel = "/Hour";
    let priceDailyUnitLabel = "/Day"; // Default

    if (priceMode === 'per_person') {
        priceUnitLabel = "/Person";
        priceDailyUnitLabel = "/Person/Day";
    } else if (priceMode === 'per_person_per_time') {
        priceUnitLabel = "/Person/Hr";
        priceDailyUnitLabel = "/Person/Day";
    }

    // Reset end time if it becomes invalid when start time changes
    useEffect(() => {
        if (startTime && endTime) {
            const startHour = parseInt(startTime.split(":")[0]);
            const endHour = parseInt(endTime.split(":")[0]);
            if (endHour <= startHour) {
                setEndTime(""); // Clear invalid end time
            }
        }
    }, [startTime, endTime]);

    const breakdownLabel = () => {
        if (isTripBooking) return 'Flat Rate';
        if (rentalType === 'day') {
            if (priceMode === 'per_person' || priceMode === 'per_person_per_time') {
                return `EGP ${Math.round(effectivePrice)} × ${guestCount} guests × ${days} days`;
            }
            return `EGP ${Math.round(effectivePrice)} × ${days} days`;
        }

        // Hourly Logic Breakdown
        const hourly = Math.round(pricePerHour || 0);
        if (priceMode === 'per_person') {
            return `EGP ${hourly} × ${guestCount} guests`;
        } else if (priceMode === 'per_person_per_time') {
            return `EGP ${hourly} × ${guestCount} guests × ${calculatedHours} hours`;
        } else {
            // Standard
            return `EGP ${hourly} × ${calculatedHours} hours`;
        }
    };

    return (
        <div className="bg-white rounded-lg border border-stone-300 p-4 shadow-lg">
            {!isTripBooking ? (
                /* Rental Type Tabs - Hide for Trip Booking */
                <div className="flex justify-start items-center gap-2 mb-6">
                    {pricePerHour && (
                        <button
                            onClick={() => {
                                setRentalType("hour");
                                setSelectedDates([]);
                                setStartTime("");
                                setEndTime("");
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-normal font-poppins transition-colors ${rentalType === "hour"
                                ? "bg-[#0F3875] text-white"
                                : "border border-zinc-400 text-zinc-500 hover:bg-gray-50"
                                }`}
                        >
                            Per Hour
                        </button>
                    )}
                    {pricePerDay && (
                        <button
                            onClick={() => {
                                setRentalType("day");
                                setSelectedDates([]);
                                setStartTime("");
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-normal font-poppins transition-colors ${rentalType === "day"
                                ? "bg-[#0F3875] text-white"
                                : "border border-zinc-400 text-zinc-500 hover:bg-gray-50"
                                }`}
                        >
                            Per Day
                        </button>
                    )}
                    <a
                        href="https://wa.me/201031416900"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg text-sm font-normal font-poppins border border-zinc-400 text-zinc-500 hover:bg-gray-50 transition-colors"
                    >
                        Custom Request
                    </a>
                </div>
            ) : (
                <div className="mb-4">
                    {/* Trip Info removed as per design */}
                </div>
            )}

            {/* Pricing Display */}
            {!isTripBooking && (
                <div className="flex justify-between items-center mb-6">
                    <div className="text-zinc-950 text-2xl font-semibold font-poppins capitalize">
                        Pricing
                    </div>
                    <div className="text-right">
                        <span className="text-[#106BD8] text-xl font-semibold font-poppins capitalize">
                            {Math.round(effectivePrice)}
                        </span>
                        <span className="text-black text-sm font-normal font-poppins capitalize">
                            {" "}EGP {rentalType === "day" ? priceDailyUnitLabel : priceUnitLabel}
                        </span>
                    </div>
                </div>
            )}

            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={() => setCurrentMonth(new Date(year, month - 1))}
                    className="p-1 hover:bg-gray-100 rounded-full"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <div className="text-stone-950 text-base font-semibold font-inter">
                    {monthNames[month]} {year}
                </div>
                <button
                    onClick={() => setCurrentMonth(new Date(year, month + 1))}
                    className="p-1 hover:bg-gray-100 rounded-full"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="mb-6">
                <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                    {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                        <div key={day} className="text-zinc-500 text-xs font-normal font-inter">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: startingDayOfWeek - 1 }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const date = new Date(year, month, day);
                        const isDisabled = isDateDisabled(date);
                        const isSelected = isDateSelected(day);
                        const isInRange = isDateInRange(day);

                        // Check booking status for this date
                        const fullyBooked = isDateFullyBooked(date);
                        const bookingInfo = dateHasBooking(date);

                        // For daily/trip rentals, disable fully booked dates
                        // For hourly rentals, allow selection but will show time restrictions
                        const shouldDisable = isDisabled || (rentalType !== "hour" && fullyBooked);

                        return (
                            <button
                                key={day}
                                onClick={() => handleDateClick(day)}
                                disabled={shouldDisable}
                                title={fullyBooked ? "Fully booked" : bookingInfo.hasBooking ? "Has bookings" : ""}
                                className={`
                                    h-8 w-8 rounded-full flex items-center justify-center text-sm font-inter transition-colors relative
                                    ${isSelected
                                        ? "bg-[#0F3875] text-white hover:bg-[#0A2755]"
                                        : isInRange
                                            ? "bg-[#E6F0FF] text-[#0F3875]"
                                            : isDisabled
                                                ? "text-gray-300 cursor-not-allowed" // Past dates
                                                : fullyBooked
                                                    ? `text-red-400 line-through ${shouldDisable ? "cursor-not-allowed" : "hover:bg-gray-100"}`
                                                    : "text-stone-700 hover:bg-gray-100"
                                    }
                                `}
                            >
                                {day}
                                {/* Show indicator dot for dates with bookings */}
                                {bookingInfo.hasBooking && !isSelected && (
                                    <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${bookingInfo.isFullDay ? "bg-red-400" : "bg-orange-400"
                                        }`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-zinc-500 text-xs font-normal font-poppins mb-1.5">
                        Start Time {loadingSlots && <span className="text-gray-400">(loading...)</span>}
                    </label>
                    <div className="relative">
                        <select
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full h-9 px-3 bg-white rounded border border-neutral-200 text-stone-900 text-sm font-normal font-poppins focus:outline-none focus:border-[#0F3875] appearance-none cursor-pointer"
                            id="startTimeSelect"
                            disabled={loadingSlots}
                        >
                            <option value="">Select</option>
                            {timeOptions.map((time) => {
                                const booked = isTimeBooked(time, false);
                                return (
                                    <option
                                        key={time}
                                        value={time}
                                        disabled={booked}
                                        className={booked ? "text-gray-400" : ""}
                                    >
                                        {time}{booked ? " (Booked)" : ""}
                                    </option>
                                );
                            })}
                        </select>
                        <div
                            className="absolute inset-y-0 right-0 flex items-center px-2 cursor-pointer"
                            onClick={() => {
                                const select = document.querySelector('#startTimeSelect') as HTMLSelectElement;
                                if (select && typeof select.showPicker === 'function') {
                                    select.showPicker();
                                }
                            }}
                        >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                {rentalType === "hour" && (
                    <div>
                        <label className="block text-zinc-500 text-xs font-normal font-poppins mb-1.5">
                            End Time
                        </label>
                        <div className="relative">
                            <select
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full h-9 px-3 bg-white rounded border border-neutral-200 text-stone-900 text-sm font-normal font-poppins focus:outline-none focus:border-[#0F3875] appearance-none cursor-pointer"
                                id="endTimeSelect"
                            >
                                <option value="">Select</option>
                                {getEndTimeOptions().map((time) => (
                                    <option key={time} value={time}>
                                        {time}
                                    </option>
                                ))}
                            </select>
                            <div
                                className="absolute inset-y-0 right-0 flex items-center px-2 cursor-pointer"
                                onClick={() => {
                                    const select = document.querySelector('#endTimeSelect') as HTMLSelectElement;
                                    if (select && typeof select.showPicker === 'function') {
                                        select.showPicker();
                                    }
                                }}
                            >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}
                {/* For Trip Type, we hide end time selection as it's calculated */}
            </div>

            {/* Guest Count */}
            <div className="mb-6">
                <label className="flex items-center gap-2 text-stone-700 text-sm font-normal font-poppins mb-3">
                    <span className="text-zinc-500">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.5 7.8125C9.39844 7.8125 10.9375 6.27344 10.9375 4.375C10.9375 2.47656 9.39844 0.9375 7.5 0.9375C5.60156 0.9375 4.0625 2.47656 4.0625 4.375C4.0625 6.27344 5.60156 7.8125 7.5 7.8125ZM9.80469 8.75H5.19531C2.96484 8.75 1.17188 10.543 1.17188 12.7734V13.4375C1.17188 13.7852 1.45312 14.0625 1.80078 14.0625H13.1992C13.5469 14.0625 13.8281 13.7852 13.8281 13.4375V12.7734C13.8281 10.543 12.0352 8.75 9.80469 8.75Z" fill="#757575" />
                        </svg>
                    </span>
                    Number of guests
                </label>
                <div className="flex items-center justify-between h-11 px-4 py-2.5 bg-white rounded border border-neutral-200">
                    <button
                        onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                        className="text-stone-900 text-xl font-medium"
                    >
                        −
                    </button>
                    <span className="text-stone-900 text-sm font-medium font-poppins">
                        {guestCount}
                    </span>
                    <button
                        onClick={() => setGuestCount(Math.min(maxGuests - (includeChildren ? childrenCount : 0), guestCount + 1))}
                        className={`text-stone-900 text-xl font-medium ${guestCount >= maxGuests - (includeChildren ? childrenCount : 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={guestCount >= maxGuests - (includeChildren ? childrenCount : 0)}
                    >
                        +
                    </button>                </div>
            </div>

            {childrenAllowed !== false && (
            <div className="mb-6">
                <label
                    className={`flex items-center gap-2 mb-3 ${(!includeChildren && guestCount >= maxGuests) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={(e) => {
                        if (!includeChildren && guestCount >= maxGuests) {
                            e.preventDefault();
                            return;
                        }
                        const newIncludeChildren = !includeChildren;
                        setIncludeChildren(newIncludeChildren);
                        if (newIncludeChildren) {
                            setChildrenCount(1);
                        } else {
                            setChildrenCount(0);
                        }
                    }}
                >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        includeChildren ? 'bg-[#0F3875] border-[#0F3875]' : 'border-gray-300'
                    }`}>
                        {includeChildren && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                    <span className="text-stone-700 text-sm font-normal font-poppins">Children ({minChildAge}–{maxChildAge} years)</span>
                </label>
                {(!includeChildren && guestCount >= maxGuests) && (
                    <p className="text-xs text-amber-600 mb-3 -mt-2">Cannot add children, max capacity reached</p>
                )}
                {includeChildren && (
                    <>
                        <label className="flex items-center gap-2 text-stone-700 text-sm font-normal font-poppins mb-3">
                            <span className="text-zinc-500">
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7.5 7.8125C9.39844 7.8125 10.9375 6.27344 10.9375 4.375C10.9375 2.47656 9.39844 0.9375 7.5 0.9375C5.60156 0.9375 4.0625 2.47656 4.0625 4.375C4.0625 6.27344 5.60156 7.8125 7.5 7.8125ZM9.80469 8.75H5.19531C2.96484 8.75 1.17188 10.543 1.17188 12.7734V13.4375C1.17188 13.7852 1.45312 14.0625 1.80078 14.0625H13.1992C13.5469 14.0625 13.8281 13.7852 13.8281 13.4375V12.7734C13.8281 10.543 12.0352 8.75 9.80469 8.75Z" fill="#757575" />
                                </svg>
                            </span>
                            Number of Children
                        </label>
                        <div className="flex items-center justify-between h-11 px-4 py-2.5 bg-white rounded border border-neutral-200">
                            <button
                                onClick={() => setChildrenCount(Math.max(1, childrenCount - 1))}
                                className="text-stone-900 text-xl font-medium"
                            >
                                −
                            </button>
                            <span className="text-stone-900 text-sm font-medium font-poppins">
                                {childrenCount}
                            </span>
                            <button
                                onClick={() => setChildrenCount(Math.min(Math.max(1, maxGuests - guestCount), childrenCount + 1))}
                                className="text-stone-900 text-xl font-medium"
                                disabled={childrenCount >= Math.max(0, maxGuests - guestCount)}
                            >
                                +
                            </button>
                        </div>
                        {childrenCount >= Math.max(0, maxGuests - guestCount) && (
                            <p className="text-xs text-amber-600 mt-1">Max capacity reached ({maxGuests} total seats)</p>
                        )}
                    </>
                )}
            </div>
            )}

            {/* Optional Services */}
            {boatServices.length > 0 && (
                <div className="mb-6">
                    <label className="flex items-center gap-2 text-stone-700 text-sm font-normal font-poppins mb-3">
                        <span className="text-zinc-500">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#757575" />
                            </svg>
                        </span>
                        Add-on Services
                    </label>
                    {selectedServiceIds.size === 0 ? (
                        <button
                            type="button"
                            onClick={() => {
                                document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="w-full p-4 border border-dashed border-gray-300 rounded-lg text-center text-zinc-500 text-sm font-poppins hover:border-[#0F3875] hover:text-[#0F3875] hover:bg-blue-50/30 transition-colors"
                        >
                            No services selected — pick from the Services section above
                        </button>
                    ) : (
                        <div className="space-y-2">
                            {boatServices
                                .filter(svcAssign => selectedServiceIds.has(svcAssign.service_id))
                                .map((svcAssign) => {
                                    const svc = svcAssign.service;
                                    if (!svc) return null;
                                    const svcPrice = svcAssign.price ?? svc.default_price ?? 0;
                                    const priceModeLabel = svc.price_mode === 'per_trip' ? '' : svc.price_mode === 'per_person' ? '/person' : '/person/hr';
                                    const isPerPerson = svc.price_mode === 'per_person' || svc.price_mode === 'per_person_per_time';
                                    const perPersonAllRequired = svcAssign.per_person_all_required !== false;
                                    const showPersonPicker = isPerPerson && !perPersonAllRequired;
                                    const maxPeople = guestCount + (includeChildren ? childrenCount : 0);
                                    let currentPersonCount = servicePersonCounts.get(svcAssign.service_id) ?? maxPeople;
                                    if (currentPersonCount > maxPeople) {
                                        currentPersonCount = maxPeople;
                                    }

                                    return (
                                        <div key={svcAssign.service_id} className="border border-[#0F3875] bg-blue-50/30 rounded-lg overflow-hidden">
                                            <div className="flex items-center gap-3 p-3">
                                                {svc.icon_url && (
                                                    <div className="w-8 h-8 rounded overflow-hidden relative flex-shrink-0">
                                                        <Image src={svc.icon_url} alt={svc.name} fill className="object-cover" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-stone-900 text-sm font-medium font-poppins truncate">{svc.name}</p>
                                                    <span className="text-[#106BD8] text-xs font-semibold font-poppins">
                                                        EGP {Math.round(svcPrice)}{priceModeLabel}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedServiceIds(prev => {
                                                            const next = new Set(prev);
                                                            next.delete(svcAssign.service_id);
                                                            return next;
                                                        });
                                                    }}
                                                    aria-label="Remove service"
                                                    className="w-6 h-6 rounded-full border border-red-300 text-red-500 hover:bg-red-50 flex items-center justify-center text-base font-bold flex-shrink-0 leading-none"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                            {showPersonPicker && (
                                                <div className="flex items-center justify-between px-3 py-2 border-t border-[#0F3875]/30">
                                                    <span className="text-zinc-600 text-xs font-poppins">How many persons?</span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setServicePersonCounts(prev => {
                                                                    const next = new Map(prev);
                                                                    next.set(svcAssign.service_id, Math.max(1, currentPersonCount - 1));
                                                                    return next;
                                                                });
                                                            }}
                                                            disabled={currentPersonCount <= 1}
                                                            className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            −
                                                        </button>
                                                        <span className="text-stone-900 text-sm font-semibold font-poppins min-w-[20px] text-center">{currentPersonCount}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setServicePersonCounts(prev => {
                                                                    const next = new Map(prev);
                                                                    next.set(svcAssign.service_id, Math.min(maxPeople, currentPersonCount + 1));
                                                                    return next;
                                                                });
                                                            }}
                                                            disabled={currentPersonCount >= maxPeople}
                                                            className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            )}            {/* Price Breakdown */}
            <div className="mb-6 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-zinc-500 text-sm font-normal font-poppins">
                        {breakdownLabel()}
                    </span>
                    <span className="text-stone-900 text-sm font-medium font-poppins">
                        EGP {Math.round(basePrice - (childrenTotal || 0))}
                    </span>
                </div>
                {/* Children price breakdown */}
                {includeChildren && childrenCount > 0 && childPrice && childPrice > 0 && (childrenTotal || 0) > 0 && (
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-zinc-500 text-sm font-normal font-poppins">
                            EGP {Math.round(childPrice)} × {childrenCount} {childrenCount === 1 ? 'child' : 'children'}{priceMode === 'per_person_per_time' ? (rentalType === 'day' ? ` × ${days} days` : ` × ${calculatedHours} hrs`) : ''}
                        </span>
                        <span className="text-stone-900 text-sm font-medium font-poppins">
                            EGP {Math.round(childrenTotal || 0)}
                        </span>
                    </div>
                )}
                {servicesTotal > 0 && (
                    <div className="mb-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-zinc-500 text-sm font-normal font-poppins">
                                Add-on Services
                            </span>
                            <span className="text-stone-900 text-sm font-medium font-poppins">
                                EGP {Math.round(servicesTotal)}
                            </span>
                        </div>                        {selectedServicesArr.map(svc => {
                            const hrsForLabel = svc.price_mode === 'per_person_per_time' && svc.price > 0 && svc.person_count && svc.person_count > 0
                                ? Math.round(svc.calculated_price / (svc.price * svc.person_count))
                                : 0;
                            return (
                            <div key={svc.service_id} className="flex justify-between items-center ml-2">
                                <span className="text-zinc-400 text-xs font-normal font-poppins">
                                    {svc.name}
                                    {svc.price_mode !== 'per_trip' && svc.person_count && (
                                        <span className="text-zinc-400"> — {Math.round(svc.price)} × {svc.person_count} {svc.person_count === 1 ? 'person' : 'persons'}{hrsForLabel > 0 ? ` × ${hrsForLabel} hr${hrsForLabel !== 1 ? 's' : ''}` : ''}</span>
                                    )}
                                </span>
                                <span className="text-zinc-500 text-xs font-poppins">
                                    EGP {Math.round(svc.calculated_price)}
                                </span>
                            </div>
                            );
                        })}
                    </div>
                )}
                <div className="flex justify-between items-center mb-3">
                    <span className="text-zinc-500 text-sm font-normal font-poppins">
                        Service fee ({serviceFeeRate * 100}%)
                    </span>
                    <span className="text-stone-900 text-sm font-medium font-poppins">
                        EGP {Math.round(serviceFee)}
                    </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <span className="text-stone-900 text-base font-semibold font-poppins">
                        Total
                    </span>
                    <span className="text-stone-900 text-base font-semibold font-poppins">
                        EGP {Math.round(total)}
                    </span>
                </div>
            </div>

            <button
                onClick={handleRequestToBook}
                className="w-full h-11 px-6 py-2.5 bg-[#0C4A8C] rounded-lg flex justify-center items-center gap-2.5 text-white text-base font-medium font-poppins hover:bg-[#0A3D7A] transition-colors mb-4"
            >
                Request to Book
            </button>

            {/* Disclaimer */}
            <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-zinc-400 text-xs font-poppins leading-relaxed">
                    You won&apos;t be charged yet. The host will review your request.
                </p>
            </div>
        </div>
    );
}
