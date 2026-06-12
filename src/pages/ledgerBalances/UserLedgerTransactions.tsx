import { useMemo } from "react"
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
import { useStandardTableOptions } from "@/lib/responsive/useResponsiveTable"



export default function UserLedgerTransactions() {

  const { userId } = useParams()

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

  const { data = [], isLoading } = useQuery({
    queryKey: ["ledgerTransactions", numericUserId],
    queryFn: () =>
      ledgerTransactionService.getTransactions({
        userId: numericUserId,
      }),
    enabled: !!userId,
  })

  const backToLedgers = () => {
    window.history.back()
  }

  const rows = data as LedgerTransactionResponse[]

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
        Cell: ({ cell }) =>
          new Date(cell.getValue<string>()).toLocaleDateString(),
      },
      {
        accessorKey: "createdDate",
        header: "Created Date",
        Cell: ({ cell }) =>
          new Date(cell.getValue<string>()).toLocaleDateString(),
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
      />

      <MaterialReactTable table={table} />
    </div>

  )
}

