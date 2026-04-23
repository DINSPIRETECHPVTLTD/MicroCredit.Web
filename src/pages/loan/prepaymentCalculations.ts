export const PREPAYMENT_STATUS = {
  NOT_PAID: "Not Paid",
  PAID: "Paid",
  PARTIAL_PAID: "Partial Paid",
  OVERDUE: "Overdue",
} as const

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function normalizePrepaymentStatus(status: string | null | undefined): string {
  const s = String(status ?? "")
    .trim()
    .toLowerCase()
  if (s === "not paid" || s === "") return PREPAYMENT_STATUS.NOT_PAID
  if (s === "paid") return PREPAYMENT_STATUS.PAID
  if (s === "partial paid" || s === "partial") return PREPAYMENT_STATUS.PARTIAL_PAID
  if (s === "overdue") return PREPAYMENT_STATUS.OVERDUE
  return s
}

export function derivePrepaymentStatus(row: {
  paymentAmount: number
  actualEmiAmount: number
}): string {
  const payment =
    row.paymentAmount != null && !Number.isNaN(Number(row.paymentAmount)) ? Number(row.paymentAmount) : 0
  const actualEmi =
    row.actualEmiAmount != null && !Number.isNaN(Number(row.actualEmiAmount))
      ? Number(row.actualEmiAmount)
      : 0

  if (payment <= 0) return PREPAYMENT_STATUS.NOT_PAID
  if (actualEmi <= 0) return PREPAYMENT_STATUS.PARTIAL_PAID
  return Math.abs(round2(payment) - round2(actualEmi)) < 1e-9
    ? PREPAYMENT_STATUS.PAID
    : PREPAYMENT_STATUS.PARTIAL_PAID
}

export function calculatePrepaymentSplit(row: {
  actualEmiAmount: number
  actualPrincipalAmount: number | null
  actualInterestAmount: number | null
  principalPercentage?: number
}, payment: number): { principalAmount: number; interestAmount: number } {
  if (payment <= 0 || Number.isNaN(payment)) {
    return { principalAmount: 0, interestAmount: 0 }
  }

  const total = row.actualEmiAmount != null && row.actualEmiAmount > 0 ? Number(row.actualEmiAmount) : 0
  const principal = row.actualPrincipalAmount != null ? Number(row.actualPrincipalAmount) : 0
  const interest = row.actualInterestAmount != null ? Number(row.actualInterestAmount) : 0

  // Prefer splitting based on (principal + interest) when both are present.
  // Helps with last installment edge cases where `actualEmiAmount` may be 0/undefined.
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
