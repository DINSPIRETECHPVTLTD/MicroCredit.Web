import {
  type MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { useMemo, useState } from "react"
import { ledgerBalanceService } from "../../services/ledgerBalance.service"
import type { LedgerBalanceResponse } from "../../types/ledgerBalance"
import { useQuery } from "@tanstack/react-query"
import { userService } from "@/services/user.service"
import { Button } from "@/components/ui/button"
import type { UserResponse } from "@/types/user"
import { Plus } from "lucide-react"
import FundTransferDialog from "./FundTransferDialog"
import { useNavigate } from "react-router-dom"


function LedgerBalancesList() {
    const [dialogOpen, setDialogOpen] = useState(false)
    const navigate = useNavigate()

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

    const openTransactions = (userId: number) => {
        navigate(`/ledger-transactions/${userId}`)
      }

    
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
              accessorKey: "insuranceAmount",
              header: "Insurance Amount",
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
        [userMap]
    )

    const table = useMaterialReactTable({
        columns,
        data: ledgerBalances,
        state: { isLoading },
        enableSorting: true,
        enableColumnFilters: true,
        enableGrouping: true,
        enableExpanding: false,
        enableColumnPinning: true,
    })

    const handleCreated = async () => {
    await refetch()
  }

    return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">All Ledger Balances</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Fund Transfer
        </Button>
      </div>

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

