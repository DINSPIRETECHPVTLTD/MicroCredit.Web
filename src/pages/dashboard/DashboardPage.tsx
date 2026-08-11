import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react"
import { Link } from "react-router-dom"
import { useIsFetching, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableInstance,
} from "material-react-table"
import toast from "react-hot-toast"
import {
  RefreshCw,
  Users,
  IndianRupee,
  UserCheck,
  Wallet,
  TrendingUp,
  HandCoins,
  Landmark,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getBranch, getSession } from "@/services/auth.service"
import { getNormalizedSessionMeta } from "@/lib/authz"
import { reportService } from "@/services/report.service"
import { dashboardService } from "@/services/dashboard.service"
import type { MemberByPocReportRow, PocBranchReportRow } from "@/types/report"
import type { DashboardChartItem } from "@/types/dashboard"
import { SummaryMetricCard } from "@/components/dashboard/SummaryMetricCard"
import { HorizontalBarChart } from "@/components/dashboard/HorizontalBarChart"
import { SummaryDataTable } from "@/components/dashboard/SummaryDataTable"
import { SegmentedToggle, type SegmentedToggleOption } from "@/components/dashboard/SegmentedToggle"
import { StaffSchedulesReportPanel } from "@/components/dashboard/StaffSchedulesReportPanel"
import { UserLedgerDashboardPanel } from "@/components/dashboard/UserLedgerDashboardPanel"
import {
  STANDARD_TABLE_CONTAINER_PROPS,
  useResponsiveTable,
} from "@/lib/responsive/useResponsiveTable"
import { renderHiddenColumnsDetailPanel } from "@/components/table/HiddenColumnsDetailPanel"
import { formatMemberRef } from "@/lib/members/format-member-ref"
import { DateInput } from "@/components/date"
import {
  formatDashboardClock,
  formatDisplayDate,
  formatOrgModeDateHighlight,
} from "@/lib/date-time"
import { sumEmiByStatusGroups } from "@/lib/dashboard/report-status-totals"

/** POC row with counts/amounts derived from members-by-poc (POC API often omits memberCount/totalAmount). */
type PocTableRow = PocBranchReportRow & {
  resolvedMemberCount: number | null
  resolvedTotalAmount: number | null
}

function countDistinctMemberIds(rows: MemberByPocReportRow[]): number {
  return new Set(rows.map((m) => m.memberId)).size
}

function sumMemberEmi(members: MemberByPocReportRow[] | undefined): number {
  if (!members?.length) return 0
  return members.reduce((sum, m) => {
    const n = m.amountPaid
    return sum + (typeof n === "number" && Number.isFinite(n) ? n : 0)
  }, 0)
}

const EMPTY_POCS: PocBranchReportRow[] = []
const EMPTY_MEMBERS: MemberByPocReportRow[] = []

const POC_TABLE_INITIAL_STATE = {
  pagination: { pageSize: 10, pageIndex: 0 },
  showColumnFilters: false,
} as const

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

/** Calendar day in local timezone YYYY-MM-DD */
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

/** Isolated so the rest of the dashboard does not re-render every minute tick. */
function DashboardClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  return (
    <p className="mt-1 text-sm text-muted-foreground">{formatDashboardClock(now)}</p>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 [caret-color:transparent]">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

function OrgModeDateHighlight() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const dateTimePart = formatOrgModeDateHighlight(now)

  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
      <span className="text-sm font-semibold text-primary">{dateTimePart}</span>
    </div>
  )
}

