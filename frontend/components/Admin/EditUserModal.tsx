import React, { useState } from "react";
import { X, Edit, AlertCircle } from "lucide-react";
import axios from "axios";

interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: "IT_ADMIN" | "ADMIN" | "NUTRITIONIST" | "COACH" | "ATHLETE";
    is_active: boolean;
    is_email_verified: boolean;
}

interface EditUserModalProps {
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
    user,
    onClose,
    onSuccess,
}) => {
    const [firstName, setFirstName] = useState(user.first_name);
    const [lastName, setLastName] = useState(user.last_name);
    const [role, setRole] = useState(user.role);
    const [isActive, setIsActive] = useState(user.is_active);
    const [isEmailVerified, setIsEmailVerified] = useState(user.is_email_verified);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (!firstName.trim() || !lastName.trim()) {
            setError("First name and last name are required");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const updates: any = {};

            // Only include fields that changed
            if (firstName !== user.first_name) updates.first_name = firstName;
            if (lastName !== user.last_name) updates.last_name = lastName;
            if (role !== user.role) updates.role = role;
            if (isActive !== user.is_active) updates.is_active = isActive;
            if (isEmailVerified !== user.is_email_verified)
                updates.is_email_verified = isEmailVerified;

            await axios.patch(`/api/admin/users/${user.id}`, updates, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to update user");
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
                    <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                                    <Edit className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        Edit User
                                    </h3>
                                    <p className="text-sm text-indigo-100">{user.email}</p>
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

                            {/* First Name */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Enter first name"
                                    required
                                />
                            </div>

                            {/* Last Name */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Enter last name"
                                    required
                                />
                            </div>

                            {/* Role */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Role
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="IT_ADMIN">IT Admin</option>
                                    <option value="ADMIN">Admin (Senior Nutritionist)</option>
                                    <option value="NUTRITIONIST">Nutritionist</option>
                                    <option value="COACH">Coach</option>
                                    <option value="ATHLETE">Athlete</option>
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    {role === "ADMIN" || role === "NUTRITIONIST"
                                        ? "AMS profile will be created automatically if needed"
                                        : ""}
                                </p>
                            </div>

                            {/* Status Checkboxes */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">
                                            Active Account
                                        </span>
                                        <p className="text-xs text-gray-500">
                                            Inactive users cannot login
                                        </p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={isEmailVerified}
                                        onChange={(e) => setIsEmailVerified(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">
                                            Email Verified
                                        </span>
                                        <p className="text-xs text-gray-500">
                                            Mark email as verified
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
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
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

export default EditUserModal;