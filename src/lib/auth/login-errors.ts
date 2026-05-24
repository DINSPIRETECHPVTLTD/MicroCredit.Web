import { LOGIN_ERROR_BRANCH_MODE_REQUIRED } from "@/lib/auth/constants"

type ApiErrorBody = {
  message?: string
  error?: string
  title?: string
  errorCode?: string
}

export function getLoginErrorMessage(err: unknown): string {
  const responseData = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof responseData === "string" && responseData.trim()) return responseData
  if (responseData && typeof responseData === "object") {
    const obj = responseData as ApiErrorBody
    const apiMessage = obj.message ?? obj.error ?? obj.title
    if (apiMessage?.trim()) return apiMessage
  }
  const generic = (err as { message?: string })?.message
  return generic?.trim() || "Login failed. Please try again."
}

export function isBranchModeRequiredError(err: unknown): boolean {
  const responseData = (err as { response?: { data?: unknown } })?.response?.data
  if (responseData && typeof responseData === "object") {
    const code = (responseData as ApiErrorBody).errorCode
    if (code === LOGIN_ERROR_BRANCH_MODE_REQUIRED) return true
  }
  const message = getLoginErrorMessage(err).toLowerCase()
  return message.includes("branch users can login only in branch mode")
}
