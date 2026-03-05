// API base URL - use Vite env in production
const API_BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "/api"

export function getApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE.replace(/\/$/, "")}${p}`
}

const base = API_BASE.replace(/\/$/, "")

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
