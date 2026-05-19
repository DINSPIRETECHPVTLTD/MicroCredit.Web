import { AUTH_BROADCAST_CHANNEL, type AuthBroadcastMessage } from "@/lib/auth/constants"

/** Notify other tabs that auth state changed. */
export function broadcastAuthEvent(message: AuthBroadcastMessage): void {
  try {
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL)
    channel.postMessage(message)
    channel.close()
  } catch {
    // BroadcastChannel unavailable
  }
}