/** Org mode: simple home — branch POC report is only shown in Branch mode after opening a branch. */
function OrgDashboardHome() {
  const [chartView, setChartView] = useState<"collections" | "capital">("collections")
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["dashboardSummary"],
    queryFn: dashboardService.getSummary,
  })

  const hasNoData = useMemo(() => {
    if (!data) return false
    const values = Object.values(data)
    return values.every((v) => typeof v === "number" && v === 0)
  }, [data])

  const netIncome = useMemo(() => {
    if (!data) return 0
    // Net Income = Received Interest + Joining Fee + Processing Fee - Expenses
    const income = data.receivedInterest + data.totalJoiningFee + data.totalProcessingFee
    const expenses = data.totalExpenseAmount
    return income - expenses
  }, [data])

  const cashInHand = useMemo(() => {
    if (!data) return 0
    return (
      data.totalOwnerAmount +
      data.totalInvestorAmount +
      data.receivedPrinciple +
      data.receivedInterest +
      data.totalJoiningFee +
      data.totalProcessingFee -
      data.totalExpenseAmount
    )
  }, [data])

  const chartItems = useMemo<DashboardChartItem[]>(() => {
    if (!data) return []
    if (chartView === "collections") {
      return [
        { label: "Received Principle", value: data.receivedPrinciple },
        { label: "Received Interest", value: data.receivedInterest },
        { label: "Joining Fee", value: data.totalJoiningFee },
        { label: "Processing Fee", value: data.totalProcessingFee },
        { label: "Expenses", value: data.totalExpenseAmount },
      ]
    }
    return [
      { label: "Owner Amount", value: data.totalOwnerAmount },
      { label: "Investor Amount", value: data.totalInvestorAmount },
      { label: "Insurance", value: data.totalInsuranceAmount },
      { label: "Claimed Amount", value: data.totalClaimedAmount },
      { label: "Outstanding Principle", value: data.outstandingPrinciple },
      { label: "Interest Accrued", value: data.interestAccured },
    ]
  }, [data, chartView])

  const errorMessage = useMemo(
    () => (error ? getApiErrorMessage(error, "Failed to load dashboard summary.") : ""),
    [error]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Org Dashboard</h1>
          <OrgModeDateHighlight />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden />
          Refresh
        </Button>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="font-medium text-destructive">{errorMessage}</p>
          <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetricCard
              title="Remittance (Owner)"
              value={formatInr(data?.totalOwnerAmount ?? 0)}
              icon={Landmark}
              loading={isLoading}
            />
            <SummaryMetricCard
              title="Credit (Investor)"
              value={formatInr(data?.totalInvestorAmount ?? 0)}
              icon={Wallet}
              loading={isLoading}
            />
            <SummaryMetricCard
              title="Insurance"
              value={formatInr(data?.totalInsuranceAmount ?? 0)}
              icon={IndianRupee}
              loading={isLoading}
            />
            <SummaryMetricCard
              title="Claimed Amount"
              value={formatInr(data?.totalClaimedAmount ?? 0)}
              icon={IndianRupee}
              loading={isLoading}
            />
            <SummaryMetricCard
              title="Net Income"
              value={formatInr(netIncome)}
              icon={TrendingUp}
              loading={isLoading}
            />
            <SummaryMetricCard
              title="Cash In Hand"
              value={formatInr(cashInHand)}
              icon={HandCoins}
              loading={isLoading}
            />
          </div>

          {hasNoData && !isLoading ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-muted-foreground">
              No summary data is available yet.
            </div>
          ) : (
            <>
              {data ? <SummaryDataTable data={data} /> : null}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Financial Breakdown</h3>
                  <SegmentedToggle
                    value={chartView}
                    onChange={setChartView}
                    ariaLabel="Financial breakdown view"
                    buttonClassName="min-w-0 py-1 font-medium"
                    options={[
                      { value: "collections", label: "Collections" },
                      { value: "capital", label: "Capital" },
                    ]}
                  />
                </div>
                <HorizontalBarChart
                  title="Distribution Chart"
                  items={chartItems}
                  emptyMessage="No chart data to display."
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
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
  {
    accessorKey: "memberName",
    header: "Member Name",
  },
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
    filterFn: "equals",
  },
  {
    accessorKey: "scheduleDate",
    header: "Schedule date",
    Cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {formatScheduleDateDisplay(row.original.scheduleDate)}
      </span>
    ),
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.scheduleDate
      const b = rowB.original.scheduleDate
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
    filterFn: "equals",
  },
]

