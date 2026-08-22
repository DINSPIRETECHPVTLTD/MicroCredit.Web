import { memo, useCallback, useMemo, type MouseEvent } from "react"
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableInstance,
} from "material-react-table"
import { formatDisplayDate } from "@/lib/date-time"
import { formatMemberRef } from "@/lib/members/format-member-ref"
import { isPaidSchedulerStatus } from "@/lib/dashboard/report-status-totals"
import {
  STANDARD_TABLE_CONTAINER_PROPS,
  useResponsiveTable,
} from "@/lib/responsive/useResponsiveTable"
import { renderHiddenColumnsDetailPanel } from "@/components/table/HiddenColumnsDetailPanel"
import type { TableVisibilityKey } from "@/lib/responsive/tableVisibility"

export type DashboardScheduleLine = {
  id: string
  memberId: string
  memberCode: string | null
  memberName: string
  pocId?: number
  pocName: string
  centerName: string
  staffName?: string
  staffUserId?: number
  scheduleDate: string | null
  paymentDate: string | null
  emiAmount: number
  paidAmount: number
  loanSchedulerStatus: string
}

type PocCenterGroup = {
  id: string
  pocName: string
  centerName: string
  staffName?: string
  memberCount: number
  scheduleAmount: number
  paidAmount: number
  members: DashboardScheduleLine[]
}

const MUI_DETAIL_PANEL_SX = { sx: { backgroundColor: "transparent" } } as const

function formatInr(amount: number): string {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatScheduleDateDisplay(scheduleIso: string | null): string {
  return formatDisplayDate(scheduleIso)
}

function dateSort(a: string | null, b: string | null): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return new Date(a).getTime() - new Date(b).getTime()
}

function StatusBadge({ status }: { status: string }) {
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
}

function resolvedPaidAmount(row: DashboardScheduleLine): number {
  if (isPaidSchedulerStatus(row.loanSchedulerStatus) && row.paidAmount <= 0) {
    return row.emiAmount
  }
  return row.paidAmount
}

export function splitPendingAndPaid(
  rows: DashboardScheduleLine[]
): { pending: DashboardScheduleLine[]; paid: DashboardScheduleLine[] } {
  const pending: DashboardScheduleLine[] = []
  const paid: DashboardScheduleLine[] = []
  for (const row of rows) {
    if (isPaidSchedulerStatus(row.loanSchedulerStatus)) paid.push(row)
    else pending.push(row)
  }
  return { pending, paid }
}

function groupByPocCenter(
  rows: DashboardScheduleLine[],
  includeStaff: boolean
): PocCenterGroup[] {
  const groups = new Map<string, PocCenterGroup>()

  for (const row of rows) {
    const id = includeStaff
      ? `${row.staffUserId ?? row.staffName ?? ""}-${row.pocId ?? row.pocName}-${row.centerName}`
      : `${row.pocId ?? row.pocName}-${row.centerName}`

    const existing = groups.get(id)
    if (existing) {
      existing.members.push(row)
      existing.memberCount += 1
      existing.scheduleAmount += row.emiAmount
      existing.paidAmount += resolvedPaidAmount(row)
      continue
    }

    groups.set(id, {
      id,
      pocName: row.pocName,
      centerName: row.centerName,
      staffName: row.staffName,
      memberCount: 1,
      scheduleAmount: row.emiAmount,
      paidAmount: resolvedPaidAmount(row),
      members: [row],
    })
  }

  return Array.from(groups.values()).sort((a, b) => {
    const poc = a.pocName.localeCompare(b.pocName, undefined, { sensitivity: "base" })
    if (poc !== 0) return poc
    return a.centerName.localeCompare(b.centerName, undefined, { sensitivity: "base" })
  })
}

