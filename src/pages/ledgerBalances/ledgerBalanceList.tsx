import {
  type MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { useCallback, useMemo, useState } from "react"
import { ledgerBalanceService } from "../../services/ledgerBalance.service"
import type { LedgerBalanceResponse } from "../../types/ledgerBalance"
import { useQuery } from "@tanstack/react-query"
import { userService } from "@/services/user.service"
import { Button } from "@/components/ui/button"
import type { UserResponse } from "@/types/user"
import { Plus } from "lucide-react"
import FundTransferDialog from "./FundTransferDialog"
import { useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/layout/PageHeader"
import { useStandardTableOptions } from "@/lib/responsive/useResponsiveTable"
import { useIsMobile } from "@/lib/responsive/useBreakpoint"


function LedgerBalancesList() {
    const [dialogOpen, setDialogOpen] = useState(false)
    const navigate = useNavigate()
    const isMobile = useIsMobile()

    const {
        data: users = [],
        isLoading: usersLoading
        } = useQuery({
        queryKey: ["users"],
        queryFn: () => userService.getUsers() as Promise<UserResponse[]>
    });

    const userMap = useMemo(() => {
      return Object.fromEntries(users.map(u => [u.id, `${u.firstName} ${u.surname}`]));
    }, [users])


    const {
        data: ledgerBalances = [], 
        isLoading: ledgerBalancesLoading,
        refetch
        } = useQuery({
        queryKey: ["ledgerBalances"],
        queryFn: () => ledgerBalanceService.getLedgerBalances(),
        enabled: !!users.length, // Debug log to check fetched data
    });

    const isLoading = ledgerBalancesLoading || usersLoading;

    const openTransactions = useCallback((userId: number) => {
        navigate(`/ledger-transactions/${userId}`)
      }, [navigate])

    
    const columns = useMemo<MRT_ColumnDef<LedgerBalanceResponse>[]>(
        () => [
            {
              id: "userName",
              header: "User Name",
              accessorFn: (row) => userMap[row.userId] ?? "Unknown",
            },
            {
              accessorKey: "amount",
              header: "Amount",
            },
            {
              id: "actions",
              header: "Actions",
              enableSorting: false,
              enableColumnFilter: false,
              Cell: ({ row }) => {
                const u = row.original
                return (
                  <Button variant="outline" onClick={() => openTransactions(u.userId)}>
                    Open Transactions
                  </Button>
                )
              },
            },

        ],
        [openTransactions, userMap]
    )

    const tableOptions = useStandardTableOptions("ledgerBalances", columns)

    const table = useMaterialReactTable({
        columns,
        data: ledgerBalances,
        state: { isLoading, ...tableOptions.state },
        enableSorting: true,
        enableColumnFilters: true,
        enableGrouping: true,
        enableExpanding: tableOptions.enableExpanding,
        renderDetailPanel: tableOptions.renderDetailPanel,
        enableColumnPinning: true,
        muiTableContainerProps: tableOptions.muiTableContainerProps,
    })

    const handleCreated = async () => {
    await refetch()
  }

    return (
    <div>
      <PageHeader
        title="All Ledger Balances"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {isMobile ? "Fund Transfer" : "Create Fund Transfer"}
          </Button>
        }
      />

      {!isLoading && ledgerBalances.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No ledger balances found</p>
        </div>
      ) : (
        <MaterialReactTable table={table} />
      )}

      <FundTransferDialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              onSuccess={handleCreated}
              users={users}
            />
    </div>
  )

}

export default LedgerBalancesList

