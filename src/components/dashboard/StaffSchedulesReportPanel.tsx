import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableInstance,
} from "material-react-table"
import toast from "react-hot-toast"
import { IndianRupee, UserCheck, Users, AlertCircle, HandCoins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDisplayDate } from "@/lib/date-time"
import { sumEmiByStatusGroups } from "@/lib/dashboard/report-status-totals"
import { DateInput } from "@/components/date"
import { reportService } from "@/services/report.service"
import type {
  MemberByPocReportRow,
  StaffReportMemberRow,
  StaffSchedulesPocTableRow,
  StaffSchedulesReport,
  StaffSchedulesStaffTableRow,
} from "@/types/report"
import { SummaryMetricCard } from "@/components/dashboard/SummaryMetricCard"
import {
  STANDARD_TABLE_CONTAINER_PROPS,
  useResponsiveTable,
} from "@/lib/responsive/useResponsiveTable"
import { renderHiddenColumnsDetailPanel } from "@/components/table/HiddenColumnsDetailPanel"
import { formatMemberRef } from "@/lib/members/format-member-ref"

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

function todayDateKey(): string {
  return localDateKey(new Date())
}

function scheduleDateKey(scheduleIsoOrKey: string | null): string | null {
  if (!scheduleIsoOrKey) return null
  const s = scheduleIsoOrKey.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return localDateKey(d)
}

/** Label relative to local today / tomorrow, otherwise the display date. */
function emiDueDayLabel(scheduleIsoOrKey: string | null): string | null {
  const dueKey = scheduleDateKey(scheduleIsoOrKey)
  if (!dueKey) return null
  const todayKey = todayDateKey()
  if (dueKey === todayKey) return "Today"
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dueKey === localDateKey(tomorrow)) return "Tomorrow"
  return formatDisplayDate(dueKey)
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
    paymentDate: m.paymentDate,
    statusRaw: null,
    loanSchedulerStatus: m.loanSchedulerStatus,
  }
}

function buildStaffTableRows(
  staffNodes: StaffSchedulesReport["staff"],
  activeScheduleDateKey: string,
  isFetching = false
): StaffSchedulesStaffTableRow[] {
  const rows: StaffSchedulesStaffTableRow[] = []

  for (const staffNode of staffNodes) {
    const pocsForDay: StaffSchedulesPocTableRow[] = []
    let scheduleCount = 0
    let totalAmount = 0

    for (const poc of staffNode.pocs) {
      const membersForDay = isFetching
        ? poc.members
        : poc.members.filter(
            (m) =>
              scheduleDateKey(m.scheduleDate) === activeScheduleDateKey ||
              scheduleDateKey(m.paymentDate) === activeScheduleDateKey
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
    accessorKey: "paymentDate",
    header: "Payment date",
    Cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {formatScheduleDateDisplay(row.original.paymentDate)}
      </span>
    ),
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.paymentDate
      const b = rowB.original.paymentDate
      if (!a && !b) return 0
      if (!a) return 1
      if (!b) return -1
      return new Date(a).getTime() - new Date(b).getTime()
    },
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
        Paid: "bg-green-500/15 text-green-800 dark:text-green-200",
        "Not Paid": "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200",
        NotPaid: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200",
        "Partial Paid": "bg-blue-500/15 text-blue-800 dark:text-blue-200",
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
    getRowId: (r) => `${r.memberId}-${r.scheduleDate ?? ""}-${r.paymentDate ?? ""}`,
    state: { columnVisibility: memberTableResponsive.columnVisibility },
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableTopToolbar: true,
    enableFullScreenToggle: false,
    enableStickyHeader: true,
    enableExpanding: memberTableResponsive.enableExpanding,
    renderDetailPanel: memberTableResponsive.enableExpanding
      ? renderHiddenColumnsDetailPanel(memberReportColumns, memberTableResponsive.hiddenColumnIds)
      : undefined,
    muiTableContainerProps: STANDARD_TABLE_CONTAINER_PROPS,
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
  { accessorKey: "centerName", header: "Center Name" },
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
    enableStickyHeader: true,
    enableExpandAll: false,
    enableKeyboardShortcuts: false,
    renderDetailPanel: renderPocDetail,
    muiTableBodyRowProps: getPocBodyRowProps,
    muiDetailPanelProps: MUI_DETAIL_PANEL_SX,
    muiTableContainerProps: STANDARD_TABLE_CONTAINER_PROPS,
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
  const [selectedDateKey, setSelectedDateKey] = useState(todayDateKey)
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

  const staffRows = useMemo(
    () => buildStaffTableRows(staffNodes, activeScheduleDateKey, isFetching),
    [staffNodes, activeScheduleDateKey, isFetching]
  )

  const totalCollectingStaff = staffNodes.length
  const totalStaffWithSchedules = staffRows.length
  const totalSchedules = staffRows.reduce((s, r) => s + r.scheduleCount, 0)
  const totalAmount = staffRows.reduce((s, r) => s + r.totalAmount, 0)

  const statusTotals = useMemo(() => {
    const lines: Array<{ loanSchedulerStatus: string; amount: number }> = []
    for (const staff of staffRows) {
      for (const poc of staff.pocsForDay) {
        for (const member of poc.membersForDay) {
          lines.push({
            loanSchedulerStatus: member.loanSchedulerStatus,
            amount: member.actualEmiAmount,
          })
        }
      }
    }
    return sumEmiByStatusGroups(lines)
  }, [staffRows])

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
      showProgressBars: isFetching,
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
    muiTableContainerProps: STANDARD_TABLE_CONTAINER_PROPS,
    muiTableBodyRowProps: getStaffBodyRowProps,
    muiDetailPanelProps: MUI_DETAIL_PANEL_SX,
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
    muiSearchTextFieldProps: { placeholder: "Search staff…" },
  })

  return (
    <div className="space-y-6 [caret-color:transparent]">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
        <SummaryMetricCard
          title="Total Pending Amount"
          value={formatInr(statusTotals.outstandingTotal)}
          icon={AlertCircle}
          loading={isLoading}
        />
        <SummaryMetricCard
          title="Total Collected Amount"
          value={formatInr(statusTotals.collectedTotal)}
          icon={HandCoins}
          loading={isLoading}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Staff schedules</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a date, then expand a staff row to see POCs ({totalSchedules} line
              {totalSchedules === 1 ? "" : "s"} on selected day).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <label className="inline-flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Date</span>
              <DateInput
                value={selectedDateKey}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDateKey(e.target.value)
                  }
                }}
                className="w-auto px-2 py-1.5 text-xs font-medium shadow-sm"
                aria-label="Pick schedule date"
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
              ? "No schedules match the selected date. Try another date."
              : totalCollectingStaff > 0
                ? "Collecting staff found, but none have schedules for the selected date."
                : "No schedules for this branch."}
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
