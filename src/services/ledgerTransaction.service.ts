import { apiClient } from '@/lib/auth/api-client'
import { api } from "../lib/api"
import type { CreateExpenseRequest, LedgerTransactionResponse } from "@/types/ledgerTransaction"

export const ledgerTransactionService = {
  async getExpenses(): Promise<LedgerTransactionResponse[]> {
    const { data } = await apiClient.get<LedgerTransactionResponse[]>(api.ledgerTransactions.expenses)
    return data
  },

  async getTransactions(params: {
    userId: number
  }): Promise<LedgerTransactionResponse[]> {
    const { data } = await apiClient.get<LedgerTransactionResponse[]>(api.ledgerTransactions.transactions(params.userId), {
      params: {
        userId: params.userId,
      },
    })
    return data
  },

  async createExpense(payload: CreateExpenseRequest): Promise<LedgerTransactionResponse> {
    const { data } = await apiClient.post<LedgerTransactionResponse>(api.ledgerTransactions.create, payload)
    return data
  },
}