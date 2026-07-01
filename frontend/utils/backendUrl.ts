const FALLBACK_BACKEND_URL = "http://localhost:8000";

export function getBackendUrl() {
  const rawValue = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

  if (
    !rawValue ||
    rawValue === "undefined" ||
    rawValue === "null"
  ) {
    return FALLBACK_BACKEND_URL;
  }

  return rawValue.replace(/\/+$/, "");
}
