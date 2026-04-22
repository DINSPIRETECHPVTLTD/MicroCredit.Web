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
  LoanId?: number
  memberId?: number
  MemberId?: number
  loanStatus?: string
  LoanStatus?: string
  loanSchedulerId?: number
  LoanSchedulerId?: number
  schedulerLoanId?: number
  SchedulerLoanId?: number
  installmentNo?: number
  InstallmentNo?: number
  scheduleDate?: string
  ScheduleDate?: string
  paymentDate?: string | null
  PaymentDate?: string | null
  actualEmiAmount?: number
  ActualEmiAmount?: number
  actualPrincipalAmount?: number | null
  ActualPrincipalAmount?: number | null
  actualInterestAmount?: number | null
  ActualInterestAmount?: number | null
  paymentAmount?: number
  PaymentAmount?: number
  principalAmount?: number | null
  PrincipalAmount?: number | null
  interestAmount?: number | null
  InterestAmount?: number | null
  schedulerStatus?: string
  SchedulerStatus?: string
  paymentMode?: string | null
  PaymentMode?: string | null
  collectedBy?: number | null
  CollectedBy?: number | null
  comments?: string | null
  Comments?: string | null
  createdBy?: number
  CreatedBy?: number
  createdDate?: string
  CreatedDate?: string
  centerId?: number
  CenterId?: number
  centerName?: string
  CenterName?: string
  branchId?: number
  BranchId?: number
  branchName?: string
  BranchName?: string
  principalPercentage?: number
  PrincipalPercentage?: number
  interestPercentage?: number
  InterestPercentage?: number
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function getField(raw: RecoveryPostingApiRow, candidates: string[]): unknown {
  const normalized = new Map<string, unknown>()
  for (const [key, value] of Object.entries(raw)) {
    normalized.set(key.toLowerCase(), value)
  }
  for (const key of candidates) {
    const value = normalized.get(key.toLowerCase())
    if (value !== undefined && value !== null) {
      return value
    }
  }
  return undefined
}

function mapApiRow(raw: RecoveryPostingApiRow): RecoveryPostingRow {
  const loanId = toNum(getField(raw, ["loanId", "schedulerLoanId"]))
  const loanSchedulerId = toNum(
    getField(raw, ["loanSchedulerId", "loanSchedulerID", "loanschedulerId", "loanschedulerID"])
  )
  const rowKey = `${loanId}-${loanSchedulerId}`
  const ap = getField(raw, ["actualPrincipalAmount"])
  const ai = getField(raw, ["actualInterestAmount"])
  const actualEmiAmount = toNum(getField(raw, ["actualEmiAmount"]))
  const actualPrincipalAmount = ap == null ? null : toNum(ap)
  const actualInterestAmount = ai == null ? null : toNum(ai)
  const principalPct =
    getField(raw, ["principalPercentage"]) != null &&
    !Number.isNaN(Number(getField(raw, ["principalPercentage"])))
      ? Number(getField(raw, ["principalPercentage"]))
      : undefined
  const interestPct =
    getField(raw, ["interestPercentage"]) != null &&
    !Number.isNaN(Number(getField(raw, ["interestPercentage"])))
      ? Number(getField(raw, ["interestPercentage"]))
      : undefined

  const base: RecoveryPostingRow = {
    rowKey,
    loanId,
    loanSchedulerId,
    memberId: toNum(getField(raw, ["memberId"])),
    installmentNo: toNum(getField(raw, ["installmentNo"])),
    actualEmiAmount,
    actualPrincipalAmount,
    actualInterestAmount,
    paymentAmount: actualEmiAmount,
    principalAmount: actualPrincipalAmount ?? 0,
    interestAmount: actualInterestAmount ?? 0,
    paymentMode: String(getField(raw, ["paymentMode"]) ?? ""),
    status: "",
    comments: String(getField(raw, ["comments"]) ?? ""),
    centerId: toNum(getField(raw, ["centerId"])),
    centerName: String(getField(raw, ["centerName"]) ?? ""),
    branchId: toNum(getField(raw, ["branchId"])),
    branchName: String(getField(raw, ["branchName"]) ?? ""),
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
