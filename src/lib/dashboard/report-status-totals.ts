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
