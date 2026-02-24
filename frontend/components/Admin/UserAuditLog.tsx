import React, { useState, useEffect } from "react";
import {
    FileText,
    Clock,
    ChevronDown,
    ChevronUp,
    Filter,
    X,
    RefreshCw,
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
    const [tableFilter, setTableFilter] = useState("");
    const [actionFilter, setActionFilter] = useState("");

    useEffect(() => {
        loadAuditLogs();
    }, [userId]);

    const loadAuditLogs = async () => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("token");
            const params: any = { user_id: userId };

            if (tableFilter) params.table_name = tableFilter;
            if (actionFilter) params.action = actionFilter;

            const response = await axios.get<{ data: AuditLog[] }>(
                "http://localhost:8000/api/admin/audit-logs",
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
        };
        return colors[tableName] || "bg-gray-100 text-gray-800";
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

                    return (
                        <div
                            key={key}
                            className={`p-2 rounded ${changed ? "bg-yellow-50 border border-yellow-200" : "bg-gray-50"
                                }`}
                        >
                            <div className="text-xs font-medium text-gray-700 mb-1">
                                {key}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {oldVal !== undefined && (
                                    <div>
                                        <span className="text-gray-500">Old:</span>
                                        <span className="ml-1 font-mono text-red-600">
                                            {JSON.stringify(oldVal)}
                                        </span>
                                    </div>
                                )}
                                {newVal !== undefined && (
                                    <div>
                                        <span className="text-gray-500">New:</span>
                                        <span className="ml-1 font-mono text-green-600">
                                            {JSON.stringify(newVal)}
                                        </span>
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
        loadAuditLogs();
    };

    // Get unique tables and actions for filters
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
            <div className="mb-4 flex gap-2">
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

                {(tableFilter || actionFilter) && (
                    <button
                        onClick={clearFilters}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-1"
                    >
                        <X className="w-3 h-3" />
                        Clear
                    </button>
                )}
            </div>

            {/* Logs List */}
            {logs.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No audit logs found</p>
                </div>
            ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                        >
                            {/* Log Header */}
                            <div
                                className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => toggleExpand(log.id)}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <span
                                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getActionBadge(
                                            log.action
                                        )}`}
                                    >
                                        {log.action}
                                    </span>
                                    <span
                                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getTableBadge(
                                            log.table_name
                                        )}`}
                                    >
                                        {log.table_name}
                                    </span>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(log.changed_on)}
                                    </div>
                                </div>
                                {expandedLog === log.id ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                            </div>

                            {/* Expanded Details */}
                            {expandedLog === log.id && (
                                <div className="p-3 border-t border-gray-200 bg-white">
                                    <div className="text-xs text-gray-500 mb-2">
                                        <strong>Record ID:</strong> {log.record_id}
                                    </div>

                                    {log.action === "CREATE" && log.new_values && (
                                        <div>
                                            <div className="text-xs font-medium text-gray-700 mb-2">
                                                Created Values:
                                            </div>
                                            {renderJsonDiff(null, log.new_values)}
                                        </div>
                                    )}

                                    {log.action === "UPDATE" && (
                                        <div>
                                            <div className="text-xs font-medium text-gray-700 mb-2">
                                                Changes:
                                            </div>
                                            {renderJsonDiff(log.old_values, log.new_values)}
                                        </div>
                                    )}

                                    {log.action === "DELETE" && log.old_values && (
                                        <div>
                                            <div className="text-xs font-medium text-gray-700 mb-2">
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