const PocMemberDetailPanel = memo(function PocMemberDetailPanel({
  members,
  isLoading,
  isError,
  activeScheduleDateKey,
}: {
  members: MemberByPocReportRow[]
  isLoading: boolean
  isError: boolean
  activeScheduleDateKey: string
}) {
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const key = scheduleDateKey(m.scheduleDate)
      return key === activeScheduleDateKey
    })
  }, [members, activeScheduleDateKey])

  const memberTableResponsive = useResponsiveTable("dashboardMemberDetail")

  const memberTable = useMaterialReactTable({
    columns: memberReportColumns,
    data: filteredMembers,
    state: { isLoading, columnVisibility: memberTableResponsive.columnVisibility },
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
    muiTableBodyCellProps: () => ({
      sx: {
        userSelect: "none",
        WebkitUserSelect: "none",
        caretColor: "transparent",
      },
    }),
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
    },
    muiSearchTextFieldProps: {
      placeholder: "Search by name or ID…",
    },
  })

  return (
    <div
      className="border-t border-border bg-muted/30 px-2 py-4 sm:px-4"
      onClick={(e) => e.stopPropagation()}
    >
      {isError ? (
        <p className="text-sm text-destructive">Failed to load members.</p>
      ) : (
        <MaterialReactTable table={memberTable} />
      )}
    </div>
  )
})

