import React, { useState, useEffect } from "react";
import {
    FileText,
    Clock,
    ChevronDown,
    ChevronUp,
    X,
    RefreshCw,
    Calendar,
} from "lucide-react";
import axios from "axios";

interface AuditLog {
    id: string;
    user_id: string;
    table_name: string;
    record_id: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    old_values: any;
    new_values: any;
    changed_on: string;
}

interface UserAuditLogProps {
    userId: string;
}

const UserAuditLog: React.FC<UserAuditLogProps> = ({ userId }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    // Filters
    const [tableFilter, setTableFilter] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Reference data for name lookups
    const [referenceData, setReferenceData] = useState<{
        sports: any[];
        users: any[];
        coaches: any[];
        athletes: any[];
    }>({
        sports: [],
        users: [],
        coaches: [],
        athletes: [],
    });

    useEffect(() => {
        loadReferenceData();
    }, []);

    useEffect(() => {
        if (!userId) return;
        loadAuditLogs();
    }, [userId, tableFilter, actionFilter, startDate, endDate]);

    const loadReferenceData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Load sports
            const sportsRes = await axios.get(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"}/api/AMS/sports?includeInactive=true`,
                { headers }
            );

            // Load coaches
            const coachesRes = await axios.get(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"}/api/AMS/coaches`,
                { headers }
            );

            // Load users (for user_id references)
            const usersRes = await axios.get(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"}/api/admin/users`,
                { headers }
            );

            setReferenceData({
                sports: sportsRes.data?.data || [],
                coaches: coachesRes.data?.data || [],
                users: usersRes.data?.users || [],
                athletes: [], // Add if you have an athletes endpoint
            });
        } catch (err) {
            console.error("Failed to load reference data:", err);
        }
    };

    const loadAuditLogs = async () => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("token");
            const params: any = { user_id: userId };

            if (tableFilter) params.table_name = tableFilter;
            if (actionFilter) params.action = actionFilter;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const response = await axios.get<{ data: AuditLog[] }>(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"}/api/admin/audit-logs`,
                {
                    params,
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data && Array.isArray(response.data.data)) {
                setLogs(response.data.data);
            } else {
                setLogs([]);
            }
        } catch (err: any) {
            setError("Failed to load audit logs");
            console.error(err);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    const getActionBadge = (action: string) => {
        const colors = {
            CREATE: "bg-green-100 text-green-800 border-green-200",
            UPDATE: "bg-blue-100 text-blue-800 border-blue-200",
            DELETE: "bg-red-100 text-red-800 border-red-200",
        };
        return colors[action as keyof typeof colors] || "bg-gray-100 text-gray-800";
    };

    const getTableBadge = (tableName: string) => {
        const colors: { [key: string]: string } = {
            users: "bg-purple-100 text-purple-800",
            athlete: "bg-teal-100 text-teal-800",
            coach: "bg-orange-100 text-orange-800",
            nutritionist: "bg-green-100 text-green-800",
            supplement: "bg-indigo-100 text-indigo-800",
            batch: "bg-blue-100 text-blue-800",
            consultation: "bg-pink-100 text-pink-800",
            sport_lookup: "bg-yellow-100 text-yellow-800",
        };
        return colors[tableName] || "bg-gray-100 text-gray-800";
    };

    // Resolve ID to name
    const resolveName = (key: string, value: any): string => {
        if (!value) return String(value);

        // Sport ID -> Sport Name
        if (key === "sport_id" || key.includes("sport")) {
            const sport = referenceData.sports.find((s) => s.id === value);
            return sport ? sport.sport : value;
        }

        // User ID -> User Name
        if (key === "user_id" || key.includes("user")) {
            const user = referenceData.users.find((u) => u.id === value);
            return user ? `${user.first_name} ${user.last_name}` : value;
        }

        // Coach ID -> Coach Name
        if (key === "coach_id" || key.includes("coach")) {
            const coach = referenceData.coaches.find((c) => c.id === value);
            return coach ? coach.name : value;
        }

        // Athlete ID -> Athlete Name
        if (key === "athlete_id" || key.includes("athlete")) {
            const athlete = referenceData.athletes.find((a) => a.id === value);
            return athlete ? athlete.name : value;
        }

        return String(value);
    };

    const toggleExpand = (logId: string) => {
        setExpandedLog(expandedLog === logId ? null : logId);
    };

    const renderJsonDiff = (oldValues: any, newValues: any) => {
        if (!oldValues && !newValues) return null;

        const allKeys = new Set([
            ...Object.keys(oldValues || {}),
            ...Object.keys(newValues || {}),
        ]);

        return (
            <div className="mt-3 space-y-2">
                {Array.from(allKeys).map((key) => {
                    const oldVal = oldValues?.[key];
                    const newVal = newValues?.[key];
                    const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);

                    // Skip internal fields
                    if (["id", "created_at", "updated_at"].includes(key)) {
                        return null;
                    }

                    return (
                        <div
                            key={key}
                            className={`p-3 rounded-lg ${changed
                                ? "bg-yellow-50 border-l-4 border-yellow-400"
                                : "bg-gray-50"
                                }`}
                        >
                            <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                {key.replace(/_/g, " ")}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {oldVal !== undefined && (
                                    <div className="space-y-1">
                                        <div className="text-xs text-gray-500 font-medium">
                                            Old Value:
                                        </div>
                                        <div className="font-mono text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
                                            {resolveName(key, oldVal)}
                                        </div>
                                    </div>
                                )}
                                {newVal !== undefined && (
                                    <div className="space-y-1">
                                        <div className="text-xs text-gray-500 font-medium">
                                            New Value:
                                        </div>
                                        <div className="font-mono text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                                            {resolveName(key, newVal)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const clearFilters = () => {
        setTableFilter("");
        setActionFilter("");
        setStartDate("");
        setEndDate("");
        loadAuditLogs();
    };

    // Get unique tables for filter dropdown
    const uniqueTables = Array.from(new Set(logs.map((log) => log.table_name)));
    const uniqueActions = ["CREATE", "UPDATE", "DELETE"];

    if (loading) {
        return (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-500">Loading audit logs...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-sm text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Audit Log ({logs.length} actions)
                </h4>
                <button
                    onClick={loadAuditLogs}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Filters */}
            <div className="mb-4 space-y-3">
                <div className="flex gap-2">
                    <select
                        value={tableFilter}
                        onChange={(e) => {
                            setTableFilter(e.target.value);
                            setTimeout(loadAuditLogs, 100);
                        }}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Tables</option>
                        {uniqueTables.map((table) => (
                            <option key={table} value={table}>
                                {table}
                            </option>
                        ))}
                    </select>

                    <select
                        value={actionFilter}
                        onChange={(e) => {
                            setActionFilter(e.target.value);
                            setTimeout(loadAuditLogs, 100);
                        }}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Actions</option>
                        {uniqueActions.map((action) => (
                            <option key={action} value={action}>
                                {action}
                            </option>
                        ))}
                    </select>

                    {(tableFilter || actionFilter || startDate || endDate) && (
                        <button
                            onClick={clearFilters}
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-1"
                        >
                            <X className="w-3 h-3" />
                            Clear
                        </button>
                    )}
                </div>

                {/* Date Range Filters */}
                <div className="flex gap-2 items-center">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                            setStartDate(e.target.value);
                            setTimeout(loadAuditLogs, 100);
                        }}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Start Date"
                    />
                    <span className="text-xs text-gray-500">to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                            setEndDate(e.target.value);
                            setTimeout(loadAuditLogs, 100);
                        }}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="End Date"
                    />
                </div>
            </div>

            {/* Logs List */}
            {logs.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No audit logs found</p>
                    {(tableFilter || actionFilter || startDate || endDate) && (
                        <button
                            onClick={clearFilters}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                        >
                            Clear filters to see all logs
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Log Header */}
                            <div
                                className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => toggleExpand(log.id)}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <span
                                        className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getActionBadge(
                                            log.action
                                        )}`}
                                    >
                                        {log.action}
                                    </span>
                                    <span
                                        className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold ${getTableBadge(
                                            log.table_name
                                        )}`}
                                    >
                                        {log.table_name}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDate(log.changed_on)}
                                    </div>
                                </div>
                                {expandedLog === log.id ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                            </div>

                            {/* Expanded Details */}
                            {expandedLog === log.id && (
                                <div className="p-4 border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white">
                                    <div className="text-xs text-gray-600 mb-3 flex items-center gap-2">
                                        <span className="font-semibold">Record ID:</span>
                                        <code className="bg-gray-100 px-2 py-1 rounded font-mono">
                                            {log.record_id}
                                        </code>
                                    </div>

                                    {log.action === "CREATE" && log.new_values && (
                                        <div>
                                            <div className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                                                Created Values:
                                            </div>
                                            {renderJsonDiff(null, log.new_values)}
                                        </div>
                                    )}

                                    {log.action === "UPDATE" && (
                                        <div>
                                            <div className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                                                Changes Made:
                                            </div>
                                            {renderJsonDiff(log.old_values, log.new_values)}
                                        </div>
                                    )}

                                    {log.action === "DELETE" && log.old_values && (
                                        <div>
                                            <div className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                                                Deleted Values:
                                            </div>
                                            {renderJsonDiff(log.old_values, null)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserAuditLog;
