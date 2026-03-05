const AVATAR_COLORS = [
  "bg-teal-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-green-500",
  "bg-red-500",
];

/** Deterministic bg-color class from a nutritionist ID string */
export function nutritionistColor(nutritionistId: string): string {
  let hash = 0;
  for (let i = 0; i < nutritionistId.length; i++) {
    hash = (hash * 31 + nutritionistId.charCodeAt(i)) & 0xffff;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Two-letter initials from a full name */
export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
