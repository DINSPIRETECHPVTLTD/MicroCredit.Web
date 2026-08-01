import { apiClient } from '@/lib/auth/api-client'

import { api } from "@/lib/api"
import { formatInstallmentLabel, resolveSubInstallmentSequence, compareInstallmentOrder } from "@/lib/installmentLabel"
import type { LoanSchedulerResponse } from "@/types/loanScheduler"

/** Same queryFn as Loan Scheduler page — keeps React Query cache aligned. */
export async function fetchLoanSchedulerList(loanId: number): Promise<LoanSchedulerResponse[]> {
  const { data } = await apiClient.get<unknown[]>(api.loanScheduler.list(loanId))

  return (data ?? []).map((x) => {
    const row = x as Record<string, unknown>
    const installmentNo = Number(row?.InstallmentNo ?? row?.installmentNo ?? 0)
    const subInstallmentSequence = resolveSubInstallmentSequence(row)
    const installmentLabelRaw = row?.InstallmentLabel ?? row?.installmentLabel
    const installmentLabel =
      installmentLabelRaw != null && String(installmentLabelRaw).trim() !== ""
        ? String(installmentLabelRaw)
        : formatInstallmentLabel(installmentNo, subInstallmentSequence)

    return {
      LoanschedulerId:
        row?.LoanschedulerId ??
        row?.loanschedulerId ??
        row?.loanSchedulerId ??
        row?.loanSchedulerID,
      LoanID: row?.LoanID ?? row?.loanId ?? row?.loanID,
      InstallmentNo: installmentNo,
      SubInstallmentSequence: subInstallmentSequence,
      ParentLoanSchedulerId:
        row?.ParentLoanSchedulerId != null || row?.parentLoanSchedulerId != null
          ? Number(row?.ParentLoanSchedulerId ?? row?.parentLoanSchedulerId)
          : null,
      InstallmentLabel: installmentLabel,
      ScheduleDate: row?.ScheduleDate ?? row?.scheduleDate,
      PaymentDate: row?.PaymentDate ?? row?.paymentDate,
      Status: row?.Status ?? row?.status,
      ActualEmiAmount: row?.ActualEmiAmount ?? row?.actualEmiAmount,
      ActualPrincipalAmount: row?.ActualPrincipalAmount ?? row?.actualPrincipalAmount,
      ActualInterestAmount: row?.ActualInterestAmount ?? row?.actualInterestAmount,
      PaymentMode: row?.PaymentMode ?? row?.paymentMode,
      Comments: row?.Comments ?? row?.comments,
      PaymentAmount: row?.PaymentAmount ?? row?.paymentAmount,
      PrincipalAmount: row?.PrincipalAmount ?? row?.principalAmount,
      InterestAmount: row?.InterestAmount ?? row?.interestAmount,
    } as LoanSchedulerResponse
  }).sort(compareInstallmentOrder)
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

/** Numerator = base installments that are Paid or Partial; denominator = base EMI rows only. */
export function countPaidPartialOverTotalEmis(
  rows: Pick<LoanSchedulerResponse, "Status" | "SubInstallmentSequence">[]
): {
  paidPartialCount: number
  totalEmis: number
} {
  const baseRows = rows.filter((r) => (r.SubInstallmentSequence ?? 0) === 0)
  const totalEmis = baseRows.length
  let paidPartialCount = 0
  for (const r of baseRows) {
    if (isPaidOrPartialEmiRow(r.Status)) paidPartialCount++
  }
  return { paidPartialCount, totalEmis }
}
