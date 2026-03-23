/**
 * Recovery Posting — loads schedulers via GET /RecoveryPosting/schedulers (query: scheduleDate, centerId, pocId).
 */
import axios from "axios"
import { api } from "@/lib/api"
import { deriveStatusFromAmounts } from "./recoveryPostingCalculations"

export type RecoveryPostingRow = {
  rowKey: string
  loanId: number
  loanSchedulerId: number
  memberId: number
  installmentNo: number
  actualEmiAmount: number
  actualPrincipalAmount: number | null
  actualInterestAmount: number | null
  /** Editable payment; initialized to full scheduled EMI (actualEmiAmount). */
  paymentAmount: number
  /** Derived from payment using schedule ratio; initialized from schedule actuals. */
  principalAmount: number
  interestAmount: number
  paymentMode: string
  status: string
  comments: string
  centerId: number
  centerName: string
  branchId: number
  branchName: string
  /** Member POC when known; API may omit — kept for future posting payloads */
  pocId: number
  /** Fallback split when actualEmi is 0; optional from API. */
  principalPercentage?: number
  interestPercentage?: number
}

/** Response shape from MicroCredit API (camelCase JSON). */
type RecoveryPostingApiRow = {
  loanId?: number
  memberId?: number
  loanStatus?: string
  loanSchedulerId?: number
  schedulerLoanId?: number
  installmentNo?: number
  scheduleDate?: string
  paymentDate?: string | null
  actualEmiAmount?: number
  actualPrincipalAmount?: number | null
  actualInterestAmount?: number | null
  paymentAmount?: number
  principalAmount?: number | null
  interestAmount?: number | null
  schedulerStatus?: string
  paymentMode?: string | null
  collectedBy?: number | null
  comments?: string | null
  createdBy?: number
  createdDate?: string
  centerId?: number
  centerName?: string
  branchId?: number
  branchName?: string
  principalPercentage?: number
  interestPercentage?: number
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function mapApiRow(raw: RecoveryPostingApiRow): RecoveryPostingRow {
  const loanId = toNum(raw.loanId ?? raw.schedulerLoanId)
  const loanSchedulerId = toNum(raw.loanSchedulerId)
  const rowKey = `${loanId}-${loanSchedulerId}`
  const ap = raw.actualPrincipalAmount
  const ai = raw.actualInterestAmount
  const actualEmiAmount = toNum(raw.actualEmiAmount)
  const actualPrincipalAmount = ap == null ? null : toNum(ap)
  const actualInterestAmount = ai == null ? null : toNum(ai)
  const principalPct =
    raw.principalPercentage != null && !Number.isNaN(Number(raw.principalPercentage))
      ? Number(raw.principalPercentage)
      : undefined
  const interestPct =
    raw.interestPercentage != null && !Number.isNaN(Number(raw.interestPercentage))
      ? Number(raw.interestPercentage)
      : undefined

  const base: RecoveryPostingRow = {
    rowKey,
    loanId,
    loanSchedulerId,
    memberId: toNum(raw.memberId),
    installmentNo: toNum(raw.installmentNo),
    actualEmiAmount,
    actualPrincipalAmount,
    actualInterestAmount,
    paymentAmount: actualEmiAmount,
    principalAmount: actualPrincipalAmount ?? 0,
    interestAmount: actualInterestAmount ?? 0,
    paymentMode: String(raw.paymentMode ?? ""),
    status: "",
    comments: String(raw.comments ?? ""),
    centerId: toNum(raw.centerId),
    centerName: String(raw.centerName ?? ""),
    branchId: toNum(raw.branchId),
    branchName: String(raw.branchName ?? ""),
    pocId: 0,
    principalPercentage: principalPct,
    interestPercentage: interestPct,
  }

  base.status = deriveStatusFromAmounts(base)
  return base
}

export type RecoveryPostingSearchParams = {
  /** YYYY-MM-DD */
  dateKey: string
  centerId: number
  pocId: number
}

/**
 * Fetches loan scheduler rows for recovery posting (branch/org from JWT).
 */
export async function fetchRecoveryPostingSchedulers(
  params: RecoveryPostingSearchParams
): Promise<RecoveryPostingRow[]> {
  const { dateKey, centerId, pocId } = params
  const { data } = await axios.get<RecoveryPostingApiRow[]>(api.recoveryPosting.schedulers, {
    params: {
      scheduleDate: `${dateKey}T00:00:00`,
      ...(centerId > 0 ? { centerId } : {}),
      ...(pocId > 0 ? { pocId } : {}),
    },
  })
  const list = Array.isArray(data) ? data : []
  return list.map((row) => mapApiRow(row))
}

export type RecoveryPostingPostLine = {
  loanSchedulerId: number
  paymentAmount: number
  principalAmount: number
  interestAmount: number
  paymentMode: string
  status: string
  comments?: string | null
}

export type RecoveryPostingPostPayload = {
  collectedBy: number
  items: RecoveryPostingPostLine[]
}

export async function postRecoveryPosting(
  payload: RecoveryPostingPostPayload
): Promise<{ postedCount: number; message?: string }> {
  const { data } = await axios.post<{ postedCount: number; message?: string }>(
    api.recoveryPosting.post,
    payload
  )
  return data
}
