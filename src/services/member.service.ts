import { apiClient } from '@/lib/auth/api-client'
import { api } from "@/lib/api"
import type { MemberResponse, MembersListApiResponse, MembersListResult } from "@/types/member"

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
  const loanRaw = r.primaryOpenLoanId ?? r.PrimaryOpenLoanId
  const loanN = typeof loanRaw === "number" ? loanRaw : Number(loanRaw)
  const primaryOpenLoanId = Number.isFinite(loanN) && loanN > 0 ? loanN : null
  return { ...(raw as MemberResponse), id, primaryOpenLoanId }
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

function parseMembersListResponse(
  data: MemberResponse | MemberResponse[] | MembersListApiResponse
): MembersListResult {
  if (Array.isArray(data)) {
    return { members: data.map(normalizeMemberResponse) }
  }
  if (data && typeof data === "object" && "data" in data && Array.isArray(data.data)) {
    return {
      members: data.data.map(normalizeMemberResponse),
      emptyMessage: data.message,
    }
  }
  return { members: [normalizeMemberResponse(data)] }
}

export const memberService = {
  async getByBranch(branchId: number): Promise<MembersListResult> {
    const { data } = await apiClient.get<
      MemberResponse | MemberResponse[] | MembersListApiResponse
    >(api.members.listByBranch(branchId))
    return parseMembersListResponse(data)
  },

  async createMember(request: MemberSaveRequest): Promise<MemberResponse> {
    const { data } = await apiClient.post(api.members.create(), request)
    return normalizeMemberResponse(data)
  },

  async updateMember(id: number, request: MemberSaveRequest): Promise<MemberResponse> {
    const { data } = await apiClient.put(api.members.update(id), request)
    return normalizeMemberResponse(data)
  },

  async setInactive(id: number): Promise<void> {
    await apiClient.delete(api.members.setInactive(id))
  },
}
