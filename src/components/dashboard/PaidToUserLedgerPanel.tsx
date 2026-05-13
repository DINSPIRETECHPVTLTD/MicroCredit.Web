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
import { IndianRupee } from "lucide-react"
import { Button } from "@/components/ui/button"
import { reportService } from "@/services/report.service"
import type { PaidToUserLedgerReportRow } from "@/types/report"
import { SummaryMetricCard } from "@/components/dashboard/SummaryMetricCard"
import { SegmentedToggle } from "@/components/dashboard/SegmentedToggle"

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

const DETAIL_PANEL_SX = { sx: { backgroundColor: "transparent" } } as const

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
  const [selectedDay, setSelectedDay] = useState<"today" | "yesterday">("today")
  const {
    data: ledgerRows,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reportRecentPaidToUser", branchId],
    queryFn: () => reportService.getRecentPaidToUserTransactions(branchId),
  })

  const rows = useMemo(() => ledgerRows ?? [], [ledgerRows])

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

  const displayRows = useMemo(() => groupedByPaidToUser.flatMap((g) => g.rows), [groupedByPaidToUser])

  const totalAmount = useMemo(() => {
    return displayRows.reduce((sum, row) => {
      return sum + (Number.isFinite(row.amount) ? row.amount : 0)
    }, 0)
  }, [displayRows])

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
    data: groupedByPaidToUser,
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
    muiTableBodyRowProps: getSummaryTableBodyRowProps,
    muiDetailPanelProps: DETAIL_PANEL_SX,
    muiSearchTextFieldProps: {
      placeholder: "Search paid users…",
    },
  })

  useEffect(() => {
    if (isError && error) {
      toast.error(getApiErrorMessage(error, "Failed to load paid-to-user transactions"))
    }
  }, [isError, error])

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 [caret-color:transparent]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Staff Collection</h2>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {displayRows.length} of {dateFilteredRows.length} row
            {dateFilteredRows.length === 1 ? "" : "s"}
          </p>
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
            <SegmentedToggle
              value={selectedDay}
              onChange={setSelectedDay}
              ariaLabel="Staff collection transaction date"
              className="self-start"
              options={[
                { value: "today", label: "Today" },
                { value: "yesterday", label: "Yesterday" },
              ]}
            />
          </div>
          <div className="mb-4 max-w-sm">
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
