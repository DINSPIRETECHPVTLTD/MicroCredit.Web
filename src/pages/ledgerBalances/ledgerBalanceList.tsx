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
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">All Ledger Balances</h1>
      </div>

      {!isLoading && ledgerBalances.length === 0 ? (
        <div className="card-empty">
          <p>No ledger balances found</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <div className="table table-row-hover">
            <MaterialReactTable table={table} />
          </div>
        </div>
      )}
    </div>
  )

}

export default LedgerBalancesList

