import { useCallback, useMemo } from "react"
import { type MRT_ColumnDef, MaterialReactTable } from "material-react-table"
import { useNavigate } from "react-router-dom"
import { Eye, DollarSign } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "../../components/ui/button"
import { useQuery } from "@tanstack/react-query"
import type { LoanResponse } from "../../types/loan"
import { loanService } from "../../services/loan.service"


function ManageLoanList() {
  const navigate = useNavigate()

  const { data: loans = [], isLoading, refetch } = useQuery({
    queryKey: ["loans"],
    // Attempts a real API call and falls back to an empty array if unavailable.
      queryFn:()=> loanService.getLoans(),
  })

  const handleViewLoan = useCallback(
    (loan: LoanResponse) => {
      // Navigate to a detail page; adjust route as needed.
      navigate(`/loans/${loan.id}`)
    },
    [navigate]
  )

  const handlePrepayment = useCallback(async (loan: LoanResponse) => {
    // Replace this with real prepayment flow (dialog/API) when available.
    toast.success(`Prepayment requested for ${loan.memberName}`)
    await refetch()
  }, [refetch])

  const columns = useMemo<MRT_ColumnDef<LoanResponse>[]>(
    () => [
      {
        accessorKey: "memberName",
        header: "Member Name",
      },
      {
        accessorKey: "totalAmount",
        header: "Total Amount",
        Cell: ({ cell }) => {
          const val = cell.getValue<number>()
          return val == null ? "-" : val.toLocaleString(undefined, { style: "currency", currency: "USD" })
        },
      },
      {
        accessorKey: "weeksPaid",
        header: "No of weeks paid",
      },
        {
            accessorKey: "totalAmountPaid",
            header: "Total Amount Paid",
        },
      {
        accessorKey: "remainingBalance",
        header: "Remaning Balance",
        Cell: ({ cell }) => {
          const val = cell.getValue<number>()
          return val == null ? "-" : val.toLocaleString(undefined, { style: "currency", currency: "USD" })
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleViewLoan(row.original)}>
              <Eye className="mr-1 h-4 w-4" />
              ViewLoan
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handlePrepayment(row.original)}>
              <DollarSign className="mr-1 h-4 w-4" />
              Prepayment
            </Button>
          </div>
        ),
      },
    ],
    [handleViewLoan, handlePrepayment]
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Loans</h1>
      </div>

      {!isLoading && loans.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No loans found</p>
        </div>
      ) : (
        <MaterialReactTable
          columns={columns}
          data={loans}
          state={{ isLoading }}
          enableSorting
          enableColumnFilters
          enableGrouping
          enableExpanding={false}
          enableColumnPinning
        />
      )}
    </div>
  )
}

export default ManageLoanList
