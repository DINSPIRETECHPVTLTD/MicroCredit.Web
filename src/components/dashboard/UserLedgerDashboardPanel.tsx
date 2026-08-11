import { useEffect, useMemo, useState } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table"
import toast from "react-hot-toast"
import {
  ArrowDownLeft,
  ArrowUpRight,
  ListOrdered,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateInput, DateDisplay } from "@/components/date"
import { SummaryMetricCard } from "@/components/dashboard/SummaryMetricCard"
import {
  STANDARD_TABLE_CONTAINER_PROPS,
  useResponsiveTable,
} from "@/lib/responsive/useResponsiveTable"
import { renderHiddenColumnsDetailPanel } from "@/components/table/HiddenColumnsDetailPanel"
import { reportService } from "@/services/report.service"
import type { UserLedgerTransactionRow } from "@/types/report"
import { formatDisplayDate, getTodayDateInputValue } from "@/lib/date-time"

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

const ALL_DATES_KEY = ""

export function UserLedgerDashboardPanel() {
  const [selectedDateKey, setSelectedDateKey] = useState(() => getTodayDateInputValue())
  const paymentDateKey = selectedDateKey || undefined

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reportUserLedgerDashboard", selectedDateKey || "all"],
    queryFn: () => reportService.getUserLedgerDashboard(paymentDateKey),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: "always",
  })

  useEffect(() => {
    if (isError && error) {
      toast.error(getApiErrorMessage(error, "Failed to load ledger dashboard"))
    }
  }, [isError, error])

  const transactions = data?.transactions ?? []
  const summary = data?.summary ?? {
    totalCredits: 0,
    totalDebits: 0,
    transactionCount: 0,
  }

  const columns = useMemo<MRT_ColumnDef<UserLedgerTransactionRow>[]>(
    () => [
      {
        accessorKey: "direction",
        header: "Type",
        filterFn: "equals",
        Cell: ({ cell }) => {
          const direction = String(cell.getValue() ?? "")
          const isCredit = direction === "Credit"
          return (
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                isCredit
                  ? "bg-green-500/15 text-green-800 dark:text-green-200"
                  : "bg-red-500/15 text-red-800 dark:text-red-200"
              }`}
            >
              {direction || "—"}
            </span>
          )
        },
      },
      {
        accessorKey: "transactionType",
        header: "Transaction",
      },
      {
        accessorKey: "amount",
        header: "Amount",
        muiTableHeadCellProps: { sx: { textAlign: "right" } },
        muiTableBodyCellProps: { sx: { textAlign: "right" } },
        Cell: ({ cell, row }) => {
          const amount = Number(cell.getValue() ?? 0)
          const prefix = row.original.direction === "Credit" ? "+" : "−"
          return (
            <span className="tabular-nums">
              {prefix}
              {formatInr(Math.abs(amount))}
            </span>
          )
        },
      },
      {
        accessorKey: "paymentDate",
        header: "Payment Date",
        Cell: ({ cell }) => <DateDisplay value={cell.getValue<string>()} />,
      },
      {
        accessorKey: "comments",
        header: "Comments",
      },
    ],
    []
  )

  const tableResponsive = useResponsiveTable("userLedgerDashboard")

  const table = useMaterialReactTable({
    columns,
    data: transactions,
    getRowId: (row) => String(row.id),
    state: {
      isLoading,
      showProgressBars: isFetching,
      columnVisibility: tableResponsive.columnVisibility,
    },
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableStickyHeader: true,
    enableFullScreenToggle: false,
    enableExpanding: tableResponsive.enableExpanding,
    renderDetailPanel: tableResponsive.enableExpanding
      ? renderHiddenColumnsDetailPanel(columns, tableResponsive.hiddenColumnIds)
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
      sorting: [{ id: "paymentDate", desc: true }],
      pagination: { pageSize: 20, pageIndex: 0 },
    },
    muiSearchTextFieldProps: {
      placeholder: "Search transactions…",
    },
  })

  return (
    <div className="space-y-6 [caret-color:transparent]">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetricCard
          title="Current balance"
          value={formatInr(data?.currentBalance ?? 0)}
          icon={Wallet}
          loading={isLoading}
        />
        <SummaryMetricCard
          title="Total credits"
          value={formatInr(summary.totalCredits)}
          icon={ArrowDownLeft}
          loading={isLoading || isFetching}
        />
        <SummaryMetricCard
          title="Total debits"
          value={formatInr(summary.totalDebits)}
          icon={ArrowUpRight}
          loading={isLoading || isFetching}
        />
        <SummaryMetricCard
          title="Transactions"
          value={String(summary.transactionCount)}
          icon={ListOrdered}
          loading={isLoading || isFetching}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">My ledger transactions</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {data?.userFullName
                ? `Showing ledger activity for ${data.userFullName}`
                : "Your ledger balance and transaction history"}
              {selectedDateKey
                ? ` on ${formatDisplayDate(selectedDateKey)}.`
                : "."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <label className="inline-flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Payment date</span>
              <DateInput
                value={selectedDateKey}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDateKey(e.target.value)
                  }
                }}
                className="w-auto px-2 py-1.5 text-xs font-medium shadow-sm"
                aria-label="Filter by payment date"
              />
            </label>
            {selectedDateKey ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setSelectedDateKey(ALL_DATES_KEY)}
              >
                Show all dates
              </Button>
            ) : null}
          </div>
        </div>

        {isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-medium text-destructive">Could not load ledger data.</p>
            <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="h-72 animate-pulse rounded-lg bg-muted" aria-hidden />
        ) : transactions.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            {selectedDateKey
              ? "No transactions match the selected payment date. Try another date or show all dates."
              : "No ledger transactions found."}
          </div>
        ) : (
          <MaterialReactTable table={table} />
        )}
      </div>
    </div>
  )
}
