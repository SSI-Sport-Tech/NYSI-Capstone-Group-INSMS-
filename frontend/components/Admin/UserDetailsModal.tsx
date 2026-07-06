import React, { useState, useEffect } from "react";
import {
    X,
    User,
    Mail,
    Shield,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    Activity,
    FileText,
} from "lucide-react";
import axios from "axios";
import UserAuditLog from "./UserAuditLog";

interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: "IT_ADMIN" | "ADMIN" | "NUTRITIONIST" | "COACH" | "ATHLETE";
    is_active: boolean;
    is_email_verified: boolean;
    created_at: string;
    last_login: string | null;
    has_nutritionist_profile: boolean;
}

interface UserDetailsModalProps {
    user: User;
    onClose: () => void;
}

interface UserActivity {
    message: string;
    user: {
        id: string;
        email: string;
        last_login: string | null;
    };
    active_sessions: number;
    sessions: Array<{
        id: string;
        ip_address: string;
        user_agent: string;
        created_at: string;
        expires_at: string;
    }>;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
    user,
    onClose,
}) => {
    const [activeTab, setActiveTab] = useState<"activity">("activity");
    const [activity, setActivity] = useState<UserActivity | null>(null);
    const [loadingActivity, setLoadingActivity] = useState(true);

    useEffect(() => {
        if (activeTab === "activity") {
            loadUserActivity();
        }
    }, [user.id, activeTab]);

    const loadUserActivity = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get<UserActivity>(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"}/api/admin/users/${user.id}/activity`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setActivity(response.data);
        } catch (err) {
            console.error("Failed to load user activity:", err);
        } finally {
            setLoadingActivity(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Never";
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getRoleBadge = (role: string) => {
        const colors = {
            IT_ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
            ADMIN: "bg-indigo-100 text-indigo-800 border-indigo-200",
            NUTRITIONIST: "bg-green-100 text-green-800 border-green-200",
            COACH: "bg-orange-100 text-orange-800 border-orange-200",
            ATHLETE: "bg-teal-100 text-teal-800 border-teal-200",
        };
        return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800";
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
                <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                                    {user.first_name[0]}
                                    {user.last_name[0]}
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white">
                                        {user.first_name} {user.last_name}
                                    </h3>
                                    <p className="text-sm text-blue-100">{user.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="flex px-6">
                            <button
                                onClick={() => setActiveTab("activity")}
                                className={`flex items-center gap-2 py-4 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === "activity"
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                            >
                                <Activity className="w-4 h-4" />
                                Activity & Sessions
                            </button>
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                        {/* Basic Info - Always visible */}
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Basic Information
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">
                                        Role
                                    </label>
                                    <div className="mt-1">
                                        <span
                                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadge(
                                                user.role
                                            )}`}
                                        >
                                            {user.role.replace("_", " ")}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">
                                        Status
                                    </label>
                                    <div className="mt-1 flex gap-2">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${user.is_active
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                                }`}
                                        >
                                            {user.is_active ? (
                                                <CheckCircle className="w-3 h-3" />
                                            ) : (
                                                <XCircle className="w-3 h-3" />
                                            )}
                                            {user.is_active ? "Active" : "Inactive"}
                                        </span>
                                        {user.has_nutritionist_profile && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                AMS Profile
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Contact & Account Activity in same row */}
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                {/* Contact Info */}
                                <div>
                                    <label className="text-xs text-gray-500 uppercase mb-2 block">
                                        Contact
                                    </label>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="text-sm font-medium text-gray-900">
                                            {user.email}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {user.is_email_verified ? (
                                                <span className="text-green-600 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="text-orange-600 flex items-center gap-1">
                                                    <XCircle className="w-3 h-3" />
                                                    Unverified
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Account Dates */}
                                <div>
                                    <label className="text-xs text-gray-500 uppercase mb-2 block">
                                        Account
                                    </label>
                                    <div className="space-y-2">
                                        <div className="bg-gray-50 rounded-lg p-2">
                                            <div className="text-xs text-gray-500">Created</div>
                                            <div className="text-xs font-medium text-gray-900">
                                                {formatDate(user.created_at)}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-2">
                                            <div className="text-xs text-gray-500">Last Login</div>
                                            <div className="text-xs font-medium text-gray-900">
                                                {formatDate(user.last_login)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <UserAuditLog userId={user.id} />
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetailsModal;
