"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import SportsSection from "@/components/Admin/SportsSection";
import CoachesSection from "@/components/Admin/CoachesSection";
import PageHeader from "@/components/PageHeader";

interface Sport {
    id: string;
    sport: string;
    is_active: boolean;
}

interface Coach {
    id: string;
    sport_id: string;
    name: string;
    sport_name: string;
}

export default function SportsCoachesPage() {
    const router = useRouter();
    const { user: currentUser, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState<"sports" | "coaches">("sports");

    // Sports state
    const [sports, setSports] = useState<Sport[]>([]);
    const [loadingSports, setLoadingSports] = useState(true);

    // Coaches state
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loadingCoaches, setLoadingCoaches] = useState(true);

    // UI state
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const isITAdmin = currentUser?.role === "IT_ADMIN";
    const isAdmin = currentUser?.role === "ADMIN";

    // Check authorization
    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }

        // Only ADMIN and IT_ADMIN can access this page
        if (!isITAdmin && !isAdmin) {
            router.push("/unauthorized");
            return;
        }

        loadSports();
        loadCoaches();
    }, [isAuthenticated, currentUser, router]);

    const loadSports = async (includeInactive = true) => {
        setLoadingSports(true);
        setError("");

        try {
            const token = localStorage.getItem("nysi_auth_token");
            const response = await axios.get<{ data: Sport[] }>(
                "http://localhost:8000/api/AMS/sports",
                {
                    params: { includeInactive },
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data && Array.isArray(response.data.data)) {
                setSports(response.data.data);
            } else {
                setSports([]);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to load sports");
            console.error(err);
            setSports([]);
        } finally {
            setLoadingSports(false);
        }
    };

    const loadCoaches = async () => {
        setLoadingCoaches(true);
        setError("");

        try {
            const token = localStorage.getItem("nysi_auth_token");
            const response = await axios.get<{ data: Coach[] }>(
                "http://localhost:8000/api/AMS/coaches",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data && Array.isArray(response.data.data)) {
                setCoaches(response.data.data);
            } else {
                setCoaches([]);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to load coaches");
            console.error(err);
            setCoaches([]);
        } finally {
            setLoadingCoaches(false);
        }
    };

    const showSuccess = (message: string) => {
        setSuccess(message);
        setTimeout(() => setSuccess(""), 3000);
    };

    const showError = (message: string) => {
        setError(message);
        setTimeout(() => setError(""), 3000);
    };

    const handleRefresh = () => {
        if (activeTab === "sports") {
            loadSports();
        } else {
            loadCoaches();
        }
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-[1600px] mx-auto px-6 py-8">
                    {/* Page Header */}
                    <PageHeader title="Sports and Coach Management" />

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

                    {/* Tabs */}
                    <div className="mb-6 border-b border-gray-200">
                        <nav className="flex gap-8">
                            <button
                                onClick={() => setActiveTab("sports")}
                                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "sports"
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                            >
                                <Trophy className="w-4 h-4" />
                                Sports ({sports.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("coaches")}
                                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "coaches"
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                Coaches ({coaches.length})
                            </button>
                        </nav>
                    </div>

                    {/* Content Sections */}
                    {activeTab === "sports" ? (
                        <SportsSection
                            sports={sports}
                            loading={loadingSports}
                            onRefresh={loadSports}
                            onSuccess={showSuccess}
                            onError={showError}
                        />
                    ) : (
                        <CoachesSection
                            coaches={coaches}
                            sports={sports}
                            loading={loadingCoaches}
                            onRefresh={loadCoaches}
                            onSuccess={showSuccess}
                            onError={showError}
                        />
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}