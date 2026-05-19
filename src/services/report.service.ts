import { apiClient } from '@/lib/auth/api-client'
import { api } from "@/lib/api"
import type {
  MemberByPocReportRow,
  PaidToUserLedgerReportRow,
  PocBranchReportRow,
  PocCollectionStaffReportRow,
  StaffScheduleReportRow,
} from "@/types/report"

function pickNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function pickStr(v: unknown): string {
  if (v == null) return ""
  return String(v).trim()
}

function pickId(v: unknown): number {
  return pickNum(v)
}

/** Calendar date YYYY-MM-DD in local timezone (for schedule-day filters). */
function pickScheduleDateKey(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === "string") {
    const t = v.trim()
    const dateOnly = t.match(/^(\d{4}-\d{2}-\d{2})/)
    if (dateOnly) return dateOnly[1]
    if (t) {
      const d = new Date(t)
      if (!Number.isNaN(d.getTime())) {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, "0")
        const day = String(d.getDate()).padStart(2, "0")
        return `${y}-${m}-${day}`
      }
    }
    return null
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, "0")
    const day = String(v.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }
  return null
}

/** Parse API date to ISO string, or null if missing/invalid. */
function pickScheduleDateIso(v: unknown): string | null {
  const key = pickScheduleDateKey(v)
  if (!key) return null
  const d = new Date(`${key}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Normalize one POC row from Report/pocs-by-branch (camelCase or PascalCase). */
function normalizePocRow(raw: Record<string, unknown>): PocBranchReportRow | null {
  const pocId =
    pickId(raw.pocId ?? raw.pocID ?? raw.PocId ?? raw.id ?? raw.Id)
  if (!pocId) return null

  const pocName = pickStr(
    raw.pocFullName ??
      raw.PocFullName ??
      raw.pocName ??
      raw.PocName ??
      raw.name ??
      raw.Name ??
      raw.fullName ??
      raw.FullName
  )
  const centerName = pickStr(raw.centerName ?? raw.CenterName ?? raw.center ?? raw.Center)

  const memberCount = pickNum(
    raw.memberCount ?? raw.MemberCount ?? raw.totalMembers ?? raw.TotalMembers
  )
  const totalAmount = pickNum(raw.totalAmount ?? raw.TotalAmount ?? raw.amount ?? raw.Amount)

  const statusRaw =
    (raw.status ?? raw.Status ?? raw.isActive ?? raw.IsActive ?? raw.active ?? raw.Active) as
      | string
      | boolean
      | null
      | undefined

  return {
    pocId,
    pocName: pocName || "—",
    centerName: centerName || "—",
    memberCount,
    totalAmount,
    statusRaw,
  }
}

/** Normalize one member row from Report/members-by-poc. */
function normalizeMemberRow(raw: Record<string, unknown>): MemberByPocReportRow | null {
  const pocId = pickId(raw.pocId ?? raw.PocId ?? raw.pocID ?? raw.PocID ?? raw.pocid)
  if (!pocId) return null

  const memberId = pickStr(
    raw.memberId ?? raw.MemberId ?? raw.code ?? raw.Code ?? raw.id ?? raw.Id
  )
  if (!memberId) return null

  const memberName = pickStr(
    raw.membersFullName ??
      raw.MembersFullName ??
      raw.memberName ??
      raw.MemberName ??
      raw.name ??
      raw.Name ??
      raw.fullName ??
      raw.FullName
  )

  const amountPaid = pickNum(
    raw.actualEmiAmount ??
      raw.ActualEmiAmount ??
      raw.amountPaid ??
      raw.AmountPaid ??
      raw.paidAmount ??
      raw.PaidAmount ??
      raw.weeklyDue ??
      raw.WeeklyDue
  )

  const due = pickNum(
    raw.due ?? raw.Due ?? raw.amountDue ?? raw.AmountDue ?? raw.weeklyDue ?? raw.WeeklyDue
  )

  const actualEmi = pickNum(
    raw.actualEmi ??
      raw.ActualEmi ??
      raw.actualEmiAmount ??
      raw.ActualEmiAmount ??
      // Fallback: keep legacy behavior when the API doesn't separate due vs actual.
      amountPaid
  )

  const statusRaw = (raw.status ?? raw.Status ?? raw.paymentStatus ?? raw.PaymentStatus) as
    | string
    | boolean
    | null
    | undefined

  const scheduleDate = pickScheduleDateIso(raw.scheduleDate ?? raw.ScheduleDate)

  const loanSchedulerStatus = pickStr(
    raw.loanSchedulerStatus ?? raw.LoanSchedulerStatus ?? ""
  )

  return {
    pocId,
    memberId,
    memberName: memberName || "—",
    due,
    actualEmi,
    amountPaid: actualEmi,
    scheduleDate,
    statusRaw,
    loanSchedulerStatus: loanSchedulerStatus || "NotPaid",
  }
}

function normalizePaidToUserLedgerRow(raw: Record<string, unknown>): PaidToUserLedgerReportRow | null {
  const id = pickId(raw.id ?? raw.Id)
  if (!id) return null
  const paidToUserFullName = pickStr(
    raw.paidToUserFullName ?? raw.PaidToUserFullName ?? raw.fullName ?? raw.FullName
  )
  const paidToUserIdRaw = raw.paidToUserId ?? raw.PaidToUserId
  const paidToUserId =
    paidToUserIdRaw == null || paidToUserIdRaw === "" ? null : pickNum(paidToUserIdRaw)
  const amount = pickNum(raw.amount ?? raw.Amount)
  const paymentDate = pickScheduleDateIso(raw.paymentDate ?? raw.PaymentDate)
  const transactionType = pickStr(raw.transactionType ?? raw.TransactionType)
  return {
    id,
    paidToUserFullName: paidToUserFullName || "—",
    paidToUserId,
    amount,
    paymentDate,
    transactionType: transactionType || "—",
  }
}

function normalizePocCollectionStaffRow(
  raw: Record<string, unknown>
): PocCollectionStaffReportRow | null {
  const userId = pickId(raw.userId ?? raw.UserId)
  if (!userId) return null
  return {
    userId,
    userFullName: pickStr(raw.userFullName ?? raw.UserFullName) || "—",
    userRole: pickStr(raw.userRole ?? raw.UserRole) || "—",
  }
}

function normalizeStaffScheduleRow(raw: Record<string, unknown>): StaffScheduleReportRow | null {
  const loanSchedulerId = pickId(
    raw.loanSchedulerId ??
      raw.LoanSchedulerId ??
      raw.loanSchedulerID ??
      raw.LoanSchedulerID ??
      raw.id ??
      raw.Id
  )
  const userId = pickId(raw.userId ?? raw.UserId)
  const pocId = pickId(raw.pocId ?? raw.PocId ?? raw.pocID ?? raw.PocID)
  const memberId = pickId(raw.memberId ?? raw.MemberId)
  if (!loanSchedulerId || !userId || !pocId || !memberId) return null

  const scheduleDateKey =
    pickScheduleDateKey(raw.scheduleDate ?? raw.ScheduleDate) ??
    pickScheduleDateKey(raw.scheduleDateIso ?? raw.ScheduleDateIso)

  return {
    pocId,
    pocStaffId: pickId(raw.pocStaffId ?? raw.PocStaffId ?? raw.collectionBy ?? raw.CollectionBy),
    userId,
    pocFullName: pickStr(raw.pocFullName ?? raw.PocFullName) || "—",
    userFullName: pickStr(raw.userFullName ?? raw.UserFullName) || "—",
    memberFullName: pickStr(raw.memberFullName ?? raw.MemberFullName) || "—",
    memberId,
    centerId: pickId(raw.centerId ?? raw.CenterId),
    pocIsDeleted: Boolean(raw.pocIsDeleted ?? raw.PocIsDeleted),
    loanSchedulerId,
    actualEmiAmount: pickNum(raw.actualEmiAmount ?? raw.ActualEmiAmount),
    scheduleDate: scheduleDateKey,
    branchId: pickId(raw.branchId ?? raw.BranchId),
    userRole: pickStr(raw.userRole ?? raw.UserRole) || "—",
  }
}

function asObjectArray(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    const list = obj.data ?? obj.items ?? obj.result ?? obj.Data
    if (Array.isArray(list)) {
      return list.filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
    }
  }
  return []
}

export const reportService = {
  async getPocsByBranch(branchId: number): Promise<PocBranchReportRow[]> {
    const { data } = await apiClient.get<unknown>(api.report.pocsByBranch(branchId))
    return asObjectArray(data)
      .map(normalizePocRow)
      .filter((r): r is PocBranchReportRow => r !== null)
  },

  async getMembersByPoc(branchId: number, pocId: number): Promise<MemberByPocReportRow[]> {
    const { data } = await apiClient.get<unknown>(api.report.membersByPoc(branchId, pocId))
    return asObjectArray(data)
      .map(normalizeMemberRow)
      .filter((r): r is MemberByPocReportRow => r !== null)
  },

  async getRecentPaidToUserTransactions(branchId: number): Promise<PaidToUserLedgerReportRow[]> {
    const { data } = await apiClient.get<unknown>(api.report.recentPaidToUserTransactions(branchId))
    return asObjectArray(data)
      .map(normalizePaidToUserLedgerRow)
      .filter((r): r is PaidToUserLedgerReportRow => r !== null)
  },

  async getMembersByPocs(branchId: number, pocIds: number[]): Promise<MemberByPocReportRow[]> {
    const { data } = await apiClient.post<unknown>(
      api.report.membersByPocs(branchId),
      pocIds
    )
    return asObjectArray(data)
      .map(normalizeMemberRow)
      .filter((r): r is MemberByPocReportRow => r !== null)
  },

  async getPocCollectionStaffByBranch(branchId: number): Promise<PocCollectionStaffReportRow[]> {
    const { data } = await apiClient.get<unknown>(api.report.pocCollectionStaffByBranch(branchId))
    return asObjectArray(data)
      .map(normalizePocCollectionStaffRow)
      .filter((r): r is PocCollectionStaffReportRow => r !== null)
  },

  async getStaffSchedulesByBranch(branchId: number): Promise<StaffScheduleReportRow[]> {
    const { data } = await apiClient.get<unknown>(api.report.staffSchedulesByBranch(branchId))
    return asObjectArray(data)
      .map(normalizeStaffScheduleRow)
      .filter((r): r is StaffScheduleReportRow => r !== null)
  },

  async getMemeberWiseCollectionReport() {
      const { data } = await apiClient.get(api.report.memberWiseCollectionReport(), {
        responseType: 'blob'  // ← tells axios to treat response as binary
    });

    // Create a download link and trigger it
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Report_${new Date().toLocaleDateString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}
