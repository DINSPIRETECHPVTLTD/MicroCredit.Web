import type { MemberResponse } from "@/types/member"
import type { MasterLookupResponse } from "@/types/masterLookup"

/** Keys compared when detecting edit changes (maps to form + preview fields). */
export const MEMBER_PREVIEW_FIELD_KEYS = [
  "centerId",
  "pocId",
  "firstName",
  "middleName",
  "lastName",
  "occupation",
  "dob",
  "age",
  "aadhaar",
  "phoneNumber",
  "altPhone",
  "address1",
  "address2",
  "city",
  "state",
  "zipCode",
  "guardianFirstName",
  "guardianLastName",
  "guardianPhone",
  "relationship",
  "relationshipOther",
  "guardianDOB",
  "guardianAge",
] as const

export type MemberPreviewFieldKey = (typeof MEMBER_PREVIEW_FIELD_KEYS)[number]

function norm(value: unknown): string {
  if (value == null) return ""
  return String(value).trim()
}

function toDateInputValue(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return ""
  const s = String(value).trim()
  const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(s)
  if (isoDate) return isoDate[1]!
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${mo}-${day}`
}

export function normalizeRelationshipForBaseline(
  stored: string | null | undefined,
  lookups: MasterLookupResponse[]
): { relationship: string; relationshipOther: string } {
  if (!stored || !String(stored).trim()) return { relationship: "", relationshipOther: "" }
  const s = String(stored).trim()
  const byCode = lookups.find((l) => l.lookupCode === s)
  if (byCode) return { relationship: byCode.lookupCode, relationshipOther: "" }
  const byValue = lookups.find((l) => l.lookupValue === s)
  if (byValue) return { relationship: byValue.lookupCode, relationshipOther: "" }
  return { relationship: "Other", relationshipOther: s }
}

/** Snapshot of member record as form values for change detection. */
export function memberToFormSnapshot(
  member: MemberResponse,
  relationshipLookups: MasterLookupResponse[]
): Record<MemberPreviewFieldKey, string | number> {
  const { relationship, relationshipOther } = normalizeRelationshipForBaseline(
    member.relationship,
    relationshipLookups
  )
  return {
    centerId: Number(member.centerId) || 0,
    pocId: Number(member.pocId) || 0,
    firstName: member.firstName ?? "",
    middleName: member.middleName ?? "",
    lastName: member.lastName ?? "",
    occupation: member.occupation ?? "",
    dob: toDateInputValue(member.dob),
    age: member.age != null ? String(member.age) : "",
    aadhaar: member.aadhaar ?? "",
    phoneNumber: member.phoneNumber ?? member.memberPhone ?? "",
    altPhone: member.altPhone ?? "",
    address1: member.address1 ?? "",
    address2: member.address2 ?? "",
    city: member.city ?? "",
    state: member.state ?? "",
    zipCode: member.zipCode ?? "",
    guardianFirstName: member.guardianFirstName ?? "",
    guardianLastName: member.guardianLastName ?? "",
    guardianPhone: member.guardianPhone ?? "",
    relationship,
    relationshipOther,
    guardianDOB: toDateInputValue(member.guardianDOB),
    guardianAge: member.guardianAge != null ? String(member.guardianAge) : "",
  }
}

export function getChangedFieldKeys(
  baseline: Record<MemberPreviewFieldKey, string | number>,
  current: Record<MemberPreviewFieldKey, string | number>
): Set<MemberPreviewFieldKey> {
  const changed = new Set<MemberPreviewFieldKey>()
  for (const key of MEMBER_PREVIEW_FIELD_KEYS) {
    if (norm(baseline[key]) !== norm(current[key])) {
      changed.add(key)
    }
  }
  return changed
}

export function formDataToSnapshot(
  data: {
    centerId: number
    pocId: number
    firstName: string
    middleName?: string
    lastName: string
    occupation: string
    dob: string
    age?: string | number
    aadhaar: string
    phoneNumber: string
    altPhone?: string
    address1: string
    address2?: string
    city: string
    state: string
    zipCode: string
    guardianFirstName: string
    guardianLastName: string
    guardianPhone?: string
    relationship: string
    relationshipOther?: string
    guardianDOB: string
    guardianAge?: string | number
  }
): Record<MemberPreviewFieldKey, string | number> {
  return {
    centerId: data.centerId,
    pocId: data.pocId,
    firstName: data.firstName,
    middleName: data.middleName ?? "",
    lastName: data.lastName,
    occupation: data.occupation,
    dob: data.dob,
    age: data.age != null ? String(data.age) : "",
    aadhaar: data.aadhaar,
    phoneNumber: data.phoneNumber,
    altPhone: data.altPhone ?? "",
    address1: data.address1,
    address2: data.address2 ?? "",
    city: data.city,
    state: data.state,
    zipCode: data.zipCode,
    guardianFirstName: data.guardianFirstName,
    guardianLastName: data.guardianLastName,
    guardianPhone: data.guardianPhone ?? "",
    relationship: data.relationship,
    relationshipOther: data.relationshipOther ?? "",
    guardianDOB: data.guardianDOB,
    guardianAge: data.guardianAge != null ? String(data.guardianAge) : "",
  }
}