function buildMemberColumns(): MRT_ColumnDef<DashboardScheduleLine>[] {
  return [
    {
      id: "memberRef",
      header: "Member",
      accessorFn: (row) => formatMemberRef(row.memberId, row.memberCode),
      Cell: ({ row }) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{row.original.memberName}</div>
          <div className="tabular-nums font-mono text-xs text-muted-foreground">
            {formatMemberRef(row.original.memberId, row.original.memberCode)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "scheduleDate",
      header: "Schedule date",
      Cell: ({ row }) => (
        <span className="tabular-nums">
          {formatScheduleDateDisplay(row.original.scheduleDate)}
        </span>
      ),
      sortingFn: (rowA, rowB) =>
        dateSort(rowA.original.scheduleDate, rowB.original.scheduleDate),
    },
    {
      accessorKey: "paymentDate",
      header: "Payment date",
      Cell: ({ row }) => (
        <span className="tabular-nums">
          {formatDisplayDate(row.original.paymentDate, { empty: "" })}
        </span>
      ),
      sortingFn: (rowA, rowB) =>
        dateSort(rowA.original.paymentDate, rowB.original.paymentDate),
    },
    {
      accessorKey: "emiAmount",
      header: "EMI amount",
      muiTableHeadCellProps: { sx: { textAlign: "right" } },
      muiTableBodyCellProps: { sx: { textAlign: "right" } },
      Cell: ({ cell }) => formatInr(Number(cell.getValue() ?? 0)),
    },
    {
      id: "paidAmount",
      header: "Paid amount",
      accessorFn: (row) => resolvedPaidAmount(row),
      muiTableHeadCellProps: { sx: { textAlign: "right" } },
      muiTableBodyCellProps: { sx: { textAlign: "right" } },
      Cell: ({ row }) => formatInr(resolvedPaidAmount(row.original)),
    },
    {
      accessorKey: "loanSchedulerStatus",
      header: "Status",
      Cell: ({ cell }) => <StatusBadge status={String(cell.getValue() ?? "")} />,
      filterFn: "equals",
    },
  ]
}

function buildPocColumns(includeStaff: boolean): MRT_ColumnDef<PocCenterGroup>[] {
  const cols: MRT_ColumnDef<PocCenterGroup>[] = [
    { accessorKey: "pocName", header: "POC" },
    { accessorKey: "centerName", header: "Center" },
  ]

  if (includeStaff) {
    cols.push({ accessorKey: "staffName", header: "Staff" })
  }

  cols.push(
    {
      accessorKey: "memberCount",
      header: "Members",
      muiTableHeadCellProps: { sx: { textAlign: "right" } },
      muiTableBodyCellProps: { sx: { textAlign: "right" } },
    },
    {
      accessorKey: "scheduleAmount",
      header: "Schedule amount",
      muiTableHeadCellProps: { sx: { textAlign: "right" } },
      muiTableBodyCellProps: { sx: { textAlign: "right" } },
      Cell: ({ cell }) => formatInr(Number(cell.getValue() ?? 0)),
    },
    {
      accessorKey: "paidAmount",
      header: "Paid amount",
      muiTableHeadCellProps: { sx: { textAlign: "right" } },
      muiTableBodyCellProps: { sx: { textAlign: "right" } },
      Cell: ({ cell }) => formatInr(Number(cell.getValue() ?? 0)),
    }
  )

  return cols
}

const NESTED_TABLE_CONTAINER_PROPS = {
  sx: {
    maxHeight: "min(42vh, 420px)",
    overflowY: "auto" as const,
    overflowX: "auto" as const,
    overscrollBehavior: "contain" as const,
  },
}

const MemberDetailTable = memo(function MemberDetailTable({
  members,
  tableKey,
}: {
  members: DashboardScheduleLine[]
  tableKey: TableVisibilityKey
}) {
  const columns = useMemo(() => buildMemberColumns(), [])
  const responsive = useResponsiveTable(tableKey)

  const table = useMaterialReactTable({
    columns,
    data: members,
    getRowId: (r) => r.id,
    state: { columnVisibility: responsive.columnVisibility },
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableTopToolbar: true,
    enableFullScreenToggle: false,
    enableStickyHeader: true,
    enableExpanding: responsive.enableExpanding,
    renderDetailPanel: responsive.enableExpanding
      ? renderHiddenColumnsDetailPanel(columns, responsive.hiddenColumnIds)
      : undefined,
    muiTableContainerProps: NESTED_TABLE_CONTAINER_PROPS,
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

function PocCenterTable({
  groups,
  isLoading,
  emptyMessage,
  includeStaff,
  pocTableKey,
  memberTableKey,
}: {
  groups: PocCenterGroup[]
  isLoading: boolean
  emptyMessage: string
  includeStaff: boolean
  pocTableKey: TableVisibilityKey
  memberTableKey: TableVisibilityKey
}) {
  const columns = useMemo(() => buildPocColumns(includeStaff), [includeStaff])
  const pocTableResponsive = useResponsiveTable(pocTableKey)

  const renderDetail = useCallback(
    ({ row }: { row: MRT_Row<PocCenterGroup> }) => (
      <MemberDetailTable members={row.original.members} tableKey={memberTableKey} />
    ),
    [memberTableKey]
  )

  const getBodyRowProps = useCallback(
    ({
      row,
      table,
      isDetailPanel,
    }: {
      row: MRT_Row<PocCenterGroup>
      table: MRT_TableInstance<PocCenterGroup>
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

  const table = useMaterialReactTable({
    columns,
    data: groups,
    getRowId: (r) => r.id,
    state: {
      isLoading,
      columnVisibility: pocTableResponsive.columnVisibility,
    },
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableStickyHeader: true,
    enableExpandAll: false,
    enableKeyboardShortcuts: false,
    renderDetailPanel: renderDetail,
    muiTableBodyRowProps: getBodyRowProps,
    muiDetailPanelProps: MUI_DETAIL_PANEL_SX,
    muiTableContainerProps: STANDARD_TABLE_CONTAINER_PROPS,
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
    muiSearchTextFieldProps: { placeholder: "Search POC / Center…" },
  })

  if (!isLoading && groups.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="[caret-color:transparent]">
      <MaterialReactTable table={table} />
    </div>
  )
}

export function PendingPaidScheduleGrids({
  rows,
  isLoading,
  includeStaff = false,
}: {
  rows: DashboardScheduleLine[]
  isLoading: boolean
  includeStaff?: boolean
}) {
  const { pending, paid } = useMemo(() => splitPendingAndPaid(rows), [rows])
  const pendingGroups = useMemo(
    () => groupByPocCenter(pending, includeStaff),
    [pending, includeStaff]
  )
  const paidGroups = useMemo(
    () => groupByPocCenter(paid, includeStaff),
    [paid, includeStaff]
  )

  const pocPendingKey: TableVisibilityKey = includeStaff
    ? "staffSchedulePendingPoc"
    : "dashboardPendingPoc"
  const pocPaidKey: TableVisibilityKey = includeStaff
    ? "staffSchedulePaidPoc"
    : "dashboardPaidPoc"
  const memberPendingKey: TableVisibilityKey = includeStaff
    ? "staffSchedulePendingLines"
    : "dashboardPendingSchedules"
  const memberPaidKey: TableVisibilityKey = includeStaff
    ? "staffSchedulePaidLines"
    : "dashboardPaidSchedules"

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Pending schedules</h2>
          <span className="tabular-nums text-xs text-muted-foreground">
            {pendingGroups.length} POC · {pending.length} members
          </span>
        </div>
        <PocCenterTable
          groups={pendingGroups}
          isLoading={isLoading}
          emptyMessage="No pending schedules for the selected date."
          includeStaff={includeStaff}
          pocTableKey={pocPendingKey}
          memberTableKey={memberPendingKey}
        />
      </section>
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Paid schedules</h2>
          <span className="tabular-nums text-xs text-muted-foreground">
            {paidGroups.length} POC · {paid.length} members
          </span>
        </div>
        <PocCenterTable
          groups={paidGroups}
          isLoading={isLoading}
          emptyMessage="No paid schedules for the selected date."
          includeStaff={includeStaff}
          pocTableKey={pocPaidKey}
          memberTableKey={memberPaidKey}
        />
      </section>
    </div>
  )
}
