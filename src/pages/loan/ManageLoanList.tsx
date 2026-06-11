import { useCallback, useMemo } from "react"
import { type MRT_ColumnDef, MaterialReactTable } from "material-react-table"
import { useNavigate } from "react-router-dom"
import { Eye, IndianRupee } from "lucide-react"
import { Button } from "../../components/ui/button"
import { useQuery } from "@tanstack/react-query"
import type { LoanResponse } from "../../types/loan"
import { loanService } from "../../services/loan.service"
import { PageHeader } from "@/components/layout/PageHeader"
import { useStandardTableOptions } from "@/lib/responsive/useResponsiveTable"
import { useIsMobile } from "@/lib/responsive/useBreakpoint"

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "string") return data
  if (data && typeof data === "object") {
    const obj = data as { message?: string; error?: string; title?: string }
    return obj.message ?? obj.error ?? obj.title ?? fallback
  }
  return fallback
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function formatCurrency(value: unknown): string {
  const n = toNumber(value)
  return n.toLocaleString(undefined, { style: "currency", currency: "INR" })
}

function ManageLoanList() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const { data: loans = [], isLoading, isError, error } = useQuery({
    queryKey: ["manageLoansAllStatuses"],
    queryFn: () => loanService.getActiveLoans(),
  })

  const paidNoOfTermsLabel = useCallback((loan: LoanResponse): string => {
    const v = loan.noOfTerms?.trim()
    return v && v.length > 0 ? v : "-"
  }, [])

  const handleViewLoan = useCallback(
    (loan: LoanResponse) => {
      navigate(`/loans/${loan.loanId}/scheduler`, {
        state: { memberName: loan.fullName },
      })
    },
    [navigate]
  )

  const handlePrepayment = useCallback(
    (loan: LoanResponse) => {
      navigate(`/loans/${loan.loanId}/prepayment`, {
        state: { memberName: loan.fullName, loanStatus: loan.status },
      })
    },
    [navigate]
  )

  const columns = useMemo<MRT_ColumnDef<LoanResponse>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Full Name",
      },
      {
        accessorKey: "pocName",
        header: "POC Name",
        Cell: ({ cell }) => cell.getValue<string>() || "-",
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        enableHiding: false,
        Cell: ({ cell }) => cell.getValue<string>() || "-",
      },
      {
        accessorKey: "loanTotalAmount",
        header: "Loan Total Amount",
        Cell: ({ cell }) => {
          return formatCurrency(cell.getValue())
        },
      },
      {
        accessorKey: "noOfTerms",
        header: "Paid/NoOfTerms",
        Cell: ({ row }) => paidNoOfTermsLabel(row.original),
      },
      {
        accessorKey: "totalAmountPaid",
        header: "Total Amount Paid",
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        accessorKey: "loanId",
        header: "Loan Id",
      },
      {
        accessorKey: "memberId",
        header: "Member Id",
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <div className="flex items-center justify-start gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => handleViewLoan(row.original)}>
              <Eye className="mr-1 h-4 w-4" />
              {isMobile ? "Schedule" : "View Schedule"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handlePrepayment(row.original)}>
              <IndianRupee className="mr-1 h-4 w-4" />
              Modify
            </Button>
          </div>
        ),
      },
    ],
    [paidNoOfTermsLabel, handleViewLoan, handlePrepayment, isMobile]
  )

  const tableOptions = useStandardTableOptions("manageLoans", columns)

  return (
    <div>
      <PageHeader title="Manage Loans" />

      {isError ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p className="font-medium text-destructive">Failed to load loans.</p>
          <p className="mt-1 text-sm">{getApiErrorMessage(error, "Unknown error")}</p>
        </div>
      ) : !isLoading && loans.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No loans found</p>
        </div>
      ) : (
        <MaterialReactTable
          columns={columns}
          data={loans}
          state={{ isLoading, ...tableOptions.state }}
          enableSorting
          enableColumnFilters
          enableGrouping
          enableExpanding={tableOptions.enableExpanding}
          renderDetailPanel={tableOptions.renderDetailPanel}
          enableColumnPinning
          muiTableContainerProps={tableOptions.muiTableContainerProps}
        />
      )}
    </div>
  )
}

export default ManageLoanList
