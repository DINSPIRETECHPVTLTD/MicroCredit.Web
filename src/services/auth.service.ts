import axios from "axios"
import type { AuthRequest, AuthResponse, OrgResponse, BranchResponse } from "@/types/auth"
import { api } from "@/lib/api"
import { AUTH_STORAGE_KEY } from "@/lib/auth/constants"
import { broadcastAuthEvent } from "@/lib/auth/broadcast"
import { isAccessTokenValid } from "@/lib/auth/jwt"
import { apiClient } from "@/lib/auth/api-client"

function readSessionFromStorage(): AuthResponse | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthResponse) : null
  } catch {
    return null
  }
}

function writeSessionToStorage(data: AuthResponse | null): void {
  if (data) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
}

/** @deprecated No-op; session is always read from localStorage. Kept for bootstrap compatibility. */
export function hydrateAuth(): void {
  // Intentionally empty — getSession() always reads storage.
}

export function setSession(response: AuthResponse): void {
  writeSessionToStorage(response)
  broadcastAuthEvent({ type: "SESSION_UPDATE" })
}

export function clearSession(): void {
  writeSessionToStorage(null)
}

/** Always reads from localStorage so tabs stay consistent without stale in-memory cache. */
export function getSession(): AuthResponse | null {
  return readSessionFromStorage()
}

export function getToken(): string | null {
  return getSession()?.token ?? null
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!isAccessTokenValid(token)) {
    if (token) clearSession()
    return false
  }
  return true
}

export function getDisplayName(): string {
  const session = getSession()
  if (!session) return "User"
  const name = [session.firstName, session.lastName].filter(Boolean).join(" ").trim()
  return name || session.email || "User"
}

export function getOrganization(): OrgResponse | null {
  return getSession()?.organization ?? null
}

export function getBranch(): BranchResponse | null {
  return getSession()?.branch ?? null
}

function mergeAuthResponse(
  data: AuthResponse,
  session: AuthResponse | null
): AuthResponse {
  if (!session) return data
  return {
    token: data.token ?? session.token,
    refreshToken: data.refreshToken ?? session.refreshToken,
    userType: data.userType ?? session.userType,
    userId: data.userId ?? session.userId,
    email: data.email ?? session.email,
    firstName: data.firstName ?? session.firstName,
    lastName: data.lastName ?? session.lastName,
    role: data.role ?? session.role,
    mode: data.mode ?? session.mode,
    branchId: data.branchId ?? session.branchId,
    organization: data.organization ?? session.organization,
    branch: data.branch !== undefined ? data.branch : session.branch,
  }
}

export const authService = {
  async login(request: AuthRequest): Promise<AuthResponse> {
    const { data } = await axios.post<AuthResponse>(api.auth.login, request)
    setSession(data)
    return data
  },

  async refresh(): Promise<AuthResponse> {
    const session = getSession()
    const refreshToken = session?.refreshToken
    if (!refreshToken) {
      clearSession()
      throw new Error("No refresh token available")
    }

    const { data } = await axios.post<AuthResponse>(api.auth.refresh, { refreshToken })
    const merged = mergeAuthResponse(data, session)
    setSession(merged)
    return merged
  },

  async navigateToBranch(branchId: number): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>(
      api.auth.navigateToBranch,
      null,
      { params: { branchId } }
    )
    setSession(data)
    return data
  },

  async navigateToOrg(): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>(api.auth.navigateToOrg, {})
    setSession(data)
    return data
  },

  async logout(): Promise<void> {
    const refreshToken = getSession()?.refreshToken
    try {
      if (refreshToken) {
        await axios.post(api.auth.logout, { refreshToken }).catch(() => {
          // Server revocation is best-effort; client state must still clear.
        })
      }
    } finally {
      clearSession()
      broadcastAuthEvent({ type: "LOGOUT" })
    }
  },
}
