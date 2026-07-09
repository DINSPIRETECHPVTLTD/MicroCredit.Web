export function formatMemberId(memberId: number | string | null | undefined): string {
  if (memberId == null) return "—"
  if (typeof memberId === "number") {
    if (!Number.isFinite(memberId) || memberId <= 0) return "—"
    return `NM${memberId}`
  }
  const value = memberId.trim()
  if (!value) return "—"
  const parsed = Number(value)
  if (Number.isFinite(parsed) && parsed > 0) return `NM${value}`
  return "—"
}
