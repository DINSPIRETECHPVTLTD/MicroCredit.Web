import { apiClient } from '@/lib/auth/api-client'
import { api } from "@/lib/api"
import { getTodayDateInputValue } from "@/lib/date-time"
import { getSession } from "@/services/auth.service"
import { pocService } from "@/services/poc.service"
import type {
  MemberByPocReportRow,
  MyCollectionSchedulesReport,
  PocBranchReportRow,
  StaffReportMemberRow,
  StaffSchedulesPocNode,
  StaffSchedulesReport,
  StaffSchedulesStaffNode,
  UserLedgerDashboardReport,
  UserLedgerTransactionRow,
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

function normalizeUserLedgerTransactionRow(
  raw: Record<string, unknown>
): UserLedgerTransactionRow | null {
  const id = pickId(raw.id ?? raw.Id)
  if (!id) return null

  const paidFromUserIdRaw = raw.paidFromUserId ?? raw.PaidFromUserId
  const paidToUserIdRaw = raw.paidToUserId ?? raw.PaidToUserId

  return {
    id,
    paidFromUserId:
      paidFromUserIdRaw == null ? null : pickId(paidFromUserIdRaw),
    paidToUserId: paidToUserIdRaw == null ? null : pickId(paidToUserIdRaw),
    paidFromUserName: pickStr(raw.paidFromUserName ?? raw.PaidFromUserName) || null,
    paidToUserName: pickStr(raw.paidToUserName ?? raw.PaidToUserName) || null,
    amount: pickNum(raw.amount ?? raw.Amount),
    paymentDate: pickStr(raw.paymentDate ?? raw.PaymentDate),
    createdDate: pickStr(raw.createdDate ?? raw.CreatedDate),
    transactionType: pickStr(raw.transactionType ?? raw.TransactionType) || "—",
    comments: pickStr(raw.comments ?? raw.Comments) || null,
    direction: pickStr(raw.direction ?? raw.Direction) || "—",
  }
}

function normalizeUserLedgerDashboardReport(data: unknown): UserLedgerDashboardReport {
  if (!data || typeof data !== "object") {
    return {
      userId: 0,
      userFullName: "",
      currentBalance: 0,
      summary: { totalCredits: 0, totalDebits: 0, transactionCount: 0 },
      transactions: [],
    }
  }

  const obj = data as Record<string, unknown>
  const summaryRaw = (obj.summary ?? obj.Summary) as Record<string, unknown> | undefined
  const txRaw = obj.transactions ?? obj.Transactions

  const transactions = Array.isArray(txRaw)
    ? txRaw
        .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
        .map(normalizeUserLedgerTransactionRow)
        .filter((r): r is UserLedgerTransactionRow => r !== null)
    : []

  return {
    userId: pickId(obj.userId ?? obj.UserId),
    userFullName: pickStr(obj.userFullName ?? obj.UserFullName) || "—",
    currentBalance: pickNum(obj.currentBalance ?? obj.CurrentBalance),
    summary: {
      totalCredits: pickNum(summaryRaw?.totalCredits ?? summaryRaw?.TotalCredits),
      totalDebits: pickNum(summaryRaw?.totalDebits ?? summaryRaw?.TotalDebits),
      transactionCount: pickNum(summaryRaw?.transactionCount ?? summaryRaw?.TransactionCount),
    },
    transactions,
  }
}

function staffReportMemberToMemberByPocRow(m: StaffReportMemberRow): MemberByPocReportRow {
  return {
    pocId: m.pocId,
    memberId: String(m.memberId),
    memberCode: m.memberCode,
    memberName: m.memberFullName,
    due: m.actualEmiAmount,
    actualEmi: m.actualEmiAmount,
    amountPaid: m.actualEmiAmount,
    scheduleDate: m.scheduleDate,
    statusRaw: null,
    loanSchedulerStatus: m.loanSchedulerStatus,
  }
}

function emptyMyCollectionSchedulesReport(userId: number, userFullName = "—"): MyCollectionSchedulesReport {
  return { userId, userFullName, pocs: [], members: [] }
}

function buildMyCollectionFromStaffNode(
  staffNode: StaffSchedulesStaffNode
): MyCollectionSchedulesReport {
  const members: MemberByPocReportRow[] = []
  const pocs: PocBranchReportRow[] = []

  for (const poc of staffNode.pocs) {
    const pocMembers = poc.members.map(staffReportMemberToMemberByPocRow)
    members.push(...pocMembers)

    pocs.push({
      pocId: poc.pocId,
      pocName: poc.pocFullName,
      centerName: "—",
      memberCount: new Set(poc.members.map((m) => m.memberId)).size,
      totalAmount: poc.members.reduce((sum, m) => sum + m.actualEmiAmount, 0),
      statusRaw: null,
    })
  }

  return {
    userId: staffNode.userId,
    userFullName: staffNode.userFullName,
    pocs,
    members,
  }
}

function normalizeMyCollectionSchedulesPocNode(
  raw: Record<string, unknown>
): { poc: PocBranchReportRow; members: MemberByPocReportRow[] } | null {
  const pocId = pickId(raw.pocId ?? raw.PocId)
  if (!pocId) return null

  const pocName = pickStr(
    raw.pocFullName ??
      raw.PocFullName ??
      raw.pocName ??
      raw.PocName ??
      raw.name ??
      raw.Name
  )
  const centerName = pickStr(raw.centerName ?? raw.CenterName ?? raw.center ?? raw.Center)

  const membersRaw = raw.members ?? raw.Members
  const members = Array.isArray(membersRaw)
    ? membersRaw
        .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
        .map((row) => {
          const staffMember = normalizeStaffReportMember(row)
          if (staffMember) return staffReportMemberToMemberByPocRow(staffMember)
          return normalizeMemberRow(row)
        })
        .filter((r): r is MemberByPocReportRow => r !== null)
    : []

  const memberCount = pickNum(raw.memberCount ?? raw.MemberCount) || members.length
  const totalAmount =
    pickNum(raw.totalAmount ?? raw.TotalAmount) ||
    members.reduce((sum, m) => sum + m.amountPaid, 0)

  return {
    poc: {
      pocId,
      pocName: pocName || "—",
      centerName: centerName || "—",
      memberCount,
      totalAmount,
      statusRaw: (raw.status ?? raw.Status ?? null) as string | boolean | null | undefined,
    },
    members: members.map((m) => ({ ...m, pocId })),
  }
}

function normalizeMyCollectionSchedulesReport(
  data: unknown,
  fallbackUserId: number
): MyCollectionSchedulesReport {
  if (!data || typeof data !== "object") {
    return emptyMyCollectionSchedulesReport(fallbackUserId)
  }

  const obj = data as Record<string, unknown>
  const userId = pickId(obj.userId ?? obj.UserId) || fallbackUserId
  const userFullName = pickStr(obj.userFullName ?? obj.UserFullName) || "—"

  const pocsRaw = obj.pocs ?? obj.Pocs
  if (Array.isArray(pocsRaw)) {
    const pocs: PocBranchReportRow[] = []
    const members: MemberByPocReportRow[] = []
    for (const raw of pocsRaw) {
      if (!raw || typeof raw !== "object") continue
      const parsed = normalizeMyCollectionSchedulesPocNode(raw as Record<string, unknown>)
      if (!parsed) continue
      pocs.push(parsed.poc)
      members.push(...parsed.members)
    }
    return { userId, userFullName, pocs, members }
  }

  const flatMembersRaw = obj.members ?? obj.Members
  if (Array.isArray(flatMembersRaw)) {
    const members = flatMembersRaw
      .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
      .map((row) => {
        const staffMember = normalizeStaffReportMember(row)
        if (staffMember) return staffReportMemberToMemberByPocRow(staffMember)
        return normalizeMemberRow(row)
      })
      .filter((r): r is MemberByPocReportRow => r !== null)

    const pocsFromApi = asObjectArray(obj.pocRows ?? obj.PocRows ?? obj.pocs ?? obj.Pocs)
    const pocs = pocsFromApi
      .map(normalizePocRow)
      .filter((r): r is PocBranchReportRow => r !== null)

    if (pocs.length > 0) {
      return { userId, userFullName, pocs, members }
    }

    const pocMap = new Map<number, PocBranchReportRow>()
    for (const member of members) {
      if (!pocMap.has(member.pocId)) {
        pocMap.set(member.pocId, {
          pocId: member.pocId,
          pocName: "—",
          centerName: "—",
          memberCount: 0,
          totalAmount: 0,
          statusRaw: null,
        })
      }
    }
    for (const [pocId, poc] of pocMap) {
      const pocMembers = members.filter((m) => m.pocId === pocId)
      poc.memberCount = new Set(pocMembers.map((m) => m.memberId)).size
      poc.totalAmount = pocMembers.reduce((sum, m) => sum + m.amountPaid, 0)
    }

    return { userId, userFullName, pocs: Array.from(pocMap.values()), members }
  }

  return emptyMyCollectionSchedulesReport(userId, userFullName)
}

function sessionUserDisplayName(): string {
  const session = getSession()
  if (!session) return "—"
  const name = [session.firstName, session.lastName].filter(Boolean).join(" ").trim()
  return name || session.email || "—"
}

async function fetchStaffSchedulesReport(
  branchId: number,
  scheduleDateKey?: string
): Promise<StaffSchedulesReport> {
  try {
    const { data } = await apiClient.get<unknown>(
      api.report.staffSchedulesReport(branchId, scheduleDateKey)
    )
    return normalizeStaffSchedulesReport(data)
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      return getStaffSchedulesReportFromLegacyEndpoints(branchId)
    }
    throw err
  }
}

