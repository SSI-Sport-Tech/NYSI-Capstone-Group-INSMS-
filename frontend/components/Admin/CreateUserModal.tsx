import React, { useState } from "react";
import { X, UserPlus, AlertCircle, Shield } from "lucide-react";
import axios from "axios";

interface CreateUserModalProps {
    onClose: () => void;
    onSuccess: () => void;
    currentUserRole: "IT_ADMIN" | "ADMIN";
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
    onClose,
    onSuccess,
    currentUserRole,
}) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [role, setRole] = useState<"IT_ADMIN" | "ADMIN" | "NUTRITIONIST" | "COACH" | "ATHLETE" | "DASHBOARD">("NUTRITIONIST");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Determine available roles based on current user
    const isITAdmin = currentUserRole === "IT_ADMIN";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (!email.trim() || !firstName.trim() || !lastName.trim()) {
            setError("All fields are required");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        // Permission check: ADMINs cannot create IT_ADMIN or ADMIN roles
        if (!isITAdmin && (role === "IT_ADMIN" || role === "ADMIN")) {
            setError("You don't have permission to create this role");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"}/api/auth/register`,
                {
                    email,
                    password,
                    first_name: firstName,
                    last_name: lastName,
                    role,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create user");
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
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                                    <UserPlus className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        Create New User
                                    </h3>
                                    <p className="text-sm text-green-100">
                                        Add a new user to the system
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
                        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                            {/* Error Message */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Permission Info Box */}
                            {!isITAdmin && (
                                <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-amber-800">
                                            <strong>Your permissions:</strong> You can create Nutritionists, Coaches, and Athletes. Only IT Admins can create Admins.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Info Box */}
                            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    The new user will be able to login immediately. If the role is
                                    ADMIN or NUTRITIONIST, an AMS profile will be created
                                    automatically.
                                </p>
                            </div>

                            {/* First Name */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Enter first name"
                                    required
                                />
                            </div>

                            {/* Last Name */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Enter last name"
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="user@nysi.org.sg"
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    This will be used for login and 2FA codes
                                </p>
                            </div>

                            {/* Role */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Role <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="NUTRITIONIST">Nutritionist (Standard User)</option>
                                    {isITAdmin && (
                                        <option value="ADMIN">Admin (Senior Nutritionist)</option>
                                    )}
                                    {isITAdmin && (
                                        <option value="IT_ADMIN">IT Admin (Full Access)</option>
                                    )}
                                    <option value="COACH">Coach (Phase 2)</option>
                                    <option value="ATHLETE">Athlete (Phase 2)</option>
                                    <option value="DASHBOARD">Dashboard (View dashboard only)</option>
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    {role === "ADMIN" || role === "NUTRITIONIST"
                                        ? "✓ AMS nutritionist profile will be created automatically"
                                        : role === "IT_ADMIN"
                                            ? "⚠️ Full system access - use with caution"
                                            : role === "DASHBOARD"
                                                ? "Dashboard access only — cannot view AMS, SSS, or Admin pages"
                                                : "No AMS profile will be created"}
                                </p>
                            </div>

                            {/* Password */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Enter password"
                                    required
                                    minLength={8}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Minimum 8 characters
                                </p>
                            </div>

                            {/* Confirm Password */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Confirm password"
                                    required
                                    minLength={8}
                                />
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
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4" />
                                        <span>Create User</span>
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

export default CreateUserModal;
