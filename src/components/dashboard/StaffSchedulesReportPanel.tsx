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
import { reportService } from "@/services/report.service"
import type {
  StaffSchedulePocSummaryRow,
  StaffScheduleReportRow,
  StaffScheduleSummaryRow,
} from "@/types/report"
import { SummaryMetricCard } from "@/components/dashboard/SummaryMetricCard"
import { SegmentedToggle } from "@/components/dashboard/SegmentedToggle"
import { useResponsiveTable } from "@/lib/responsive/useResponsiveTable"
import { renderHiddenColumnsDetailPanel } from "@/components/table/HiddenColumnsDetailPanel"

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

function getTodayAndTomorrowDateKeys() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return {
    todayKey: localDateKey(today),
    tomorrowKey: localDateKey(tomorrow),
  }
}

function scheduleDateKey(scheduleIsoOrKey: string | null): string | null {
  if (!scheduleIsoOrKey) return null
  const s = scheduleIsoOrKey.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return localDateKey(d)
}

function matchesScheduleDay(
  row: StaffScheduleReportRow,
  activeScheduleDateKey: string
): boolean {
  const key = scheduleDateKey(row.scheduleDate)
  if (!key) return true
  return key === activeScheduleDateKey
}

function emiDueDayLabel(scheduleIsoOrKey: string | null): "Today" | "Tomorrow" | null {
  const dueKey = scheduleDateKey(scheduleIsoOrKey)
  if (!dueKey) return null
  const { todayKey, tomorrowKey } = getTodayAndTomorrowDateKeys()
  if (dueKey === todayKey) return "Today"
  if (dueKey === tomorrowKey) return "Tomorrow"
  return null
}