async function getMyCollectionSchedulesFromStaffReport(
  branchId: number,
  userId: number,
  scheduleDateKey?: string
): Promise<MyCollectionSchedulesReport | null> {
  const staffReport = await fetchStaffSchedulesReport(branchId, scheduleDateKey)
  const staffNode = staffReport.staff.find((s) => s.userId === userId)
  if (!staffNode) return null
  return buildMyCollectionFromStaffNode(staffNode)
}

async function fetchMembersByPocs(
  branchId: number,
  pocIds: number[],
  scheduleDateKey?: string
): Promise<MemberByPocReportRow[]> {
  const { data } = await apiClient.post<unknown>(
    api.report.membersByPocs(branchId, scheduleDateKey),
    pocIds
  )
  return asObjectArray(data)
    .map(normalizeMemberRow)
    .filter((r): r is MemberByPocReportRow => r !== null)
}

async function getMyCollectionSchedulesFromPocMaster(
  branchId: number,
  userId: number,
  scheduleDateKey?: string
): Promise<MyCollectionSchedulesReport> {
  const { pocs: branchPocs } = await pocService.getByBranch(branchId)
  const assignedPocs = branchPocs.filter((p) => p.collectionBy === userId)
  if (assignedPocs.length === 0) {
    return emptyMyCollectionSchedulesReport(userId, sessionUserDisplayName())
  }

  const pocIds = assignedPocs.map((p) => p.id)
  const members = await fetchMembersByPocs(branchId, pocIds, scheduleDateKey)

  const pocs: PocBranchReportRow[] = assignedPocs.map((p) => {
    const pocMembers = members.filter((m) => m.pocId === p.id)
    return {
      pocId: p.id,
      pocName: p.name || "—",
      centerName: p.centerName || "—",
      memberCount: new Set(pocMembers.map((m) => m.memberId)).size,
      totalAmount: pocMembers.reduce((sum, m) => sum + m.amountPaid, 0),
      statusRaw: null,
    }
  })

  return {
    userId,
    userFullName: sessionUserDisplayName(),
    pocs,
    members,
  }
}

