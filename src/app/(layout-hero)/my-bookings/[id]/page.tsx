"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { customerApi, Order } from "@/lib/api";
import { normalizeImageUrl } from "@/lib/imageUtils";
import {
    FiClock,
    FiCalendar,
    FiMapPin,
    FiAnchor,
    FiUser,
    FiDollarSign,
    FiChevronLeft,
    FiCreditCard,
    FiCheckCircle,
    FiInfo,
    FiStar,
    FiPhone,
    FiMessageSquare,
    FiPackage
} from "react-icons/fi";

export default function BookingDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [currentBoatImageIndex, setCurrentBoatImageIndex] = useState(0); // For Boat Slider

    // Auto-advance Trip slider
    useEffect(() => {
        if (!order?.trip?.images || order.trip.images.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % order.trip!.images!.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [order?.trip?.images]);

    // Auto-advance Boat slider
    useEffect(() => {
        if (!order?.boat?.images || order.boat.images.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentBoatImageIndex((prev) => (prev + 1) % order.boat!.images!.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [order?.boat?.images]);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!params.id) return;

            try {
                setLoading(true);
                const orderId = parseInt(params.id as string, 10);
                if (isNaN(orderId)) {
                    setError("Invalid order ID");
                    return;
                }

                const response = await customerApi.getOrderById(orderId);

                if (response.success && response.data) {
                    setOrder(response.data.order);
                } else {
                    setError(response.error || "Failed to load booking details");
                }
            } catch (err) {
                console.error("Error fetching order:", err);
                setError("An unexpected error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#106BD8]"></div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
                <div className="text-red-500 mb-4 text-xl">
                    <FiInfo className="inline mr-2" />
                    {error || "Booking not found"}
                </div>
                <button
                    onClick={() => router.push('/my-bookings')}
                    className="text-[#106BD8] hover:underline flex items-center gap-2"
                >
                    <FiChevronLeft /> Back to My Bookings
                </button>
            </div>
        );
    }

    // Helper functions
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EGP'
        }).format(amount);
    };

    // Duration calc
    const startDate = new Date(order.start_date);
    const endDate = new Date(order.end_date);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationDays = Math.floor(durationHours / 24);
    const remainingHours = durationHours % 24;


    // Determine Rate to show (Base Rate)
    let ratePerUnit = 0;
    if (order.price_per_hour) {
        ratePerUnit = order.price_per_hour;
    } else if (order.price_per_day) {
        ratePerUnit = order.price_per_day;
    } else {
        ratePerUnit = order.total_price / (durationHours || 1);
    }

    const durationText = durationDays > 0
        ? `${durationDays} Day${durationDays > 1 ? 's' : ''} ${remainingHours > 0 ? `${remainingHours} Hr${remainingHours > 1 ? 's' : ''}` : ''}`
        : `${durationHours} Hour${durationHours !== 1 ? 's' : ''}`;

    // Status Badge Logic
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
            case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    const mainImage = order.trip?.images?.[0] || order.boat?.images?.[0];
    const title = order.trip?.name || order.boat?.name;
    const location = order.trip?.city_name || order.boat?.cities?.[0] || 'Marina';

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">

                {/* Back Button */}
                <button
                    onClick={() => router.push('/my-bookings')}
                    className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#106BD8] transition-colors font-medium"
                >
                    <FiChevronLeft size={20} /> Back to My Bookings
                </button>

                {/* Status Banner */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 mb-1">
                            Booking #{order.id}
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Booked on {formatDate(order.created_at)}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide border ${getStatusColor(order.status)}`}>
                            {order.status}
                        </span>
                        {order.payment_status === 'paid' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                <FiCheckCircle className="text-green-500" /> Paid
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Main Info Column */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Trip Details Card with Slider */}
                        {order.trip_id && order.trip && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="relative h-64 w-full group">
                                    {order.trip.images && order.trip.images.length > 0 ? (
                                        <>
                                            <Image
                                                src={normalizeImageUrl(order.trip.images[currentImageIndex])}
                                                alt={order.trip.name}
                                                fill
                                                className="object-cover transition-all duration-700"
                                            />
                                            {/* Slider Arrows */}
                                            {order.trip.images.length > 1 && (
                                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCurrentImageIndex((prev) => (prev - 1 + order.trip!.images!.length) % order.trip!.images!.length);
                                                        }}
                                                        className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition"
                                                    >
                                                        <FiChevronLeft size={20} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCurrentImageIndex((prev) => (prev + 1) % order.trip!.images!.length);
                                                        }}
                                                        className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition rotate-180"
                                                    >
                                                        <FiChevronLeft size={20} />
                                                    </button>
                                                </div>
                                            )}
                                            {/* Slider Dots */}
                                            {order.trip.images.length > 1 && (
                                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                    {order.trip.images.map((_, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setCurrentImageIndex(idx);
                                                            }}
                                                            className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? "bg-white w-4" : "bg-white/50 hover:bg-white/80"}`}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                            <FiAnchor className="text-gray-400 text-4xl" />
                                        </div>
                                    )}
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/10 via-transparent to-black/60 pointer-events-none"></div>
                                    <div className="absolute bottom-4 left-4 text-white z-10 pointer-events-none">
                                        <h2 className="text-2xl font-bold mb-1 shadow-black drop-shadow-md">{title}</h2>
                                        <div className="flex items-center gap-2 text-white/90 drop-shadow-md">
                                            <FiMapPin size={16} /> {location}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-3">About this Trip</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        {order.trip.description || "No description available."}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Boat Details Card with Slider */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="relative h-64 w-full group">
                                {order.boat?.images && order.boat.images.length > 0 ? (
                                    <>
                                        <Image
                                            src={normalizeImageUrl(order.boat.images[currentBoatImageIndex])}
                                            alt={order.boat.name}
                                            fill
                                            className="object-cover transition-all duration-700"
                                        />
                                        {/* Slider Arrows */}
                                        {order.boat.images.length > 1 && (
                                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCurrentBoatImageIndex((prev) => (prev - 1 + order.boat!.images!.length) % order.boat!.images!.length);
                                                    }}
                                                    className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition"
                                                >
                                                    <FiChevronLeft size={20} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCurrentBoatImageIndex((prev) => (prev + 1) % order.boat!.images!.length);
                                                    }}
                                                    className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition rotate-180"
                                                >
                                                    <FiChevronLeft size={20} />
                                                </button>
                                            </div>
                                        )}
                                        {/* Slider Dots */}
                                        {order.boat.images.length > 1 && (
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                {order.boat.images.map((_, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCurrentBoatImageIndex(idx);
                                                        }}
                                                        className={`w-2 h-2 rounded-full transition-all ${idx === currentBoatImageIndex ? "bg-white w-4" : "bg-white/50 hover:bg-white/80"}`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                        <FiAnchor className="text-gray-400 text-4xl" />
                                    </div>
                                )}
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/10 via-transparent to-black/60 pointer-events-none"></div>
                                <div className="absolute bottom-4 left-4 text-white z-10 pointer-events-none">
                                    <h2 className="text-2xl font-bold mb-1 shadow-black drop-shadow-md">{order.boat?.name || title}</h2>
                                    <div className="flex items-center gap-2 text-white/90 drop-shadow-md mb-1">
                                        <FiMapPin size={16} /> {order.boat?.cities?.[0] || location}
                                    </div>
                                    {/* Display Rating on Boat Card */}
                                    <div className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 backdrop-blur-sm px-2 py-1 rounded-md inline-flex">
                                        <FiStar className="text-yellow-400 fill-yellow-400" />
                                        <span>{order.boat?.average_rating || "New"}</span>
                                        {order.boat?.total_reviews ? <span className="font-normal opacity-80">({order.boat.total_reviews})</span> : null}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-3">About the Boat</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {order.boat?.description || "No description available."}
                                </p>
                            </div>
                        </div>

                        {/* Itinerary / Schedule */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FiCalendar className="text-[#106BD8]" /> Schedule
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Start</span>
                                    <div className="font-bold text-gray-900 text-lg">{formatTime(order.start_date)}</div>
                                    <div className="text-gray-600">{formatDate(order.start_date)}</div>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">End</span>
                                    <div className="font-bold text-gray-900 text-lg">{formatTime(order.end_date)}</div>
                                    <div className="text-gray-600">{formatDate(order.end_date)}</div>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-6 text-sm text-gray-600 border-t border-gray-100 pt-4">
                                <div className="flex items-center gap-2">
                                    <FiClock className="text-gray-400" size={18} />
                                    <span>Duration: <span className="font-semibold text-gray-900">{durationText}</span></span>
                                </div>
                                {order.trip_id && (
                                    <div className="flex items-center gap-2">
                                        <FiAnchor className="text-gray-400" size={18} />
                                        <span>Type: <span className="font-semibold text-gray-900">{order.trip?.trip_type || "Trip"}</span></span>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">

                        {/* Payment Summary */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FiDollarSign className="text-[#106BD8]" /> Payment
                            </h3>

                            <div className="space-y-3 mb-6">

                                {order.trip_id ? (
                                    /* Trip View: Simplified */
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Trip Price</span>
                                        <span className="font-medium text-gray-900">
                                            {formatCurrency((order.total_price || 0) - (order.service_fee || 0))}
                                        </span>
                                    </div>
                                ) : (
                                    /* Rental View: Detailed */
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Rate</span>
                                            <span className="font-medium text-gray-900">
                                                {formatCurrency(ratePerUnit)}
                                                <span className="text-xs text-gray-400 font-normal"> /{order.booking_type === 'daily' ? 'day' : 'hr'}</span>
                                            </span>
                                        </div>

                                        {/* Detailed Calculation */}
                                        <div className="flex justify-between text-xs text-gray-400 px-2 gap-1">
                                            <span>{formatCurrency(ratePerUnit)}</span>
                                            {/* Determine Price Mode logic with fallback */}
                                            {(() => {
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                const priceMode = order.price_mode || order.boat?.price_mode || 'per_time';

                                                return (
                                                    <>
                                                        {(priceMode === 'per_person' || priceMode === 'per_person_per_time') && (
                                                            <span>× {order.guest_count} guest{order.guest_count > 1 ? 's' : ''}</span>
                                                        )}
                                                        {priceMode !== 'per_person' && (
                                                            <span>× {durationText}</span>
                                                        )}
                                                    </>
                                                );                                            })()}
                                        </div>
                                    </>
                                )}

                                {/* Selected Services */}
                                {order.selected_services && order.selected_services.length > 0 && (
                                    <>
                                        <div className="pt-2 border-t border-gray-100">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <FiPackage size={14} className="text-gray-400" />
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add-on Services</span>
                                            </div>                                            <div className="space-y-1.5">
                                                {order.selected_services.map((svc, idx) => (
                                                    <div key={idx} className="flex justify-between items-start text-sm">
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-gray-600 font-medium">{svc.name}</span>
                                                            {svc.price_mode !== 'per_trip' && svc.person_count && (
                                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                                    {formatCurrency(svc.price)} × {svc.person_count} {svc.person_count === 1 ? 'person' : 'persons'}
                                                                    {svc.price_mode === 'per_person_per_time' && svc.price > 0 && svc.person_count > 0 &&
                                                                        ` × ${Math.round(svc.calculated_price / (svc.price * svc.person_count))} hr${Math.round(svc.calculated_price / (svc.price * svc.person_count)) !== 1 ? 's' : ''}`
                                                                    }
                                                                </p>
                                                            )}
                                                            {svc.description && (
                                                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{svc.description}</p>
                                                            )}
                                                        </div>
                                                        <span className="font-medium text-gray-900 ml-2 whitespace-nowrap">
                                                            {formatCurrency(svc.calculated_price)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Services Subtotal</span>
                                            <span className="font-medium text-gray-900">{formatCurrency(order.services_total || 0)}</span>
                                        </div>
                                    </>
                                )}

                                {/* Children price breakdown */}
                                {order.children_count && order.children_count > 0 && order.child_price_snapshot != null && order.child_price_snapshot > 0 && (
                                    <>
                                        <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                                            <span className="text-gray-500">Children</span>
                                            <span className="font-medium text-gray-900">
                                                {formatCurrency(
                                                    (() => {
                                                        const priceMode = order.price_mode || order.boat?.price_mode || 'per_time';
                                                        if (priceMode === 'per_person_per_time') {
                                                            return order.children_count * order.child_price_snapshot * durationHours;
                                                        }
                                                        return order.children_count * order.child_price_snapshot;
                                                    })()
                                                )}
                                            </span>
                                        </div>

                                        {/* Detailed Children Calculation */}
                                        <div className="flex justify-between text-xs text-gray-400 px-2 gap-1 mb-2">
                                            <span>{formatCurrency(order.child_price_snapshot)}</span>
                                            {(() => {
                                                const priceMode = order.price_mode || order.boat?.price_mode || 'per_time';
                                                return (
                                                    <>
                                                        <span>× {order.children_count} child{order.children_count > 1 ? 'ren' : ''}</span>
                                                        {priceMode === 'per_person_per_time' && (
                                                            <span>× {durationText}</span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </>
                                )}

                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Service Fee</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(order.service_fee || 0)}</span>
                                </div>


                                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                                    <span className="font-bold text-gray-900">Total</span>
                                    <span className="font-bold text-xl text-[#106BD8]">{formatCurrency(order.total_price)}</span>
                                </div>


                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-white rounded-full shadow-sm">
                                        <FiCreditCard className="text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase">Payment Method</p>
                                        <p className="text-sm font-bold text-gray-900 capitalize">{order.payment_method || 'Cash'}</p>
                                    </div>
                                </div>
                                {(order.payment_method || '').toLowerCase() === 'cash' ? (
                                    null
                                ) : (
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {order.payment_status || 'Pending'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Location Info */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FiMapPin className="text-[#106BD8]" /> Location
                            </h3>
                            <p className="text-gray-600 mb-4 text-sm">{location}</p>

                            {/* Use order's snapshot location_url with fallback to boat */}
                            {(order.location_url || order.boat?.location_url) ? (
                                <a
                                    href={order.location_url || order.boat?.location_url || ''}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#106BD8] text-[#106BD8] text-sm font-semibold rounded-xl hover:bg-sky-50 transition-colors"
                                >
                                    <FiMapPin /> View Meet Location
                                </a>
                            ) : (
                                <p className="text-xs text-gray-400 italic">No meeting location URL available.</p>
                            )}
                        </div>

                        {/* Guest Info */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FiUser className="text-[#106BD8]" /> Guests
                            </h3>
                            <div className="text-center py-4 bg-blue-50 rounded-xl border border-blue-100">
                                <span className="block text-3xl font-bold text-[#106BD8] mb-1">{order.guest_count}</span>
                                <span className="text-sm text-blue-600 font-medium">People</span>
                                {order.children_count && order.children_count > 0 && (
                                    <div className="mt-2 pt-2 border-t border-blue-200">
                                        <span className="text-lg font-bold text-[#106BD8]">{order.children_count}</span>
                                        <span className="text-sm text-blue-600 font-medium ml-1">{order.children_count === 1 ? 'Child' : 'Children'}</span>
                                        {order.child_price_snapshot != null && order.child_price_snapshot > 0 && (
                                            <p className="text-xs text-blue-400 mt-0.5">{formatCurrency(order.child_price_snapshot)} per child</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contact Info - only show when booking is for someone else */}
                        {order.booking_for === 'other' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <FiPhone className="text-[#106BD8]" /> Contact Info
                                </h3>
                                <div className="space-y-3">
                                    {order.contact_first_name && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking For</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {order.contact_first_name} {order.contact_last_name}
                                            </p>
                                        </div>
                                    )}
                                    {order.contact_phone && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</p>
                                            <p className="text-sm font-medium text-gray-900">{order.contact_phone}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Notes - always show when present */}
                        {order.booking_notes && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <FiInfo className="text-[#106BD8]" /> Notes
                                </h3>
                                <p className="text-sm text-gray-600">{order.booking_notes}</p>
                            </div>
                        )}

                        {/* Captain Info */}
                        {order.boat?.owner && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <FiUser className="text-[#106BD8]" /> Captain
                                </h3>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shadow-sm shrink-0">
                                        {order.boat.owner.avatar_url ? (
                                            <Image
                                                src={normalizeImageUrl(order.boat.owner.avatar_url)}
                                                alt={order.boat.owner.username}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                                <FiUser size={28} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-lg leading-tight">{order.boat.owner.username}</p>
                                        <p className="text-xs text-gray-500 font-medium">Boat Owner</p>
                                        {order.boat.owner.member_since && (
                                            <p className="text-xs text-gray-400 mt-0.5">Member since {order.boat.owner.member_since}</p>
                                        )}
                                    </div>
                                </div>

                                {(order.boat.owner.bio || order.boat.owner.phone) && (
                                    <div className="space-y-3 pt-4 border-t border-gray-100">
                                        {order.boat.owner.bio && (
                                            <div className="text-sm text-gray-600 italic leading-relaxed">
                                                &quot;{order.boat.owner.bio}&quot;
                                            </div>
                                        )}
                                        {order.boat.owner.phone && (
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                <FiPhone className="text-[#106BD8]" />
                                                <span>{order.boat.owner.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                </div>
            </div>
        </div >
    );
}
