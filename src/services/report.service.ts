import axios from "axios"
import { api } from "@/lib/api"
import type { MemberByPocReportRow, PocBranchReportRow } from "@/types/report"

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

/** Parse API date to ISO string, or null if missing/invalid. */
function pickScheduleDateIso(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString()
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

  const statusRaw = (raw.status ?? raw.Status ?? raw.paymentStatus ?? raw.PaymentStatus) as
    | string
    | boolean
    | null
    | undefined

  const scheduleDate = pickScheduleDateIso(raw.scheduleDate ?? raw.ScheduleDate)

  return {
    memberId,
    memberName: memberName || "—",
    amountPaid,
    scheduleDate,
    statusRaw,
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
    const { data } = await axios.get<unknown>(api.report.pocsByBranch(branchId))
    return asObjectArray(data)
      .map(normalizePocRow)
      .filter((r): r is PocBranchReportRow => r !== null)
  },

  async getMembersByPoc(branchId: number, pocId: number): Promise<MemberByPocReportRow[]> {
    const { data } = await axios.get<unknown>(api.report.membersByPoc(branchId, pocId))
    return asObjectArray(data)
      .map(normalizeMemberRow)
      .filter((r): r is MemberByPocReportRow => r !== null)
  },
}
