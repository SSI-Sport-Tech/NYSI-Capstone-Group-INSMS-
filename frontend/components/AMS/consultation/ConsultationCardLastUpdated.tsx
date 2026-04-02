"use client";

function formatTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const dateText = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
  const timeText = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return `${dateText}, ${timeText}`;
}

export default function ConsultationCardLastUpdated({
  lastUpdatedAt,
  lastUpdatedBy,
}: {
  lastUpdatedAt?: string | null;
  lastUpdatedBy?: string | null;
}) {
  const formatted = formatTimestamp(lastUpdatedAt);
  const user = lastUpdatedBy?.trim() || "Unknown user";

  if (!formatted && !lastUpdatedBy) {
    return (
      <p className="mt-1 text-xs text-gray-500">Last Updated: Not available</p>
    );
  }

  return (
    <p className="mt-1 text-xs text-gray-500">
      Last Updated: {formatted ?? "Unknown date"}
      , {user}
    </p>
  );
}
