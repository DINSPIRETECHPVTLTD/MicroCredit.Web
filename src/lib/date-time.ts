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
