import { apiClient } from '@/lib/auth/api-client'

import { api } from "@/lib/api"
import type { LoanSchedulerResponse } from "@/types/loanScheduler"
import { resolveInstallmentLabel } from "@/lib/installmentLabel"

/** Same queryFn as Loan Scheduler page — keeps React Query cache aligned. */
export async function fetchLoanSchedulerList(loanId: number): Promise<LoanSchedulerResponse[]> {
  const { data } = await apiClient.get<unknown[]>(api.loanScheduler.list(loanId))

  return (data ?? []).map((x) => {
    const row = x as Record<string, unknown>
    const installmentNo = Number(row?.InstallmentNo ?? row?.installmentNo ?? 0)
    const subInstallmentSequence = Number(
      row?.SubInstallmentSequence ?? row?.subInstallmentSequence ?? 0
    )
    const parentRaw = row?.ParentLoanSchedulerId ?? row?.parentLoanSchedulerId
    const parentLoanSchedulerId =
      parentRaw == null || parentRaw === "" ? null : Number(parentRaw)

    return {
      LoanschedulerId:
        row?.LoanschedulerId ??
        row?.loanschedulerId ??
        row?.loanSchedulerId ??
        row?.loanSchedulerID,
      LoanID: row?.LoanID ?? row?.loanId ?? row?.loanID,
      InstallmentNo: installmentNo,
      SubInstallmentSequence: subInstallmentSequence,
      ParentLoanSchedulerId: parentLoanSchedulerId,
      InstallmentLabel: resolveInstallmentLabel({
        installmentNo,
        subInstallmentSequence,
        installmentLabel: (row?.InstallmentLabel ?? row?.installmentLabel) as string | null,
      }),
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
  })
}

function normalizeScheduleStatus(status: unknown): string {
  return String(status ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function isBaseEmiRow(row: Pick<LoanSchedulerResponse, "ParentLoanSchedulerId" | "SubInstallmentSequence">): boolean {
  return (
    (row.ParentLoanSchedulerId == null || Number.isNaN(Number(row.ParentLoanSchedulerId))) &&
    (row.SubInstallmentSequence ?? 0) === 0
  )
}

/** One EMI row counts if it is fully paid or has any partial payment recorded. */
export function isPaidOrPartialEmiRow(status: unknown): boolean {
  const s = normalizeScheduleStatus(status)
  if (s === "paid") return true
  if (s === "partial" || s === "partial paid") return true
  return false
}

/**
 * Progress uses base EMI rows only (Seq=0) so payment children do not inflate term counts.
 * Numerator = bases that are Paid or legacy Partial.
 */
export function countPaidPartialOverTotalEmis(
  rows: Pick<LoanSchedulerResponse, "Status" | "ParentLoanSchedulerId" | "SubInstallmentSequence">[]
): {
  paidPartialCount: number
  totalEmis: number
} {
  const bases = rows.filter(isBaseEmiRow)
  const totalEmis = bases.length
  let paidPartialCount = 0
  for (const r of bases) {
    if (isPaidOrPartialEmiRow(r.Status)) paidPartialCount++
  }
  return { paidPartialCount, totalEmis }
}
