import React from "react";
import { Bell, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
    const { user } = useAuth();

    // Get role display name
    const getRoleDisplay = (role?: string) => {
        if (!role) return "User";

        const roleMap: { [key: string]: string } = {
            IT_ADMIN: "IT Admin",
            ADMIN: "Admin",
            NUTRITIONIST: "Nutritionist",
            COACH: "Coach",
            ATHLETE: "Athlete",
        };

        return roleMap[role] || role;
    };

    // Get user initials for avatar
    const getInitials = () => {
        if (!user) return "?";
        const firstInitial = user.first_name?.[0] || "";
        const lastInitial = user.last_name?.[0] || "";
        return `${firstInitial}${lastInitial}`.toUpperCase();
    };

    return (
        <div className="mb-6 flex items-center justify-between">
            {/* Left side - Title */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-gray-500 mt-1">{subtitle}</p>
                )}
            </div>

            {/* Right side - User Profile & Actions */}
            <div className="flex items-center gap-4">
                {/* Optional children (like stats or action buttons) */}
                {children}

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                    {/* User Avatar */}
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {getInitials()}
                        </div>
                        {/* Online indicator */}
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>

                    {/* User Info */}
                    <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                            {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                            {getRoleDisplay(user?.role)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PageHeader;