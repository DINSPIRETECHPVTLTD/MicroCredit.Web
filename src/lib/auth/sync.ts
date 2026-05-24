import type { QueryClient } from "@tanstack/react-query"
import { AUTH_BROADCAST_CHANNEL, AUTH_STORAGE_KEY } from "@/lib/auth/constants"
import { isOwnAuthBroadcast } from "@/lib/auth/broadcast"
import { resetAppState } from "@/lib/auth/reset-app-state"
import { clearSession } from "@/services/auth.service"

let authSyncRegistered = false

/**
 * Keeps tabs in sync when login/logout happens elsewhere.
 * Returns a cleanup function (call on HMR teardown if needed).
 */
export function initAuthSync(queryClient: QueryClient): () => void {
  if (authSyncRegistered) {
    return () => undefined
  }
  authSyncRegistered = true

  const handleRemoteLogout = () => {
    clearSession()
    void resetAppState(queryClient, {
      skipLogout: true,
      redirect: true,
      toastMessage: "You have been signed out.",
    })
  }

  const handleRemoteSessionUpdate = () => {
    queryClient.clear()
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_STORAGE_KEY) return
    if (event.newValue === null) {
      handleRemoteLogout()
    } else if (event.oldValue !== event.newValue) {
      handleRemoteSessionUpdate()
    }
  }

  window.addEventListener("storage", onStorage)

  let channel: BroadcastChannel | null = null
  try {
    channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL)
    channel.onmessage = (event: MessageEvent<{ type?: string; sourceId?: string }>) => {
      if (isOwnAuthBroadcast(event.data?.sourceId)) return
      if (event.data?.type === "LOGOUT") {
        handleRemoteLogout()
      } else if (event.data?.type === "SESSION_UPDATE") {
        handleRemoteSessionUpdate()
      }
    }
  } catch {
    // ignore
  }

  return () => {
    authSyncRegistered = false
    window.removeEventListener("storage", onStorage)
    channel?.close()
  }
}
