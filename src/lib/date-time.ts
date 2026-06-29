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

/**
 * Format ISO strings, YYYY-MM-DD keys, and Date values as DD/MM/YYYY for UI display.
 * Does not alter API payloads or form input values.
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
