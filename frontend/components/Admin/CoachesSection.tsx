import React, { useState } from "react";
import { Plus, Edit, Trash2, RefreshCw, Filter, X } from "lucide-react";
import axios from "axios";
import CreateCoachModal from "./CreateCoachModal";
import EditCoachModal from "./EditCoachModal";

interface Coach {
    id: string;
    sport_id: string;
    name: string;
    sport_name: string;
}

interface Sport {
    id: string;
    sport: string;
    is_active: boolean;
}

interface CoachesSectionProps {
    coaches: Coach[];
    sports: Sport[];
    loading: boolean;
    onRefresh: () => void;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
}

const CoachesSection: React.FC<CoachesSectionProps> = ({
    coaches,
    sports,
    loading,
    onRefresh,
    onSuccess,
    onError,
}) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
    const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
    const [sportFilter, setSportFilter] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    // Filter coaches based on sport and search
    const filteredCoaches = coaches.filter((coach) => {
        const matchesSport = !sportFilter || coach.sport_id === sportFilter;
        const matchesSearch =
            !searchQuery ||
            coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            coach.sport_name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSport && matchesSearch;
    });

    const handleSelectAll = () => {
        if (selectedCoaches.length === filteredCoaches.length) {
            setSelectedCoaches([]);
        } else {
            setSelectedCoaches(filteredCoaches.map((c) => c.id));
        }
    };

    const handleSelectCoach = (id: string) => {
        if (selectedCoaches.includes(id)) {
            setSelectedCoaches(selectedCoaches.filter((cid) => cid !== id));
        } else {
            setSelectedCoaches([...selectedCoaches, id]);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedCoaches.length === 0) return;

        const coachNames = coaches
            .filter((c) => selectedCoaches.includes(c.id))
            .map((c) => `${c.name} (${c.sport_name})`)
            .join(", ");

        if (
            !confirm(
                `Are you sure you want to delete ${selectedCoaches.length} coach(es)?\n\n${coachNames}\n\nThis action cannot be undone.`
            )
        ) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            await axios.delete("http://localhost:8000/api/AMS/coaches", {
                data: { ids: selectedCoaches },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            onSuccess(`${selectedCoaches.length} coach(es) deleted successfully`);
            setSelectedCoaches([]);
            onRefresh();
        } catch (err: any) {
            onError(err.response?.data?.message || "Failed to delete coaches");
        }
    };

    const handleEdit = (coach: Coach) => {
        setSelectedCoach(coach);
        setShowEditModal(true);
    };

    const handleModalSuccess = () => {
        setShowCreateModal(false);
        setShowEditModal(false);
        setSelectedCoach(null);
        onRefresh();
    };

    const handleClearFilters = () => {
        setSportFilter("");
        setSearchQuery("");
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-500">Loading coaches...</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">
                            Coaches List
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {filteredCoaches.length} of {coaches.length} coaches
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {selectedCoaches.length > 0 && (
                            <button
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete ({selectedCoaches.length})
                            </button>
                        )}
                        <button
                            onClick={onRefresh}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Coach
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex gap-3">
                        {/* Search */}
                        <div className="flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search coaches by name..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>

                        {/* Sport Filter */}
                        <div className="w-64">
                            <select
                                value={sportFilter}
                                onChange={(e) => setSportFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                <option value="">All Sports</option>
                                {sports
                                    .filter((s) => s.is_active)
                                    .map((sport) => (
                                        <option key={sport.id} value={sport.id}>
                                            {sport.sport}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Clear Filters */}
                        {(sportFilter || searchQuery) && (
                            <button
                                onClick={handleClearFilters}
                                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                            >
                                <X className="w-4 h-4" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                {filteredCoaches.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <p className="text-gray-500">
                            {searchQuery || sportFilter
                                ? "No coaches found matching your filters"
                                : "No coaches found"}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedCoaches.length === filteredCoaches.length &&
                                                filteredCoaches.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Coach Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sport
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredCoaches.map((coach) => (
                                    <tr
                                        key={coach.id}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedCoaches.includes(coach.id)}
                                                onChange={() => handleSelectCoach(coach.id)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {coach.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {coach.sport_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(coach)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreateCoachModal
                    sports={sports.filter((s) => s.is_active)}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        handleModalSuccess();
                        onSuccess("Coach created successfully");
                    }}
                    onError={onError}
                />
            )}

            {showEditModal && selectedCoach && (
                <EditCoachModal
                    coach={selectedCoach}
                    sports={sports.filter((s) => s.is_active)}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedCoach(null);
                    }}
                    onSuccess={() => {
                        handleModalSuccess();
                        onSuccess("Coach updated successfully");
                    }}
                    onError={onError}
                />
            )}
        </>
    );
};

export default CoachesSection;