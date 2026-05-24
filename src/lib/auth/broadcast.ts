import { AUTH_BROADCAST_CHANNEL, type AuthBroadcastMessage } from "@/lib/auth/constants"

/** Per-tab id so we do not handle our own broadcast (avoids double redirect on logout). */
const AUTH_TAB_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`

/** Notify other tabs that auth state changed. */
export function broadcastAuthEvent(
  message: Omit<AuthBroadcastMessage, "sourceId">
): void {
  try {
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL)
    channel.postMessage({ ...message, sourceId: AUTH_TAB_ID })
    channel.close()
  } catch {
    // BroadcastChannel unavailable
  }
}

export function isOwnAuthBroadcast(sourceId: string | undefined): boolean {
  return sourceId === AUTH_TAB_ID
}