function formatScheduleDateDisplay(scheduleIso: string | null): string {
  if (!scheduleIso) return "—"
  const key = scheduleDateKey(scheduleIso)
  if (!key) return "—"
  const d = new Date(`${key}T12:00:00`)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function sumEmi(rows: { actualEmiAmount: number }[]): number {
  return rows.reduce((sum, r) => {
    const n = r.actualEmiAmount
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)
}

function buildStaffSummaries(
  schedules: StaffScheduleReportRow[],
  activeScheduleDateKey: string
): StaffScheduleSummaryRow[] {
  const filtered = schedules.filter((r) => matchesScheduleDay(r, activeScheduleDateKey))
  const byUser = new Map<number, StaffScheduleReportRow[]>()
  for (const row of filtered) {
    const list = byUser.get(row.userId) ?? []
    list.push(row)
    byUser.set(row.userId, list)
  }

  return Array.from(byUser.entries())
    .map(([userId, lines]) => {
      const pocIds = new Set(lines.map((l) => l.pocId))
      return {
        userId,
        userFullName: lines[0]?.userFullName ?? "—",
        userRole: lines[0]?.userRole ?? "—",
        pocCount: pocIds.size,
        scheduleCount: lines.length,
        totalAmount: sumEmi(lines),
      }
    })
    .sort((a, b) =>
      a.userFullName.localeCompare(b.userFullName, undefined, { sensitivity: "base" })
    )
}

function buildPocSummariesForStaff(
  schedules: StaffScheduleReportRow[],
  userId: number,
  activeScheduleDateKey: string
): StaffSchedulePocSummaryRow[] {
  const lines = schedules.filter(
    (r) => r.userId === userId && matchesScheduleDay(r, activeScheduleDateKey)
  )
  const byPoc = new Map<number, StaffScheduleReportRow[]>()
  for (const row of lines) {
    const list = byPoc.get(row.pocId) ?? []
    list.push(row)
    byPoc.set(row.pocId, list)
  }

  return Array.from(byPoc.entries())
    .map(([pocId, pocLines]) => {
      const memberIds = new Set(pocLines.map((l) => l.memberId))
      return {
        pocId,
        pocFullName: pocLines[0]?.pocFullName ?? "—",
        centerId: pocLines[0]?.centerId ?? 0,
        memberCount: memberIds.size,
        totalAmount: sumEmi(pocLines),
        scheduleLines: pocLines,
      }
    })
    .sort((a, b) =>
      a.pocFullName.localeCompare(b.pocFullName, undefined, { sensitivity: "base" })
    )
}

const DETAIL_PANEL_SX = { sx: { backgroundColor: "transparent" } } as const

const scheduleLineColumns: MRT_ColumnDef<StaffScheduleReportRow>[] = [
  {
    accessorKey: "memberId",
    header: "Member ID",
    Cell: ({ cell }) => <span className="tabular-nums">{cell.getValue<number>()}</span>,
  },
  { accessorKey: "memberFullName", header: "Member Name" },
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
    accessorKey: "actualEmiAmount",
    header: "Actual EMI",
    Cell: ({ cell }) => formatInr(Number(cell.getValue() ?? 0)),
  },
]

const StaffPocMemberDetailPanel = memo(function StaffPocMemberDetailPanel({
  lines,
}: {
  lines: StaffScheduleReportRow[]
}) {
  const memberTableResponsive = useResponsiveTable("staffScheduleMemberLines")

  const table = useMaterialReactTable({
    columns: scheduleLineColumns,
    data: lines,
    getRowId: (r, index) => `${r.loanSchedulerId}-${r.memberId}-${index}`,
    state: { columnVisibility: memberTableResponsive.columnVisibility },
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableTopToolbar: true,
    enableFullScreenToggle: false,
    enableKeyboardShortcuts: false,
    enableExpanding: memberTableResponsive.enableExpanding,
    renderDetailPanel: memberTableResponsive.enableExpanding
      ? renderHiddenColumnsDetailPanel(scheduleLineColumns, memberTableResponsive.hiddenColumnIds)
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
      <MaterialReactTable table={table} />
    </div>
  )
})

const pocColumns: MRT_ColumnDef<StaffSchedulePocSummaryRow>[] = [
  { accessorKey: "pocFullName", header: "POC Name" },
  {
    accessorKey: "memberCount",
    header: "Members",
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
]

const StaffPocDetailPanel = memo(function StaffPocDetailPanel({
  pocRows,
}: {
  pocRows: StaffSchedulePocSummaryRow[]
}) {
  const pocTableResponsive = useResponsiveTable("staffSchedulePoc")

  const renderPocDetail = useCallback(
    ({ row }: { row: MRT_Row<StaffSchedulePocSummaryRow> }) => (
      <StaffPocMemberDetailPanel lines={row.original.scheduleLines} />
    ),
    []
  )

  const getPocBodyRowProps = useCallback(
    ({
      row,
      table,
      isDetailPanel,
    }: {
      row: MRT_Row<StaffSchedulePocSummaryRow>
      table: MRT_TableInstance<StaffSchedulePocSummaryRow>
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
    muiDetailPanelProps: DETAIL_PANEL_SX,
    muiTableContainerProps: { sx: { overflowX: "auto" } },
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
    muiSearchTextFieldProps: { placeholder: "Search POCs…" },
  })

  return (
    <div
      className="border-t border-border bg-muted/30 px-2 py-4 sm:px-4"
      onClick={(e) => e.stopPropagation()}
    >
      <MaterialReactTable table={pocTable} />
    </div>
  )
})

type StaffSchedulesReportPanelProps = {
  branchId: number
}

export function StaffSchedulesReportPanel({ branchId }: StaffSchedulesReportPanelProps) {
  const { todayKey, tomorrowKey } = useMemo(() => getTodayAndTomorrowDateKeys(), [])
  const [scheduleWindow, setScheduleWindow] = useState<"today" | "tomorrow">("today")
  const activeScheduleDateKey = scheduleWindow === "today" ? todayKey : tomorrowKey

  const {
    data: schedulesRaw,
    isLoading: schedulesLoading,
    isError: schedulesError,
    error: schedulesErr,
    refetch: refetchSchedules,
  } = useQuery({
    queryKey: ["reportStaffSchedules", branchId],
    queryFn: () => reportService.getStaffSchedulesByBranch(branchId),
    enabled: branchId > 0,
  })

  const {
    data: staffListRaw,
    isLoading: staffListLoading,
    isError: staffListError,
    error: staffListErr,
  } = useQuery({
    queryKey: ["reportPocCollectionStaff", branchId],
    queryFn: () => reportService.getPocCollectionStaffByBranch(branchId),
    enabled: branchId > 0,
  })

  const schedules = useMemo(
    () => (Array.isArray(schedulesRaw) ? schedulesRaw : []),
    [schedulesRaw]
  )
  const staffList = useMemo(
    () => (Array.isArray(staffListRaw) ? staffListRaw : []),
    [staffListRaw]
  )

  const staffRows = useMemo(
    () => buildStaffSummaries(schedules, activeScheduleDateKey),
    [schedules, activeScheduleDateKey]
  )

  const registeredStaffCount = staffList.length > 0
    ? staffList.length
    : new Set(schedules.map((r) => r.userId)).size

  const totalSchedules = staffRows.reduce((s, r) => s + r.scheduleCount, 0)
  const totalAmount = staffRows.reduce((s, r) => s + r.totalAmount, 0)
  const totalStaff = staffRows.length
  const apiScheduleLineCount = schedules.length

  const isSchedulesLoading = schedulesLoading
  const schedulesFailed = schedulesError

  useEffect(() => {
    if (schedulesError && schedulesErr) {
      toast.error(getApiErrorMessage(schedulesErr, "Failed to load staff schedules"))
    }
  }, [schedulesError, schedulesErr])

  useEffect(() => {
    if (staffListError && staffListErr) {
      toast.error(
        getApiErrorMessage(staffListErr, "Failed to load collection staff list")
      )
    }
  }, [staffListError, staffListErr])

  const renderStaffDetail = useCallback(
    ({ row }: { row: MRT_Row<StaffScheduleSummaryRow> }) => {
      const pocRows = buildPocSummariesForStaff(
        schedules,
        row.original.userId,
        activeScheduleDateKey
      )
      return <StaffPocDetailPanel pocRows={pocRows} />
    },
    [schedules, activeScheduleDateKey]
  )

  const getStaffBodyRowProps = useCallback(
    ({
      row,
      table,
      isDetailPanel,
    }: {
      row: MRT_Row<StaffScheduleSummaryRow>
      table: MRT_TableInstance<StaffScheduleSummaryRow>
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

  const staffColumns = useMemo<MRT_ColumnDef<StaffScheduleSummaryRow>[]>(
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
      isLoading: isSchedulesLoading,
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
    muiDetailPanelProps: DETAIL_PANEL_SX,
    muiTableBodyCellProps: () => ({
      sx: {
        userSelect: "none",
        WebkitUserSelect: "none",
        caretColor: "transparent",
      },
    }),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
    muiSearchTextFieldProps: { placeholder: "Search staff…" },
  })

  return (
    <div className="space-y-6 [caret-color:transparent]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryMetricCard
          title="Collecting staff (branch)"
          value={String(registeredStaffCount)}
          icon={UserCheck}
          loading={isSchedulesLoading || staffListLoading}
        />
        <SummaryMetricCard
          title="Staff with schedules"
          value={String(totalStaff)}
          icon={Users}
          loading={isSchedulesLoading}
        />
        <SummaryMetricCard
          title="Total schedule amount"
          value={formatInr(totalAmount)}
          icon={IndianRupee}
          loading={isSchedulesLoading}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Staff schedules</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Expand a staff row to see POCs, then expand a POC to view member schedules (
              {totalSchedules} line{totalSchedules === 1 ? "" : "s"} on selected day).
            </p>
          </div>
          <SegmentedToggle
            value={scheduleWindow}
            onChange={setScheduleWindow}
            ariaLabel="Schedule date"
            className="self-start"
            options={[
              { value: "today", label: "Today" },
              { value: "tomorrow", label: "Tomorrow" },
            ]}
          />
        </div>

        {schedulesFailed ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-medium text-destructive">Could not load staff schedules.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {getApiErrorMessage(schedulesErr, "Schedules request failed.")}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => void refetchSchedules()}>
              Try again
            </Button>
          </div>
        ) : isSchedulesLoading ? (
          <div className="h-72 animate-pulse rounded-lg bg-muted" aria-hidden />
        ) : staffRows.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            {apiScheduleLineCount > 0
              ? "No schedules match the selected date. Try Today or Tomorrow."
              : "No schedules for this branch in the next two days."}
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
