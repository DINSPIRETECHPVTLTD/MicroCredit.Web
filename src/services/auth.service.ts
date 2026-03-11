import axios from "axios"
import type { AuthRequest, AuthResponse, OrgResponse, BranchResponse } from "@/types/auth"
import { api } from "@/lib/api"

const AUTH_STORAGE_KEY = "auth_session"

let sessionCache: AuthResponse | null = null

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

/** Hydrate in-memory cache from storage (call on app init). */
export function hydrateAuth(): void {
  sessionCache = readSessionFromStorage()
}

function setSession(response: AuthResponse): void {
  sessionCache = response
  writeSessionToStorage(response)
}

export function clearSession(): void {
  sessionCache = null
  writeSessionToStorage(null)
}

export function getSession(): AuthResponse | null {
  if (sessionCache !== null) return sessionCache
  sessionCache = readSessionFromStorage()
  return sessionCache
}

export function getToken(): string | null {
  return getSession()?.token ?? null
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token || typeof token !== "string") {
    return false
  }
  try {
    const parts = token.split(".")
    if (parts.length !== 3) {
      clearSession()
      return false
    }
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    )
    if (!payload?.exp) return true
    const isValid = payload.exp > Math.floor(Date.now() / 1000)
    if (!isValid) clearSession()
    return isValid
  } catch {
    clearSession()
    return false
  }
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

export const authService = {
  async login(request: AuthRequest): Promise<AuthResponse> {
    const { data } = await axios.post<AuthResponse>(api.auth.login, request)
    setSession(data)
    return data
  },

  async refresh(): Promise<AuthResponse> {
    const session = getSession()
    const refreshToken = session?.refreshToken ?? session?.token
    const body = refreshToken ? { refreshToken } : {}
    const { data } = await axios.post<AuthResponse>(api.auth.refresh, body)
    const merged: AuthResponse = {
      token: data.token ?? session!.token,
      refreshToken: data.refreshToken ?? session?.refreshToken,
      userType: data.userType ?? session!.userType,
      userId: data.userId ?? session!.userId,
      email: data.email ?? session!.email,
      firstName: data.firstName ?? session!.firstName,
      lastName: data.lastName ?? session!.lastName,
      role: data.role ?? session!.role,
      mode: data.mode ?? session?.mode,
      organization: data.organization ?? session?.organization,
      branch: data.branch !== undefined ? data.branch : session?.branch,
    }
    setSession(merged)
    return merged
  },

  async navigateToBranch(branchId: number): Promise<AuthResponse> {
    const { data } = await axios.post<AuthResponse>(
      api.auth.navigateToBranch,
      null,
      { params: { branchId } }
    )
    setSession(data)
    return data
  },

  async navigateToOrg(): Promise<AuthResponse> {
    const { data } = await axios.post<AuthResponse>(api.auth.navigateToOrg, {})
    setSession(data)
    return data
  },

  logout(): void {
    clearSession()
  },
}
