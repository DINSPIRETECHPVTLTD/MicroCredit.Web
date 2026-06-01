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
  /** Loan scheduler status (e.g. NotPaid, Partial, Overdue, Claimed). */
  loanSchedulerStatus: string
}

/** GET /Report/poc-collection-staff-by-branch/{branchId} */
export interface PocCollectionStaffReportRow {
  userId: number
  userFullName: string
  userRole: string
}

/** GET /Report/staff-schedules-by-branch/{branchId} */
export interface StaffScheduleReportRow {
  pocId: number
  pocStaffId: number
  userId: number
  pocFullName: string
  userFullName: string
  memberFullName: string
  memberId: number
  centerId: number
  pocIsDeleted: boolean
  loanSchedulerId: number
  actualEmiAmount: number
  scheduleDate: string | null
  branchId: number
  userRole: string
}

/** Staff row for expandable staff-schedules report UI. */
export interface StaffScheduleSummaryRow {
  userId: number
  userFullName: string
  userRole: string
  pocCount: number
  scheduleCount: number
  totalAmount: number
}

/** POC aggregate under a staff collector in staff-schedules report. */
export interface StaffSchedulePocSummaryRow {
  pocId: number
  pocFullName: string
  centerId: number
  memberCount: number
  totalAmount: number
  scheduleLines: StaffScheduleReportRow[]
}
