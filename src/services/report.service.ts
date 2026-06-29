import { apiClient } from '@/lib/auth/api-client'
import { api } from "@/lib/api"
import { getTodayDateInputValue } from "@/lib/date-time"
import type {
  MemberByPocReportRow,
  PocBranchReportRow,
  StaffReportMemberRow,
  StaffSchedulesPocNode,
  StaffSchedulesReport,
  StaffSchedulesStaffNode,
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

  const scheduleDate =
    pickScheduleDateKey(raw.scheduleDate ?? raw.ScheduleDate) ??
    pickScheduleDateKey(raw.scheduleDateIso ?? raw.ScheduleDateIso)

  const loanSchedulerStatus = pickStr(
    raw.loanSchedulerStatus ?? raw.LoanSchedulerStatus ?? ""
  )

  const memberCode = pickStr(raw.memberCode ?? raw.MemberCode) || null

  return {
    pocId,
    memberId,
    memberCode,
    memberName: memberName || "—",
    due,
    actualEmi,
    amountPaid: actualEmi,
    scheduleDate,
    statusRaw,
    loanSchedulerStatus: loanSchedulerStatus || "NotPaid",
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

function normalizeStaffReportMember(raw: Record<string, unknown>): StaffReportMemberRow | null {
  const memberId = pickId(raw.memberId ?? raw.MemberId)
  const pocId = pickId(raw.pocId ?? raw.PocId ?? raw.pocID ?? raw.PocID)
  if (!memberId || !pocId) return null

  const loanSchedulerId =
    pickId(raw.loanSchedulerId ?? raw.LoanSchedulerId ?? raw.id ?? raw.Id) ||
    memberId * 10000 + pickId(raw.loanId ?? raw.LoanId)

  const scheduleDate =
    pickScheduleDateKey(raw.scheduleDate ?? raw.ScheduleDate) ??
    pickScheduleDateKey(raw.scheduleDateIso ?? raw.ScheduleDateIso)

  const loanSchedulerStatus = pickStr(raw.loanSchedulerStatus ?? raw.LoanSchedulerStatus)

  return {
    memberId,
    memberCode: pickStr(raw.memberCode ?? raw.MemberCode) || null,
    pocId,
    memberFullName:
      pickStr(
        raw.memberFullName ??
          raw.MemberFullName ??
          raw.membersFullName ??
          raw.MembersFullName
      ) || "—",
    loanId: pickId(raw.loanId ?? raw.LoanId),
    loanStatus: pickStr(raw.loanStatus ?? raw.LoanStatus) || "—",
    loanSchedulerId,
    scheduleDate,
    actualEmiAmount: pickNum(raw.actualEmiAmount ?? raw.ActualEmiAmount),
    loanSchedulerStatus: loanSchedulerStatus || "NotPaid",
  }
}

function normalizePocCollectionStaffRow(
  raw: Record<string, unknown>
): Pick<StaffSchedulesStaffNode, "userId" | "userFullName" | "userRole"> | null {
  const userId = pickId(raw.userId ?? raw.UserId)
  if (!userId) return null
  return {
    userId,
    userFullName: pickStr(raw.userFullName ?? raw.UserFullName) || "—",
    userRole: pickStr(raw.userRole ?? raw.UserRole) || "—",
  }
}

function buildStaffSchedulesFromLegacyFlatRows(
  staffRows: Pick<StaffSchedulesStaffNode, "userId" | "userFullName" | "userRole">[],
  scheduleRows: StaffReportMemberRow[],
  pocMeta: Map<number, { pocFullName: string; centerId: number; userId: number; userFullName: string; userRole: string }>
): StaffSchedulesReport {
  const staffById = new Map<number, StaffSchedulesStaffNode>()
  for (const staff of staffRows) {
    staffById.set(staff.userId, { ...staff, pocs: [] })
  }

  const pocNodesByStaff = new Map<number, Map<number, StaffSchedulesPocNode>>()

  for (const member of scheduleRows) {
    const meta = pocMeta.get(member.pocId)
    const userId = meta?.userId
    if (!userId) continue

    if (!staffById.has(userId)) {
      staffById.set(userId, {
        userId,
        userFullName: meta.userFullName,
        userRole: meta.userRole,
        pocs: [],
      })
    }

    let pocMap = pocNodesByStaff.get(userId)
    if (!pocMap) {
      pocMap = new Map()
      pocNodesByStaff.set(userId, pocMap)
    }

    if (!pocMap.has(member.pocId)) {
      pocMap.set(member.pocId, {
        pocId: member.pocId,
        pocFullName: meta.pocFullName,
        centerId: meta.centerId,
        members: [],
      })
    }

    pocMap.get(member.pocId)!.members.push(member)
  }

  for (const [userId, staff] of staffById) {
    const pocMap = pocNodesByStaff.get(userId)
    staff.pocs = pocMap
      ? Array.from(pocMap.values()).sort((a, b) =>
          a.pocFullName.localeCompare(b.pocFullName, undefined, { sensitivity: "base" })
        )
      : []
  }

  const staff = Array.from(staffById.values()).sort((a, b) =>
    a.userFullName.localeCompare(b.userFullName, undefined, { sensitivity: "base" })
  )

  return { staff }
}

function normalizeLegacyStaffScheduleFlatRow(
  raw: Record<string, unknown>
): { member: StaffReportMemberRow; pocMeta: { pocFullName: string; centerId: number; userId: number; userFullName: string; userRole: string } } | null {
  const member = normalizeStaffReportMember(raw)
  if (!member) return null

  const userId = pickId(raw.userId ?? raw.UserId ?? raw.pocStaffId ?? raw.PocStaffId)
  if (!userId) return null

  return {
    member,
    pocMeta: {
      pocFullName: pickStr(raw.pocFullName ?? raw.PocFullName) || "—",
      centerId: pickId(raw.centerId ?? raw.CenterId),
      userId,
      userFullName: pickStr(raw.userFullName ?? raw.UserFullName) || "—",
      userRole: pickStr(raw.userRole ?? raw.UserRole) || "—",
    },
  }
}

async function getStaffSchedulesReportFromLegacyEndpoints(
  branchId: number
): Promise<StaffSchedulesReport> {
  const [staffRes, schedulesRes] = await Promise.all([
    apiClient.get<unknown>(api.report.pocCollectionStaffByBranch(branchId)),
    apiClient.get<unknown>(api.report.staffSchedulesByBranch(branchId)),
  ])

  const staffRows = asObjectArray(staffRes.data)
    .map(normalizePocCollectionStaffRow)
    .filter((r): r is Pick<StaffSchedulesStaffNode, "userId" | "userFullName" | "userRole"> => r !== null)

  const pocMeta = new Map<
    number,
    { pocFullName: string; centerId: number; userId: number; userFullName: string; userRole: string }
  >()
  const scheduleRows: StaffReportMemberRow[] = []

  for (const raw of asObjectArray(schedulesRes.data)) {
    const parsed = normalizeLegacyStaffScheduleFlatRow(raw)
    if (!parsed) continue
    scheduleRows.push(parsed.member)
    if (!pocMeta.has(parsed.member.pocId)) {
      pocMeta.set(parsed.member.pocId, {
        pocFullName: parsed.pocMeta.pocFullName,
        centerId: parsed.pocMeta.centerId,
        userId: parsed.pocMeta.userId,
        userFullName: parsed.pocMeta.userFullName,
        userRole: parsed.pocMeta.userRole,
      })
    }
  }

  return buildStaffSchedulesFromLegacyFlatRows(staffRows, scheduleRows, pocMeta)
}

function normalizeStaffSchedulesPocNode(raw: Record<string, unknown>): StaffSchedulesPocNode | null {
  const pocId = pickId(raw.pocId ?? raw.PocId)
  if (!pocId) return null

  const membersRaw = raw.members ?? raw.Members
  const members = Array.isArray(membersRaw)
    ? membersRaw
        .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
        .map(normalizeStaffReportMember)
        .filter((r): r is StaffReportMemberRow => r !== null)
    : []

  return {
    pocId,
    pocFullName: pickStr(raw.pocFullName ?? raw.PocFullName) || "—",
    centerId: pickId(raw.centerId ?? raw.CenterId),
    members,
  }
}

function normalizeStaffSchedulesStaffNode(
  raw: Record<string, unknown>
): StaffSchedulesStaffNode | null {
  const userId = pickId(raw.userId ?? raw.UserId)
  if (!userId) return null

  const pocsRaw = raw.pocs ?? raw.Pocs
  const pocs = Array.isArray(pocsRaw)
    ? pocsRaw
        .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
        .map(normalizeStaffSchedulesPocNode)
        .filter((r): r is StaffSchedulesPocNode => r !== null)
    : []

  return {
    userId,
    userFullName: pickStr(raw.userFullName ?? raw.UserFullName) || "—",
    userRole: pickStr(raw.userRole ?? raw.UserRole) || "—",
    pocs,
  }
}

function normalizeStaffSchedulesReport(data: unknown): StaffSchedulesReport {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    const staffRaw = obj.staff ?? obj.Staff
    if (Array.isArray(staffRaw)) {
      const staff = staffRaw
        .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
        .map(normalizeStaffSchedulesStaffNode)
        .filter((r): r is StaffSchedulesStaffNode => r !== null)
      return { staff }
    }
  }
  return { staff: [] }
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

  async getMembersByPocs(branchId: number, pocIds: number[]): Promise<MemberByPocReportRow[]> {
    const { data } = await apiClient.post<unknown>(
      api.report.membersByPocs(branchId),
      pocIds
    )
    return asObjectArray(data)
      .map(normalizeMemberRow)
      .filter((r): r is MemberByPocReportRow => r !== null)
  },

  async getStaffSchedulesReport(branchId: number): Promise<StaffSchedulesReport> {
    try {
      const { data } = await apiClient.get<unknown>(api.report.staffSchedulesReport(branchId))
      return normalizeStaffSchedulesReport(data)
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        return getStaffSchedulesReportFromLegacyEndpoints(branchId)
      }
      throw err
    }
  },

  async getMemeberWiseCollectionReport() {
      const { data } = await apiClient.get(api.report.memberWiseCollectionReport(), {
        responseType: 'blob'  // ← tells axios to treat response as binary
    });

    // Create a download link and trigger it
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Report_${getTodayDateInputValue()}.xlsx`);
    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}
