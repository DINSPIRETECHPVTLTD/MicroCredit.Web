import axios from "axios"
import { api } from "@/lib/api"
import type { MemberResponse } from "@/types/member"

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
}

export const memberService = {
  async getByBranch(branchId: number): Promise<MemberResponse[]> {
    const { data } = await axios.get<MemberResponse | MemberResponse[]>(
      api.members.listByBranch(branchId)
    )
    return Array.isArray(data) ? data : [data]
  },

  async createMember(request: MemberSaveRequest): Promise<MemberResponse> {
    const { data } = await axios.post<MemberResponse>(api.members.create(), request)
    return data
  },

  async updateMember(id: number, request: MemberSaveRequest): Promise<MemberResponse> {
    const { data } = await axios.put<MemberResponse>(api.members.update(id), request)
    return data
  },

  async setInactive(id: number): Promise<void> {
    await axios.delete(api.members.setInactive(id))
  },
}
