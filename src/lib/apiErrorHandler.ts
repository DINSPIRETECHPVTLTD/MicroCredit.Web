import axios, { type AxiosError } from "axios"

export const DEFAULT_API_ERROR_MESSAGE = "Something went wrong. Please try again."

type ErrorObject = Record<string, unknown>
type ValidationErrors = Record<string, string[]>

export type ApiErrorDetails = {
  message: string
  statusCode?: number
  errorCode?: string
  validationErrors: ValidationErrors
  isNetworkError: boolean
  isServerError: boolean
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()]
  }
  return []
}

function extractValidationErrors(data: unknown): ValidationErrors {
  if (!data || typeof data !== "object") return {}
  const obj = data as ErrorObject

  const candidates = [obj.validationErrors, obj.errors]
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue
    const mapped: ValidationErrors = {}
    for (const [key, value] of Object.entries(candidate as ErrorObject)) {
      const messages = toStringList(value)
      if (messages.length > 0) {
        mapped[key] = messages
      }
    }
    if (Object.keys(mapped).length > 0) {
      return mapped
    }
  }

  return {}
}

function firstValidationMessage(validationErrors: ValidationErrors): string | undefined {
  for (const values of Object.values(validationErrors)) {
    if (values.length > 0) return values[0]
  }
  return undefined
}

export function getApiErrorDetails(error: unknown): ApiErrorDetails {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<unknown>
    const statusCode = axiosError.response?.status
    const data = axiosError.response?.data
    const validationErrors = extractValidationErrors(data)
    const fromValidation = firstValidationMessage(validationErrors)

    let message = ""
    let errorCode: string | undefined

    if (typeof data === "string") {
      message = data.trim()
    } else if (data && typeof data === "object") {
      const obj = data as {
        message?: unknown
        title?: unknown
        error?: unknown
        errorCode?: unknown
      }
      if (typeof obj.message === "string" && obj.message.trim()) {
        message = obj.message.trim()
      } else if (typeof obj.title === "string" && obj.title.trim()) {
        message = obj.title.trim()
      } else if (typeof obj.error === "string" && obj.error.trim()) {
        message = obj.error.trim()
      }

      if (typeof obj.errorCode === "string" && obj.errorCode.trim()) {
        errorCode = obj.errorCode.trim()
      }
    }

    if (!message && fromValidation) {
      message = fromValidation
    }

    if (!message && statusCode && statusCode >= 500) {
      message = DEFAULT_API_ERROR_MESSAGE
    }

    if (!message && !axiosError.response) {
      message = "Network error. Please check your connection and try again."
    }

    return {
      message: message || DEFAULT_API_ERROR_MESSAGE,
      statusCode,
      errorCode,
      validationErrors,
      isNetworkError: !axiosError.response,
      isServerError: Boolean(statusCode && statusCode >= 500),
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      message: error.message.trim(),
      validationErrors: {},
      isNetworkError: false,
      isServerError: false,
    }
  }

  return {
    message: DEFAULT_API_ERROR_MESSAGE,
    validationErrors: {},
    isNetworkError: false,
    isServerError: false,
  }
}
