import { apiClient } from '@/lib/auth/api-client'
import { api } from "../lib/api"
import type { CreateInvestmentRequest, InvestmentResponse } from "../types/investment"

export const investmentService = {
  async getInvestments(): Promise<InvestmentResponse[]> {
    const { data } = await apiClient.get<InvestmentResponse[]>(api.investments.list)
    return data
  },

  async createInvestment(payload: CreateInvestmentRequest): Promise<CreateInvestmentRequest> {
    const { data } = await apiClient.post<CreateInvestmentRequest>(api.investments.create, payload)
    return data
  },
}