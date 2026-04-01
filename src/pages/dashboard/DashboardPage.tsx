import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type MouseEvent,
} from "react"
import { Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableInstance,
} from "material-react-table"
import toast from "react-hot-toast"
import { RefreshCw, Users, IndianRupee, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getBranch, getOrganization, getSession } from "@/services/auth.service"
import { reportService } from "@/services/report.service"
import type { MemberByPocReportRow, PocBranchReportRow } from "@/types/report"

/** POC row with counts/amounts derived from members-by-poc (POC API often omits memberCount/totalAmount). */
type PocTableRow = PocBranchReportRow & {
  resolvedMemberCount: number | null
  resolvedTotalAmount: number | null
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

const POC_EXPAND_COLUMN_HIDE = {
  size: 0,
  minSize: 0,
  maxSize: 0,
  grow: false,
  muiTableHeadCellProps: { sx: { display: "none" } },
  muiTableBodyCellProps: { sx: { display: "none" } },
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return localDateKey(d)
}

/** Label relative to viewer's local today / tomorrow. */
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
  const d = new Date(scheduleIso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
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

function formatDashboardClock(d: Date): string {
  const datePart = d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  return `${datePart} • ${timePart}`
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string
  value: string | number
  icon: ComponentType<{ className?: string }>
  loading?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
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

/** Org mode: simple home — branch POC report is only shown in Branch mode after opening a branch. */
function OrgDashboardHome() {
  const org = getOrganization()
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome to MicroCredit (MCS)
        {org?.name ? (
          <>
            {" "}
            — <span className="font-medium text-foreground">{org.name}</span>
          </>
        ) : null}
        .
      </p>
    </div>
  )
}

const memberReportColumns: MRT_ColumnDef<MemberByPocReportRow>[] = [
  {
    accessorKey: "memberId",
    header: "Member ID",
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

  const memberTable = useMaterialReactTable({
    columns: memberReportColumns,
    data: filteredMembers,
    state: { isLoading },
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableTopToolbar: true,
    enableFullScreenToggle: false,
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

function BranchReportDashboard() {
  const queryClient = useQueryClient()
  const branch = getBranch()
  const branchId = branch?.id

  const { todayKey, tomorrowKey } = useMemo(() => getTodayAndTomorrowDateKeys(), [])
  const [scheduleWindow, setScheduleWindow] = useState<"today" | "tomorrow">("today")
  const activeScheduleDateKey = scheduleWindow === "today" ? todayKey : tomorrowKey

  const {
    data: pocsRaw,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reportPocs", branchId],
    enabled: Boolean(branchId),
    queryFn: () => reportService.getPocsByBranch(branchId!),
  })

  const pocErrorMessage = useMemo(
    () => (isError && error ? getApiErrorMessage(error, "") : ""),
    [isError, error]
  )
  const noPocInBranchError = pocErrorMessage.toLowerCase().includes("no poc in current branch")

  const pocs = pocsRaw ?? EMPTY_POCS

  const pocIds = useMemo(() => {
    const ids = pocs.map((p) => p.pocId).filter((id) => Number.isFinite(id))
    return ids.slice().sort((a, b) => a - b)
  }, [pocs])

  const {
    data: membersRaw,
    isLoading: membersIsLoading,
    isFetching: membersIsFetching,
    isError: membersIsError,
    error: membersError,
  } = useQuery({
    queryKey: ["reportMembersByPocs", branchId, pocIds.join(",")],
    enabled: Boolean(branchId && pocIds.length > 0),
    queryFn: () => reportService.getMembersByPocs(branchId!, pocIds),
    /** Fetch fresh rows when expanding/refreshing the dashboard. */
    staleTime: 0,
    refetchOnMount: "always",
  })

  const members = membersRaw ?? EMPTY_MEMBERS
  const filteredMembers = useMemo(() => {
    return members.filter((m) => scheduleDateKey(m.scheduleDate) === activeScheduleDateKey)
  }, [members, activeScheduleDateKey])

  const membersByPoc = useMemo(() => {
    const map = new Map<number, MemberByPocReportRow[]>()
    for (const row of filteredMembers) {
      const existing = map.get(row.pocId)
      if (existing) existing.push(row)
      else map.set(row.pocId, [row])
    }
    return map
  }, [filteredMembers])

  const totalPocs = pocs.length
  const totalMembersInBranch = membersIsError
    ? pocs.reduce((sum, poc) => sum + (poc.memberCount ?? 0), 0)
    : filteredMembers.length
  const totalAmountInBranch = membersIsError
    ? pocs.reduce((sum, poc) => sum + (poc.totalAmount ?? 0), 0)
    : sumMemberEmi(filteredMembers)

  const pocTableRows: PocTableRow[] = useMemo(() => {
    return pocs.map((poc) => {
      if (membersIsLoading) {
        return { ...poc, resolvedMemberCount: null, resolvedTotalAmount: null }
      }

      if (membersIsError) {
        return {
          ...poc,
          resolvedMemberCount: poc.memberCount,
          resolvedTotalAmount: poc.totalAmount,
        }
      }

      if (membersRaw === undefined) {
        return { ...poc, resolvedMemberCount: null, resolvedTotalAmount: null }
      }

      const pocMembers = membersByPoc.get(poc.pocId) ?? []
      return {
        ...poc,
        resolvedMemberCount: pocMembers.length,
        resolvedTotalAmount: sumMemberEmi(pocMembers),
      }
    })
  }, [pocs, membersByPoc, membersIsError, membersIsLoading, membersRaw])

  useEffect(() => {
    if (membersIsError && membersError) {
      toast.error(getApiErrorMessage(membersError, "Failed to load POC members"))
    }
  }, [membersIsError, membersError])

  useEffect(() => {
    if (isError && error) {
      if (noPocInBranchError) return
      toast.error(getApiErrorMessage(error, "Failed to load POC report"))
    }
  }, [isError, error, noPocInBranchError])

  const handleRefreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["reportPocs", branchId] })
    void queryClient.invalidateQueries({ queryKey: ["reportMembersByPocs", branchId] })
  }, [queryClient, branchId])

  const renderPocDetailPanel = useCallback(
    ({ row }: { row: MRT_Row<PocTableRow> }) => (
      <PocMemberDetailPanel
        members={membersByPoc.get(row.original.pocId) ?? EMPTY_MEMBERS}
        isLoading={membersIsLoading || membersIsFetching}
        isError={membersIsError}
        activeScheduleDateKey={activeScheduleDateKey}
      />
    ),
    [membersByPoc, membersIsError, membersIsFetching, membersIsLoading, activeScheduleDateKey]
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

  const pocTable = useMaterialReactTable({
    columns: pocColumns,
    data: pocTableRows,
    getRowId: (row) => String(row.pocId),
    state: { isLoading },
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableStickyHeader: true,
    enableKeyboardShortcuts: false,
    enableExpandAll: false,
    muiTableBodyCellProps: () => ({
      sx: {
        userSelect: "none",
        WebkitUserSelect: "none",
        caretColor: "transparent",
      },
    }),
    renderDetailPanel: renderPocDetailPanel,
    displayColumnDefOptions: {
      "mrt-row-expand": { ...POC_EXPAND_COLUMN_HIDE },
    },
    initialState: { ...POC_TABLE_INITIAL_STATE },
    muiTableBodyRowProps: getPocTableBodyRowProps,
    muiDetailPanelProps: MUI_DETAIL_PANEL_SX,
    muiSearchTextFieldProps: {
      placeholder: "Search POCs…",
    },
  })

  if (!branchId) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My View Dashboard</h1>
          <DashboardClock />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRefreshAll}
          disabled={isFetching || membersIsFetching}
        >
          <RefreshCw
            className={cn("h-4 w-4", (isFetching || membersIsFetching) && "animate-spin")}
            aria-hidden
          />
          Refresh
        </Button>
      </div>

      {isLoading && pocs.length === 0 ? (
        <DashboardSkeleton />
      ) : isError ? (
        noPocInBranchError ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No POCs
          </div>
        ) : (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="font-medium text-destructive">Could not load dashboard data.</p>
          <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
        )
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard title="Total POCs" value={totalPocs} icon={UserCheck} loading={isLoading} />
            <SummaryCard
              title="Total Members"
              value={totalMembersInBranch}
              icon={Users}
              loading={isLoading || membersIsLoading || membersIsFetching}
            />
            <SummaryCard
              title="Total Amount Collected"
              value={formatInr(totalAmountInBranch)}
              icon={IndianRupee}
              loading={isLoading || membersIsLoading || membersIsFetching}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 [caret-color:transparent]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex rounded-lg border border-border bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setScheduleWindow("today")}
                    className={cn(
                      "min-w-24 rounded-md px-3 py-1.5 text-center text-xs font-semibold transition-colors",
                      scheduleWindow === "today"
                        ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                        : "text-muted-foreground hover:bg-background hover:text-foreground"
                    )}
                    aria-pressed={scheduleWindow === "today"}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleWindow("tomorrow")}
                    className={cn(
                      "min-w-24 rounded-md px-3 py-1.5 text-center text-xs font-semibold transition-colors",
                      scheduleWindow === "tomorrow"
                        ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                        : "text-muted-foreground hover:bg-background hover:text-foreground"
                    )}
                    aria-pressed={scheduleWindow === "tomorrow"}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>

            </div>
            {pocs.length === 0 && !isLoading ? (
              <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                No POC data for this branch.
              </div>
            ) : (
              <div className="[caret-color:transparent]">
                <MaterialReactTable table={pocTable} />
              </div>
            )}
          </div>
        </>
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
