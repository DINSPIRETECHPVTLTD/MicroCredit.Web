import axios from "axios"
import { useCallback, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
} from "material-react-table"
import toast from "react-hot-toast"
import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { getApiErrorDetails, DEFAULT_API_ERROR_MESSAGE } from "@/lib/apiErrorHandler"
import { masterlookupService } from "@/services/masterLookup.service"
import { getSession } from "@/services/auth.service"
import { loanService } from "@/services/loan.service"
import type { MasterLookupResponse } from "@/types/masterLookup"
import {
  calculatePrepaymentSplit,
  derivePrepaymentStatus,
  normalizePrepaymentStatus,
  PREPAYMENT_STATUS,
  round2,
} from "./prepaymentCalculations"
import { postPrepaymentRecoveries } from "@/services/prepayment.service"

type LoanSchedulerApiRow = {
  loanSchedulerId?: number
  loanSchedulerID?: number
  loanschedulerId?: number
  LoanSchedulerId?: number
  loanId?: number
  LoanID?: number
  installmentNo?: number
  InstallmentNo?: number
  scheduleDate?: string | Date | null
  ScheduleDate?: string | Date | null
  paymentDate?: string | Date | null
  PaymentDate?: string | Date | null
  status?: string
  Status?: string
  actualEmiAmount?: number
  ActualEmiAmount?: number
  paymentAmount?: number
  PaymentAmount?: number
  paymentMode?: string
  PaymentMode?: string
  comments?: string
  Comments?: string
  actualPrincipalAmount?: number | null
  ActualPrincipalAmount?: number | null
  actualInterestAmount?: number | null
  ActualInterestAmount?: number | null
  principalAmount?: number | null
  PrincipalAmount?: number | null
  interestAmount?: number | null
  InterestAmount?: number | null
  principalPercentage?: number | null
  PrincipalPercentage?: number | null
  interestPercentage?: number | null
  InterestPercentage?: number | null
}

type PrepaymentRow = {
  rowKey: string
  loanSchedulerId: number
  loanId: number
  installmentNo: number
  scheduleDate: string | Date | null
  paymentDate: string | Date | null
  actualEmiAmount: number
  paymentAmount: number
  principalAmount: number
  interestAmount: number
  paymentMode: string
  status: string
  comments: string
  actualPrincipalAmount: number | null
  actualInterestAmount: number | null
  principalPercentage?: number
}

type RowDraft = {
  paymentAmount: number
  principalAmount: number
  interestAmount: number
  paymentMode: string
  status: string
  comments: string
}

type CloseSuccessInfo = {
  memberName: string
  loanId: number
  receivedAmount: number
}

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, { style: "currency", currency: "INR" })
}

function parseDate(raw: unknown): string {
  if (!raw) return "-"
  const d = raw instanceof Date ? raw : new Date(String(raw))
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString()
}

