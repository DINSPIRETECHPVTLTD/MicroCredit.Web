import axios from "axios"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  type MRT_ColumnDef,
  MaterialReactTable,
} from "material-react-table"
import { useParams } from "react-router-dom"

import { api } from "@/lib/api"
import type { LoanSchedulerResponse } from "@/types/loanScheduler"

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "string") return data
  if (data && typeof data === "object") {
    const obj = data as { message?: string; error?: string; title?: string }
    return obj.message ?? obj.error ?? obj.title ?? fallback
  }
  return fallback
}

export default function LoanSchedulerList() {
  const params = useParams()
  const loanIdRaw = params.loanId ?? params.loadid
  const loanId = loanIdRaw ? Number(loanIdRaw) : NaN

  const { data: rows = [], isLoading, isError, error } = useQuery<LoanSchedulerResponse[]>({
    queryKey: ["loanSchedulers", loanId],
    queryFn: async () => {
      // Backend typically serializes property names in camelCase, so we normalize
      // the response to the PascalCase keys our table columns expect.
      const { data } = await axios.get<any[]>(api.loanScheduler.list(loanId))

      return (data ?? []).map((x) => ({
        LoanschedulerId: x?.LoanschedulerId ?? x?.loanSchedulerId ?? x?.loanSchedulerID,
        LoanID: x?.LoanID ?? x?.loanId ?? x?.loanID,
        InstallmentNo: x?.InstallmentNo ?? x?.installmentNo,
        ScheduleDate: x?.ScheduleDate ?? x?.scheduleDate,
        PaymentDate: x?.PaymentDate ?? x?.paymentDate,
        Status: x?.Status ?? x?.status,
        ActualEmiAmount: x?.ActualEmiAmount ?? x?.actualEmiAmount,
        PaymentMode: x?.PaymentMode ?? x?.paymentMode,
        Comments: x?.Comments ?? x?.comments,
        PaymentAmount: x?.PaymentAmount ?? x?.paymentAmount,
      })) as LoanSchedulerResponse[]
    },
    enabled: Number.isFinite(loanId),
  })

  const totals = useMemo(() => {
    let totalAmount = 0
    let remainingBalance = 0
    let totalPaidAmount = 0

    for (const r of rows) {
      const emiRaw = r.ActualEmiAmount as unknown
      const emi = typeof emiRaw === "string" ? Number(emiRaw) : (emiRaw ?? 0)
      const emiNum = Number.isFinite(Number(emi)) ? Number(emi) : 0

      totalAmount += emiNum

      const statusNorm = String(r.Status ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()

      if (statusNorm === "not paid") {
        remainingBalance += emiNum
      } else if (statusNorm === "paid") {
        totalPaidAmount += emiNum
      }
    }

    return { totalAmount, remainingBalance, totalPaidAmount }
  }, [rows])

  const formatCurrency = (value: number) =>
    value.toLocaleString(undefined, { style: "currency", currency: "INR" })

  const columns = useMemo<MRT_ColumnDef<LoanSchedulerResponse>[]>(
    () => [
      {
        accessorKey: "LoanschedulerId",
        header: "Schedule Id",
        size: 120,
      },
      {
        accessorKey: "LoanID",
        header: "Loan Id",
        size: 100,
      },
      {
        accessorKey: "InstallmentNo",
        header: "Week Number",
        size: 50,
      },
      {
        accessorKey: "ScheduleDate",
        header: "Schedule Date",
        Cell: ({ cell }) => {
          const raw = cell.getValue<string | Date | null | undefined>()
          if (raw == null || raw === "") return "-"
          const d = raw instanceof Date ? raw : new Date(String(raw))
          if (Number.isNaN(d.getTime())) return "-"
          return d.toLocaleDateString()
        },
      },
      {
        accessorKey: "PaymentDate",
        header: "Payment Date",
        Cell: ({ cell }) => {
          const raw = cell.getValue<string | Date | null | undefined>()
          if (raw == null || raw === "") return "-"
          const d = raw instanceof Date ? raw : new Date(String(raw))
          if (Number.isNaN(d.getTime())) return "-"
          return d.toLocaleDateString()
        },
      },
      {
        accessorKey: "Status",
        header: "Payment Status",
      },
      {
        accessorKey: "ActualEmiAmount",
        header: "Actual Emi Amount",
        Cell: ({ cell }) => {
          const raw = cell.getValue<number | string | null | undefined>()
          if (raw == null || raw === "") return "-"
          const n = typeof raw === "string" ? Number(raw) : raw
          if (!Number.isFinite(n)) return "-"
          return n.toLocaleString(undefined, {
            style: "currency",
            currency: "INR",
          })
        },
      },
      {
        accessorKey: "PaymentAmount",
        header: "Paid Amount",
        Cell: ({ cell }) => {
          const raw = cell.getValue<number | string | null | undefined>()
          if (raw == null || raw === "") return "-"
          const n = typeof raw === "string" ? Number(raw) : raw
          if (!Number.isFinite(n)) return "-"
          return n.toLocaleString(undefined, {
            style: "currency",
            currency: "INR",
          })
        },
      },
      {
        accessorKey: "PaymentMode",
        header: "Payment Mode",
      },
      {
        accessorKey: "Comments",
        header: "Reasons",
      },
    ],
    []
  )

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 justify-between">
        <h1 className="text-2xl font-semibold">Loan Scheduler</h1>
        {Number.isFinite(loanId) ? (
          <div className="text-sm text-muted-foreground">Loan Id: {loanId}</div>
        ) : null}
      </div>

      {!Number.isFinite(loanId) ? (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          <p>Missing or invalid `loanId` in the URL.</p>
        </div>
      ) : isError ? (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          <p className="font-medium text-destructive">Failed to load loan scheduler.</p>
          <p className="mt-1 text-sm">{getApiErrorMessage(error, "Unknown error")}</p>
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">TotalAmount</div>
            <div className="mt-1 text-lg font-semibold">{formatCurrency(totals.totalAmount)}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">RemaningBalance</div>
            <div className="mt-1 text-lg font-semibold">
              {formatCurrency(totals.remainingBalance)}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">TotalPaidAmount</div>
            <div className="mt-1 text-lg font-semibold">{formatCurrency(totals.totalPaidAmount)}</div>
          </div>
        </div>
      )}

      {Number.isFinite(loanId) && !isLoading && rows.length === 0 && !isError ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No loan scheduler rows found</p>
        </div>
      ) : (
        <MaterialReactTable
          columns={columns}
          data={rows}
          state={{ isLoading }}
          initialState={{
            columnVisibility: {
              // Keep columns defined, but hide them by default.
              LoanschedulerId: false,
              LoanID: false,
            },
          }}
          enableSorting
          enableColumnFilters
          enableGrouping
          enableColumnPinning
          enableExpanding={false}
        />
      )}
    </div>
  )
}