function MyViewBranchReportSection({ branchId }: { branchId: number }) {
  const [selectedDateKey, setSelectedDateKey] = useState(todayDateKey)
  const activeScheduleDateKey = selectedDateKey
  const sessionUserId = getSession()?.userId ?? 0

  const {
    data: collectionReport,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reportMyCollectionSchedules", branchId, sessionUserId, selectedDateKey],
    queryFn: () => reportService.getMyCollectionSchedules(branchId, selectedDateKey),
    enabled: sessionUserId > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: "always",
  })

  const pocs = collectionReport?.pocs ?? EMPTY_POCS
  const members = collectionReport?.members ?? EMPTY_MEMBERS

  const filteredMembers = useMemo(() => {
    if (isFetching) return members
    return members.filter((m) => scheduleDateKey(m.scheduleDate) === activeScheduleDateKey)
  }, [members, activeScheduleDateKey, isFetching])

  const membersByPoc = useMemo(() => {
    const map = new Map<number, MemberByPocReportRow[]>()
    for (const row of filteredMembers) {
      const existing = map.get(row.pocId)
      if (existing) existing.push(row)
      else map.set(row.pocId, [row])
    }
    return map
  }, [filteredMembers])

  const totalMembersInBranch = countDistinctMemberIds(filteredMembers)
  const totalAmountInBranch = sumMemberEmi(filteredMembers)

  const statusTotals = useMemo(
    () =>
      sumEmiByStatusGroups(
        filteredMembers.map((m) => ({
          loanSchedulerStatus: m.loanSchedulerStatus,
          amount: m.amountPaid,
        }))
      ),
    [filteredMembers]
  )

  const pocTableRows: PocTableRow[] = useMemo(() => {
    return pocs.map((poc) => {
      if (isLoading && collectionReport === undefined) {
        return { ...poc, resolvedMemberCount: null, resolvedTotalAmount: null }
      }

      const pocMembers = membersByPoc.get(poc.pocId) ?? []
      return {
        ...poc,
        resolvedMemberCount: countDistinctMemberIds(pocMembers),
        resolvedTotalAmount: sumMemberEmi(pocMembers),
      }
    })
  }, [pocs, membersByPoc, isLoading, collectionReport])

  const visiblePocTableRows = useMemo(() => {
    if (isLoading && collectionReport === undefined) {
      return []
    }
    return pocTableRows.filter((row) => (row.resolvedMemberCount ?? 0) > 0)
  }, [pocTableRows, isLoading, collectionReport])

  const totalPocs = visiblePocTableRows.length

  useEffect(() => {
    if (isError && error) {
      toast.error(getApiErrorMessage(error, "Failed to load your collection schedules"))
    }
  }, [isError, error])

  const renderPocDetailPanel = useCallback(
    ({ row }: { row: MRT_Row<PocTableRow> }) => (
      <PocMemberDetailPanel
        members={membersByPoc.get(row.original.pocId) ?? EMPTY_MEMBERS}
        isLoading={isLoading || isFetching}
        isError={isError}
        activeScheduleDateKey={activeScheduleDateKey}
      />
    ),
    [membersByPoc, isError, isFetching, isLoading, activeScheduleDateKey]
  )

  const getPocTableBodyRowProps = useCallback(
    ({
      row,
      table,
      isDetailPanel,
    }: {
      row: MRT_Row<PocTableRow>
      table: MRT_TableInstance<PocTableRow>
      isDetailPanel?: boolean
    }) => {
      if (isDetailPanel) {
        return {}
      }
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
          "&:nth-of-type(even)": {
            backgroundColor: "action.hover",
          },
          "&:hover": {
            backgroundColor: "action.selected",
          },
        },
      }
    },
    []
  )

  const pocColumns = useMemo<MRT_ColumnDef<PocTableRow>[]>(
    () => [
      {
        accessorKey: "pocName",
        header: "POC Name",
      },
      {
        accessorKey: "centerName",
        header: "Center Name",
      },
      {
        accessorKey: "resolvedMemberCount",
        header: "Total Members",
        muiTableHeadCellProps: {
          sx: { textAlign: "right" },
        },
        muiTableBodyCellProps: {
          sx: { textAlign: "right" },
        },
        Cell: ({ cell }) => {
          const v = cell.getValue<number | null>()
          if (v === null) {
            return <span className="text-muted-foreground">…</span>
          }
          return <span className="tabular-nums">{v}</span>
        },
      },
      {
        accessorKey: "resolvedTotalAmount",
        header: "Total Amount",
        muiTableHeadCellProps: {
          sx: { textAlign: "right" },
        },
        muiTableBodyCellProps: {
          sx: { textAlign: "right" },
        },
        Cell: ({ cell }) => {
          const v = cell.getValue<number | null>()
          if (v === null) {
            return <span className="text-muted-foreground">…</span>
          }
          return formatInr(v)
        },
      },
    ],
    []
  )

  const pocTableResponsive = useResponsiveTable("dashboardPoc")

  const pocTable = useMaterialReactTable({
    columns: pocColumns,
    data: visiblePocTableRows,
    getRowId: (row) => String(row.pocId),
    state: {
      isLoading: isLoading && collectionReport === undefined,
      showProgressBars: isFetching,
      columnVisibility: pocTableResponsive.columnVisibility,
    },
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableStickyHeader: true,
    enableKeyboardShortcuts: false,
    enableExpandAll: false,
    muiTableContainerProps: STANDARD_TABLE_CONTAINER_PROPS,
    muiTableBodyCellProps: () => ({
      sx: {
        userSelect: "none",
        WebkitUserSelect: "none",
        caretColor: "transparent",
      },
    }),
    renderDetailPanel: renderPocDetailPanel,
    initialState: { ...POC_TABLE_INITIAL_STATE },
    muiTableBodyRowProps: getPocTableBodyRowProps,
    muiDetailPanelProps: MUI_DETAIL_PANEL_SX,
    muiSearchTextFieldProps: {
      placeholder: "Search POCs…",
    },
  })

  if (sessionUserId <= 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Could not determine the logged-in user. Sign in again to view your schedules.
      </div>
    )
  }

  if (isLoading && collectionReport === undefined) {
    return <DashboardSkeleton />
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="font-medium text-destructive">Could not load your collection schedules.</p>
        <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryMetricCard
          title="Total POCs"
          value={String(totalPocs)}
          icon={UserCheck}
          loading={isLoading || isFetching}
        />
        <SummaryMetricCard
          title="Total Members"
          value={String(totalMembersInBranch)}
          icon={Users}
          loading={isLoading || isFetching}
        />
        <SummaryMetricCard
          title="Total schedule amount"
          value={formatInr(totalAmountInBranch)}
          icon={IndianRupee}
          loading={isLoading || isFetching}
        />
        <SummaryMetricCard
          title="Total Pending Amount"
          value={formatInr(statusTotals.outstandingTotal)}
          icon={AlertCircle}
          loading={isLoading || isFetching}
        />
        <SummaryMetricCard
          title="Total Collected Amount"
          value={formatInr(statusTotals.collectedTotal)}
          icon={HandCoins}
          loading={isLoading || isFetching}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 [caret-color:transparent]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">My collection schedules</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              POCs assigned to you for collection
              {collectionReport?.userFullName ? ` (${collectionReport.userFullName})` : ""}.
              Pick a date, then expand a row to view member schedules.
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
        {visiblePocTableRows.length === 0 && !isLoading && collectionReport !== undefined ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No schedules are assigned to you for the selected date.
          </div>
        ) : (
          <div className="[caret-color:transparent]">
            <MaterialReactTable table={pocTable} />
          </div>
        )}
      </div>
    </>
  )
}