function mapSchedulerRow(raw: LoanSchedulerApiRow): PrepaymentRow {
  const loanSchedulerId = toNumber(
    raw.LoanSchedulerId ?? raw.loanSchedulerId ?? raw.loanSchedulerID ?? raw.loanschedulerId
  )
  const loanId = toNumber(raw.LoanID ?? raw.loanId)
  const actualEmiAmount = toNumber(raw.ActualEmiAmount ?? raw.actualEmiAmount)
  const paymentAmountRaw = toNumber(raw.PaymentAmount ?? raw.paymentAmount)
  const postedPrincipalAmount = toNumber(raw.PrincipalAmount ?? raw.principalAmount)
  const postedInterestAmount = toNumber(raw.InterestAmount ?? raw.interestAmount)
  const principalFromActualRaw = raw.ActualPrincipalAmount ?? raw.actualPrincipalAmount
  const interestFromActualRaw = raw.ActualInterestAmount ?? raw.actualInterestAmount
  const principalFromScheduled = postedPrincipalAmount
  const interestFromScheduled = postedInterestAmount
  const principalFromActual =
    principalFromActualRaw == null ? null : toNumber(principalFromActualRaw)
  const interestFromActual =
    interestFromActualRaw == null ? null : toNumber(interestFromActualRaw)
  const actualPrincipalAmount =
    principalFromActual == null
      ? (principalFromScheduled > 0 ? principalFromScheduled : null)
      : (principalFromActual === 0 && principalFromScheduled > 0 ? principalFromScheduled : principalFromActual)
  const actualInterestAmount =
    interestFromActual == null
      ? (interestFromScheduled > 0 ? interestFromScheduled : null)
      : (interestFromActual === 0 && interestFromScheduled > 0 ? interestFromScheduled : interestFromActual)
  const principalPercentageRaw = raw.PrincipalPercentage ?? raw.principalPercentage
  const principalPercentage =
    principalPercentageRaw == null ? undefined : Number(principalPercentageRaw)
  const initialStatus = String(
    raw.Status ?? raw.status ?? derivePrepaymentStatus({ paymentAmount: paymentAmountRaw, actualEmiAmount })
  )
  const normalizedInitialStatus = normalizePrepaymentStatus(initialStatus)
  const isPaidOrPartial =
    normalizedInitialStatus === PREPAYMENT_STATUS.PAID ||
    normalizedInitialStatus === PREPAYMENT_STATUS.PARTIAL_PAID
  const paymentAmount =
    isPaidOrPartial
      ? (paymentAmountRaw > 0
        ? paymentAmountRaw
        : normalizedInitialStatus === PREPAYMENT_STATUS.PAID
          ? actualEmiAmount
          : 0)
      : 0

  const split = calculatePrepaymentSplit(
    {
      actualEmiAmount,
      actualPrincipalAmount,
      actualInterestAmount,
      principalPercentage,
    },
    paymentAmount
  )

  return {
    rowKey: String(loanSchedulerId),
    loanSchedulerId,
    loanId,
    installmentNo: toNumber(raw.InstallmentNo ?? raw.installmentNo),
    scheduleDate: raw.ScheduleDate ?? raw.scheduleDate ?? null,
    paymentDate: raw.PaymentDate ?? raw.paymentDate ?? null,
    actualEmiAmount,
    paymentAmount,
    principalAmount:
      isPaidOrPartial && postedPrincipalAmount > 0 ? postedPrincipalAmount : split.principalAmount,
    interestAmount:
      isPaidOrPartial && postedInterestAmount > 0 ? postedInterestAmount : split.interestAmount,
    paymentMode: String(raw.PaymentMode ?? raw.paymentMode ?? ""),
    status: initialStatus,
    comments: String(raw.Comments ?? raw.comments ?? ""),
    actualPrincipalAmount,
    actualInterestAmount,
    principalPercentage,
  }
}

