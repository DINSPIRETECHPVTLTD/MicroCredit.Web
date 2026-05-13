import axios from "axios"
import { api } from "../lib/api"
import type { CreateInvestmentRequest, InvestmentResponse } from "../types/investment"

export const investmentService = {
  async getInvestments(): Promise<InvestmentResponse[]> {
    const { data } = await axios.get<InvestmentResponse[]>(api.investments.list)
    return data
  },

  async createInvestment(payload: CreateInvestmentRequest): Promise<CreateInvestmentRequest> {
    const { data } = await axios.post<CreateInvestmentRequest>(api.investments.create, payload)
    return data
  },
}