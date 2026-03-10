import {
  type MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { useMemo } from "react"
import { ledgerTransactionService } from "@/services/ledgerTransaction.service"
import type { LedgerTransactionResponse } from "@/types/ledgerTransaction"
import { useQuery } from "@tanstack/react-query"
import { userService } from "@/services/user.service"


function ExpenseList() {
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
        data: expenses = [], 
        isLoading: expensesLoading,
        refetch } = useQuery({
        queryKey: ["ledgerTransactions"],
        queryFn: () => ledgerTransactionService.getExpenses(),
        enabled: !!users.length,
    });

    console.log('Fetched expenses:', expenses); // Debug log to check fetched data

    const isLoading = expensesLoading || usersLoading;

    
    const columns = useMemo<MRT_ColumnDef<LedgerTransactionResponse>[]>(
        () => [
            {
              id: "userName",
              header: "User Name",
              accessorFn: (row) => userMap[row.paidFromUserId] ?? "Unknown",
            },
            {
              accessorKey: "amount",
              header: "Amount",
            },
            {
                accessorKey: "paymentDate",
                header: "Payment Date",
                Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleDateString()
            },
            {
                id: "createdByName",
                header: "Created By",
                accessorFn: (row) => userMap[row.createdBy] ?? "Unknown"
            },
            {
                id: "createdDate",
                header: "Created Date",
                accessorFn: (row) => new Date(row.createdDate).toLocaleDateString()
            },
            {
                accessorKey: "comments",
                header: "Description",
            }
        ],
        [refetch, userMap]
    )

    const table = useMaterialReactTable({
        columns,
        data: expenses,
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
        <h1 className="page-title">All Expenses</h1>
      </div>

      {!isLoading && expenses.length === 0 ? (
        <div className="card-empty">
          <p>No expenses found</p>
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

export default ExpenseList

