import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Trash2,
  Settings,
  Upload,
  Plus,
  MoreVertical,
  Eye,
  Pin,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import AddAthleteModal from "./AddAthleteModal";

// interface Athlete {
//   id: string;
//   sportsync_id: string;
//   initials: string;
//   sport_name: string;
//   gender: string;
//   date_of_birth: string;
//   carding_status?: string;
//   target_event?: string;
//   assigned_nutritionist?: string;
//   is_pinned?: boolean;
//   coaches?: Array<{
//     coach_id: string;
//     coach_name: string;
//     is_active: boolean;
//   }>;
// }
// interface Athlete {
//   pk_athlete_uuid: string;
//   first_name: string;
//   last_name: string;
//   anonymized_display_name: string;
//   email: string;
//   date_of_birth: string;
//   gender: string;
//   fk_sport_uuid: string;
//   position: string;
//   race: string | null;
//   ethnicity: string |null;
//   nationality: string | null;
//   sport_sync_id: string | null;
//   external_patient_id: string | null;
//   pnco: string;
//   is_active: boolean;
//   created_at: string;
//   updated_at: string;
// }
interface Athlete {
  id: string;
  anonymized_display_name: string;
  sport_name: string;
  gender: string;
  date_of_birth: string;
  carding_status: string | null;
  carding_start_date: Date,
  carding_end_date: Date,
  is_active: boolean;

  email: string;
  position: string;
  race: string | null;
  ethnicity: string | null;
  nationality: string | null;
  fk_sport_uuid: string;
  team_uuid: string;

  assigned_nutritionist: string;
  is_pinned: boolean;
}

