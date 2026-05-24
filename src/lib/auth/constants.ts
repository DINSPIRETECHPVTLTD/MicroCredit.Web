/** localStorage key for the authenticated session payload. */
export const AUTH_STORAGE_KEY = "auth_session"

/** Cross-tab auth events (login/logout) within the same origin. */
export const AUTH_BROADCAST_CHANNEL = "mcs-auth"

export type AuthBroadcastMessage =
  | { type: "LOGOUT"; sourceId: string }
  | { type: "SESSION_UPDATE"; sourceId: string }

export const AUTH_PATH_MARKERS = ["/auth/login", "/auth/refresh", "/auth/logout"] as const

/** Stable API error code when branch-mode login is required. */
export const LOGIN_ERROR_BRANCH_MODE_REQUIRED = "BRANCH_MODE_REQUIRED"
