// Backend base URL (no "api/" suffix). Set VITE_API_URL in .env e.g. https://localhost:7119
const API_BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, "")
    : "https://localhost:7119"

export function getApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE}${p}`
}

const base = API_BASE

export const api = {
  auth: {
    login: `${base}/auth/login`,
    refresh: `${base}/auth/refresh`,
    navigateToBranch: `${base}/auth/navigate-to-branch`,
    navigateToOrg: `${base}/auth/navigate-to-org`,
  },
  users: {
    list: `${base}/Users/Org`,
    create: `${base}/api/users`,
    update: (id: number) => `${base}/api/users/${id}`,
  },
}
