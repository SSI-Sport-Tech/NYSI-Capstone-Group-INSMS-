import React, { useState } from "react";
import { X, Edit, AlertCircle } from "lucide-react";
import axios from "axios";

interface Sport {
    id: string;
    sport: string;
    is_active: boolean;
}

interface EditSportModalProps {
    sport: Sport;
    onClose: () => void;
    onSuccess: () => void;
    onError: (message: string) => void;
}

const EditSportModal: React.FC<EditSportModalProps> = ({
    sport,
    onClose,
    onSuccess,
    onError,
}) => {
    const [sportName, setSportName] = useState(sport.sport);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!sportName.trim()) {
            setError("Sport name is required");
            return;
        }

        if (sportName.trim() === sport.sport) {
            onClose();
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("nysi_auth_token");
            await axios.patch(
                `http://localhost:8000/api/AMS/sports/${sport.id}`,
                { sport: sportName.trim() },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            onSuccess();
        } catch (err: any) {
            const message = err.response?.data?.message || "Failed to update sport";
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
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">
                                Edit Sport
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sport Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={sportName}
                                onChange={(e) => setSportName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Edit className="w-4 h-4" />
                                        <span>Save Changes</span>
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

export default EditSportModal;