import { apiClient } from '@/lib/auth/api-client'
import { api } from "@/lib/api"

export interface CreateMemberFeeRequest {
  memberId: number
  amount: number
  paidDate: string
  collectedBy: number
  paymentMode?: string | null
  comments?: string | null
}

export const memberFeeService = {
  async createFee(request: CreateMemberFeeRequest): Promise<void> {
    await apiClient.post(api.memberFees.create(), request)
  },
}

