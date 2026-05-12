import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableInstance,
} from "material-react-table"
import toast from "react-hot-toast"
import { IndianRupee, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { reportService } from "@/services/report.service"
import type { PaidToUserLedgerReportRow } from "@/types/report"
import { SummaryMetricCard } from "@/components/dashboard/SummaryMetricCard"

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

function paidToUserGroupKey(r: PaidToUserLedgerReportRow): string {
  return r.paidToUserId != null ? `id:${r.paidToUserId}` : `name:${r.paidToUserFullName}`
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function paymentDateKey(paymentDate: string | null): string | null {
  if (!paymentDate) return null
  const d = new Date(paymentDate)
  if (Number.isNaN(d.getTime())) return null
  return localDateKey(d)
}

function formatPaymentDateDisplay(paymentDate: string | null): string {
  if (!paymentDate) return "—"
  const d = new Date(paymentDate)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type PaidToUserSummaryRow = {
  key: string
  label: string
  paidToUserId: number | null
  transactionCount: number
  totalAmount: number
  rows: PaidToUserLedgerReportRow[]
}

const selectClass =
  "w-full max-w-xl rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const DETAIL_PANEL_SX = { sx: { backgroundColor: "transparent" } } as const
const EXPAND_COLUMN_HIDE = {
  size: 0,
  minSize: 0,
  maxSize: 0,
  grow: false,
  muiTableHeadCellProps: { sx: { display: "none" } },
  muiTableBodyCellProps: { sx: { display: "none" } },
} as const

const transactionColumns: MRT_ColumnDef<PaidToUserLedgerReportRow>[] = [
  {
    accessorKey: "amount",
    header: "Amount",
    size: 120,
    muiTableHeadCellProps: { sx: { textAlign: "right" } },
    muiTableBodyCellProps: { sx: { textAlign: "right" } },
    Cell: ({ cell }) => formatInr(cell.getValue<number>()),
  },
  {
    accessorKey: "paymentDate",
    header: "Payment date",
    size: 170,
    Cell: ({ cell }) => formatPaymentDateDisplay(cell.getValue<string | null>()),
  },
  { accessorKey: "transactionType", header: "Transaction type", size: 170 },
]

const PaidToUserTransactionDetailPanel = memo(function PaidToUserTransactionDetailPanel({
  rows,
}: {
  rows: PaidToUserLedgerReportRow[]
}) {
  const transactionTable = useMaterialReactTable({
    columns: transactionColumns,
    data: rows,
    getRowId: (r) => String(r.id),
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableTopToolbar: true,
    enableFullScreenToggle: false,
    enableKeyboardShortcuts: false,
    layoutMode: "grid",
    muiTableHeadCellProps: {
      sx: {
        px: 1.5,
        py: 1,
      },
    },
    muiTableBodyCellProps: () => ({
      sx: {
        px: 1.5,
        py: 1,
        userSelect: "none",
        WebkitUserSelect: "none",
        caretColor: "transparent",
      },
    }),
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
    },
    muiSearchTextFieldProps: {
      placeholder: "Search transactions…",
    },
  })

  return (
    <div
      className="border-t border-border bg-muted/30 px-2 py-3 sm:px-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-w-4xl">
        <MaterialReactTable table={transactionTable} />
      </div>
    </div>
  )
})

/** `GET /Report/recent-paid-to-user-transactions?branchId=…` — embed on branch dashboard (Owner tab). */
export function PaidToUserLedgerPanel({ branchId }: { branchId: number }) {
  const queryClient = useQueryClient()
  const [selectedDay, setSelectedDay] = useState<"today" | "yesterday">("today")
  const [selectedUserKey, setSelectedUserKey] = useState<string | "all">("all")
  const {
    data: ledgerRows,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reportRecentPaidToUser", branchId],
    queryFn: () => reportService.getRecentPaidToUserTransactions(branchId),
  })

  const rows = ledgerRows ?? []

  const { todayKey, yesterdayKey } = useMemo(() => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return {
      todayKey: localDateKey(today),
      yesterdayKey: localDateKey(yesterday),
    }
  }, [])

  const dateFilteredRows = useMemo(() => {
    const activeKey = selectedDay === "today" ? todayKey : yesterdayKey
    return rows.filter((r) => paymentDateKey(r.paymentDate) === activeKey)
  }, [rows, selectedDay, todayKey, yesterdayKey])

  const groupedByPaidToUser = useMemo(() => {
    const map = new Map<string, PaidToUserLedgerReportRow[]>()
    for (const r of dateFilteredRows) {
      const key = paidToUserGroupKey(r)
      const list = map.get(key) ?? []
      list.push(r)
      map.set(key, list)
    }
    return Array.from(map.entries())
      .map(([key, list]) => {
        const sorted = [...list].sort((a, b) => {
          const ta = a.paymentDate ? new Date(a.paymentDate).getTime() : 0
          const tb = b.paymentDate ? new Date(b.paymentDate).getTime() : 0
          return tb - ta
        })
        const label = sorted[0]?.paidToUserFullName?.trim() || "—"
        const paidToUserId = sorted[0]?.paidToUserId ?? null
        const totalAmount = sorted.reduce((sum, row) => {
          return sum + (Number.isFinite(row.amount) ? row.amount : 0)
        }, 0)
        return {
          key,
          label,
          paidToUserId,
          transactionCount: sorted.length,
          totalAmount,
          rows: sorted,
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))
  }, [dateFilteredRows])

  const displayGroups = useMemo(() => {
    if (selectedUserKey === "all") return groupedByPaidToUser
    return groupedByPaidToUser.filter((g) => g.key === selectedUserKey)
  }, [groupedByPaidToUser, selectedUserKey])

  const displayRows = useMemo(() => displayGroups.flatMap((g) => g.rows), [displayGroups])

  const totalAmount = useMemo(() => {
    return displayRows.reduce((sum, row) => {
      return sum + (Number.isFinite(row.amount) ? row.amount : 0)
    }, 0)
  }, [displayRows])

  useEffect(() => {
    if (
      selectedUserKey !== "all" &&
      !groupedByPaidToUser.some((g) => g.key === selectedUserKey)
    ) {
      setSelectedUserKey("all")
    }
  }, [groupedByPaidToUser, selectedUserKey])

  const showPaidToUserDropdown = useMemo(() => {
    if (dateFilteredRows.length === 0) return false
    return (
      groupedByPaidToUser.length > 1 ||
      groupedByPaidToUser.some((g) => g.rows.length > 1)
    )
  }, [dateFilteredRows.length, groupedByPaidToUser])

  const summaryColumns = useMemo<MRT_ColumnDef<PaidToUserSummaryRow>[]>(
    () => [
      { accessorKey: "label", header: "Paid to", size: 240 },
      {
        accessorKey: "transactionCount",
        header: "Transactions",
        muiTableHeadCellProps: { sx: { textAlign: "right" } },
        muiTableBodyCellProps: { sx: { textAlign: "right" } },
        Cell: ({ cell }) => {
          return <span className="tabular-nums">{cell.getValue<number>()}</span>
        },
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

  const renderDetailPanel = useCallback(
    ({ row }: { row: MRT_Row<PaidToUserSummaryRow> }) => (
      <PaidToUserTransactionDetailPanel rows={row.original.rows} />
    ),
    []
  )

  const getSummaryTableBodyRowProps = useCallback(
    ({
      row,
      table,
      isDetailPanel,
    }: {
      row: MRT_Row<PaidToUserSummaryRow>
      table: MRT_TableInstance<PaidToUserSummaryRow>
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

  const summaryTable = useMaterialReactTable({
    columns: summaryColumns,
    data: displayGroups,
    getRowId: (r) => r.key,
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
    initialState: {
      pagination: { pageSize: 15, pageIndex: 0 },
    },
    renderDetailPanel,
    displayColumnDefOptions: {
      "mrt-row-expand": { ...EXPAND_COLUMN_HIDE },
    },
    muiTableBodyRowProps: getSummaryTableBodyRowProps,
    muiDetailPanelProps: DETAIL_PANEL_SX,
    muiSearchTextFieldProps: {
      placeholder: "Search paid users…",
    },
  })

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["reportRecentPaidToUser", branchId] })
  }, [queryClient, branchId])

  useEffect(() => {
    if (isError && error) {
      toast.error(getApiErrorMessage(error, "Failed to load paid-to-user transactions"))
    }
  }, [isError, error])

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 [caret-color:transparent]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Paid to user transactions</h2>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {displayRows.length} of {dateFilteredRows.length} row
            {dateFilteredRows.length === 1 ? "" : "s"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>
      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="font-medium text-destructive">Could not load report.</p>
          <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex self-start rounded-lg border border-border bg-muted p-1">
              <button
                type="button"
                onClick={() => setSelectedDay("today")}
                className={cn(
                  "min-w-24 rounded-md px-3 py-1.5 text-center text-xs font-semibold transition-colors",
                  selectedDay === "today"
                    ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                )}
                aria-pressed={selectedDay === "today"}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDay("yesterday")}
                className={cn(
                  "min-w-24 rounded-md px-3 py-1.5 text-center text-xs font-semibold transition-colors",
                  selectedDay === "yesterday"
                    ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                )}
                aria-pressed={selectedDay === "yesterday"}
              >
                Yesterday
              </button>
            </div>
            {showPaidToUserDropdown ? (
              <div className="w-full sm:flex sm:justify-end">
                <select
                  id="paid-to-user-collection-picker"
                  className={selectClass}
                  value={selectedUserKey === "all" ? "" : selectedUserKey}
                  onChange={(e) => {
                    const v = e.target.value
                    setSelectedUserKey(v === "" ? "all" : v)
                  }}
                >
                  <option value="">All ({dateFilteredRows.length} transactions)</option>
                  {groupedByPaidToUser.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label} ({g.rows.length})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryMetricCard
              title="Total Amount"
              value={formatInr(totalAmount)}
              icon={IndianRupee}
              loading={isLoading}
            />
          </div>
          <MaterialReactTable table={summaryTable} />
        </>
      )}
    </div>
  )
}
