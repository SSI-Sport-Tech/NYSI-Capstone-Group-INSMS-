import React, { useState } from "react";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";
import axios from "axios";
import CreateSportModal from "./CreateSportModal";
import EditSportModal from "./EditSportModal";

interface Sport {
    id: string;
    sport: string;
    is_active: boolean;
}

interface SportsSectionProps {
    sports: Sport[];
    loading: boolean;
    onRefresh: () => void;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
}

const SportsSection: React.FC<SportsSectionProps> = ({
    sports,
    loading,
    onRefresh,
    onSuccess,
    onError,
}) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
    const [selectedSports, setSelectedSports] = useState<string[]>([]);

    const handleSelectAll = () => {
        if (selectedSports.length === sports.length) {
            setSelectedSports([]);
        } else {
            setSelectedSports(sports.map(s => s.id));
        }
    };

    const handleSelectSport = (id: string) => {
        if (selectedSports.includes(id)) {
            setSelectedSports(selectedSports.filter(sid => sid !== id));
        } else {
            setSelectedSports([...selectedSports, id]);
        }
    };

    const handleToggleActive = async (sport: Sport) => {
        try {
            const token = localStorage.getItem("token");
            await axios.patch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"}/api/AMS/sports/${sport.id}`,
                { is_active: !sport.is_active },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            onSuccess(
                `${sport.sport} ${!sport.is_active ? "activated" : "deactivated"} successfully`
            );
            onRefresh();
        } catch (err: any) {
            onError(err.response?.data?.message || "Failed to update sport");
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedSports.length === 0) return;

        const sportNames = sports
            .filter(s => selectedSports.includes(s.id))
            .map(s => s.sport)
            .join(", ");

        if (
            !confirm(
                `Are you sure you want to delete ${selectedSports.length} sport(s)? (${sportNames})\n\nThis action cannot be undone.`
            )
        ) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"}/api/AMS/sports`, {
                data: { ids: selectedSports },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            onSuccess(`${selectedSports.length} sport(s) deleted successfully`);
            setSelectedSports([]);
            onRefresh();
        } catch (err: any) {
            onError(
                err.response?.data?.message || "Failed to delete sports. They may be in use by athletes or coaches."
            );
        }
    };

    const handleEdit = (sport: Sport) => {
        setSelectedSport(sport);
        setShowEditModal(true);
    };

    const handleModalSuccess = () => {
        setShowCreateModal(false);
        setShowEditModal(false);
        setSelectedSport(null);
        onRefresh();
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-500">Loading sports...</p>
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
                            Sports List
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {sports.length} sports in database
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {selectedSports.length > 0 && (
                            <button
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete ({selectedSports.length})
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
                            Add Sport
                        </button>
                    </div>
                </div>

                {/* Table */}
                {sports.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <p className="text-gray-500">No sports found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedSports.length === sports.length}
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sport Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sports.map((sport) => (
                                    <tr key={sport.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedSports.includes(sport.id)}
                                                onChange={() => handleSelectSport(sport.id)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {sport.sport}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${sport.is_active
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                    }`}
                                            >
                                                {sport.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleActive(sport)}
                                                    className={`p-1.5 rounded-lg transition-colors ${sport.is_active
                                                        ? "text-orange-600 hover:bg-orange-50"
                                                        : "text-green-600 hover:bg-green-50"
                                                        }`}
                                                    title={sport.is_active ? "Deactivate" : "Activate"}
                                                >
                                                    {sport.is_active ? (
                                                        <ToggleRight className="w-4 h-4" />
                                                    ) : (
                                                        <ToggleLeft className="w-4 h-4" />
                                                    )}
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
                <CreateSportModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        handleModalSuccess();
                        onSuccess("Sport created successfully");
                    }}
                    onError={onError}
                />
            )}

            {showEditModal && selectedSport && (
                <EditSportModal
                    sport={selectedSport}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedSport(null);
                    }}
                    onSuccess={() => {
                        handleModalSuccess();
                        onSuccess("Sport updated successfully");
                    }}
                    onError={onError}
                />
            )}
        </>
    );
};

export default SportsSection;