/** Static empty state — no hooks so parent can branch before mounting hookful content. */
function BranchDashboardNoBranch() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <p className="text-lg font-medium text-foreground">No branch is selected.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Open <strong>Branches</strong>, choose a branch, then return to Dashboard for My View.
      </p>
      <Button className="mt-4" asChild variant="outline">
        <Link to="/branches">Go to Branches</Link>
      </Button>
    </div>
  )
}

/**
 * Branch dashboard shell: reads branch id synchronously and mounts hookful content only
 * when branchId is defined (avoids optional branchId in hook dependency arrays).
 */
function BranchReportDashboard() {
  const branchId = getBranch()?.id
  if (branchId == null) {
    return <BranchDashboardNoBranch />
  }
  return <BranchReportDashboardContent branchId={branchId} />
}

/** Branch dashboard section — My Ledger sits beside Staff Schedules for Owner in branch mode. */
type BranchDashboardSection = "myView" | "staffSchedules" | "myLedger"

/**
 * All dashboard hooks live here with a guaranteed numeric branchId.
 */
function BranchReportDashboardContent({ branchId }: { branchId: number }) {
  const queryClient = useQueryClient()
  const { role } = getNormalizedSessionMeta(getSession())
  const isOwner = role === "Owner"
  const [dashboardSection, setDashboardSection] = useState<BranchDashboardSection>("myView")

  const myViewFetching =
    useIsFetching({ queryKey: ["reportMyCollectionSchedules", branchId] }) > 0
  const staffSchedulesFetching =
    useIsFetching({ queryKey: ["reportStaffSchedules", branchId] }) > 0
  const userLedgerFetching =
    useIsFetching({ queryKey: ["reportUserLedgerDashboard"] }) > 0
  const refreshSpinning =
    (dashboardSection === "myView" && myViewFetching) ||
    (dashboardSection === "staffSchedules" && staffSchedulesFetching) ||
    (dashboardSection === "myLedger" && userLedgerFetching)

  const handleRefreshAll = useCallback(() => {
    if (dashboardSection === "myLedger") {
      void queryClient.invalidateQueries({ queryKey: ["reportUserLedgerDashboard"] })
      return
    }
    if (dashboardSection === "staffSchedules") {
      void queryClient.invalidateQueries({ queryKey: ["reportStaffSchedules", branchId] })
      return
    }
    void queryClient.invalidateQueries({ queryKey: ["reportMyCollectionSchedules", branchId] })
  }, [queryClient, branchId, dashboardSection])

  const dashboardTitle = useMemo(() => {
    if (dashboardSection === "myLedger") return "My Ledger Dashboard"
    if (!isOwner) return "My View Dashboard"
    return "Dashboard"
  }, [dashboardSection, isOwner])

  const branchDashboardToggleOptions = useMemo((): SegmentedToggleOption<BranchDashboardSection>[] => {
    if (isOwner) {
      return [
        { value: "myView", label: "My View" },
        { value: "staffSchedules", label: "Staff Schedules" },
        { value: "myLedger", label: "My Ledger" },
      ]
    }
    return [
      { value: "myView", label: "Collection Schedules" },
      { value: "myLedger", label: "My Ledger" },
    ]
  }, [isOwner])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dashboardTitle}</h1>
          <DashboardClock />
          <SegmentedToggle
            value={dashboardSection}
            onChange={(section) => {
              if (!isOwner && section === "staffSchedules") return
              setDashboardSection(section)
            }}
            ariaLabel="Dashboard section"
            className="mt-3 max-w-full flex-wrap"
            buttonClassName="sm:min-w-28"
            options={branchDashboardToggleOptions}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRefreshAll}
          disabled={refreshSpinning}
        >
          <RefreshCw className={cn("h-4 w-4", refreshSpinning && "animate-spin")} aria-hidden />
          Refresh
        </Button>
      </div>

      {dashboardSection === "staffSchedules" && isOwner ? (
        <StaffSchedulesReportPanel branchId={branchId} />
      ) : dashboardSection === "myLedger" ? (
        <UserLedgerDashboardPanel />
      ) : (
        <MyViewBranchReportSection branchId={branchId} />
      )}
    </div>
  )
}

export default function DashboardPage() {
  const session = getSession()
  const mode = session?.mode === "ORG" || session?.mode === "BRANCH" ? session.mode : "ORG"
  if (mode !== "BRANCH") {
    return <OrgDashboardHome />
  }
  return <BranchReportDashboard />
}
