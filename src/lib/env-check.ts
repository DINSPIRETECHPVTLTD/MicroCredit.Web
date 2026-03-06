/** Reads VITE_API_URL without importing api.ts. Use to validate env before app loads. */
export function getViteApiUrl(): string {
  const raw =
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_URL : undefined
  return typeof raw === "string" ? raw.trim() : ""
}

/** Returns the raw value (for showing on error screen). */
export function getViteApiUrlDebug(): string {
  const raw =
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_URL : undefined
  if (raw === undefined) return "(not set)"
  if (typeof raw !== "string") return `(invalid type: ${typeof raw})`
  if (raw.trim() === "") return "(empty or whitespace)"
  return raw
}

export const VITE_API_URL_REQUIRED_MESSAGE =
  "VITE_API_URL is required. Set it in your .env file (e.g. VITE_API_URL=https://your-api.example.com)."
