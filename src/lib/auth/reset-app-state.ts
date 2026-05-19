import type { QueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { authService } from "@/services/auth.service"
import { redirectToLogin } from "@/lib/auth/redirect"

export type ResetAppStateOptions = {
  /** Navigate to /login after reset (default: false). */
  redirect?: boolean
  /** Show a toast before redirect (e.g. session expired). */
  toastMessage?: string
  /** Skip authService.logout() when storage was already cleared (multi-tab). */
  skipLogout?: boolean
  /** Clear React Query cache (default: true). */
  clearQueryCache?: boolean
}

/**
 * Central logout / session-expiry cleanup: auth storage + in-memory query cache.
 */
export async function resetAppState(
  queryClient: QueryClient,
  options: ResetAppStateOptions = {}
): Promise<void> {
  const {
    redirect = false,
    toastMessage,
    skipLogout = false,
    clearQueryCache = true,
  } = options

  if (!skipLogout) {
    await authService.logout()
  }

  if (clearQueryCache) {
    queryClient.clear()
  }

  if (toastMessage) {
    toast.error(toastMessage, { id: "auth-reset" })
  }

  if (redirect) {
    redirectToLogin()
  }
}

/**
 * After org ↔ branch context switch, drop cached API data so the UI cannot show stale scope.
 */
export function resetQueriesOnContextSwitch(queryClient: QueryClient): void {
  queryClient.clear()
}
