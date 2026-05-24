type JwtPayload = {
  exp?: number
  [key: string]: unknown
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    return JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    ) as JwtPayload
  } catch {
    return null
  }
}

/** Client-side expiry check for routing UX only — API remains the authority. */
export function isAccessTokenValid(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false
  const payload = decodeJwtPayload(token)
  if (!payload?.exp || typeof payload.exp !== "number") return false
  return payload.exp > Math.floor(Date.now() / 1000)
}
