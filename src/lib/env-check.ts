/** Reads VITE_API_URL without importing api.ts. Use to validate env before app loads. */
export function getViteApiUrl(): string {
  const raw =
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_URL : undefined
  const trimmed = typeof raw === "string" ? raw.trim() : ""
  return trimmed
}

export const VITE_API_URL_REQUIRED_MESSAGE =
  "VITE_API_URL is required. Set it in your .env file (e.g. VITE_API_URL=https://your-api.example.com)."
