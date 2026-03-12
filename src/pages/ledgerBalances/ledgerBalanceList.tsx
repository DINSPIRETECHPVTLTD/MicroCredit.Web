import {
  type MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { useMemo } from "react"
import { ledgerBalanceService } from "../../services/ledgerBalance.service"
import type { LedgerBalanceResponse } from "../../types/ledgerBalance"
import { useQuery } from "@tanstack/react-query"
import { userService } from "@/services/user.service"


function LedgerBalancesList() {
    const {
        data: users = [],
        isLoading: usersLoading
        } = useQuery({
        queryKey: ["users"],
        queryFn: () => userService.getUsers()
    });

    const userMap = useMemo(() => {
      return Object.fromEntries(users.map(u => [u.id, `${u.firstName} ${u.surname}`]));
    }, [users])


    const {
        data: ledgerBalances = [], 
        isLoading: ledgerBalancesLoading,
        refetch } = useQuery({
        queryKey: ["ledgerBalances"],
        queryFn: () => ledgerBalanceService.getLedgerBalances(),
        enabled: !!users.length, // Debug log to check fetched data
    });

    const isLoading = ledgerBalancesLoading || usersLoading;

    
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
            }
        ],
        [refetch, userMap]
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

    return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">All Ledger Balances</h1>
      </div>

      {!isLoading && ledgerBalances.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No ledger balances found</p>
        </div>
      ) : (
        <MaterialReactTable table={table} />
      )}
    </div>
  )

}

export default LedgerBalancesList

