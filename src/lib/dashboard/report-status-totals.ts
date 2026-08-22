/** Normalize loan scheduler status for dashboard report grouping. */
export function normalizeSchedulerStatus(status: string | null | undefined): string {
  const s = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
  if (s === "not paid" || s === "notpaid") return "not_paid"
  if (s === "paid") return "paid"
  if (s === "partial" || s === "partial paid") return "partial_paid"
  if (s === "overdue") return "overdue"
  if (s === "claimed") return "claimed"
  return s
}

export type DashboardStatusTotals = {
  /** Sum of EMI where status is Not Paid, Overdue, or Partial. */
  outstandingTotal: number
  /** Sum of paid amounts where status is Paid or Claimed. */
  collectedTotal: number
}

export function isPaidSchedulerStatus(status: string | null | undefined): boolean {
  const s = normalizeSchedulerStatus(status)
  return s === "paid" || s === "claimed"
}

function toDayKey(isoOrKey: string | null | undefined): string | null {
  if (!isoOrKey) return null
  const s = String(isoOrKey).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export type ScheduleAmountRow = {
  scheduleDate: string | null
  paymentDate: string | null
  emiAmount: number
  paidAmount: number
  loanSchedulerStatus: string
}

export function collectedAmountForRow(row: ScheduleAmountRow): number {
  const emi = typeof row.emiAmount === "number" && Number.isFinite(row.emiAmount) ? row.emiAmount : 0
  const paid = typeof row.paidAmount === "number" && Number.isFinite(row.paidAmount) ? row.paidAmount : 0
  if (isPaidSchedulerStatus(row.loanSchedulerStatus) && paid <= 0) return emi
  return Math.max(paid, 0)
}

export function pendingAmountForRow(row: ScheduleAmountRow): number {
  const emi = typeof row.emiAmount === "number" && Number.isFinite(row.emiAmount) ? row.emiAmount : 0
  if (isPaidSchedulerStatus(row.loanSchedulerStatus)) return 0
  return Math.max(emi - collectedAmountForRow(row), 0)
}

export type ScheduleAmountSummary = {
  scheduleTotal: number
  pendingTotal: number
  overdueTotal: number
  collectedTotal: number
  preCollected: number
  postCollected: number
  prePostTotal: number
}

/** Pre = paid before schedule date; Post = paid after schedule date. */
export function summarizeScheduleAmounts(rows: ScheduleAmountRow[]): ScheduleAmountSummary {
  let scheduleTotal = 0
  let pendingTotal = 0
  let overdueTotal = 0
  let collectedTotal = 0
  let preCollected = 0
  let postCollected = 0

  for (const row of rows) {
    const emi = typeof row.emiAmount === "number" && Number.isFinite(row.emiAmount) ? row.emiAmount : 0
    scheduleTotal += emi
    const pending = pendingAmountForRow(row)
    pendingTotal += pending
    if (normalizeSchedulerStatus(row.loanSchedulerStatus) === "overdue") {
      overdueTotal += pending
    }
    const collected = collectedAmountForRow(row)
    collectedTotal += collected

    if (collected <= 0) continue
    const scheduleKey = toDayKey(row.scheduleDate)
    const paymentKey = toDayKey(row.paymentDate)
    if (!scheduleKey || !paymentKey) continue
    if (paymentKey < scheduleKey) preCollected += collected
    else if (paymentKey > scheduleKey) postCollected += collected
  }

  return {
    scheduleTotal,
    pendingTotal,
    overdueTotal,
    collectedTotal,
    preCollected,
    postCollected,
    prePostTotal: preCollected + postCollected,
  }
}

export function sumEmiByStatusGroups(
  rows: Array<{ loanSchedulerStatus: string; amount: number }>
): DashboardStatusTotals {
  let outstandingTotal = 0
  let collectedTotal = 0

  for (const row of rows) {
    const amount = typeof row.amount === "number" && Number.isFinite(row.amount) ? row.amount : 0
    const status = normalizeSchedulerStatus(row.loanSchedulerStatus)

    if (status === "not_paid" || status === "overdue" || status === "partial_paid") {
      outstandingTotal += amount
    } else if (status === "paid" || status === "claimed") {
      collectedTotal += amount
    }
  }

  return { outstandingTotal, collectedTotal }
}
