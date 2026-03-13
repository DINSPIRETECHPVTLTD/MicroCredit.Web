import {
  type MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { useMemo, useState } from "react"
import { investmentService } from "../../services/investment.service"
import type { InvestmentResponse } from "../../types/investment"
import type { UserResponse } from "../../types/user"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { userService } from "@/services/user.service"
import AddInvestmentDialog from "./AddInvestmentDialog"

function InvestmentsList() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    data: users = [],
    isLoading: usersLoading,
  } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.getUsers() as Promise<UserResponse[]>,
  })

  const userMap = useMemo(() => {
    return Object.fromEntries(users.map((u) => [u.id, `${u.firstName} ${u.surname}`]))
  }, [users])

  const {
    data: investments = [],
    isLoading: investmentsLoading,
    refetch,
  } = useQuery({
    queryKey: ["investments"],
    queryFn: () => investmentService.getInvestments(),
    enabled: !!users.length,
  })

  const isDataLoading = investmentsLoading || usersLoading

  const columns = useMemo<MRT_ColumnDef<InvestmentResponse>[]>(
    () => [
      {
        id: "investorName",
        header: "Investor Name",
        accessorFn: (row) => userMap[row.userId] ?? "Unknown",
      },
      {
        accessorKey: "amount",
        header: "Amount",
      },
      {
        accessorKey: "investmentDate",
        header: "Investment Date",
        Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleDateString(),
      },
      {
        id: "createdByName",
        header: "Created By",
        accessorFn: (row) => userMap[row.createdById] ?? "Unknown",
      },
      {
        accessorKey: "createdDate",
        header: "Created Date",
        Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleDateString(),
      },
    ],
    [userMap]
  )

  const table = useMaterialReactTable({
    columns,
    data: investments,
    state: { isLoading: isDataLoading },
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
        <h1 className="text-2xl font-semibold">All Investments</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          ADD Investment
        </Button>
      </div>

      {!isDataLoading && investments.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No investments found</p>
          <p className="text-sm mt-1">Click &quot;Add Investment&quot; to create a new investment</p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>
            Add Investment
          </Button>
        </div>
      ) : (
        <MaterialReactTable table={table} />
      )}

      <AddInvestmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleCreated}
        users={users}
      />
    </div>
  )
}

export default InvestmentsList
