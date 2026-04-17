import { useCallback, useMemo } from "react"
import { type MRT_ColumnDef, MaterialReactTable } from "material-react-table"
import { useNavigate } from "react-router-dom"
import { Eye, IndianRupee } from "lucide-react"
import { Button } from "../../components/ui/button"
import { useQuery, useQueries } from "@tanstack/react-query"
import type { LoanResponse } from "../../types/loan"
import { loanService } from "../../services/loan.service"
import {
  countPaidPartialOverTotalEmis,
  fetchLoanSchedulerList,
} from "../../services/loanScheduler.service"

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

  const { data: loans = [], isLoading, isError, error } = useQuery({
    queryKey: ["activeLoans"],
    queryFn: () => loanService.getActiveLoans(),
  })
  const totalRecords = loans.length

  const schedulerQueries = useQueries({
    queries: loans.map((loan) => ({
      queryKey: ["loanSchedulers", loan.loanId],
      queryFn: () => fetchLoanSchedulerList(loan.loanId),
      enabled: !isLoading && loans.length > 0,
      staleTime: 60_000,
    })),
  })

  const getEmiProgressLabel = useCallback(
    (loan: LoanResponse): string => {
      const idx = loans.findIndex((l) => l.loanId === loan.loanId)
      const q = idx >= 0 ? schedulerQueries[idx] : undefined
      if (!q) return loan.noOfTerms || "-"
      if (q.isLoading) return "…"
      if (q.isError) return loan.noOfTerms || "-"
      const rows = q.data ?? []
      if (rows.length === 0) return loan.noOfTerms || "-"
      const { paidPartialCount, totalEmis } = countPaidPartialOverTotalEmis(rows)
      return `${paidPartialCount}/${totalEmis}`
    },
    [loans, schedulerQueries]
  )

  const handleViewLoan = useCallback(
    (loan: LoanResponse) => {
      navigate(`/loans/${loan.loanId}/scheduler`)
    },
    [navigate]
  )

  const handlePrepayment = useCallback(
    (loan: LoanResponse) => {
      navigate(`/loans/${loan.loanId}/prepayment`, {
        state: { memberName: loan.fullName },
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
        accessorKey: "loanTotalAmount",
        header: "Loan Total Amount",
        Cell: ({ cell }) => {
          return formatCurrency(cell.getValue())
        },
      },
      {
        accessorKey: "noOfTerms",
        header: "Paid/NoOfTerms",
        Cell: ({ row }) => getEmiProgressLabel(row.original),
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
        accessorKey: "schedulerTotalAmount",
        header: "Scheduler Total Amount",
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        accessorKey: "remainingBal",
        header: "Remaining Balance",
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <div className="flex items-center justify-start gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleViewLoan(row.original)}>
              <Eye className="mr-1 h-4 w-4" />
              View Schedule
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handlePrepayment(row.original)}>
              <IndianRupee className="mr-1 h-4 w-4" />
              Prepayment
            </Button>
          </div>
        ),
      },
    ],
    [getEmiProgressLabel, handleViewLoan, handlePrepayment]
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Active Loans({isLoading ? "-" : totalRecords})</h1>
      </div>

      {isError ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p className="font-medium text-destructive">Failed to load active loans.</p>
          <p className="mt-1 text-sm">{getApiErrorMessage(error, "Unknown error")}</p>
        </div>
      ) : !isLoading && loans.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No active loans found</p>
        </div>
      ) : (
        <MaterialReactTable
          columns={columns}
          data={loans}
          state={{ isLoading }}
          initialState={{
            columnVisibility: {
              loanId: false,
              memberId: false,
              schedulerTotalAmount: false,
              remainingBal: false,
            },
          }}
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
