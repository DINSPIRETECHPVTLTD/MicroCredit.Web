/**
 * Recovery posting money math: amounts are rounded off to two decimal places (rupee/paise),
 * consistent with how principal and interest are split from a payment.
 */

export const RECOVERY_STATUS = {
  NOT_PAID: "Not Paid",
  PAID: "Paid",
  PARTIAL_PAID: "Partial Paid",
} as const

/** Round off to two decimal places (standard money precision). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Split payment into principal and interest using the schedule ratio (actualPrincipal / actualEmi).
 * Principal is round-off of (payment × ratio); interest is round-off of (payment − principal).
 * Fallback when EMI total is zero: uses principalPercentage for the split, same round-off rules.
 */
export function calculatePaymentSplitFromSchedule(
  row: {
    actualEmiAmount: number
    actualPrincipalAmount: number | null
    actualInterestAmount: number | null
    principalPercentage?: number
  },
  payment: number
): { principalAmount: number; interestAmount: number } {
  if (payment <= 0 || Number.isNaN(payment)) {
    return { principalAmount: 0, interestAmount: 0 }
  }

  const total = row.actualEmiAmount != null && row.actualEmiAmount > 0 ? Number(row.actualEmiAmount) : 0
  const principal = row.actualPrincipalAmount != null ? Number(row.actualPrincipalAmount) : 0
  const interest = row.actualInterestAmount != null ? Number(row.actualInterestAmount) : 0

  // Prefer splitting based on (principal + interest) when both are present.
  // This fixes cases where `actualEmiAmount` is 0/undefined for the last installment,
  // but principal/interest values are still available from the API.
  const hasPrincipalAndInterest =
    row.actualPrincipalAmount != null &&
    row.actualInterestAmount != null &&
    Number.isFinite(principal) &&
    Number.isFinite(interest)
  const totalFromPI = hasPrincipalAndInterest ? principal + interest : 0
  if (totalFromPI > 0) {
    const principalRatio = principal / totalFromPI
    const principalAmount = round2(payment * principalRatio)
    const interestAmount = round2(payment - principalAmount)
    return { principalAmount, interestAmount }
  }

  if (total > 0) {
    const principalRatio = principal / total
    const principalAmount = round2(payment * principalRatio)
    const interestAmount = round2(payment - principalAmount)
    return { principalAmount, interestAmount }
  }

  const pPct =
    row.principalPercentage != null && !Number.isNaN(Number(row.principalPercentage))
      ? Number(row.principalPercentage)
      : 0
  const principalAmount = round2((payment * pPct) / 100)
  const interestAmount = round2(payment - principalAmount)
  return { principalAmount, interestAmount }
}

/**
 * Status from payment vs scheduled EMI, using the same two-decimal round-off for comparison.
 */
export function deriveStatusFromAmounts(row: {
  paymentAmount: number
  actualEmiAmount: number
}): string {
  const payment =
    row.paymentAmount != null && !Number.isNaN(Number(row.paymentAmount)) ? Number(row.paymentAmount) : 0
  const actualEmi =
    row.actualEmiAmount != null && !Number.isNaN(Number(row.actualEmiAmount))
      ? Number(row.actualEmiAmount)
      : 0

  if (payment <= 0) return RECOVERY_STATUS.NOT_PAID
  if (actualEmi <= 0) return RECOVERY_STATUS.PARTIAL_PAID
  return Math.abs(round2(payment) - round2(actualEmi)) < 1e-9
    ? RECOVERY_STATUS.PAID
    : RECOVERY_STATUS.PARTIAL_PAID
}

export function normalizeStatusValue(status: string | null | undefined): string {
  const s = String(status ?? "")
    .trim()
    .toLowerCase()
  if (s === "not paid" || s === "") return RECOVERY_STATUS.NOT_PAID
  if (s === "paid") return RECOVERY_STATUS.PAID
  if (s === "partial paid" || s === "partial") return RECOVERY_STATUS.PARTIAL_PAID
  return s
}

type PostValidationIssue =
  | { type: "sum"; rowKey: string }
  | { type: "exceedsEmi"; rowKey: string; payment: number; actualEmi: number }
  | { type: "paymentMode"; rowKey: string }
  | { type: "status"; rowKey: string }

/** Whole paise (two decimal places) — for exact payment vs principal+interest checks. */
function toPaise(n: number): number {
  return Math.round(n * 100)
}

/**
 * Validates selected rows before POST. Principal + interest must equal payment (same paise total).
 */
export function validateRecoveryPostRows(
  rows: Array<{
    rowKey: string
    status: string
    paymentAmount: number
    principalAmount: number
    interestAmount: number
    actualEmiAmount: number
    paymentMode: string
  }>
): PostValidationIssue[] {
  const issues: PostValidationIssue[] = []

  for (const row of rows) {
    const st = normalizeStatusValue(row.status)
    const payment = row.paymentAmount ?? 0
    const pr = row.principalAmount ?? 0
    const int = row.interestAmount ?? 0

    if (!String(row.paymentMode ?? "").trim()) {
      issues.push({ type: "paymentMode", rowKey: row.rowKey })
    }

    if (st === RECOVERY_STATUS.NOT_PAID) {
      issues.push({ type: "status", rowKey: row.rowKey })
    }

    if (toPaise(payment) !== toPaise(pr + int)) {
      issues.push({ type: "sum", rowKey: row.rowKey })
    }

    const actualEmi = row.actualEmiAmount ?? 0
    // Compare in paise units to avoid false "exceeds" from JS float representation.
    if (actualEmi > 0 && toPaise(payment) > toPaise(actualEmi)) {
      issues.push({ type: "exceedsEmi", rowKey: row.rowKey, payment, actualEmi })
    }
  }

  return issues
}
