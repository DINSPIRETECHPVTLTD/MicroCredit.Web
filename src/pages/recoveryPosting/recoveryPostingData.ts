/**
 * Recovery Posting — loads schedulers via GET /RecoveryPosting/schedulers (query: scheduleDate, centerId, pocId).
 */
import { apiClient } from '@/lib/auth/api-client'
import { api } from "@/lib/api"
import { deriveStatusFromAmounts } from "./recoveryPostingCalculations"
import { resolveInstallmentLabel } from "@/lib/installmentLabel"

export type RecoveryPostingRow = {
  rowKey: string
  memberName: string
  loanId: number
  loanSchedulerId: number
  memberId: number
  memberCode: string | null
  installmentNo: number
  /** Display label e.g. 10 or 10_1 when API provides parent/child tracking. */
  installmentLabel?: string
  subInstallmentSequence?: number
  parentLoanSchedulerId?: number | null
  scheduleDate: string
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
  pocName: string
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
  memberName?: string
  MemberName?: string
  pocName?: string
  PocName?: string
  loanId?: number
  LoanId?: number
  memberId?: number
  MemberId?: number
  memberCode?: string | null
  MemberCode?: string | null
  loanStatus?: string
  LoanStatus?: string
  loanSchedulerId?: number
  LoanSchedulerId?: number
  schedulerLoanId?: number
  SchedulerLoanId?: number
  installmentNo?: number
  InstallmentNo?: number
  installmentLabel?: string
  InstallmentLabel?: string
  subInstallmentSequence?: number
  SubInstallmentSequence?: number
  parentLoanSchedulerId?: number | null
  ParentLoanSchedulerId?: number | null
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

function toText(v: unknown): string {
  if (v === null || v === undefined) return ""
  return String(v).trim()
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
    memberName: String(getField(raw, ["memberName"]) ?? ""),
    loanId,
    loanSchedulerId,
    memberId: toNum(getField(raw, ["memberId"])),
    memberCode: toText(getField(raw, ["memberCode"])) || null,
    installmentNo: toNum(getField(raw, ["installmentNo"])),
    installmentLabel: resolveInstallmentLabel({
      installmentNo: toNum(getField(raw, ["installmentNo"])),
      subInstallmentSequence: toNum(getField(raw, ["subInstallmentSequence"])),
      installmentLabel: toText(getField(raw, ["installmentLabel"])) || null,
    }),
    subInstallmentSequence: toNum(getField(raw, ["subInstallmentSequence"])),
    parentLoanSchedulerId: (() => {
      const v = getField(raw, ["parentLoanSchedulerId"])
      return v == null || v === "" ? null : toNum(v)
    })(),
    scheduleDate: String(getField(raw, ["scheduleDate"]) ?? ""),
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
    pocName: String(getField(raw, ["pocName"]) ?? ""),
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
  const { data } = await apiClient.get<RecoveryPostingApiRow[]>(api.recoveryPosting.schedulers, {
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
  paymentAmount?: number | null
  principalAmount?: number | null
  interestAmount?: number | null
  paymentMode?: string | null
  status: string
  comments?: string | null
}

export type RecoveryPostingPostPayload = {
  clientRequestId: string
  collectedBy: number
  items: RecoveryPostingPostLine[]
  skipLedgerTransaction?: boolean
}

export async function postRecoveryPosting(
  payload: RecoveryPostingPostPayload
): Promise<{ postedCount: number; message?: string }> {
  const { data } = await apiClient.post<{ postedCount: number; message?: string }>(
    api.recoveryPosting.post,
    {
      clientRequestId: payload.clientRequestId,
      collectedBy: payload.collectedBy,
      items: payload.items,
      ...(payload.skipLedgerTransaction ? { skipLedgerTransaction: true } : {}),
    }
  )
  return data
}
