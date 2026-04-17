import axios from "axios"
import { api } from "@/lib/api"
import type { DashboardSummaryResponse } from "@/types/dashboard"

function pickNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function normalizeSummary(raw: Record<string, unknown>): DashboardSummaryResponse {
  return {
    totalOwnerAmount: pickNum(raw.totalOwnerAmount ?? raw.TotalOwnerAmount),
    totalInvestorAmount: pickNum(raw.totalInvestorAmount ?? raw.TotalInvestorAmount),
    totalInsuranceAmount: pickNum(raw.totalInsuranceAmount ?? raw.TotalInsuranceAmount),
    totalProcessingFee: pickNum(raw.totalProcessingFee ?? raw.TotalProcessingFee),
    receivedPrinciple: pickNum(raw.receivedPrinciple ?? raw.ReceivedPrinciple),
    receivedInterest: pickNum(raw.receivedInterest ?? raw.ReceivedInterest),
    outstandingPrinciple: pickNum(raw.outstandingPrinciple ?? raw.OutstandingPrinciple),
    interestAccured: pickNum(raw.interestAccured ?? raw.InterestAccured),
    totalJoiningFee: pickNum(raw.totalJoiningFee ?? raw.TotalJoiningFee),
    totalLedgerExpenseAmount: pickNum(raw.totalLedgerExpenseAmount ?? raw.TotalLedgerExpenseAmount),
  }
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummaryResponse> {
    const { data } = await axios.get<unknown>(api.report.summary())
    const safe = data && typeof data === "object" ? (data as Record<string, unknown>) : {}
    return normalizeSummary(safe)
  },
}
