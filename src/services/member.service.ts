import axios from "axios"
import { api } from "@/lib/api"
import type { MemberResponse } from "@/types/member"

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/** API may return `Id` / `MemberId` (PascalCase) instead of `id`. */
function normalizeMemberResponse(raw: unknown): MemberResponse {
  if (!raw || typeof raw !== "object") {
    return { id: 0 }
  }
  const r = raw as Record<string, unknown>
  const id = toNumber(r.id ?? r.Id ?? r.memberId ?? r.MemberId)
  return { ...(raw as MemberResponse), id }
}

export interface MemberSaveRequest {
  centerId: number
  pocId?: number
  firstName: string
  middleName?: string | null
  lastName: string
  occupation?: string | null
  dob?: string | null
  age?: number | null
  phoneNumber: string
  aadhaar?: string | null
  altPhone?: string | null
  address1?: string | null
  address2?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null

  // Guardian details (expected by backend Create/UpdateMemberRequest)
  guardianFirstName: string
  guardianMiddleName?: string | null
  guardianLastName: string
  guardianPhone?: string | null
  relationship?: string | null
  guardianDob?: string | null
  guardianAge: number
}

export const memberService = {
  async getByBranch(branchId: number): Promise<MemberResponse[]> {
    const { data } = await axios.get<MemberResponse | MemberResponse[]>(
      api.members.listByBranch(branchId)
    )
    return Array.isArray(data) ? data : [data]
  },

  async createMember(request: MemberSaveRequest): Promise<MemberResponse> {
    const { data } = await axios.post(api.members.create(), request)
    return normalizeMemberResponse(data)
  },

  async updateMember(id: number, request: MemberSaveRequest): Promise<MemberResponse> {
    const { data } = await axios.put(api.members.update(id), request)
    return normalizeMemberResponse(data)
  },

  async setInactive(id: number): Promise<void> {
    await axios.delete(api.members.setInactive(id))
  },
}
