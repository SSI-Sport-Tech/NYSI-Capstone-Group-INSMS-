import React, { useState } from "react";
import { X, Plus, AlertCircle } from "lucide-react";
import axios from "axios";

interface Sport {
    id: string;
    sport: string;
    is_active: boolean;
}

interface CreateCoachModalProps {
    sports: Sport[];
    onClose: () => void;
    onSuccess: () => void;
    onError: (message: string) => void;
}

const CreateCoachModal: React.FC<CreateCoachModalProps> = ({
    sports,
    onClose,
    onSuccess,
    onError,
}) => {
    const [coachName, setCoachName] = useState("");
    const [sportId, setSportId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!coachName.trim()) {
            setError("Coach name is required");
            return;
        }

        if (!sportId) {
            setError("Please select a sport");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("nysi_auth_token");
            await axios.post(
                "http://localhost:8000/api/AMS/coaches",
                {
                    name: coachName.trim(),
                    sport_id: sportId,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            onSuccess();
        } catch (err: any) {
            const message = err.response?.data?.message || "Failed to create coach";
            setError(message);
            onError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75"
                    onClick={onClose}
                ></div>

                <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Add New Coach
                                </h3>
                                <p className="text-sm text-green-100 mt-0.5">
                                    Create a coach and assign to a sport
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Coach Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Coach Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={coachName}
                                onChange={(e) => setCoachName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="e.g., John Smith"
                                required
                                autoFocus
                            />
                        </div>

                        {/* Sport Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sport <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={sportId}
                                onChange={(e) => setSportId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                            >
                                <option value="">Select a sport</option>
                                {sports.map((sport) => (
                                    <option key={sport.id} value={sport.id}>
                                        {sport.sport}
                                    </option>
                                ))}
                            </select>
                            {sports.length === 0 && (
                                <p className="mt-1 text-xs text-amber-600">
                                    ⚠️ No active sports available. Please create a sport first.
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || sports.length === 0}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        <span>Create Coach</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateCoachModal;