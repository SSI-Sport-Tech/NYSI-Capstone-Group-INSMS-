"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import UserSearchSection from "@/components/Admin/UserSearchSection";
import UserTable from "@/components/Admin/UserTable";
import UserDetailsModal from "@/components/Admin/UserDetailsModal";
import EditUserModal from "@/components/Admin/EditUserModal";
import ChangePasswordModal from "@/components/Admin/ChangePasswordModal";
import ChangeEmailModal from "@/components/Admin/ChangeEmailModal";

interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: "IT_ADMIN" | "ADMIN" | "NUTRITIONIST" | "COACH" | "ATHLETE";
    is_active: boolean;
    is_email_verified: boolean;
    created_at: string;
    last_login_at: string | null;
    has_nutritionist_profile: boolean;
}

interface UsersResponse {
    message: string;
    count: number;
    users: User[];
}

export default function AdminUsersPage() {
    const router = useRouter();
    const { user: currentUser, isAuthenticated } = useAuth();
    const [query, setQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Modal states
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);

    // Check authorization
    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }

        console.log("Current User:", currentUser);


        // // Only ADMIN and IT_ADMIN can access this page
        // if (currentUser?.role !== "ADMIN" && currentUser?.role !== "IT_ADMIN") {
        //     router.push("/unauthorized");
        //     return;
        // }

        loadUsers();
    }, [isAuthenticated, currentUser, router]);

    const loadUsers = async (searchQuery = "", role = "", status = "") => {
        setLoading(true);
        setError("");

        try {
            const params: { search?: string; role?: string; is_active?: string } = {};

            if (searchQuery.trim()) {
                params.search = searchQuery;
            }
            if (role) {
                params.role = role;
            }
            if (status) {
                params.is_active = status;
            }

            const token = localStorage.getItem("token");

            // Use your actual API base URL
            const response = await axios.get<UsersResponse>(
                "http://localhost:8000/api/admin/users",
                {
                    params,
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data && Array.isArray(response.data.users)) {
                setUsers(response.data.users);
                setTotal(response.data.count || 0);
            } else {
                setUsers([]);
                setTotal(0);
            }
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError("Session expired. Please login again.");
                router.push("/login");
            } else if (err.response?.status === 403) {
                setError("You don't have permission to access this page.");
                router.push("/unauthorized");
            } else {
                setError(
                    err.response?.data?.message ||
                    "Failed to load users. Please try again."
                );
            }
            console.error(err);
            setUsers([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        await loadUsers(query, roleFilter, statusFilter);
    };

    const handleClearSearch = async () => {
        setQuery("");
        setRoleFilter("");
        setStatusFilter("");
        await loadUsers("", "", "");
    };

    const handleRoleFilter = (role: string) => {
        setRoleFilter(role);
        loadUsers(query, role, statusFilter);
    };

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
        loadUsers(query, roleFilter, status);
    };

    const handleViewDetails = (user: User) => {
        setSelectedUser(user);
        setShowDetailsModal(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setShowEditModal(true);
    };

    const handleChangePassword = (user: User) => {
        setSelectedUser(user);
        setShowPasswordModal(true);
    };

    const handleChangeEmail = (user: User) => {
        setSelectedUser(user);
        setShowEmailModal(true);
    };

    const handleToggleActive = async (user: User) => {
        try {
            const token = localStorage.getItem("token");
            await axios.patch(
                `http://localhost:8000/api/admin/users/${user.id}/active`,
                { is_active: !user.is_active },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setSuccess(
                `User ${!user.is_active ? "activated" : "deactivated"} successfully`
            );
            await loadUsers(query, roleFilter, statusFilter);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(""), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to update user status");
            console.error(err);
        }
    };

    const handleDeleteUser = async (user: User) => {
        if (
            !confirm(
                `Are you sure you want to delete ${user.first_name} ${user.last_name}? This action cannot be undone.`
            )
        ) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            await axios.delete(
                `http://localhost:8000/api/admin/users/${user.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setSuccess("User deleted successfully");
            await loadUsers(query, roleFilter, statusFilter);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(""), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to delete user");
            console.error(err);
        }
    };

    const handleModalSuccess = async () => {
        await loadUsers(query, roleFilter, statusFilter);
        setShowDetailsModal(false);
        setShowEditModal(false);
        setShowPasswordModal(false);
        setShowEmailModal(false);
        setSelectedUser(null);
        setSuccess("Changes saved successfully");
        setTimeout(() => setSuccess(""), 3000);
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-[1600px] mx-auto px-6 py-8">
                    {/* Page Header */}
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                                User Management
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Manage user accounts, roles, and permissions
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4">
                            <div className="bg-white px-6 py-3 rounded-lg border border-gray-200 shadow-sm">
                                <div className="text-2xl font-bold text-gray-900">{total}</div>
                                <div className="text-xs text-gray-500 uppercase">
                                    Total Users
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-xl mb-6 flex items-start gap-3">
                            <svg
                                className="w-5 h-5 flex-shrink-0 mt-0.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <p className="text-sm font-medium">{success}</p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl mb-6 flex items-start gap-3">
                            <svg
                                className="w-5 h-5 flex-shrink-0 mt-0.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {/* Search Section */}
                    <UserSearchSection
                        query={query}
                        onQueryChange={setQuery}
                        onSearch={handleSearch}
                        onClear={handleClearSearch}
                        loading={loading}
                        roleFilter={roleFilter}
                        onRoleFilter={handleRoleFilter}
                        statusFilter={statusFilter}
                        onStatusFilter={handleStatusFilter}
                    />

                    {/* User Table */}
                    <UserTable
                        users={users}
                        loading={loading}
                        onViewDetails={handleViewDetails}
                        onEdit={handleEditUser}
                        onChangePassword={handleChangePassword}
                        onChangeEmail={handleChangeEmail}
                        onToggleActive={handleToggleActive}
                        onDelete={handleDeleteUser}
                    />
                </div>
            </div>

            {/* Modals */}
            {showDetailsModal && selectedUser && (
                <UserDetailsModal
                    user={selectedUser}
                    onClose={() => setShowDetailsModal(false)}
                />
            )}

            {showEditModal && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={handleModalSuccess}
                />
            )}

            {showPasswordModal && selectedUser && (
                <ChangePasswordModal
                    user={selectedUser}
                    onClose={() => setShowPasswordModal(false)}
                    onSuccess={handleModalSuccess}
                />
            )}

            {showEmailModal && selectedUser && (
                <ChangeEmailModal
                    user={selectedUser}
                    onClose={() => setShowEmailModal(false)}
                    onSuccess={handleModalSuccess}
                />
            )}
        </DashboardLayout>
    );
}