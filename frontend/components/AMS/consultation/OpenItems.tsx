import { useState, useEffect } from "react";

interface OpenItemsProps {
  athleteId: string;
  sessionId: string;
}

interface OpenItem {
  id: string;
  due_date: string;
  owner: string;
  status: string;
  description: string;
  open_item: string;
}

export default function OpenItems({ athleteId, sessionId }: OpenItemsProps) {
  const [openItems, setOpenItems] = useState<OpenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const fetchOpenItems = async () => {
    if (!sessionId) {
      setOpenItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/open-items/session/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setOpenItems(data.data || []);
    } catch (error) {
      console.error("Error fetching open items:", error);
      setError("Failed to load open items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenItems();
  }, [sessionId]);

  if (loading) {
    return (
      <section id="open-items" className="bg-white rounded-xl shadow-lg p-6">
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
      <section id="open-items" className="bg-white rounded-xl shadow-lg p-6">
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
    <section id="open-items" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Open Items</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">All Actions (2)</span>
          <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            Mark as Completed
          </button>
          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200">
            Add New Action
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-700"></th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Due Date ↓
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Owner ↓
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Status ↓
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Description ↓
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Open Item ↓
              </th>
            </tr>
          </thead>
          <tbody>
            {openItems.map((item, index) => (
              <tr
                key={item.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-3 px-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="py-3 px-4 text-sm text-gray-900">
                  {new Date(item.due_date).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-sm text-gray-900">
                  {item.owner}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    • {item.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 max-w-xs">
                  {item.description}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 max-w-xs">
                  {item.open_item}
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
