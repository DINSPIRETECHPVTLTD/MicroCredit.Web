/** Report API DTOs — normalized in report.service from flexible backend shapes. */

export interface PocBranchReportRow {
  pocId: number
  pocName: string
  centerName: string
  memberCount: number
  totalAmount: number
  /** Raw status from API when present (e.g. Active/Inactive or boolean). */
  statusRaw: string | boolean | null | undefined
}

/** Report/Recent paid-to-user ledger rows (camelCase or PascalCase from API). */
export interface PaidToUserLedgerReportRow {
  id: number
  paidToUserFullName: string
  paidToUserId: number | null
  amount: number
  paymentDate: string | null
  transactionType: string
}

export interface MemberByPocReportRow {
  pocId: number
  memberId: string
  memberName: string
  /** Scheduled due EMI amount (API field naming varies). */
  due: number
  /** Actual EMI amount paid/collected (API field naming varies). */
  actualEmi: number
  /**
   * Back-compat alias for existing UI columns.
   * Prefer `actualEmi` for new logic.
   */
  amountPaid: number
  /** Schedule due datetime / key from API (ISO string or `YYYY-MM-DD`). */
  scheduleDate: string | null
  statusRaw: string | boolean | null | undefined
}
