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
  memberCode: string | null
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

/** GET /Report/staff-schedules-report/{branchId} — member schedule line. */
export interface StaffReportMemberRow {
  memberId: number
  memberCode: string | null
  pocId: number
  memberFullName: string
  loanId: number
  loanStatus: string
  loanSchedulerId: number
  scheduleDate: string | null
  actualEmiAmount: number
  loanSchedulerStatus: string
}

export interface StaffSchedulesPocNode {
  pocId: number
  pocFullName: string
  centerId: number
  members: StaffReportMemberRow[]
}

export interface StaffSchedulesStaffNode {
  userId: number
  userFullName: string
  userRole: string
  pocs: StaffSchedulesPocNode[]
}

export interface StaffSchedulesReport {
  staff: StaffSchedulesStaffNode[]
}

/** POC row with counts for the selected schedule day. */
export type StaffSchedulesPocTableRow = StaffSchedulesPocNode & {
  resolvedMemberCount: number
  resolvedTotalAmount: number
  membersForDay: StaffReportMemberRow[]
}

/** Staff row with aggregated counts for the selected schedule day. */
export type StaffSchedulesStaffTableRow = {
  userId: number
  userFullName: string
  userRole: string
  pocCount: number
  scheduleCount: number
  totalAmount: number
  pocsForDay: StaffSchedulesPocTableRow[]
}