export default function LoanPrepayment() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const loanId = Number(params.loanId)
  const sessionUserId = getSession()?.userId ?? 0
  const memberNameFromState =
    (location.state as { memberName?: string } | null | undefined)?.memberName ?? "-"

  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({})
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({})
  const [bulkPopupOpen, setBulkPopupOpen] = useState(false)
  const [bulkPaymentMode, setBulkPaymentMode] = useState("")
  const [bulkReason, setBulkReason] = useState("")
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)
  const [closeSuccessInfo, setCloseSuccessInfo] = useState<CloseSuccessInfo | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const { data: baseRows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["loan-prepayment-schedulers", loanId],
    queryFn: async () => {
      const { data } = await axios.get<LoanSchedulerApiRow[]>(api.loanScheduler.list(loanId))
      return (Array.isArray(data) ? data : []).map(mapSchedulerRow)
    },
    enabled: Number.isFinite(loanId) && loanId > 0,
  })

  const { data: lookups = [] } = useQuery({
    queryKey: ["masterLookups"],
    queryFn: () => masterlookupService.getMasterLookups(),
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })

  const paymentModes = useMemo<MasterLookupResponse[]>(() => {
    return lookups.filter((x) => x.lookupKey?.toLowerCase() === "paymentmode")
  }, [lookups])
  const shouldFetchMemberFallback = !memberNameFromState || memberNameFromState === "-"
  const { data: activeLoans = [] } = useQuery({
    queryKey: ["activeLoans", "prepayment-member-fallback"],
    queryFn: () => loanService.getActiveLoans(),
    enabled: shouldFetchMemberFallback,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  const rows = useMemo<PrepaymentRow[]>(() => {
    return baseRows.map((r) => {
      const d = rowDrafts[r.rowKey]
      return d ? { ...r, ...d } : r
    })
  }, [baseRows, rowDrafts])
  const apiReadOnlyByRowKey = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const r of baseRows) {
      const normalized = normalizePrepaymentStatus(r.status)
      map[r.rowKey] =
        normalized === PREPAYMENT_STATUS.PAID ||
        normalized === PREPAYMENT_STATUS.PARTIAL_PAID ||
        normalized === PREPAYMENT_STATUS.OVERDUE
    }
    return map
  }, [baseRows])

  const selectedRows = useMemo(() => {
    return rows.filter((r) => rowSelection[r.rowKey])
  }, [rows, rowSelection])
  const pendingRows = useMemo(() => rows.filter((r) => !apiReadOnlyByRowKey[r.rowKey]), [apiReadOnlyByRowKey, rows])

  const selectedTotal = useMemo(() => {
    return selectedRows.reduce((sum, row) => sum + (row.paymentAmount || 0), 0)
  }, [selectedRows])

  const loanSummary = useMemo(() => {
    const totalAmount = rows.reduce((sum, r) => sum + (r.actualEmiAmount || 0), 0)
    const remainingBalance = rows.reduce((sum, r) => {
      const st = normalizePrepaymentStatus(r.status)
      if (st === PREPAYMENT_STATUS.PAID) return sum
      const remaining = Math.max(0, (r.actualEmiAmount || 0) - (r.paymentAmount || 0))
      return sum + remaining
    }, 0)
    const fallbackMemberName = activeLoans.find((l) => l.loanId === loanId)?.fullName || "-"
    return {
      memberName: shouldFetchMemberFallback ? fallbackMemberName : memberNameFromState,
      totalAmount,
      remainingBalance,
    }
  }, [activeLoans, loanId, memberNameFromState, rows, shouldFetchMemberFallback])

  const updateDraft = useCallback((row: PrepaymentRow, patch: Partial<RowDraft>) => {
    setRowDrafts((prev) => {
      const merged: RowDraft = {
        paymentAmount: prev[row.rowKey]?.paymentAmount ?? row.paymentAmount,
        principalAmount: prev[row.rowKey]?.principalAmount ?? row.principalAmount,
        interestAmount: prev[row.rowKey]?.interestAmount ?? row.interestAmount,
        paymentMode: prev[row.rowKey]?.paymentMode ?? row.paymentMode,
        status: prev[row.rowKey]?.status ?? row.status,
        comments: prev[row.rowKey]?.comments ?? row.comments,
        ...patch,
      }
      return { ...prev, [row.rowKey]: merged }
    })
  }, [])

  const handlePaymentAmountChange = useCallback(
    (row: PrepaymentRow, payment: number) => {
      const safe = Number.isNaN(payment) ? 0 : Math.max(0, payment)
      const split = calculatePrepaymentSplit(row, safe)
      updateDraft(row, {
        paymentAmount: safe,
        principalAmount: split.principalAmount,
        interestAmount: split.interestAmount,
        status: derivePrepaymentStatus({ paymentAmount: safe, actualEmiAmount: row.actualEmiAmount }),
      })
    },
    [updateDraft]
  )

  const handlePaymentAmountBlur = useCallback(
    (row: PrepaymentRow) => {
      const amount = Number(row.paymentAmount || 0)
      const emi = Number(row.actualEmiAmount || 0)
      if (emi <= 0) return
      if (amount < emi) {
        toast.error("Amount should not be less than EMI amount.")
      } else if (amount > emi) {
        toast.error("Amount should not be more than EMI amount.")
      } else {
        return
      }
      const split = calculatePrepaymentSplit(row, emi)
      updateDraft(row, {
        paymentAmount: emi,
        principalAmount: split.principalAmount,
        interestAmount: split.interestAmount,
        status: PREPAYMENT_STATUS.PAID,
      })
    },
    [updateDraft]
  )

  const handleRowSelectionChange = useCallback(
    (updater: MRT_RowSelectionState | ((prev: MRT_RowSelectionState) => MRT_RowSelectionState)) => {
      setRowSelection((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        const newlySelected = Object.keys(next).filter((k) => next[k] && !prev[k])
        const newlyDeselected = Object.keys(prev).filter((k) => prev[k] && !next[k])
        if (newlySelected.length > 0) {
          setRowDrafts((draftPrev) => {
            const draftNext = { ...draftPrev }
            for (const rowKey of newlySelected) {
              const row = rows.find((r) => r.rowKey === rowKey)
              if (!row) continue
              const isReadOnly = apiReadOnlyByRowKey[row.rowKey]
              if (isReadOnly) continue
              const amount = row.actualEmiAmount
              const split = calculatePrepaymentSplit(row, amount)
              draftNext[rowKey] = {
                paymentAmount: amount,
                principalAmount: split.principalAmount,
                interestAmount: split.interestAmount,
                paymentMode: row.paymentMode,
                status: PREPAYMENT_STATUS.PAID,
                comments: row.comments,
              }
            }
            return draftNext
          })
          setBulkPopupOpen(true)
        }
        if (newlyDeselected.length > 0) {
          setRowDrafts((draftPrev) => {
            const draftNext = { ...draftPrev }
            for (const rowKey of newlyDeselected) {
              delete draftNext[rowKey]
            }
            return draftNext
          })
        }
        return next
      })
    },
    [apiReadOnlyByRowKey, rows]
  )

  const handleApplyBulkDetails = useCallback(() => {
    if (!bulkPaymentMode.trim()) {
      toast.error("Select payment mode.")
      return
    }
    const selectedKeys = Object.keys(rowSelection).filter((k) => rowSelection[k])
    if (selectedKeys.length === 0) {
      toast.error("Select at least one EMI row.")
      return
    }

    setRowDrafts((prev) => {
      const next = { ...prev }
      for (const key of selectedKeys) {
        const row = rows.find((r) => r.rowKey === key)
        if (!row) continue
        next[key] = {
          paymentAmount: prev[key]?.paymentAmount ?? row.paymentAmount,
          principalAmount: prev[key]?.principalAmount ?? row.principalAmount,
          interestAmount: prev[key]?.interestAmount ?? row.interestAmount,
          paymentMode: bulkPaymentMode.trim(),
          status: prev[key]?.status ?? row.status,
          comments: bulkReason,
        }
      }
      return next
    })
    setBulkPopupOpen(false)
  }, [bulkPaymentMode, bulkReason, rowSelection, rows])

  const handleCancel = useCallback(() => {
    setRowDrafts({})
    setRowSelection({})
    navigate("/loans/manage")
  }, [navigate])

  const executeSave = useCallback(async () => {
    if (!sessionUserId) {
      toast.error("Unable to identify current user.")
      return
    }
    if (selectedRows.length === 0) {
      toast.error("Select at least one EMI row.")
      return
    }
    const closableRows = rows.filter((r) => !apiReadOnlyByRowKey[r.rowKey])
    const isFullClosureSelection =
      closableRows.length > 0 &&
      selectedRows.length === closableRows.length &&
      closableRows.every((r) => rowSelection[r.rowKey])

    for (const row of selectedRows) {
      const status = normalizePrepaymentStatus(row.status)
      const amount = round2(row.paymentAmount || 0)
      const emi = round2(row.actualEmiAmount || 0)
      if (amount <= 0) {
        toast.error(`Week ${row.installmentNo}: payment amount must be greater than zero.`)
        return
      }
      if (status === PREPAYMENT_STATUS.OVERDUE) {
        toast.error(`Week ${row.installmentNo}: overdue EMI is read-only and cannot be posted here.`)
        return
      }
      if (emi > 0 && amount > emi) {
        toast.error(`Week ${row.installmentNo}: payment amount cannot exceed weekly due.`)
        return
      }
      if (emi > 0 && amount < emi) {
        toast.error(`Week ${row.installmentNo}: payment amount cannot be less than weekly due.`)
        return
      }
      if (!String(row.paymentMode || "").trim()) {
        toast.error(`Week ${row.installmentNo}: select payment mode.`)
        return
      }
      if (status !== PREPAYMENT_STATUS.PAID || Math.abs(amount - emi) > 0.001) {
        toast.error(`Week ${row.installmentNo}: full EMI payment is required.`)
        return
      }
    }

    let emiPosted = false
    try {
      setIsSaving(true)
      const items = selectedRows.map((r) => {
        const split = calculatePrepaymentSplit(
          {
            actualEmiAmount: r.actualEmiAmount,
            actualPrincipalAmount: r.actualPrincipalAmount,
            actualInterestAmount: r.actualInterestAmount,
            principalPercentage: r.principalPercentage,
          },
          round2(r.paymentAmount)
        )
        return {
          loanSchedulerId: r.loanSchedulerId,
          paymentAmount: round2(r.paymentAmount),
          principalAmount: round2(split.principalAmount),
          interestAmount: round2(split.interestAmount),
          paymentMode: String(r.paymentMode ?? "").trim(),
          status: String(r.status ?? "").trim(),
          comments: String(r.comments ?? "").trim() || undefined,
        }
      })
      if (isFullClosureSelection) {
        const receivedAmount = items.reduce((sum, item) => sum + Number(item.paymentAmount || 0), 0)
        await postPrepaymentRecoveries({
          collectedBy: sessionUserId,
          items,
        })
        emiPosted = true
        const closeRes = await axios.put<{
          loanId: number
          isClosed: boolean
          status: string
          closureDate?: string | null
        }>(api.loans.close(loanId))
        if (closeRes.data?.isClosed) {
          toast.success("All EMIs paid. Loan closed successfully.")
          setCloseSuccessInfo({
            memberName: loanSummary.memberName || "-",
            loanId,
            receivedAmount: round2(receivedAmount),
          })
        } else {
          toast.error(
            "EMI posted, but loan is not closed. Ensure all pending EMIs are paid and try close again."
          )
          return
        }
      } else {
        const result = await postPrepaymentRecoveries({
          collectedBy: sessionUserId,
          items,
        })
        emiPosted = true
        toast.success(result.message || `Posted ${result.postedCount || selectedRows.length} EMI row(s).`)
      }
      setRowSelection({})
      setRowDrafts({})
      await refetch()
    } catch (err) {
      const details = getApiErrorDetails(err)
      if (isFullClosureSelection && emiPosted) {
        toast.error("EMI update completed but loan closure failed. Please retry Close Loan.")
      } else {
        toast.error(details.message || DEFAULT_API_ERROR_MESSAGE)
      }
      setRowSelection({})
      setRowDrafts({})
      await refetch()
    } finally {
      setIsSaving(false)
    }
  }, [apiReadOnlyByRowKey, loanId, loanSummary.memberName, refetch, rowSelection, rows, selectedRows, sessionUserId])

  const handleSave = useCallback(() => {
    if (pendingRows.length === 0) {
      toast("All EMIs are already paid. Loan is closed.")
      return
    }
    const closableRows = rows.filter((r) => !apiReadOnlyByRowKey[r.rowKey])
    const isFullClosureSelection =
      closableRows.length > 0 &&
      selectedRows.length === closableRows.length &&
      closableRows.every((r) => rowSelection[r.rowKey])

    if (isFullClosureSelection) {
      setCloseConfirmOpen(true)
      return
    }

    void executeSave()
  }, [apiReadOnlyByRowKey, executeSave, pendingRows.length, rowSelection, rows, selectedRows])

  const columns = useMemo<MRT_ColumnDef<PrepaymentRow>[]>(
    () => [
      { accessorKey: "installmentNo", header: "Week No", size: 70 },
      {
        accessorKey: "scheduleDate",
        header: "Collection Date",
        Cell: ({ cell }) => parseDate(cell.getValue()),
      },
      {
        accessorKey: "paymentDate",
        header: "Paid Date",
        Cell: ({ cell }) => parseDate(cell.getValue()),
      },
      {
        accessorKey: "status",
        header: "Payment Status",
        Cell: ({ row }) => {
          const s = normalizePrepaymentStatus(row.original.status)
          const cls =
            s === PREPAYMENT_STATUS.PAID
              ? "text-green-700 dark:text-green-400"
              : s === PREPAYMENT_STATUS.PARTIAL_PAID
                ? "text-amber-700 dark:text-amber-400"
                : s === PREPAYMENT_STATUS.OVERDUE
                  ? "text-red-700 dark:text-red-400"
                : "text-muted-foreground"
          return (
            <span className={cn("text-sm font-medium", cls)}>{row.original.status}</span>
          )
        },
      },
      {
        accessorKey: "paymentAmount",
        header: "Paid Amount",
        Cell: ({ row }) => {
          const isReadOnly = !!apiReadOnlyByRowKey[row.original.rowKey]
          const isSelected = !!rowSelection[row.original.rowKey]
          return (
            <input
              type="number"
              min={0}
              step="0.01"
              className={cn(
                "h-8 w-[110px] rounded-md border border-input bg-background px-2 text-sm",
                (isReadOnly || !isSelected) && "cursor-not-allowed bg-muted text-muted-foreground"
              )}
              value={Number.isFinite(row.original.paymentAmount) ? row.original.paymentAmount : 0}
              readOnly={isReadOnly || !isSelected}
              onChange={(e) => handlePaymentAmountChange(row.original, parseFloat(e.target.value))}
              onBlur={() => handlePaymentAmountBlur(row.original)}
            />
          )
        },
      },
      {
        accessorKey: "actualEmiAmount",
        header: "Weekly Due",
        Cell: ({ cell }) => formatCurrency(toNumber(cell.getValue())),
      },
      {
        accessorKey: "principalAmount",
        header: "Principal Amount",
        Cell: ({ cell }) => formatCurrency(toNumber(cell.getValue())),
      },
      {
        accessorKey: "interestAmount",
        header: "Interest Amount",
        Cell: ({ cell }) => formatCurrency(toNumber(cell.getValue())),
      },
      {
        accessorKey: "paymentMode",
        header: "Payment Mode",
        Cell: ({ row }) => {
          const isReadOnly = !!apiReadOnlyByRowKey[row.original.rowKey]
          const isSelected = !!rowSelection[row.original.rowKey]
          const value = row.original.paymentMode || ""
          return (
            <select
              className={cn(
                "h-8 w-[120px] rounded-md border border-input bg-background px-2 text-sm",
                (isReadOnly || !isSelected) && "cursor-not-allowed bg-muted text-muted-foreground"
              )}
              value={value}
              disabled={isReadOnly || !isSelected}
              onChange={(e) => updateDraft(row.original, { paymentMode: e.target.value })}
            >
              <option value="">Select</option>
              {paymentModes.map((m) => (
                <option key={m.id} value={m.lookupValue}>
                  {m.lookupValue}
                </option>
              ))}
            </select>
          )
        },
      },
      {
        accessorKey: "comments",
        header: "Reasons",
        Cell: ({ row }) => {
          const isReadOnly = !!apiReadOnlyByRowKey[row.original.rowKey]
          const isSelected = !!rowSelection[row.original.rowKey]
          return (
            <input
              type="text"
              className={cn(
                "h-8 w-[160px] rounded-md border border-input bg-background px-2 text-sm",
                (isReadOnly || !isSelected) && "cursor-not-allowed bg-muted text-muted-foreground"
              )}
              value={row.original.comments || ""}
              readOnly={isReadOnly || !isSelected}
              onChange={(e) => updateDraft(row.original, { comments: e.target.value })}
            />
          )
        },
      },
    ],
    [apiReadOnlyByRowKey, handlePaymentAmountBlur, handlePaymentAmountChange, paymentModes, rowSelection, updateDraft]
  )

  if (!Number.isFinite(loanId) || loanId <= 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        Missing or invalid `loanId` in the URL.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prepayment / Part-Payment</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setBulkPopupOpen(true)}
            disabled={selectedRows.length === 0}
          >
            Apply to Selected
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || pendingRows.length === 0}>
            <Save className="h-4 w-4" />
            {pendingRows.length === 0 ? "All Paid" : isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Loan Summary</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <p className="text-xs text-muted-foreground">Member Name</p>
            <p className="font-medium">{loanSummary.memberName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Loan Id</p>
            <p className="font-medium">{loanId}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="font-medium">{formatCurrency(loanSummary.totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining Balance</p>
            <p className="font-medium">{formatCurrency(loanSummary.remainingBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Selected Total</p>
            <p className="font-medium">{formatCurrency(selectedTotal)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        {isError ? (
          <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
            {getApiErrorDetails(error).message || DEFAULT_API_ERROR_MESSAGE}
          </div>
        ) : (
          <MaterialReactTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.rowKey}
            enableRowSelection={(row) => !apiReadOnlyByRowKey[row.original.rowKey]}
            enableSelectAll={pendingRows.length > 0}
            muiSelectAllCheckboxProps={{
              disabled: pendingRows.length === 0,
              sx: pendingRows.length === 0 ? { visibility: "hidden" } : undefined,
            }}
            muiSelectCheckboxProps={({ row }) => ({
              sx: apiReadOnlyByRowKey[row.original.rowKey] ? { visibility: "hidden" } : undefined,
            })}
            onRowSelectionChange={handleRowSelectionChange}
            state={{ rowSelection, isLoading }}
            initialState={{ pagination: { pageSize: 20, pageIndex: 0 } }}
            enableSorting
            enableColumnFilters={false}
            enableGrouping={false}
            enableExpanding={false}
            enableColumnPinning
          />
        )}
      </section>

      {bulkPopupOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-4 shadow-lg">
            <h3 className="text-base font-semibold">Update Selected EMIs</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Selected rows: {selectedRows.length}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Payment Mode</label>
                <select
                  className={cn("h-9 w-full rounded-md border border-input bg-background px-2 text-sm")}
                  value={bulkPaymentMode}
                  onChange={(e) => setBulkPaymentMode(e.target.value)}
                >
                  <option value="">Select</option>
                  {paymentModes.map((m) => (
                    <option key={m.id} value={m.lookupValue}>
                      {m.lookupValue}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Reason</label>
                <input
                  type="text"
                  className={cn("h-9 w-full rounded-md border border-input bg-background px-2 text-sm")}
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="Reason"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setBulkPopupOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleApplyBulkDetails}>Apply</Button>
            </div>
          </div>
        </div>
      ) : null}

      {closeConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-4 shadow-lg">
            <h3 className="text-base font-semibold">Confirm Loan Closure</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You selected all pending EMIs. This will close the loan. Continue?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCloseConfirmOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setCloseConfirmOpen(false)
                  void executeSave()
                }}
                disabled={isSaving}
              >
                Yes, Close Loan
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {closeSuccessInfo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-4 shadow-lg">
            <h3 className="text-base font-semibold">Loan Closed Successfully</h3>
            <div className="mt-3 space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Member Name:</span>{" "}
                <span className="font-medium">{closeSuccessInfo.memberName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Loan Id:</span>{" "}
                <span className="font-medium">{closeSuccessInfo.loanId}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Received Amount:</span>{" "}
                <span className="font-medium">{formatCurrency(closeSuccessInfo.receivedAmount)}</span>
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setCloseSuccessInfo(null)}>OK</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
