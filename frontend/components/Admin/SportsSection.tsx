import React, { useState } from "react";
import { RefreshCw } from "lucide-react";

interface Sport {
    id: string;
    sport: string;
    is_active: boolean;
}

interface SportsSectionProps {
    sports: Sport[];
    loading: boolean;
    onRefresh: () => void;
}

const SportsSection: React.FC<SportsSectionProps> = ({
    sports,
    loading,
    onRefresh,
}) => {
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-500">Loading sports...</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">
                            Sports List
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {sports.length} sports in database
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onRefresh}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Table */}
                {sports.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <p className="text-gray-500">No sports found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sport Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sports.map((sport) => (
                                    <tr key={sport.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {sport.sport}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${sport.is_active
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                    }`}
                                            >
                                                {sport.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default SportsSection;
