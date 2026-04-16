import type { AppMode, AppRole } from "@/types/menu"
import type { AuthResponse } from "@/types/auth"

const ROLE_MAP: Record<string, AppRole> = {
  owner: "Owner",
  branchadmin: "BranchAdmin",
  branch_admin: "BranchAdmin",
  staff: "Staff",
  investor: "Investor",
}

export function normalizeRole(role?: string | null): AppRole | null {
  if (!role) return null
  const key = role.replace(/\s+/g, "").replace(/-/g, "_").toLowerCase()
  return ROLE_MAP[key] ?? null
}

export function normalizeMode(mode?: string | null): AppMode {
  const value = (mode ?? "").trim().toUpperCase()
  return value === "BRANCH" ? "BRANCH" : "ORG"
}

export function getNormalizedSessionMeta(session: AuthResponse | null): {
  role: AppRole | null
  mode: AppMode
} {
  return {
    role: normalizeRole(session?.role),
    mode: normalizeMode(session?.mode),
  }
}
