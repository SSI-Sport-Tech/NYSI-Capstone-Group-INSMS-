import { useState, useEffect } from "react";

interface OpenItemsProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  newSessionId?: string;
}

interface OpenItem {
  id: string;
  due_date: string | null;
  owner: string | null;
  status: string;
  open_item_status_id: string;
  description: string | null;
  open_item: string | null;
  other_remarks: string | null;
}

interface StatusLookup {
  id: string;
  open_item_status: string;
}

const emptyNewItem = {
  description: "",
  openItem: "",
  dueDate: "",
  statusId: "",
};

export default function OpenItems({
  athleteId: _athleteId,
  sessionId,
  isNewConsultation,
  newSessionId,
}: OpenItemsProps) {
  const targetSessionId =
    isNewConsultation && newSessionId ? newSessionId : sessionId;

  const [openItems, setOpenItems] = useState<OpenItem[]>([]);
  const [statuses, setStatuses] = useState<StatusLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState(emptyNewItem);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fetchStatuses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/open-items/statuses`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return;
      const data = await res.json();
      const list: StatusLookup[] = data.data || [];
      setStatuses(list);
      // Default new item status to "In Progress"
      const inProgress = list.find((s) =>
        s.open_item_status.toLowerCase().includes("in progress"),
      );
      if (inProgress) {
        setNewItem((prev) => ({ ...prev, statusId: inProgress.id }));
      }
    } catch {
      // Non-critical: statuses still render empty dropdown
    }
  };

  const fetchOpenItems = async () => {
    if (!targetSessionId) {
      setOpenItems([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/open-items/session/${targetSessionId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      setOpenItems(data.data || []);
    } catch {
      setError("Failed to load open items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  useEffect(() => {
    fetchOpenItems();
    setSelectedIds(new Set());
  }, [targetSessionId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === openItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(openItems.map((i) => i.id)));
    }
  };

  const handleMarkCompleted = async () => {
    if (selectedIds.size === 0) return;
    const completedStatus = statuses.find((s) =>
      s.open_item_status.toLowerCase().includes("completed"),
    );
    if (!completedStatus) return;
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/open-items/${id}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                open_item_status_id: completedStatus.id,
              }),
            },
          ),
        ),
      );
      setSelectedIds(new Set());
      await fetchOpenItems();
    } catch {
      setSaveError("Failed to update status.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!targetSessionId || !newItem.statusId) return;
    try {
      setSaving(true);
      setSaveError("");
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/open-items`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessions_id: targetSessionId,
            open_item_status_id: newItem.statusId,
            description: newItem.description || null,
            open_item: newItem.openItem || null,
            due_date: newItem.dueDate || null,
          }),
        },
      );
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      setShowAddForm(false);
      setNewItem({
        ...emptyNewItem,
        statusId:
          statuses.find((s) =>
            s.open_item_status.toLowerCase().includes("in progress"),
          )?.id ?? "",
      });
      await fetchOpenItems();
    } catch {
      setSaveError("Failed to add item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section
        id="open-items"
        className="bg-white rounded-xl shadow-lg p-6 text-gray-900"
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        id="open-items"
        className="bg-white rounded-xl shadow-lg p-6 text-gray-900"
      >
        <div className="text-center py-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchOpenItems}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      id="open-items"
      className="bg-white rounded-xl shadow-lg p-6 text-gray-900"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Open Items</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            All Actions ({openItems.length})
          </span>
          <button
            onClick={handleMarkCompleted}
            disabled={selectedIds.size === 0 || saving}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mark as Completed
          </button>
          <button
            onClick={() => {
              setShowAddForm((v) => !v);
              setSaveError("");
            }}
            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
          >
            {showAddForm ? "Cancel" : "Add New Action"}
          </button>
        </div>
      </div>

      {saveError && <p className="text-red-600 text-sm mb-3">{saveError}</p>}

      {/* Add New Item Form */}
      {showAddForm && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newItem.description}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="e.g. Athlete reports fatigue"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Open Item / Action</label>
              <input
                type="text"
                value={newItem.openItem}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, openItem: e.target.value }))
                }
                placeholder="e.g. Get full blood count"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={newItem.dueDate}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, dueDate: e.target.value }))
                }
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Status</label>
              <select
                value={newItem.statusId}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, statusId: e.target.value }))
                }
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.open_item_status}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setSaveError("");
              }}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAddItem}
              disabled={saving}
              className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save Item"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-2">
                <input
                  type="checkbox"
                  checked={
                    openItems.length > 0 &&
                    selectedIds.size === openItems.length
                  }
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Due Date
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Owner
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Status
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Description
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Open Item
              </th>
            </tr>
          </thead>
          <tbody>
            {openItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-3 px-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="py-3 px-4 text-sm text-gray-900">
                  {item.due_date
                    ? new Date(item.due_date).toLocaleDateString()
                    : "—"}
                </td>
                <td className="py-3 px-4 text-sm text-gray-900">
                  {item.owner || "—"}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.status?.toLowerCase().includes("completed")
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    • {item.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 max-w-xs">
                  {item.description || "—"}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 max-w-xs">
                  {item.open_item || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openItems.length === 0 && (
        <div className="text-center py-8">
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No open items
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new action item.
          </p>
        </div>
      )}
    </section>
  );
}
