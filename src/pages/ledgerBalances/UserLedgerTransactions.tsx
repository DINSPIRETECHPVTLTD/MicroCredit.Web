import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  type MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"

import { ledgerTransactionService } from "@/services/ledgerTransaction.service"
import type { LedgerTransactionResponse } from "@/types/ledgerTransaction"
import { userService } from "@/services/user.service"
import type { UserResponse } from "@/types/user"
import { useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { DateDisplay, DateInput } from "@/components/date"
import { useStandardTableOptions } from "@/lib/responsive/useResponsiveTable"
import { getTodayDateInputValue, toIsoDateValue } from "@/lib/date-time"

function isPaymentDateInRange(
  paymentDate: LedgerTransactionResponse["paymentDate"],
  fromDate: string,
  toDate: string
): boolean {
  const key = toIsoDateValue(paymentDate)
  if (!key) return false
  if (fromDate && key < fromDate) return false
  if (toDate && key > toDate) return false
  return true
}

export default function UserLedgerTransactions() {
  const { userId } = useParams()
  const today = getTodayDateInputValue()
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.getUsers() as Promise<UserResponse[]>,
  })

  const userMap = useMemo(() => {
    return Object.fromEntries(
      users.map((u) => [u.id, `${u.firstName} ${u.surname}`])
    )
  }, [users])

  const numericUserId = Number(userId)
  const rangeFrom = fromDate && toDate && fromDate > toDate ? toDate : fromDate
  const rangeTo = fromDate && toDate && fromDate > toDate ? fromDate : toDate

  const { data = [], isLoading } = useQuery({
    queryKey: ["ledgerTransactions", numericUserId, rangeFrom, rangeTo],
    queryFn: () =>
      ledgerTransactionService.getTransactions({
        userId: numericUserId,
        fromDate: rangeFrom || undefined,
        toDate: rangeTo || undefined,
      }),
    enabled: !!userId,
  })

  const backToLedgers = () => {
    window.history.back()
  }

  const rows = useMemo(() => {
    const all = data as LedgerTransactionResponse[]
    if (!rangeFrom && !rangeTo) return all
    return all.filter((tx) => isPaymentDateInRange(tx.paymentDate, rangeFrom, rangeTo))
  }, [data, rangeFrom, rangeTo])

  const columns = useMemo<MRT_ColumnDef<LedgerTransactionResponse>[]>(
    () => [
      {
        id: "fromUser",
        header: "From User",
        accessorFn: (row) => userMap[row.paidFromUserId] ?? "Unknown",
      },
      {
        id: "toUser",
        header: "To User",
        accessorFn: (row) => userMap[row.paidToUserId] ?? "Unknown",
      },
      { accessorKey: "amount", header: "Amount" },
      {
        accessorKey: "paymentDate",
        header: "Payment Date",
        Cell: ({ cell }) => <DateDisplay value={cell.getValue<string>()} />,
      },
      {
        accessorKey: "createdDate",
        header: "Created Date",
        Cell: ({ cell }) => <DateDisplay value={cell.getValue<string>()} />,
      },
      { accessorKey: "transactionType", header: "Transaction Type" },
      { accessorKey: "comments", header: "Comments" },
    ],
    [userMap]
  )

  const tableOptions = useStandardTableOptions("ledgerTransactions", columns)

  const table = useMaterialReactTable({
    columns,
    data: rows,
    state: { isLoading, ...tableOptions.state },
    enableSorting: true,
    enableColumnFilters: true,
    enableGrouping: true,
    enableExpanding: tableOptions.enableExpanding,
    renderDetailPanel: tableOptions.renderDetailPanel,
    enableColumnPinning: true,
    enableStickyHeader: tableOptions.enableStickyHeader,
    muiTableContainerProps: tableOptions.muiTableContainerProps,
    initialState: {
      sorting: [{ id: "createdDate", desc: true }],
      pagination: { pageSize: 20, pageIndex: 0 },
    },
  })

  return (
    <div>
      <PageHeader
        title="Ledger Transactions"
        actions={
          <Button onClick={() => backToLedgers()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ledgers
          </Button>
        }
        toolbar={
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">From Date</span>
              <DateInput
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => {
                  const next = e.target.value
                  if (!next) return
                  setFromDate(next)
                  if (toDate && next > toDate) setToDate(next)
                }}
                className="w-[10.5rem]"
                aria-label="From date"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">To Date</span>
              <DateInput
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => {
                  const next = e.target.value
                  if (!next) return
                  setToDate(next)
                  if (fromDate && next < fromDate) setFromDate(next)
                }}
                className="w-[10.5rem]"
                aria-label="To date"
              />
            </label>
          </div>
        }
      />

      {!isLoading && rows.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No transactions found for the selected date range.</p>
        </div>
      ) : (
        <MaterialReactTable table={table} />
      )}
    </div>
  )
}
