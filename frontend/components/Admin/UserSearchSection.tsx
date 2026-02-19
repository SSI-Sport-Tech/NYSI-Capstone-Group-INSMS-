import React from "react";
import { Search, X } from "lucide-react";

interface UserSearchSectionProps {
    query: string;
    onQueryChange: (query: string) => void;
    onSearch: () => void;
    onClear: () => void;
    loading: boolean;
    roleFilter: string;
    onRoleFilter: (role: string) => void;
    statusFilter: string;
    onStatusFilter: (status: string) => void;
}

const UserSearchSection: React.FC<UserSearchSectionProps> = ({
    query,
    onQueryChange,
    onSearch,
    onClear,
    loading,
    roleFilter,
    onRoleFilter,
    statusFilter,
    onStatusFilter,
}) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            {/* Search Header */}
            <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">Search Users</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                    Search users by name, email, or filter by role and status
                </p>
            </div>

            {/* Search Input Area */}
            <div className="px-6 py-5">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Type user name or email..."
                            value={query}
                            onChange={(e) => onQueryChange(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onSearch()}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                        />
                        {query && (
                            <button
                                onClick={onClear}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onSearch}
                        disabled={loading}
                        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Search className="w-4 h-4" />
                        <span>Search</span>
                    </button>
                </div>
            </div>

            {/* Role Filters */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <p className="text-xs font-medium text-gray-600 mb-3 uppercase">
                    Filter by Role
                </p>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => onRoleFilter("")}
                        className={`px-3 py-1.5 border rounded-lg text-sm transition-colors ${roleFilter === ""
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        All Roles
                    </button>
                    <button
                        onClick={() => onRoleFilter("IT_ADMIN")}
                        className={`px-3 py-1.5 border rounded-lg text-sm transition-colors ${roleFilter === "IT_ADMIN"
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        IT Admin
                    </button>
                    <button
                        onClick={() => onRoleFilter("ADMIN")}
                        className={`px-3 py-1.5 border rounded-lg text-sm transition-colors ${roleFilter === "ADMIN"
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        Admin
                    </button>
                    <button
                        onClick={() => onRoleFilter("NUTRITIONIST")}
                        className={`px-3 py-1.5 border rounded-lg text-sm transition-colors ${roleFilter === "NUTRITIONIST"
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        Nutritionist
                    </button>
                    <button
                        onClick={() => onRoleFilter("COACH")}
                        className={`px-3 py-1.5 border rounded-lg text-sm transition-colors ${roleFilter === "COACH"
                            ? "bg-orange-600 text-white border-orange-600"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        Coach
                    </button>
                    <button
                        onClick={() => onRoleFilter("ATHLETE")}
                        className={`px-3 py-1.5 border rounded-lg text-sm transition-colors ${roleFilter === "ATHLETE"
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        Athlete
                    </button>
                </div>
            </div>

            {/* Status Filters */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <p className="text-xs font-medium text-gray-600 mb-3 uppercase">
                    Filter by Status
                </p>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => onStatusFilter("")}
                        className={`px-3 py-1.5 border rounded-lg text-sm transition-colors ${statusFilter === ""
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        All Status
                    </button>
                    <button
                        onClick={() => onStatusFilter("true")}
                        className={`px-3 py-1.5 border rounded-lg text-sm transition-colors ${statusFilter === "true"
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        ✓ Active
                    </button>
                    <button
                        onClick={() => onStatusFilter("false")}
                        className={`px-3 py-1.5 border rounded-lg text-sm transition-colors ${statusFilter === "false"
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        ✗ Inactive
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserSearchSection;