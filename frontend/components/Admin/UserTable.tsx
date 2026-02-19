import React from "react";
import {
    Eye,
    Edit,
    Key,
    Mail,
    UserCheck,
    UserX,
    Trash2,
    Shield,
    ShieldCheck,
    Users,
} from "lucide-react";

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

interface UserTableProps {
    users: User[];
    loading: boolean;
    onViewDetails: (user: User) => void;
    onEdit: (user: User) => void;
    onChangePassword: (user: User) => void;
    onChangeEmail: (user: User) => void;
    onToggleActive: (user: User) => void;
    onDelete: (user: User) => void;
}

const UserTable: React.FC<UserTableProps> = ({
    users,
    loading,
    onViewDetails,
    onEdit,
    onChangePassword,
    onChangeEmail,
    onToggleActive,
    onDelete,
}) => {
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

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "IT_ADMIN":
                return <ShieldCheck className="w-3.5 h-3.5" />;
            case "ADMIN":
                return <Shield className="w-3.5 h-3.5" />;
            case "NUTRITIONIST":
            case "COACH":
            case "ATHLETE":
                return <Users className="w-3.5 h-3.5" />;
            default:
                return null;
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Never";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-500">Loading users...</p>
                </div>
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No users found
                    </h3>
                    <p className="text-gray-500">
                        Try adjusting your search or filters
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-base font-semibold text-gray-900">
                    Users ({users.length})
                </h3>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Login
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                {/* User Info */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                            {user.first_name[0]}
                                            {user.last_name[0]}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {user.first_name} {user.last_name}
                                            </div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>

                                {/* Role */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(
                                            user.role
                                        )}`}
                                    >
                                        {getRoleIcon(user.role)}
                                        {user.role.replace("_", " ")}
                                    </span>
                                </td>

                                {/* Status */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                                }`}
                                        >
                                            {user.is_active ? "✓ Active" : "✗ Inactive"}
                                        </span>
                                        {user.has_nutritionist_profile && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                AMS Profile
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Last Login */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(user.last_login_at)}
                                </td>

                                {/* Created */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(user.created_at)}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => onViewDetails(user)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onEdit(user)}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit User"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onChangePassword(user)}
                                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                            title="Change Password"
                                        >
                                            <Key className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onChangeEmail(user)}
                                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                            title="Change Email"
                                        >
                                            <Mail className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onToggleActive(user)}
                                            className={`p-1.5 rounded-lg transition-colors ${user.is_active
                                                    ? "text-orange-600 hover:bg-orange-50"
                                                    : "text-green-600 hover:bg-green-50"
                                                }`}
                                            title={user.is_active ? "Deactivate" : "Activate"}
                                        >
                                            {user.is_active ? (
                                                <UserX className="w-4 h-4" />
                                            ) : (
                                                <UserCheck className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => onDelete(user)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete User"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserTable;