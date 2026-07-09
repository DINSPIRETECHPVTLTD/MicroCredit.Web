import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react"
import { useQuery } from "@tanstack/react-query"
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableInstance,
} from "material-react-table"
import toast from "react-hot-toast"
import { IndianRupee, UserCheck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatDisplayDate } from "@/lib/date-time"
import { reportService } from "@/services/report.service"
import type {
  MemberByPocReportRow,
  StaffReportMemberRow,
  StaffSchedulesPocTableRow,
  StaffSchedulesReport,
  StaffSchedulesStaffTableRow,
} from "@/types/report"
import { SummaryMetricCard } from "@/components/dashboard/SummaryMetricCard"
import { useResponsiveTable } from "@/lib/responsive/useResponsiveTable"
import { renderHiddenColumnsDetailPanel } from "@/components/table/HiddenColumnsDetailPanel"
import { formatMemberRef } from "@/lib/members/format-member-ref"

const BRANCH_SCHEDULE_WINDOW_DAYS = 7
const MUI_DETAIL_PANEL_SX = { sx: { backgroundColor: "transparent" } } as const

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

function addDaysToDateKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + days)
  return localDateKey(d)
}

function getScheduleWindowBounds() {
  const today = new Date()
  const todayKey = localDateKey(today)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = localDateKey(tomorrow)
  const maxKey = addDaysToDateKey(todayKey, BRANCH_SCHEDULE_WINDOW_DAYS - 1)
  return { todayKey, tomorrowKey, minKey: todayKey, maxKey }
}

function clampScheduleDateKey(
  key: string,
  bounds: ReturnType<typeof getScheduleWindowBounds>
): string {
  if (key < bounds.minKey) return bounds.minKey
  if (key > bounds.maxKey) return bounds.maxKey
  return key
}

function scheduleDateKey(scheduleIsoOrKey: string | null): string | null {
  if (!scheduleIsoOrKey) return null
  const s = scheduleIsoOrKey.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return localDateKey(d)
}

function formatScheduleDateShort(key: string): string {
  return formatDisplayDate(key)
}

function emiDueDayLabel(scheduleIsoOrKey: string | null): string | null {
  const dueKey = scheduleDateKey(scheduleIsoOrKey)
  if (!dueKey) return null
  const { todayKey, tomorrowKey, minKey, maxKey } = getScheduleWindowBounds()
  if (dueKey === todayKey) return "Today"
  if (dueKey === tomorrowKey) return "Tomorrow"
  if (dueKey >= minKey && dueKey <= maxKey) return formatScheduleDateShort(dueKey)
  return null
}

function formatScheduleDateDisplay(scheduleIso: string | null): string {
  return formatDisplayDate(scheduleIso)
}

function toMemberDisplayRow(m: StaffReportMemberRow): MemberByPocReportRow {
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

function buildStaffTableRows(
  staffNodes: StaffSchedulesReport["staff"],
  activeScheduleDateKey: string
): StaffSchedulesStaffTableRow[] {
  const rows: StaffSchedulesStaffTableRow[] = []

  for (const staffNode of staffNodes) {
    const pocsForDay: StaffSchedulesPocTableRow[] = []
    let scheduleCount = 0
    let totalAmount = 0

    for (const poc of staffNode.pocs) {
      const membersForDay = poc.members.filter(
        (m) => scheduleDateKey(m.scheduleDate) === activeScheduleDateKey
      )
      if (membersForDay.length === 0) continue

      const pocTotal = membersForDay.reduce((sum, m) => sum + m.actualEmiAmount, 0)
      scheduleCount += membersForDay.length
      totalAmount += pocTotal

      pocsForDay.push({
        ...poc,
        membersForDay,
        resolvedMemberCount: new Set(membersForDay.map((m) => m.memberId)).size,
        resolvedTotalAmount: pocTotal,
      })
    }

    if (pocsForDay.length === 0) continue

    rows.push({
      userId: staffNode.userId,
      userFullName: staffNode.userFullName,
      userRole: staffNode.userRole,
      pocCount: pocsForDay.length,
      scheduleCount,
      totalAmount,
      pocsForDay,
    })
  }

  return rows.sort((a, b) =>
    a.userFullName.localeCompare(b.userFullName, undefined, { sensitivity: "base" })
  )
}

const memberReportColumns: MRT_ColumnDef<MemberByPocReportRow>[] = [
  {
    id: "memberRef",
    header: "Member Code/ID",
    accessorFn: (row) => formatMemberRef(row.memberId, row.memberCode),
    Cell: ({ row }) => (
      <span className="tabular-nums font-mono text-xs">
        {formatMemberRef(row.original.memberId, row.original.memberCode)}
      </span>
    ),
  },
  { accessorKey: "memberName", header: "Member Name" },
  {
    id: "dueDay",
    header: "Due",
    accessorFn: (row) => emiDueDayLabel(row.scheduleDate) ?? "",
    Cell: ({ row }) => {
      const label = emiDueDayLabel(row.original.scheduleDate)
      if (label === "Today") {
        return (
          <span className="inline-flex rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            Today
          </span>
        )
      }
      if (label === "Tomorrow") {
        return (
          <span className="inline-flex rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
            Tomorrow
          </span>
        )
      }
      if (label) {
        return (
          <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {label}
          </span>
        )
      }
      return <span className="text-muted-foreground">—</span>
    },
  },
  {
    accessorKey: "scheduleDate",
    header: "Schedule date",
    Cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {formatScheduleDateDisplay(row.original.scheduleDate)}
      </span>
    ),
  },
  {
    accessorKey: "amountPaid",
    header: "Actual EMI",
    Cell: ({ cell }) => formatInr(Number(cell.getValue() ?? 0)),
  },
  {
    accessorKey: "loanSchedulerStatus",
    header: "Status",
    Cell: ({ cell }) => {
      const status = String(cell.getValue() ?? "")
      const colorMap: Record<string, string> = {
        "Not Paid": "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200",
        NotPaid: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200",
        Partial: "bg-blue-500/15 text-blue-800 dark:text-blue-200",
        Overdue: "bg-red-500/15 text-red-800 dark:text-red-200",
        Claimed: "bg-purple-500/15 text-purple-800 dark:text-purple-200",
      }
      const cls = colorMap[status] ?? "bg-muted text-muted-foreground"
      return (
        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
          {status || "—"}
        </span>
      )
    },
  },
]

const StaffPocMemberDetailPanel = memo(function StaffPocMemberDetailPanel({
  members,
}: {
  members: StaffReportMemberRow[]
}) {
  const memberTableResponsive = useResponsiveTable("staffScheduleMemberLines")
  const displayRows = useMemo(() => members.map(toMemberDisplayRow), [members])

  const table = useMaterialReactTable({
    columns: memberReportColumns,
    data: displayRows,
    getRowId: (r) => `${r.memberId}-${r.scheduleDate ?? ""}`,
    state: { columnVisibility: memberTableResponsive.columnVisibility },
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableTopToolbar: true,
    enableFullScreenToggle: false,
    enableExpanding: memberTableResponsive.enableExpanding,
    renderDetailPanel: memberTableResponsive.enableExpanding
      ? renderHiddenColumnsDetailPanel(memberReportColumns, memberTableResponsive.hiddenColumnIds)
      : undefined,
    muiTableContainerProps: { sx: { overflowX: "auto" } },
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
    muiSearchTextFieldProps: { placeholder: "Search members…" },
  })

  return (
    <div
      className="border-t border-border bg-muted/20 px-2 py-3 sm:px-4"
      onClick={(e) => e.stopPropagation()}
    >
      {members.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No members for the selected date.
        </p>
      ) : (
        <MaterialReactTable table={table} />
      )}
    </div>
  )
})

const pocColumns: MRT_ColumnDef<StaffSchedulesPocTableRow>[] = [
  { accessorKey: "pocFullName", header: "POC Name" },
  {
    accessorKey: "resolvedMemberCount",
    header: "Members",
    muiTableHeadCellProps: { sx: { textAlign: "right" } },
    muiTableBodyCellProps: { sx: { textAlign: "right" } },
  },
  {
    id: "scheduleCount",
    header: "Schedules",
    accessorFn: (row) => row.membersForDay.length,
    muiTableHeadCellProps: { sx: { textAlign: "right" } },
    muiTableBodyCellProps: { sx: { textAlign: "right" } },
  },
  {
    accessorKey: "resolvedTotalAmount",
    header: "Total Amount",
    muiTableHeadCellProps: { sx: { textAlign: "right" } },
    muiTableBodyCellProps: { sx: { textAlign: "right" } },
    Cell: ({ cell }) => formatInr(cell.getValue<number>()),
  },
]

const StaffPocDetailPanel = memo(function StaffPocDetailPanel({
  pocRows,
}: {
  pocRows: StaffSchedulesPocTableRow[]
}) {
  const pocTableResponsive = useResponsiveTable("staffSchedulePoc")

  const renderPocDetail = useCallback(
    ({ row }: { row: MRT_Row<StaffSchedulesPocTableRow> }) => (
      <StaffPocMemberDetailPanel members={row.original.membersForDay} />
    ),
    []
  )

  const getPocBodyRowProps = useCallback(
    ({
      row,
      table,
      isDetailPanel,
    }: {
      row: MRT_Row<StaffSchedulesPocTableRow>
      table: MRT_TableInstance<StaffSchedulesPocTableRow>
      isDetailPanel?: boolean
    }) => {
      if (isDetailPanel) return {}
      return {
        onClick: (e: MouseEvent<HTMLTableRowElement>) => {
          if ((e.target as HTMLElement).closest("button")) return
          const open = !row.getIsExpanded()
          table.setExpanded(open ? { [row.id]: true } : {})
        },
        sx: { cursor: "pointer" },
      }
    },
    []
  )

  const pocTable = useMaterialReactTable({
    columns: pocColumns,
    data: pocRows,
    getRowId: (r) => String(r.pocId),
    state: { columnVisibility: pocTableResponsive.columnVisibility },
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    enableExpandAll: false,
    enableKeyboardShortcuts: false,
    renderDetailPanel: renderPocDetail,
    muiTableBodyRowProps: getPocBodyRowProps,
    muiDetailPanelProps: MUI_DETAIL_PANEL_SX,
    muiTableContainerProps: { sx: { overflowX: "auto" } },
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
    muiSearchTextFieldProps: { placeholder: "Search POCs…" },
  })

  return (
    <div
      className="border-t border-border bg-muted/30 px-2 py-4 sm:px-4"
      onClick={(e) => e.stopPropagation()}
    >
      {pocRows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No POCs for this staff.</p>
      ) : (
        <MaterialReactTable table={pocTable} />
      )}
    </div>
  )
})

type StaffSchedulesReportPanelProps = {
  branchId: number
}

export function StaffSchedulesReportPanel({ branchId }: StaffSchedulesReportPanelProps) {
  const bounds = useMemo(() => getScheduleWindowBounds(), [])
  const [selectedDateKey, setSelectedDateKey] = useState(bounds.todayKey)
  const activeScheduleDateKey = selectedDateKey

  const {
    data: reportRaw,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reportStaffSchedules", branchId],
    queryFn: () => reportService.getStaffSchedulesReport(branchId),
    enabled: branchId > 0,
    staleTime: 0,
    refetchOnMount: "always",
  })

  const staffNodes = reportRaw?.staff ?? []

  const staffRows = useMemo(
    () => buildStaffTableRows(staffNodes, activeScheduleDateKey),
    [staffNodes, activeScheduleDateKey]
  )

  const totalCollectingStaff = staffNodes.length
  const totalStaffWithSchedules = staffRows.length
  const totalSchedules = staffRows.reduce((s, r) => s + r.scheduleCount, 0)
  const totalAmount = staffRows.reduce((s, r) => s + r.totalAmount, 0)
  const hasWindowData = staffNodes.some((s) =>
    s.pocs.some((p) => p.members.length > 0)
  )

  useEffect(() => {
    if (isError && error) {
      toast.error(getApiErrorMessage(error, "Failed to load staff schedules report"))
    }
  }, [isError, error])

  const renderStaffDetail = useCallback(
    ({ row }: { row: MRT_Row<StaffSchedulesStaffTableRow> }) => (
      <StaffPocDetailPanel pocRows={row.original.pocsForDay} />
    ),
    []
  )

  const getStaffBodyRowProps = useCallback(
    ({
      row,
      table,
      isDetailPanel,
    }: {
      row: MRT_Row<StaffSchedulesStaffTableRow>
      table: MRT_TableInstance<StaffSchedulesStaffTableRow>
      isDetailPanel?: boolean
    }) => {
      if (isDetailPanel) return {}
      return {
        onClick: (e: MouseEvent<HTMLTableRowElement>) => {
          if ((e.target as HTMLElement).closest("button")) return
          const open = !row.getIsExpanded()
          table.setExpanded(open ? { [row.id]: true } : {})
        },
        sx: {
          cursor: "pointer",
          userSelect: "none",
          caretColor: "transparent",
          "&:nth-of-type(even)": { backgroundColor: "action.hover" },
          "&:hover": { backgroundColor: "action.selected" },
        },
      }
    },
    []
  )

  const staffColumns = useMemo<MRT_ColumnDef<StaffSchedulesStaffTableRow>[]>(
    () => [
      { accessorKey: "userFullName", header: "Staff Name" },
      { accessorKey: "userRole", header: "Role" },
      {
        accessorKey: "pocCount",
        header: "POCs",
        muiTableHeadCellProps: { sx: { textAlign: "right" } },
        muiTableBodyCellProps: { sx: { textAlign: "right" } },
      },
      {
        accessorKey: "scheduleCount",
        header: "Schedules",
        muiTableHeadCellProps: { sx: { textAlign: "right" } },
        muiTableBodyCellProps: { sx: { textAlign: "right" } },
      },
      {
        accessorKey: "totalAmount",
        header: "Total Amount",
        muiTableHeadCellProps: { sx: { textAlign: "right" } },
        muiTableBodyCellProps: { sx: { textAlign: "right" } },
        Cell: ({ cell }) => formatInr(cell.getValue<number>()),
      },
    ],
    []
  )

  const staffTableResponsive = useResponsiveTable("staffScheduleStaff")

  const staffTable = useMaterialReactTable({
    columns: staffColumns,
    data: staffRows,
    getRowId: (r) => String(r.userId),
    state: {
      isLoading,
      columnVisibility: staffTableResponsive.columnVisibility,
    },
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableStickyHeader: true,
    enableKeyboardShortcuts: false,
    enableExpandAll: false,
    renderDetailPanel: renderStaffDetail,
    muiTableContainerProps: { sx: { overflowX: "auto" } },
    muiTableBodyRowProps: getStaffBodyRowProps,
    muiDetailPanelProps: MUI_DETAIL_PANEL_SX,
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
    muiSearchTextFieldProps: { placeholder: "Search staff…" },
  })

  return (
    <div className="space-y-6 [caret-color:transparent]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryMetricCard
          title="Collecting staff (branch)"
          value={String(totalCollectingStaff)}
          icon={UserCheck}
          loading={isLoading}
        />
        <SummaryMetricCard
          title="Staff with schedules"
          value={String(totalStaffWithSchedules)}
          icon={Users}
          loading={isLoading}
        />
        <SummaryMetricCard
          title="Total schedule amount"
          value={formatInr(totalAmount)}
          icon={IndianRupee}
          loading={isLoading}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Staff schedules</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a date within the next {BRANCH_SCHEDULE_WINDOW_DAYS} days. Expand a staff row to
              see POCs ({totalSchedules} line{totalSchedules === 1 ? "" : "s"} on selected day).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <div
              className="inline-flex rounded-lg border border-border bg-muted p-1"
              role="group"
              aria-label="Schedule date"
            >
              <button
                type="button"
                onClick={() => setSelectedDateKey(bounds.todayKey)}
                aria-pressed={selectedDateKey === bounds.todayKey}
                className={cn(
                  "min-w-24 rounded-md px-3 py-1.5 text-center text-xs font-semibold transition-colors",
                  selectedDateKey === bounds.todayKey
                    ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                )}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateKey(bounds.tomorrowKey)}
                aria-pressed={selectedDateKey === bounds.tomorrowKey}
                className={cn(
                  "min-w-24 rounded-md px-3 py-1.5 text-center text-xs font-semibold transition-colors",
                  selectedDateKey === bounds.tomorrowKey
                    ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                )}
              >
                Tomorrow
              </button>
            </div>
            <label className="inline-flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Date</span>
              <input
                type="date"
                min={bounds.minKey}
                max={bounds.maxKey}
                value={selectedDateKey}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDateKey(clampScheduleDateKey(e.target.value, bounds))
                  }
                }}
                className={cn(
                  "rounded-md border border-input bg-background px-2 py-1.5 text-xs font-medium text-foreground shadow-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
                aria-label="Pick schedule date within the next seven days"
              />
            </label>
          </div>
        </div>

        {isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-medium text-destructive">Could not load staff schedules.</p>
            <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="h-72 animate-pulse rounded-lg bg-muted" aria-hidden />
        ) : staffRows.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            {hasWindowData
              ? "No schedules match the selected date. Try Tomorrow or another day in the next seven days."
              : totalCollectingStaff > 0
                ? "Collecting staff found, but none have schedules in the next seven days."
                : `No schedules for this branch in the next ${BRANCH_SCHEDULE_WINDOW_DAYS} days.`}
          </div>
        ) : (
          <div className="[caret-color:transparent]">
            <MaterialReactTable table={staffTable} />
          </div>
        )}
      </div>
    </div>
  )
}