async function getMyCollectionSchedulesFallback(
  branchId: number,
  userId: number,
  scheduleDateKey?: string
): Promise<MyCollectionSchedulesReport> {
  if (!userId) {
    return emptyMyCollectionSchedulesReport(0)
  }

  try {
    const fromStaff = await getMyCollectionSchedulesFromStaffReport(branchId, userId, scheduleDateKey)
    if (fromStaff && (fromStaff.pocs.length > 0 || fromStaff.members.length > 0)) {
      return fromStaff
    }
  } catch {
    // Fall through to POC master filter.
  }

  return getMyCollectionSchedulesFromPocMaster(branchId, userId, scheduleDateKey)
}

export const reportService = {
  async getPocsByBranch(branchId: number): Promise<PocBranchReportRow[]> {
    const { data } = await apiClient.get<unknown>(api.report.pocsByBranch(branchId))
    return asObjectArray(data)
      .map(normalizePocRow)
      .filter((r): r is PocBranchReportRow => r !== null)
  },

  async getMembersByPoc(
    branchId: number,
    pocId: number,
    scheduleDateKey?: string
  ): Promise<MemberByPocReportRow[]> {
    const { data } = await apiClient.get<unknown>(
      api.report.membersByPoc(branchId, pocId, scheduleDateKey)
    )
    return asObjectArray(data)
      .map(normalizeMemberRow)
      .filter((r): r is MemberByPocReportRow => r !== null)
  },

  async getMembersByPocs(
    branchId: number,
    pocIds: number[],
    scheduleDateKey?: string
  ): Promise<MemberByPocReportRow[]> {
    return fetchMembersByPocs(branchId, pocIds, scheduleDateKey)
  },

  async getMyCollectionSchedules(
    branchId: number,
    scheduleDateKey?: string
  ): Promise<MyCollectionSchedulesReport> {
    const userId = getSession()?.userId ?? 0
    if (!userId) {
      return emptyMyCollectionSchedulesReport(0)
    }

    try {
      const { data } = await apiClient.get<unknown>(
        api.report.myCollectionSchedules(branchId, scheduleDateKey)
      )
      return normalizeMyCollectionSchedulesReport(data, userId)
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404 || status === 501) {
        return getMyCollectionSchedulesFallback(branchId, userId, scheduleDateKey)
      }
      throw err
    }
  },

  async getStaffSchedulesReport(
    branchId: number,
    scheduleDateKey?: string
  ): Promise<StaffSchedulesReport> {
    return fetchStaffSchedulesReport(branchId, scheduleDateKey)
  },

  async getUserLedgerDashboard(
    paymentDateKey?: string
  ): Promise<UserLedgerDashboardReport> {
    const { data } = await apiClient.get<unknown>(
      api.report.userLedgerDashboard(paymentDateKey)
    )
    return normalizeUserLedgerDashboardReport(data)
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
