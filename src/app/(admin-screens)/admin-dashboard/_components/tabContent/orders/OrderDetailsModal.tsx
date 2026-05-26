import React from "react";
import { useRouter } from "next/navigation";
import { AdminOrder } from "@/lib/api";
import { FiX, FiUser, FiCalendar, FiDollarSign, FiAnchor, FiPackage } from "react-icons/fi";
import Image from "next/image";

interface OrderDetailsModalProps {
    order: AdminOrder | null;
    onClose: () => void;
    onStatusChange: (orderId: number, status: string) => void;
    onPaymentStatusChange: (orderId: number, paymentStatus: string) => void;
}

export default function OrderDetailsModal({
    order,
    onClose,
    onStatusChange,
    onPaymentStatusChange,
}: OrderDetailsModalProps) {
    const router = useRouter();

    if (!order) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "EGP",
        }).format(amount);
    };

    const calculateDuration = (start: string, end: string, type: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());

        if (type === 'hourly') {
            const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
            return { value: diffHours || 1, unit: 'hour' };
        } else {
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { value: diffDays || 1, unit: 'day' };
        }
    };

    const { value: duration, unit } = calculateDuration(order.start_date, order.end_date, order.booking_type || 'daily');

    // Determine Rate to show (Base Rate)
    let ratePerUnit = 0;
    if (order.price_per_hour) {
        ratePerUnit = order.price_per_hour;
    } else if (order.price_per_day) {
        ratePerUnit = order.price_per_day;
    } else {
        // Fallback (calculated, might include fees if not careful, but better than 0)
        ratePerUnit = order.total_price / duration;
    }

    const statusColors: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-700",
        confirmed: "bg-blue-100 text-blue-700",
        cancelled: "bg-red-100 text-red-700",
        completed: "bg-green-100 text-green-700",
    };

    const status = (order.status || "pending").toLowerCase();

    const handleBoatClick = () => {
        if (order.boat_id) {
            router.push(`/admin-dashboard?tab=boat-listings&boatId=${order.boat_id}&returnTab=bookings&returnOrderId=${order.id}`);
        }
    };

    const handleTripClick = () => {
        if (order.trip_details?.id) {
            const tripId = order.trip_details.id;
            router.push(`/admin-dashboard?tab=trips&tripId=${tripId}&returnTab=bookings&returnOrderId=${order.id}`);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 font-sans"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-none flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">
                            Order Details - ORD-{order.id.toString().padStart(4, '0')}
                        </h2>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${statusColors[status] || "bg-gray-100"}`}>
                            {status}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-900"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <p className="text-xs text-gray-500 mb-6 font-medium">
                        Created on {new Date(order.created_at).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}, {new Date(order.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>

                    {/* Boat Info Card */}
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wide">
                            <FiAnchor /> Boat Information
                        </h3>
                        {order.voyage_type && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded uppercase">
                                {order.voyage_type} Voyage
                            </span>
                        )}
                        {order.trip_type && (
                            <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-bold rounded uppercase">
                                {order.trip_type} Trip
                            </span>
                        )}
                    </div>

                    <div
                        onClick={handleBoatClick}
                        className="bg-gray-50 rounded-2xl p-4 flex gap-5 mb-8 border border-gray-100 cursor-pointer hover:shadow-md transition-shadow group"
                    >
                        <div className="w-24 h-24 relative rounded-xl overflow-hidden bg-white shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                            {order.boat_images?.[0] ? (
                                <Image
                                    src={order.boat_images[0]}
                                    alt={order.boat_name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <FiAnchor size={32} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 py-1">
                            <h4 className="text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-blue-600 transition-colors">{order.boat_name || "Unknown Boat"}</h4>
                            <p className="text-sm text-gray-500 font-medium">
                                {order.trip_name || order.booking_type || "Yacht"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                {order.boat_description || "No description available"}
                            </p>
                        </div>
                    </div>

                    {/* Trip Information (New Section) */}
                    {order.trip_details && (
                        <div className="mb-8">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                                <FiAnchor className="text-teal-600" /> Trip Information
                            </h3>
                            <div
                                onClick={handleTripClick}
                                className="bg-white rounded-2xl p-4 flex gap-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
                            >
                                <div className="w-32 h-32 relative rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                    {order.trip_details.image ? (
                                        <Image
                                            src={order.trip_details.image}
                                            alt={order.trip_details.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <FiAnchor size={40} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 py-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-blue-600 transition-colors">{order.trip_details.name}</h4>
                                        <span className="bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded font-bold uppercase">{order.trip_details.trip_type}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 font-medium mb-3">{order.trip_details.voyage_hours} Hours Voyage</p>
                                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                                        {order.trip_details.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Sharing Participants List */}
                    {order.voyage_type === 'Sharing' && order.voyage_participants && order.voyage_participants.length > 0 && (
                        <div className="mb-8 pb-8 border-b border-gray-100">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
                                <FiUser className="text-purple-600" /> Other Participants
                            </h3>
                            <div className="bg-white border boundary-gray-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-3">Customer</th>
                                            <th className="px-4 py-3">Guests</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Payment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {order.voyage_participants.map((p) => (
                                            <tr key={p.id} className={p.id === order.id ? "bg-blue-50/50" : ""}>
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {p.username} {p.id === order.id && <span className="text-blue-600 text-xs ml-1">(Current)</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{p.guest_count}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${p.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                        p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${p.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                                        p.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {p.payment_status || 'Unpaid'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}


                    {/* 2-Column Grid: Customer & Owner */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-100">
                        {/* Customer */}
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
                                <FiUser /> Customer Details
                            </h3>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</p>
                                <p className="text-base font-bold text-gray-900 mb-3">{order.username || "Unknown"}</p>

                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
                                <p className="text-sm font-medium text-gray-900 mb-3">{order.user_email || "N/A"}</p>

                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</p>
                                <p className="text-sm font-medium text-gray-900">{order.user_phone || "N/A"}</p>
                            </div>
                        </div>

                        {/* Owner */}
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
                                <FiUser /> Boat Owner
                            </h3>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</p>
                                <p className="text-base font-bold text-gray-900 mb-3">
                                    {order.owner_details?.username || order.owner_username || "Unknown Owner"}
                                </p>

                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
                                <p className="text-sm font-medium text-gray-900 mb-3">
                                    {order.owner_details?.email || order.owner_email || "N/A"}
                                </p>

                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {order.owner_details?.phone || order.owner_phone || "N/A"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Booking Contact Info */}
                    {(order.contact_phone || order.booking_notes) && (
                        <div className="mb-8 pb-8 border-b border-gray-100">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
                                <FiUser /> Booking Contact
                            </h3>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                {order.booking_for === 'other' && order.contact_first_name && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Booking For</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {order.contact_first_name} {order.contact_last_name}
                                        </p>
                                    </div>
                                )}
                                {order.contact_phone && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact Phone</p>
                                        <p className="text-sm font-medium text-gray-900">{order.contact_phone}</p>
                                    </div>
                                )}
                                {order.booking_notes && (
                                    <div className="col-span-2">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                                        <p className="text-sm text-gray-600">{order.booking_notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {/* Rental/Trip Info */}
                    <div className="mb-8 pb-8 border-b border-gray-100">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
                            <FiCalendar /> {order.trip_type ? "Trip Schedule" : "Rental Information"}
                        </h3>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Start Date</p>
                                <p className="text-sm font-medium text-gray-900">{formatDate(order.start_date)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">End Date</p>
                                <p className="text-sm font-medium text-gray-900">{formatDate(order.end_date)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Duration</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {order.trip_details ? `${order.trip_details.voyage_hours} hours` : `${duration} ${unit}${duration > 1 ? "s" : ""}`}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Guests</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {order.voyage_type === 'Sharing' && order.voyage_seats_taken ? (
                                        <span>
                                            <span className="text-blue-600 font-bold">{order.voyage_seats_taken}</span>
                                            <span className="text-gray-400"> / {order.voyage_max_seats} total</span>
                                        </span>
                                    ) : (
                                        <>
                                            {order.guest_count} people
                                            {order.children_count && order.children_count > 0 ? (
                                                <span className="text-gray-500 ml-1">({order.children_count} children)</span>
                                            ) : null}
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="mb-8">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
                            <FiDollarSign /> Pricing Details
                        </h3>

                        {/* Breakdown for Hourly/Daily Rentals */}
                        {!order.trip_type && (
                            <div className="bg-gray-50 p-3 rounded-lg mb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-gray-600 font-medium">Rate Breakdown</span>
                                    <span className="text-sm font-bold text-gray-900">
                                        {formatCurrency(ratePerUnit)}
                                        {(() => {
                                            // Use order's snapshot price_mode with fallback to boat
                                            const priceMode = order.price_mode || 'per_time';
                                            if (priceMode === 'per_person') return ' / passenger';
                                            if (priceMode === 'per_person_per_time') return ` / passenger / ${unit === 'hour' ? 'hr' : unit}`;
                                            return ` / ${unit}`;
                                        })()}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 flex justify-end gap-1">
                                    <span>{formatCurrency(ratePerUnit)}</span>
                                    {(order.price_mode?.includes('person') || (!order.price_mode && order.guest_count > 0)) && (
                                        <span>× {order.guest_count} guest{order.guest_count > 1 ? 's' : ''}</span>
                                    )}
                                    <span>× {duration} {unit}{duration > 1 ? 's' : ''}</span>
                                </div>
                                {order.children_count && order.children_count > 0 && order.child_price_snapshot != null && order.child_price_snapshot > 0 && (
                                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm text-gray-600 font-medium">Children Rate</span>
                                            <span className="text-sm font-bold text-gray-900">
                                                {formatCurrency(
                                                    (() => {
                                                        const priceMode = order.price_mode || 'per_time';
                                                        if (priceMode === 'per_person_per_time') {
                                                            return order.children_count * order.child_price_snapshot * duration;
                                                        }
                                                        return order.children_count * order.child_price_snapshot;
                                                    })()
                                                )}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 flex justify-end gap-1">
                                            <span>{formatCurrency(order.child_price_snapshot)}</span>
                                            <span>× {order.children_count} child{order.children_count > 1 ? 'ren' : ''}</span>
                                            {(() => {
                                                const priceMode = order.price_mode || 'per_time';
                                                if (priceMode === 'per_person_per_time') {
                                                    return <span>× {duration} {unit}{duration > 1 ? 's' : ''}</span>;
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="space-y-2">
                            {/* Selected Services */}
                            {order.selected_services && order.selected_services.length > 0 && (
                                <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FiPackage size={14} className="text-gray-500" />
                                        <span className="text-sm font-semibold text-gray-700">Add-on Services</span>
                                    </div>                                    <div className="space-y-1.5 pl-1">
                                        {order.selected_services.map((svc, idx) => (
                                            <div key={idx} className="flex justify-between items-start text-sm">
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-medium text-gray-700">{svc.name}</span>
                                                    <span className="text-[10px] text-gray-400 ml-1.5">
                                                        ({svc.price_mode === 'per_trip' ? 'flat' : svc.price_mode === 'per_person' ? '/person' : '/person/hr'})
                                                    </span>
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
                                                <span className="font-medium text-gray-900 ml-2 whitespace-nowrap">{formatCurrency(svc.calculated_price)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-dashed border-gray-200">
                                        <span className="font-medium text-gray-600">Services Subtotal</span>
                                        <span className="font-bold text-gray-900">{formatCurrency(order.services_total || 0)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Subtotal */}
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">
                                    {order.trip_type ? "Trip Price" : "Subtotal"}
                                </span>
                                <span className="text-sm font-bold text-gray-900">
                                    {formatCurrency((order.total_price || 0) - (order.service_fee || 0))}
                                </span>
                            </div>

                            {/* Service Fee */}
                            {(order.service_fee || 0) > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">Service Fee</span>
                                    <span className="text-sm font-bold text-gray-900">{formatCurrency(order.service_fee || 0)}</span>
                                </div>
                            )}

                            {/* Total */}
                            <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-2">
                                <span className="text-base font-bold text-gray-900">Total</span>
                                <span className="text-xl font-bold text-sky-900">{formatCurrency(order.total_price)}</span>
                            </div>

                            {/* Payment Method */}
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-sm font-medium text-gray-500">Payment Method</span>
                                <span className="text-sm font-medium text-gray-900 capitalize flex items-center gap-2">
                                    {order.payment_method || "Card"}
                                    {(!order.payment_method || order.payment_method.toLowerCase() !== 'cash') && (
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white bg-black`}>
                                            {order.payment_status || "Paid"}
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>


                </div>

            </div>
        </div>
    );
}
