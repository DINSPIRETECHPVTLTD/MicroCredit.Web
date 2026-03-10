import {
  type MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { useMemo } from "react"
import { investmentService } from "../../services/investment.service"
import type { InvestmentResponse } from "../../types/investment"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react";
import { userService } from "@/services/user.service"

function InvestmentsList() {
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
        data: investments = [], 
        isLoading: investmentsLoading, 
        refetch } = useQuery({
        queryKey: ["investments"],
        queryFn: () => investmentService.getInvestments(),
        enabled: !!users.length, // Debug log to check fetched data
    });

    const isDataLoading = investmentsLoading || usersLoading;

    
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
        [refetch, userMap]
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

    return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">All Investments</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          ADD Investment
        </Button>
      </div>

      {!isDataLoading && investments.length === 0 ? (
        <div className="card-empty">
          <p>No investments found</p>
          <p>Click &quot;Add Investment&quot; to create a new investment</p>
          <Button className="mt-4">
            Add Investment
          </Button>
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

export default InvestmentsList

