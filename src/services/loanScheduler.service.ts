import axios from "axios"

import { api } from "@/lib/api"
import type { LoanSchedulerResponse } from "@/types/loanScheduler"

/** Same queryFn as Loan Scheduler page — keeps React Query cache aligned. */
export async function fetchLoanSchedulerList(loanId: number): Promise<LoanSchedulerResponse[]> {
  const { data } = await axios.get<unknown[]>(api.loanScheduler.list(loanId))

  return (data ?? []).map((x) => {
    const row = x as Record<string, unknown>
    return {
      LoanschedulerId: row?.LoanschedulerId ?? row?.loanSchedulerId ?? row?.loanSchedulerID,
      LoanID: row?.LoanID ?? row?.loanId ?? row?.loanID,
      InstallmentNo: row?.InstallmentNo ?? row?.installmentNo,
      ScheduleDate: row?.ScheduleDate ?? row?.scheduleDate,
      PaymentDate: row?.PaymentDate ?? row?.paymentDate,
      Status: row?.Status ?? row?.status,
      ActualEmiAmount: row?.ActualEmiAmount ?? row?.actualEmiAmount,
      PaymentMode: row?.PaymentMode ?? row?.paymentMode,
      Comments: row?.Comments ?? row?.comments,
      PaymentAmount: row?.PaymentAmount ?? row?.paymentAmount,
    } as LoanSchedulerResponse
  })
}

function normalizeScheduleStatus(status: unknown): string {
  return String(status ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

/** One EMI row counts if it is fully paid or has any partial payment recorded. */
export function isPaidOrPartialEmiRow(status: unknown): boolean {
  const s = normalizeScheduleStatus(status)
  if (s === "paid") return true
  if (s === "partial" || s === "partial paid") return true
  return false
}

/** Numerator = installments that are Paid or Partial; denominator = total EMI rows. */
export function countPaidPartialOverTotalEmis(rows: Pick<LoanSchedulerResponse, "Status">[]): {
  paidPartialCount: number
  totalEmis: number
} {
  const totalEmis = rows.length
  let paidPartialCount = 0
  for (const r of rows) {
    if (isPaidOrPartialEmiRow(r.Status)) paidPartialCount++
  }
  return { paidPartialCount, totalEmis }
}
