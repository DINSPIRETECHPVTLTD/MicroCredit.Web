import { formatMemberId } from "@/lib/members/format-member-id"

function hasMemberId(memberId: number | string | null | undefined): boolean {
  if (memberId == null) return false
  if (typeof memberId === "number") return Number.isFinite(memberId) && memberId > 0
  const value = memberId.trim()
  if (!value) return false
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0
}

/** Display member reference: `code/id`, code only, or id only. */
export function formatMemberRef(
  memberId: number | string | null | undefined,
  memberCode?: string | null
): string {
  const code = memberCode?.trim() || null
  const hasCode = Boolean(code)
  const hasId = hasMemberId(memberId)
  if (hasCode && hasId) return `${code}/${formatMemberId(memberId)}`
  if (hasCode) return code!
  if (hasId) return formatMemberId(memberId)
  return "—"
}
