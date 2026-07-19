function formatDateParts(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(date)
  const year = parts.find((p) => p.type === "year")?.value ?? "0000"
  const month = parts.find((p) => p.type === "month")?.value ?? "01"
  const day = parts.find((p) => p.type === "day")?.value ?? "01"
  return `${year}-${month}-${day}`
}

export function getBrowserTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return zone && zone.trim() ? zone.trim() : "UTC"
  } catch {
    return "UTC"
  }
}

export function getTodayDateInputValue(timeZone = getBrowserTimeZone()): string {
  return formatDateParts(new Date(), timeZone)
}

/** Canonical UI date format for display and date textboxes. */
export const DATE_DISPLAY_FORMAT = "DD/MM/YYYY"

export type FormatDisplayDateOptions = {
  /** Shown when the value is empty or invalid. Default: "—" */
  empty?: string
}

/** Format a Date as DD/MM/YYYY for UI display. */
export function formatDisplayDateFromDate(
  date: Date,
  empty = "—"
): string {
  if (Number.isNaN(date.getTime())) return empty
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/** Convert YYYY-MM-DD (or ISO) to DD/MM/YYYY for the date textbox. */
export function isoDateToDisplay(value: string | null | undefined): string {
  if (value == null) return ""
  const trimmed = String(value).trim()
  if (!trimmed) return ""
  const formatted = formatDisplayDate(trimmed, { empty: "" })
  return formatted
}

/**
 * Parse DD/MM/YYYY (also accepts D/M/YYYY) into YYYY-MM-DD.
 * Returns "" for empty input, null when invalid.
 */
export function displayDateToIso(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return ""

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const d = new Date(year, month - 1, day)
  if (
    Number.isNaN(d.getTime()) ||
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null
  }

  const mm = String(month).padStart(2, "0")
  const dd = String(day).padStart(2, "0")
  return `${year}-${mm}-${dd}`
}

/** Normalize any supported date string to YYYY-MM-DD for form/API values. */
export function toIsoDateValue(value: string | Date | null | undefined): string {
  if (value == null || value === "") return ""
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ""
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, "0")
    const d = String(value.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  const trimmed = String(value).trim()
  if (!trimmed) return ""

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const fromDisplay = displayDateToIso(trimmed)
  if (fromDisplay != null) return fromDisplay

  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return ""
  return toIsoDateValue(d)
}

/**
 * Format ISO strings, YYYY-MM-DD keys, and Date values as DD/MM/YYYY for UI display.
 * Does not alter API payloads or form input values.
 *
 * Prefer `<DateDisplay />` from `@/components/date` in React UI.
 * Prefer `<DateInput />` from `@/components/date` for date textboxes/pickers.
 * Change the format here to update display everywhere.
 */
export function formatDisplayDate(
  value: string | Date | null | undefined,
  options?: FormatDisplayDateOptions
): string {
  const empty = options?.empty ?? "—"
  if (value == null || value === "") return empty

  if (value instanceof Date) {
    return formatDisplayDateFromDate(value, empty)
  }

  const trimmed = value.trim()
  if (!trimmed) return empty

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  if (dateOnlyMatch) {
    const d = new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3])
    )
    return formatDisplayDateFromDate(d, empty)
  }

  const d = new Date(trimmed)
  return formatDisplayDateFromDate(d, empty)
}

/** Live clock label: weekday + DD/MM/YYYY + time. */
export function formatDashboardClock(d: Date): string {
  const weekday = d.toLocaleDateString("en-IN", { weekday: "long" })
  const datePart = formatDisplayDateFromDate(d)
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  return `${weekday}, ${datePart} • ${timePart}`
}

/** Org-mode highlight: weekday + DD/MM/YYYY + time (long weekday, same date format). */
export function formatOrgModeDateHighlight(d: Date): string {
  const weekday = d.toLocaleDateString("en-IN", { weekday: "long" })
  const datePart = formatDisplayDateFromDate(d)
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  return `${weekday}, ${datePart} • ${timePart}`
}
