import { useMemo } from "react"
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table"
import { formatDisplayDate } from "@/lib/date-time"
import { formatMemberRef } from "@/lib/members/format-member-ref"
import { isPaidSchedulerStatus } from "@/lib/dashboard/report-status-totals"
import { useResponsiveTable } from "@/lib/responsive/useResponsiveTable"
import { renderHiddenColumnsDetailPanel } from "@/components/table/HiddenColumnsDetailPanel"
import type { TableVisibilityKey } from "@/lib/responsive/tableVisibility"

export type DashboardScheduleLine = {
  id: string
  memberId: string
  memberCode: string | null
  memberName: string
  pocName: string
  centerName: string
  staffName?: string
  scheduleDate: string | null
  paymentDate: string | null
  emiAmount: number
  paidAmount: number
  loanSchedulerStatus: string
}

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

function buildColumns(includeStaff: boolean): MRT_ColumnDef<DashboardScheduleLine>[] {
  const cols: MRT_ColumnDef<DashboardScheduleLine>[] = [
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
  ]

  if (includeStaff) {
    cols.push({ accessorKey: "staffName", header: "Staff" })
  }

  cols.push(
    { accessorKey: "pocName", header: "POC" },
    { accessorKey: "centerName", header: "Center" },
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
    }
  )

  return cols
}

const TALL_TABLE_CONTAINER_PROPS = {
  sx: {
    maxHeight: "min(58vh, 640px)",
    overflowY: "auto" as const,
    overflowX: "auto" as const,
    overscrollBehavior: "contain" as const,
  },
}

function ScheduleLinesTable({
  rows,
  isLoading,
  emptyMessage,
  includeStaff,
  tableKey,
}: {
  rows: DashboardScheduleLine[]
  isLoading: boolean
  emptyMessage: string
  includeStaff: boolean
  tableKey: TableVisibilityKey
}) {
  const columns = useMemo(() => buildColumns(includeStaff), [includeStaff])
  const responsive = useResponsiveTable(tableKey)

  const table = useMaterialReactTable({
    columns,
    data: rows,
    getRowId: (r) => r.id,
    state: {
      isLoading,
      columnVisibility: responsive.columnVisibility,
    },
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
    muiTableContainerProps: TALL_TABLE_CONTAINER_PROPS,
    initialState: { pagination: { pageSize: 15, pageIndex: 0 } },
    muiSearchTextFieldProps: { placeholder: "Search schedules…" },
  })

  if (!isLoading && rows.length === 0) {
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
  const pendingTableKey: TableVisibilityKey = includeStaff
    ? "staffSchedulePendingLines"
    : "dashboardPendingSchedules"
  const paidTableKey: TableVisibilityKey = includeStaff
    ? "staffSchedulePaidLines"
    : "dashboardPaidSchedules"

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Pending schedules</h2>
          <span className="tabular-nums text-xs text-muted-foreground">{pending.length}</span>
        </div>
        <ScheduleLinesTable
          rows={pending}
          isLoading={isLoading}
          emptyMessage="No pending schedules for the selected date."
          includeStaff={includeStaff}
          tableKey={pendingTableKey}
        />
      </section>
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Paid schedules</h2>
          <span className="tabular-nums text-xs text-muted-foreground">{paid.length}</span>
        </div>
        <ScheduleLinesTable
          rows={paid}
          isLoading={isLoading}
          emptyMessage="No paid schedules for the selected date."
          includeStaff={includeStaff}
          tableKey={paidTableKey}
        />
      </section>
    </div>
  )
}
