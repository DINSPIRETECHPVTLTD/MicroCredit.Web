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

export interface MemberByPocReportRow {
  memberId: string
  memberName: string
  amountPaid: number
  /** Schedule due datetime from API (ISO string). Used for today / tomorrow EMI window. */
  scheduleDate: string | null
  statusRaw: string | boolean | null | undefined
}
