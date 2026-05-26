import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminApi, AdminActivity } from "@/lib/api";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiAnchor, FiUsers, FiUpload, FiActivity } from "react-icons/fi";
import Image from "next/image";
import { useToast } from "../../ToastProvider";
import ConfirmModal from "../../ConfirmModal";

export default function AdminActivitiesLayout() {
    const { showSuccess, showError } = useToast();
    const [activities, setActivities] = useState<AdminActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingActivity, setEditingActivity] = useState<AdminActivity | null>(null);
    const [activityName, setActivityName] = useState("");
    const [activityImage, setActivityImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [saving, setSaving] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Confirm delete state
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; activityId: number | null; activityName: string }>({
        isOpen: false,
        activityId: null,
        activityName: ""
    });
    const [deleting, setDeleting] = useState(false);

    // Activity Details Modal State
    const [selectedActivityForDetails, setSelectedActivityForDetails] = useState<AdminActivity | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [activityBoats, setActivityBoats] = useState<any[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Navigation
    const router = useRouter();
    const searchParams = useSearchParams();

    // Deep linking: Open activity modal
    useEffect(() => {
        const activityIdParam = searchParams.get('openActivityId');
        if (activityIdParam && activities.length > 0) {
            const activityId = parseInt(activityIdParam);
            const activity = activities.find(a => a.id === activityId);
            if (activity) {
                if (selectedActivityForDetails?.id !== activity.id) {
                    fetchActivityDetails(activity);
                }
            }
        } else {
            // URL param missing, ensure modal is closed
            if (selectedActivityForDetails) {
                setSelectedActivityForDetails(null);
            }
        }
    }, [searchParams, activities, selectedActivityForDetails]);

    const fetchActivities = useCallback(async () => {
        setLoading(true);
        const response = await adminApi.getActivities();
        if (response.success && response.data) {
            setActivities(response.data.activities);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    const fetchActivityDetails = async (activity: AdminActivity) => {
        setSelectedActivityForDetails(activity);
        setDetailsLoading(true);
        try {
            // Fetch all boats, then filter client-side for boats that have this activity
            const boatsResponse = await adminApi.getBoats(1, 100);
            if (boatsResponse.success && boatsResponse.data) {
                const filteredBoats = boatsResponse.data.boats.filter(boat =>
                    boat.activities_id?.includes(activity.id)
                );
                setActivityBoats(filteredBoats);
            }
        } catch (error) {
            showError("Failed to fetch activity details");
        }
        setDetailsLoading(false);
    };

    const openCreateModal = () => {
        setEditingActivity(null);
        setActivityName("");
        setActivityImage(null);
        setImagePreview("");
        setShowModal(true);
    };

    const openEditModal = (activity: AdminActivity) => {
        setEditingActivity(activity);
        setActivityName(activity.name);
        setActivityImage(null);
        setImagePreview(activity.image || "");
        setShowModal(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setActivityImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        if (!activityName.trim()) {
            showError("Please enter an activity name");
            return;
        }

        setSaving(true);

        let response;
        if (editingActivity) {
            response = await adminApi.updateActivity(editingActivity.id, activityName, activityImage || undefined);
        } else {
            response = await adminApi.createActivity(activityName, activityImage || undefined);
        }

        if (response.success) {
            setShowModal(false);
            setActivityName("");
            setActivityImage(null);
            setImagePreview("");
            setEditingActivity(null);
            fetchActivities();
            showSuccess(editingActivity ? "Activity updated successfully" : "Activity created successfully");
        } else {
            showError(response.error || "Failed to save activity");
        }
        setSaving(false);
    };

    const handleDeleteClick = (activity: AdminActivity) => {
        setConfirmDelete({ isOpen: true, activityId: activity.id, activityName: activity.name });
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDelete.activityId) return;

        setDeleting(true);
        const response = await adminApi.deleteActivity(confirmDelete.activityId);
        if (response.success) {
            if (selectedActivityForDetails?.id === confirmDelete.activityId) {
                router.push('/admin-dashboard?tab=activities');
                setSelectedActivityForDetails(null);
            }
            fetchActivities();
            showSuccess("Activity deleted successfully");
        } else {
            showError(response.error || "Failed to delete activity");
        }
        setDeleting(false);
        setConfirmDelete({ isOpen: false, activityId: null, activityName: "" });
    };

    const navigateToDetails = (id: number) => {
        const returnActivityId = selectedActivityForDetails?.id;

        // Close modal
        setSelectedActivityForDetails(null);

        // Navigate to boat tab with ID param AND return info
        const params = new URLSearchParams();
        params.set('tab', 'boat-listings');
        params.set('boatId', id.toString());

        if (returnActivityId) {
            params.set('returnToActivityId', returnActivityId.toString());
        }

        router.push(`/admin-dashboard?${params.toString()}`);
    };

    // Helper for image url
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getImageUrl = (item: any) => {
        if (item.images && item.images.length > 0) return item.images[0];
        if (item.primary_image_url) return item.primary_image_url;
        return null;
    };

    return (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center mb-6 justify-between gap-3">
                <div>
                    <p className="text-[#0A0A0A] font-bold text-xl">Activities Management</p>
                    <p className="text-[#717182] font-normal text-sm">
                        Manage boat activities ({activities.length} activities)
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-[#0F172A] text-white px-5 py-3 rounded-xl hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    <FiPlus size={18} /> Add Activity
                </button>
            </div>

            {/* Activities Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="border rounded-xl p-4 h-[120px] animate-pulse">
                            <div className="flex gap-3">
                                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                                <div className="space-y-2 flex-1">
                                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : activities.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <FiActivity className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No activities found</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-6">
                        Add activities like &apos;Fishing&apos;, &apos;Snorkeling&apos;, &apos;Water Skiing&apos;, etc.
                    </p>
                    <button
                        onClick={openCreateModal}
                        className="text-blue-600 font-medium hover:underline"
                    >
                        Add your first activity
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activities.map((activity) => (
                        <div
                            key={activity.id}
                            className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4 hover:shadow-lg transition cursor-pointer group"
                            onClick={() => router.push(`/admin-dashboard?tab=activities&openActivityId=${activity.id}`)}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-white shadow-sm">
                                    {activity.image ? (
                                        <Image src={activity.image} alt={activity.name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <FiActivity size={24} className="text-emerald-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">{activity.name}</h3>
                                    <p className="text-xs text-gray-500 font-medium">{activity.boats_count || 0} boats</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-3 border-t border-emerald-100">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEditModal(activity);
                                    }}
                                    className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-gray-600 hover:bg-white rounded transition font-medium"
                                    aria-label={`Edit ${activity.name}`}
                                >
                                    <FiEdit2 size={12} /> Edit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Activity Details Modal */}
            {selectedActivityForDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white rounded-t-2xl">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{selectedActivityForDetails.name}</h1>
                                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-semibold">{activityBoats.length} Boats</span>
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDeleteClick(selectedActivityForDetails)}
                                    className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full transition-colors"
                                    title="Delete Activity"
                                >
                                    <FiTrash2 size={20} />
                                </button>
                                <button
                                    onClick={() => router.push('/admin-dashboard?tab=activities')}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <FiX size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/50">
                            {detailsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                                    <p className="text-sm text-gray-500 font-medium">Loading details...</p>
                                </div>
                            ) : (
                                activityBoats.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {activityBoats.map(boat => {
                                            const imgUrl = getImageUrl(boat);
                                            return (
                                                <div key={boat.id} className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full">
                                                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                                                        {imgUrl ? (
                                                            <img src={imgUrl} alt={boat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                                                <FiAnchor size={32} />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                                        <div className="absolute top-3 right-3">
                                                            <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm text-gray-900 text-xs font-bold rounded-lg shadow-sm">
                                                                ${boat.price_per_hour}/hr
                                                            </span>
                                                        </div>
                                                        <div className="absolute bottom-3 left-3 text-white">
                                                            <div className="flex items-center gap-1.5 text-xs font-medium bg-black/30 backdrop-blur-md px-2 py-1 rounded-lg">
                                                                <FiUsers size={12} /> {boat.max_seats} Guests
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-5 flex flex-col flex-1">
                                                        <h3 className="font-bold text-gray-900 mb-1 truncate text-lg group-hover:text-emerald-600 transition-colors">{boat.name}</h3>
                                                        <p className="text-xs text-gray-500 mb-4 line-clamp-2">{boat.description || "No description provided."}</p>

                                                        <div className="mt-auto pt-4 border-t border-gray-50">
                                                            <button
                                                                onClick={() => navigateToDetails(boat.id)}
                                                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm group-hover:border-emerald-200 group-hover:text-emerald-700"
                                                            >
                                                                View Details
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                            <FiActivity size={24} />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">No boats found</h3>
                                        <p className="text-gray-500">There are no boats with the {selectedActivityForDetails.name} activity yet.</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-xl w-full max-w-md">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-lg font-semibold">
                                {editingActivity ? "Edit Activity" : "Add Activity"}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setActivityName("");
                                    setActivityImage(null);
                                    setImagePreview("");
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <FiX />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Activity Name *
                                </label>
                                <input
                                    type="text"
                                    value={activityName}
                                    onChange={(e) => setActivityName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Enter activity name"
                                />
                            </div>

                            {/* Image */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Activity Image
                                </label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-emerald-400"
                                >
                                    {imagePreview ? (
                                        <div className="relative w-full h-32">
                                            <Image src={imagePreview} alt="Preview" fill className="object-contain rounded" />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-gray-500">
                                            <FiUpload size={24} />
                                            <span className="text-sm">Click to upload image</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setActivityName("");
                                    setActivityImage(null);
                                    setImagePreview("");
                                }}
                                className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                {editingActivity ? "Update Activity" : "Create Activity"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title="Delete Activity"
                message={`Are you sure you want to delete "${confirmDelete.activityName}"? This may affect boats associated with it.`}
                confirmText="Delete"
                confirmVariant="danger"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setConfirmDelete({ isOpen: false, activityId: null, activityName: "" })}
                isLoading={deleting}
            />
        </div>
    );
}
