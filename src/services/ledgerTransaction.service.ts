import axios from "axios"
import { api } from "../lib/api"
import type { CreateExpenseRequest, LedgerTransactionResponse } from "@/types/ledgerTransaction"

export const ledgerTransactionService = {
  async getExpenses(): Promise<LedgerTransactionResponse[]> {
    const { data } = await axios.get<LedgerTransactionResponse[]>(api.ledgerTransactions.expenses)
    return data
  },

  async getTransactions(params: {
    userId: number
  }): Promise<LedgerTransactionResponse[]> {
    const { data } = await axios.get<LedgerTransactionResponse[]>(api.ledgerTransactions.transactions(params.userId), {
      params: {
        userId: params.userId,
      },
    })
    return data
  },

  async createExpense(payload: CreateExpenseRequest): Promise<LedgerTransactionResponse> {
    const { data } = await axios.post<LedgerTransactionResponse>(api.ledgerTransactions.create, payload)
    return data
  },
}