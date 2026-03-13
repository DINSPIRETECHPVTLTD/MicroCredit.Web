import {
  type MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { useMemo, useState } from "react"
import { ledgerTransactionService } from "@/services/ledgerTransaction.service"
import type { LedgerTransactionResponse } from "@/types/ledgerTransaction"
import { useQuery } from "@tanstack/react-query"
import { userService } from "@/services/user.service"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { UserResponse } from "@/types/user"
import AddExpenseDialog from "./AddExpenseDialog"


function ExpenseList() {
    const [dialogOpen, setDialogOpen] = useState(false)

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
        data: expenses = [], 
        isLoading: expensesLoading,
        refetch } = useQuery({
        queryKey: ["ledgerTransactions"],
        queryFn: () => ledgerTransactionService.getExpenses(),
        enabled: !!users.length,
    });

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

    const handleCreated = async () => {
      await refetch()
    }

    return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">All Expenses</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          ADD Expense
        </Button>
      </div>

      {!isLoading && expenses.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No expenses found</p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>
            Add Expense
          </Button>
        </div>
      ) : (
        <MaterialReactTable table={table} />
      )}

      <AddExpenseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleCreated}
        users={users}
      />
    </div>
  )

}

export default ExpenseList