interface AthleteTableProps {
  athletes: Athlete[];
  total: number;
  loading: boolean;
  searchQuery?: string;
  onRefresh?: () => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const AthleteTable: React.FC<AthleteTableProps> = ({
  athletes,
  total,
  loading,
  searchQuery,
  onRefresh,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onSuccess,
  onError,
}) => {
  const router = useRouter();
  const { token } = useAuth();
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [pinnedAthletes, setPinnedAthletes] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Update pinned athletes when data changes
  // useEffect(() => {
  //   const pinned = athletes
  //     .filter((athlete) => athlete.is_pinned)
  //     .map((athlete) => athlete.id);
  //   setPinnedAthletes(pinned);
  // }, [athletes]);

  // Handle pin toggle
  // const handlePinToggle = async (athleteId: string) => {
  //   try {
  //     const athlete = athletes.find((a) => a.id === athleteId);
  //     if (!athlete) return;

  //     const isPinned = athlete.is_pinned;
  //     console.log(
  //       `Toggling pin for athlete ${athleteId}, current state: ${isPinned} -> ${!isPinned}`,
  //     );

  //     const response = await axios.patch(
  //       `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"}/api/AMS/nutritionists/pin`,
  //       {
  //         athlete_id: athleteId,
  //         is_pinned: !isPinned,
  //       },
  //       {
  //         headers: { Authorization: `Bearer ${token}` },
  //       },
  //     );

  //     console.log("Pin toggle response:", response.data);

  //     // Refresh the data to get updated pin status
  //     if (onRefresh) {
  //       console.log("Calling onRefresh to reload data");
  //       onRefresh();
  //     } else {
  //       console.log("onRefresh is not available");
  //     }
  //   } catch (error) {
  //     console.error("Error toggling pin:", error);
  //     if (onError) {
  //       onError("Failed to toggle pin status");
  //     }
  //   }
  // };

  // Handle navigation to athlete detail page
  const handleViewAthlete = (athleteId: string) => {
    router.push(`/AMS/athlete-management/${athleteId}`);
  };

  // Handle checkbox selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAthletes(athletes.map((athlete) => athlete.id));
      // setSelectedAthletes(athletes.map((athlete) => athlete.pk_athlete_uuid));
    } else {
      setSelectedAthletes([]);
    }
  };

  const handleSelectAthlete = (athleteId: string, checked: boolean) => {
    if (checked) {
      setSelectedAthletes((prev) => [...prev, athleteId]);
    } else {
      setSelectedAthletes((prev) => prev.filter((id) => id !== athleteId));
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (selectedAthletes.length === 0) {
      alert("Please select athletes to delete");
      return;
    }

    if (
      confirm(
        `Are you sure you want to delete ${selectedAthletes.length} athlete(s)?`,
      )
    ) {
      try {
        await axios.delete("/api/AMS/athletes", {
          data: { ids: selectedAthletes },
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedAthletes([]);
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error("Error deleting athletes:", error);
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          alert("Access denied: deleting athletes requires Admin privileges.");
        } else {
          alert("Failed to delete athletes. Please try again.");
        }
      }
    }
  };

  // Handle export
  // const handleExport = () => {
  //   const headers = [
  //     "ID",
  //     "SportSync ID",
  //     "Athlete Name",
  //     "Sport",
  //     "Gender",
  //     "Date of Birth",
  //   ];
  //   const csvContent = [
  //     headers.join(","),
  //     ...athletes.map((athlete) =>
  //       [
  //         athlete.id,
  //         athlete.sportsync_id,
  //         athlete.initials,
  //         athlete.sport_name,
  //         athlete.gender,
  //         athlete.date_of_birth
  //           ? new Date(athlete.date_of_birth).toLocaleDateString()
  //           : "-",
  //       ].join(","),
  //     ),
  //   ].join("\n");

  //   const blob = new Blob([csvContent], { type: "text/csv" });
  //   const url = URL.createObjectURL(blob);
  //   const link = document.createElement("a");
  //   link.href = url;
  //   link.download = `athletes-${new Date().toISOString().split("T")[0]}.csv`;
  //   link.click();
  //   URL.revokeObjectURL(url);
  // };

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Handle modal success and error
  const handleModalSuccess = (message: string) => {
    setShowAddModal(false);
    if (onRefresh) onRefresh();
    if (onSuccess) onSuccess(message);
  };

  const handleModalError = (message: string) => {
    if (onError) onError(message);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              All Athletes ({total})
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage and view athlete information
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={selectedAthletes.length === 0}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg px-3.5 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
              {selectedAthletes.length > 0 && (
                <span className="ml-1 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                  {selectedAthletes.length}
                </span>
              )}
            </button>
            {/* <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg px-3.5 py-2 transition-colors hover:bg-gray-50"
            >
              <Upload className="w-4 h-4" />
              <span>Export</span>
            </button> */}
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Athlete</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="px-5">
          <div className="overflow-hidden rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {/* <th className="px-3 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedAthletes.length === athletes.length &&
                        athletes.length > 0
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th> */}
                  <th className="px-3 py-3 text-left w-12">
                    {/* Pin column */}
                  </th>
                  <th
                    onClick={() => handleSort("initials")}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  >
                    <div className="flex items-center gap-1">
                      <span className="whitespace-nowrap">Athlete Name</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("sport_name")}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  >
                    <div className="flex items-center gap-1">
                      <span className="whitespace-nowrap">Sports</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("carding_level")}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  >
                    <div className="flex items-center gap-1">
                      <span className="whitespace-nowrap">Carding Level</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("carding_status")}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  >
                    <div className="flex items-center gap-1">
                      <span className="whitespace-nowrap">Status</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("gender")}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  >
                    <div className="flex items-center gap-1">
                      <span className="whitespace-nowrap">Gender</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("date_of_birth")}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  >
                    <div className="flex items-center gap-1">
                      <span className="whitespace-nowrap">DOB</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("target_event")}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  >
                    <div className="flex items-center gap-1">
                      <span className="whitespace-nowrap">Target Event</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("assigned_nutritionist")}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  >
                    <div className="flex items-center gap-1">
                      <span className="whitespace-nowrap">Assigned To</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading athletes...
                    </td>
                  </tr>
                ) : athletes.length > 0 ? (
                  athletes.map((athlete) => (
                    <tr key={athlete.id} className="hover:bg-gray-50">
                    {/* <tr key={athlete.pk_athlete_uuid} className="hover:bg-gray-50"> */}
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selectedAthletes.includes(athlete.id)}
                          // checked={selectedAthletes.includes(athlete.pk_athlete_uuid)}
                          onChange={(e) =>
                            handleSelectAthlete(athlete.id, e.target.checked)
                            // handleSelectAthlete(athlete.pk_athlete_uuid, e.target.checked)
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      {/* <td className="px-3 py-4">
                        <button
                          // onClick={() => handlePinToggle(athlete.id)}
                          onClick={() => handlePinToggle(athlete.pk_athlete_uuid)}
                          className={`p-1 rounded transition-colors ${athlete.is_pinned
                              ? "text-black hover:text-gray-800"
                              : "text-gray-400 hover:text-gray-600"
                            }`}
                        >
                          <Pin
                            className={`w-4 h-4 ${athlete.is_pinned ? "fill-current" : ""
                              }`}
                          />
                        </button>
                      </td> */}
                      <td className="px-3 py-4 text-sm font-medium">
                        <button
                          onClick={() => handleViewAthlete(athlete.id)}
                          // onClick={() => handleViewAthlete(athlete.pk_athlete_uuid)}
                          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          {athlete.anonymized_display_name}
                        </button>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {athlete.sport_name}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {athlete.carding_status}
                      </td>
                      <td className="px-3 py-4">
                        {athlete.is_active ? (
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              athlete.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {athlete.is_active ? "Active" : "Inactive"}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {athlete.gender === "Male"
                          ? "M"
                          : athlete.gender === "Female"
                            ? "F"
                            : athlete.gender}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {athlete.date_of_birth
                          ? new Date(athlete.date_of_birth).toLocaleDateString(
                            "en-US",
                          )
                          : "-"}
                      </td>
                      {/* <td className="px-3 py-4 text-sm text-gray-900">
                        {athlete.target_event || "-"}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {athlete.assigned_nutritionist || "Amy Tan"}
                      </td> */}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      {searchQuery
                        ? "No athletes found matching your search."
                        : "No athletes available."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-3 py-4 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-lg">
              <div className="flex items-center">
                <span className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    {(currentPage - 1) * 10 + 1}
                  </span>
                  {" - "}
                  <span className="font-medium text-gray-900">
                    {Math.min(currentPage * 10, total)}
                  </span>
                  {" of "}
                  <span className="font-medium text-gray-900">
                    {total}
                  </span>{" "}
                  results
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange && onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => onPageChange && onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Athlete Modal */}
      <AddAthleteModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleModalSuccess}
        onError={handleModalError}
      />
    </>
  );
};

export default AthleteTable;
