import { useEffect, useMemo } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { AlertCircle, HandCoins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { reportService } from "@/services/report.service"
import type { StaffSchedulesReport } from "@/types/report"
import { SummaryMetricCard } from "@/components/dashboard/SummaryMetricCard"
import {
  PendingPaidScheduleGrids,
  splitPendingAndPaid,
  type DashboardScheduleLine,
} from "@/components/dashboard/PendingPaidScheduleGrids"

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "string" && data.trim()) return data.trim()
  if (data && typeof data === "object") {
    const obj = data as { message?: string; error?: string; title?: string }
    return obj.message ?? obj.error ?? obj.title ?? fallback
  }
  return fallback
}

function formatInr(amount: number): string {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function scheduleDateKey(scheduleIsoOrKey: string | null): string | null {
  if (!scheduleIsoOrKey) return null
  const s = scheduleIsoOrKey.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return localDateKey(d)
}

function flattenStaffScheduleLines(
  staffNodes: StaffSchedulesReport["staff"],
  activeScheduleDateKey: string,
  isFetching = false
): DashboardScheduleLine[] {
  const rows: DashboardScheduleLine[] = []

  for (const staffNode of staffNodes) {
    for (const poc of staffNode.pocs) {
      const membersForDay = isFetching
        ? poc.members
        : poc.members.filter(
            (m) =>
              scheduleDateKey(m.scheduleDate) === activeScheduleDateKey ||
              scheduleDateKey(m.paymentDate) === activeScheduleDateKey
          )

      for (const member of membersForDay) {
        rows.push({
          id: `${staffNode.userId}-${member.loanSchedulerId}-${member.scheduleDate ?? ""}`,
          memberId: String(member.memberId),
          memberCode: member.memberCode,
          memberName: member.memberFullName,
          pocName: poc.pocFullName,
          centerName: poc.centerName || "—",
          staffName: staffNode.userFullName,
          scheduleDate: member.scheduleDate,
          paymentDate: member.paymentDate,
          emiAmount: member.actualEmiAmount,
          paidAmount: member.paidAmount,
          loanSchedulerStatus: member.loanSchedulerStatus,
        })
      }
    }
  }

  return rows
}

type StaffSchedulesReportPanelProps = {
  branchId: number
  selectedDateKey: string
}

export function StaffSchedulesReportPanel({
  branchId,
  selectedDateKey,
}: StaffSchedulesReportPanelProps) {
  const activeScheduleDateKey = selectedDateKey

  const {
    data: reportRaw,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reportStaffSchedules", branchId, selectedDateKey],
    queryFn: () => reportService.getStaffSchedulesReport(branchId, selectedDateKey),
    enabled: branchId > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: "always",
  })

  const staffNodes = reportRaw?.staff ?? []
  const scheduleLines = useMemo(
    () => flattenStaffScheduleLines(staffNodes, activeScheduleDateKey, isFetching),
    [staffNodes, activeScheduleDateKey, isFetching]
  )
  const { pending, paid } = useMemo(() => splitPendingAndPaid(scheduleLines), [scheduleLines])
  const pendingEmi = pending.reduce((s, r) => s + r.emiAmount, 0)
  const paidCollected = paid.reduce(
    (s, r) => s + (r.paidAmount > 0 ? r.paidAmount : r.emiAmount),
    0
  )

  useEffect(() => {
    if (isError && error) {
      toast.error(getApiErrorMessage(error, "Failed to load staff schedules report"))
    }
  }, [isError, error])

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="font-medium text-destructive">Could not load staff schedules.</p>
        <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (isLoading && reportRaw === undefined) {
    return <div className="h-72 animate-pulse rounded-lg bg-muted" aria-hidden />
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SummaryMetricCard
          title="Pending"
          value={`${pending.length} · ${formatInr(pendingEmi)}`}
          icon={AlertCircle}
          loading={isLoading || isFetching}
          compact
        />
        <SummaryMetricCard
          title="Paid"
          value={`${paid.length} · ${formatInr(paidCollected)}`}
          icon={HandCoins}
          loading={isLoading || isFetching}
          compact
        />
      </div>
      <PendingPaidScheduleGrids
        rows={scheduleLines}
        isLoading={isLoading || isFetching}
        includeStaff
      />
    </div>
  )
}
