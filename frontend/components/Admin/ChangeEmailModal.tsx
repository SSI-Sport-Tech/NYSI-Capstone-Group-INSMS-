import React, { useState } from "react";
import { X, Mail, AlertCircle } from "lucide-react";
import axios from "axios";

interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
}

interface ChangeEmailModalProps {
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({
    user,
    onClose,
    onSuccess,
}) => {
    const [newEmail, setNewEmail] = useState("");
    const [resetVerification, setResetVerification] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            setError("Please enter a valid email address");
            return;
        }

        if (newEmail === user.email) {
            setError("New email must be different from current email");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            await axios.patch(
                `/api/admin/users/${user.id}/email`,
                {
                    new_email: newEmail,
                    reset_verification: resetVerification,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            onSuccess();
        } catch (err: any) {
            setError(
                err.response?.data?.message || "Failed to change email"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                    onClick={onClose}
                ></div>

                {/* Modal panel */}
                <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                                    <Mail className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        Change Email (2FA Email)
                                    </h3>
                                    <p className="text-sm text-teal-100">
                                        {user.first_name} {user.last_name}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <form onSubmit={handleSubmit}>
                        <div className="px-6 py-5">
                            {/* Error Message */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Warning */}
                            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> This email is where 2FA verification
                                    codes will be sent during login.
                                </p>
                            </div>

                            {/* Current Email */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Current Email
                                </label>
                                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                                    {user.email}
                                </div>
                            </div>

                            {/* New Email */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Email Address
                                </label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    placeholder="Enter new email address"
                                    required
                                />
                            </div>

                            {/* Reset Verification Checkbox */}
                            <div className="mb-4">
                                <label className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={resetVerification}
                                        onChange={(e) => setResetVerification(e.target.checked)}
                                        className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">
                                            Mark email as unverified
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Recommended: User will need to verify their new email
                                            address
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Changing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4" />
                                        <span>Change Email</span>
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

export default ChangeEmailModal;