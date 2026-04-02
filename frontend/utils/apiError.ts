function formatDetail(detail: unknown): string | null {
  if (!detail || typeof detail !== "object") return null;

  const record = detail as Record<string, unknown>;
  const field =
    typeof record.field === "string"
      ? record.field
      : Array.isArray(record.path)
        ? record.path.join(".")
        : null;
  const message =
    typeof record.message === "string"
      ? record.message
      : typeof record.msg === "string"
        ? record.msg
        : null;

  if (field && message) return `${field}: ${message}`;
  return message;
}

export async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as Record<string, unknown>;

      const details = Array.isArray(payload.details)
        ? payload.details.map(formatDetail).filter(Boolean)
        : [];
      if (details.length > 0) {
        return details.join(" | ");
      }

      if (typeof payload.error === "string" && typeof payload.message === "string") {
        return `${payload.error}: ${payload.message}`;
      }
      if (typeof payload.message === "string") return payload.message;
      if (typeof payload.error === "string") return payload.error;
    } else {
      const text = (await response.text()).trim();
      if (text) return text.slice(0, 300);
    }
  } catch {
    // Fall through to status-based fallback when body parsing fails.
  }

  return `${fallback} (HTTP ${response.status})`;
}
