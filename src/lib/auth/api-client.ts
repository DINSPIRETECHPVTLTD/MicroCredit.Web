import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios"
import type { QueryClient } from "@tanstack/react-query"
import { AUTH_PATH_MARKERS } from "@/lib/auth/constants"
import { resetAppState } from "@/lib/auth/reset-app-state"
import { getToken } from "@/services/auth.service"

/** Marks a request that has already attempted token refresh (prevents infinite retry loops). */
export interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url
    return AUTH_PATH_MARKERS.some((marker) => path.includes(marker))
  } catch {
    return AUTH_PATH_MARKERS.some((marker) => url.includes(marker))
  }
}

/** Dedicated axios instance for authenticated API traffic. */
export const apiClient: AxiosInstance = axios.create()

let refreshPromise: Promise<void> | null = null
let interceptorsRegistered = false

async function runRefresh(refresh: () => Promise<unknown>): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = refresh()
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null
      })
  }
  await refreshPromise
}

export type ApiInterceptorDeps = {
  refresh: () => Promise<unknown>
}

/**
 * Registers Bearer token on requests and 401 → refresh → single retry on responses.
 * Login/refresh/logout use plain axios in auth.service and are excluded from recovery.
 */
export function setupApiInterceptors(
  queryClient: QueryClient,
  deps: ApiInterceptorDeps
): void {
  if (interceptorsRegistered) return
  interceptorsRegistered = true

  apiClient.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryAxiosRequestConfig | undefined
      if (!originalRequest) {
        return Promise.reject(error)
      }

      if (error.response?.status !== 401) {
        return Promise.reject(error)
      }

      if (isAuthEndpoint(originalRequest.url)) {
        return Promise.reject(error)
      }

      if (originalRequest._retry) {
        await resetAppState(queryClient, {
          redirect: true,
          toastMessage: "Your session has expired. Please sign in again.",
        })
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        await runRefresh(deps.refresh)
        const token = getToken()
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`
        }
        return apiClient(originalRequest)
      } catch {
        await resetAppState(queryClient, {
          redirect: true,
          toastMessage: "Your session has expired. Please sign in again.",
        })
        return Promise.reject(error)
      }
    }
  )
}
