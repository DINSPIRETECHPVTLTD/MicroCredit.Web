/**
 * Recovery Posting UI — filters and grid live here; data loading is in ./recoveryPostingData.ts.
 */
import { useCallback, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
} from "material-react-table"
import Autocomplete from "@mui/material/Autocomplete"
import TextField from "@mui/material/TextField"
import { Check } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getApiErrorDetails,
  DEFAULT_API_ERROR_MESSAGE,
  type ApiErrorDetails,
} from "@/lib/apiErrorHandler"
import { getBranch, getSession } from "@/services/auth.service"
import { centerService } from "@/services/center.service"
import { pocService } from "@/services/poc.service"
import { staffService } from "@/services/staff.service"
import type { CenterResponse } from "@/types/center"
import type { PocResponse } from "@/types/poc"
import type { StaffResponse } from "@/types/staff"
import { masterlookupService } from "@/services/masterLookup.service"
import type { MasterLookupResponse } from "@/types/masterLookup"
import {
  fetchRecoveryPostingSchedulers,
  postRecoveryPosting,
  type RecoveryPostingRow,
} from "./recoveryPostingData"
import {
  calculatePaymentSplitFromSchedule,
  deriveStatusFromAmounts,
  normalizeStatusValue,
  round2,
  RECOVERY_STATUS,
} from "./recoveryPostingCalculations"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring focus-visible:ring-offset-2"

/** Stable fallbacks: `useQuery`'s `data ?? []` default creates a new `[]` each render and breaks `useEffect([gridRows])`. */
const EMPTY_RECOVERY_ROWS: RecoveryPostingRow[] = []
const EMPTY_CENTERS: CenterResponse[] = []
const EMPTY_POCS: PocResponse[] = []
const EMPTY_LOOKUPS: MasterLookupResponse[] = []
const EMPTY_STAFF: StaffResponse[] = []

/** API may send isActive on branch users; keep typing local to this page. */
type BranchUserForCollectedBy = StaffResponse & { isActive?: boolean }
type RecoveryRowDraft = {
  paymentAmount: number
  principalAmount: number
  interestAmount: number
  status: string
}
type RecoveryPostingFieldErrorState = {
  collectedBy?: string
  rows: Record<
    string,
    {
      paymentAmount?: string
      principalAmount?: string
      interestAmount?: string
      paymentMode?: string
      status?: string
      comments?: string
      general?: string
    }
  >
}

const EMPTY_FIELD_ERRORS: RecoveryPostingFieldErrorState = { rows: {} }

function formatDisplayDate(dateKey: string): string {
  const parts = dateKey.split("-").map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (!y || !m || !d) return dateKey
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "INR" })
}

function todayDateKey(): string {
  const t = new Date()
  const y = t.getFullYear()
  const mo = String(t.getMonth() + 1).padStart(2, "0")
  const day = String(t.getDate()).padStart(2, "0")
  return `${y}-${mo}-${day}`
}

/** Compare role strings from API (e.g. "Owner" vs "OWNER"). */
function normalizeUserRole(role: string | undefined): string {
  if (!role) return ""
  return role.trim().toUpperCase().replace(/\s+/g, "_")
}

function isOwnerRole(role: string | undefined): boolean {
  return normalizeUserRole(role) === "OWNER"
}

function clearRowFieldError(
  prev: RecoveryPostingFieldErrorState,
  rowKey: string,
  field: keyof RecoveryPostingFieldErrorState["rows"][string]
): RecoveryPostingFieldErrorState {
  const row = prev.rows[rowKey]
  if (!row || !row[field]) return prev
  const nextRow = { ...row }
  delete nextRow[field]
  const nextRows = { ...prev.rows }
  if (Object.keys(nextRow).length === 0) delete nextRows[rowKey]
  else nextRows[rowKey] = nextRow
  return { ...prev, rows: nextRows }
}

function mapApiValidationErrorsToRecoveryFields(
  details: ApiErrorDetails,
  rowsToPost: RecoveryPostingRow[]
): RecoveryPostingFieldErrorState {
  const next: RecoveryPostingFieldErrorState = { rows: {} }
  const errors = details.validationErrors
  if (Object.keys(errors).length === 0) return next

  for (const [rawKey, messages] of Object.entries(errors)) {
    const message = messages[0]
    if (!message) continue
    const normalizedKey = rawKey.trim().toLowerCase()

    if (normalizedKey.includes("collectedby")) {
      next.collectedBy = message
      continue
    }

    const itemMatch = normalizedKey.match(/items[[.](\d+)[\].]?/i)
    const row = itemMatch ? rowsToPost[Number(itemMatch[1])] : undefined
    const rowKey = row?.rowKey
    if (!rowKey) continue

    const rowErrors = next.rows[rowKey] ?? {}
    if (normalizedKey.includes("paymentmode")) rowErrors.paymentMode = message
    else if (normalizedKey.includes("status")) rowErrors.status = message
    else if (normalizedKey.includes("paymentamount")) rowErrors.paymentAmount = message
    else if (normalizedKey.includes("principalamount")) rowErrors.principalAmount = message
    else if (normalizedKey.includes("interestamount")) rowErrors.interestAmount = message
    else if (normalizedKey.includes("comments")) rowErrors.comments = message
    else rowErrors.general = message

    next.rows[rowKey] = rowErrors
  }

  return next
}

function RecoveryPostingList() {
  const branch = getBranch()
  const branchId = branch?.id

  const [dateKey, setDateKey] = useState(todayDateKey)
  const [centerId, setCenterId] = useState(0)
  const [pocId, setPocId] = useState(0)
  const [collectedById, setCollectedById] = useState(0)
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({})
  const [paymentModeDraft, setPaymentModeDraft] = useState<Record<string, string>>({})
  const [commentsDraft, setCommentsDraft] = useState<Record<string, string>>({})
  const [rowEdits, setRowEdits] = useState<Record<string, RecoveryRowDraft>>({})
  const [fieldErrors, setFieldErrors] = useState<RecoveryPostingFieldErrorState>(EMPTY_FIELD_ERRORS)

  const { data: centersData } = useQuery({
    queryKey: ["centers"],
    queryFn: () => centerService.getCenters(),
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })
  const centers = centersData ?? EMPTY_CENTERS

  const { data: pocsData } = useQuery({
    queryKey: ["pocs", branchId],
    queryFn: () => pocService.getByBranch(branchId!),
    enabled: !!branchId && centerId > 0,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })
  const pocsByBranch = pocsData ?? EMPTY_POCS

  const pocsForCenter = useMemo<PocResponse[]>(() => {
    if (!centerId) return []
    return pocsByBranch.filter((p) => p.centerId === centerId)
  }, [pocsByBranch, centerId])

  const { data: staffData } = useQuery({
    queryKey: ["staff"],
    queryFn: () => staffService.getStaffs(),
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })

  /** Active branch users; Owner role appears only for BRANCH_ADMIN or OWNER. */
  const collectedByOptions = useMemo(() => {
    const rows = (staffData ?? EMPTY_STAFF) as BranchUserForCollectedBy[]
    const active = rows.filter((u) => u.isActive !== false)
    const sessionRole = getSession()?.role
    const maySeeOwner =
      sessionRole === "BRANCH_ADMIN" || sessionRole === "OWNER"
    if (maySeeOwner) return active
    return active.filter((u) => !isOwnerRole(u.role))
  }, [staffData])

  const {
    data: recoveryData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["recoveryPosting", branchId, dateKey, centerId, pocId],
    queryFn: () =>
      fetchRecoveryPostingSchedulers({
        dateKey,
        centerId,
        pocId,
      }),
    enabled: !!branchId && !!dateKey,
    staleTime: 1000 * 60 * 2,
  })

  const gridRows = recoveryData ?? EMPTY_RECOVERY_ROWS

  /** Payment mode options only needed when the grid has rows — avoids GET /masterLookups on empty screen. */
  const hasGridData = gridRows.length > 0

  const { data: masterLookupsData } = useQuery({
    queryKey: ["masterLookups"],
    queryFn: () => masterlookupService.getMasterLookups(),
    enabled: hasGridData,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })
  const allLookups = masterLookupsData ?? EMPTY_LOOKUPS

  const paymentModeLookups = useMemo<MasterLookupResponse[]>(
    () => allLookups.filter((x) => x.lookupKey?.toLowerCase() === "paymentmode"),
    [allLookups]
  )

  const editableRows = useMemo<RecoveryPostingRow[]>(() => {
    return gridRows.map((row) => {
      const draft = rowEdits[row.rowKey]
      return draft ? { ...row, ...draft } : row
    })
  }, [gridRows, rowEdits])

  const resetTableDrafts = useCallback(() => {
    setRowSelection({})
    setPaymentModeDraft({})
    setCommentsDraft({})
    setRowEdits({})
    setFieldErrors(EMPTY_FIELD_ERRORS)
  }, [])

  const effectiveCollectedById = useMemo(() => {
    if (!collectedById) return 0
    return collectedByOptions.some((u) => u.id === collectedById) ? collectedById : 0
  }, [collectedById, collectedByOptions])

  const updatePaymentAmount = useCallback((rowKey: string, payment: number) => {
    setRowEdits((prev) => {
      const baseRow = gridRows.find((r) => r.rowKey === rowKey)
      if (!baseRow) return prev
      const mergedRow = { ...baseRow, ...(prev[rowKey] ?? {}) }
      const { principalAmount, interestAmount } = calculatePaymentSplitFromSchedule(mergedRow, payment)
      return {
        ...prev,
        [rowKey]: {
          paymentAmount: payment,
          principalAmount,
          interestAmount,
          status: deriveStatusFromAmounts({ ...mergedRow, paymentAmount: payment }),
        },
      }
    })
    setFieldErrors((prev) => {
      let next = clearRowFieldError(prev, rowKey, "paymentAmount")
      next = clearRowFieldError(next, rowKey, "principalAmount")
      next = clearRowFieldError(next, rowKey, "interestAmount")
      next = clearRowFieldError(next, rowKey, "status")
      next = clearRowFieldError(next, rowKey, "general")
      return next
    })
  }, [gridRows])

  const selectedTotal = useMemo(() => {
    let sum = 0
    for (const r of editableRows) {
      if (rowSelection[r.rowKey]) {
        sum += r.paymentAmount ?? 0
      }
    }
    return sum
  }, [editableRows, rowSelection])

  const handlePost = useCallback(async () => {
    setFieldErrors(EMPTY_FIELD_ERRORS)
    const keys = Object.keys(rowSelection).filter((k) => rowSelection[k])
    if (keys.length === 0) {
      toast.error("Select at least one row to post recovery.")
      return
    }
    if (!effectiveCollectedById) {
      setFieldErrors({ rows: {}, collectedBy: "Select Collected By." })
      toast.error("Select Collected By.")
      return
    }

    const selectedRows = keys
      .map((k) => editableRows.find((r) => r.rowKey === k))
      .filter((r): r is RecoveryPostingRow => r != null)

    const rowsToPost = selectedRows
      .map((r) => ({
        ...r,
        paymentMode: (paymentModeDraft[r.rowKey] ?? r.paymentMode ?? "").trim(),
        comments: commentsDraft[r.rowKey] ?? r.comments,
      }))
      .filter((r) => (r.paymentAmount ?? 0) > 0)
    if (rowsToPost.length === 0) {
      toast.error("Enter a payment amount greater than zero for at least one row.")
      return
    }

    try {
      const result = await postRecoveryPosting({
        collectedBy: effectiveCollectedById,
        items: rowsToPost.map((r) => ({
          loanSchedulerId: r.loanSchedulerId,
          // Backend validates `paymentAmount == principalAmount + interestAmount` using
          // exact decimal equality. Re-derive interest from the rounded payment to avoid
          // any floating/rounding drift between fields.
          paymentAmount: round2(r.paymentAmount),
          principalAmount: round2(r.principalAmount),
          interestAmount: round2(round2(r.paymentAmount) - round2(r.principalAmount)),
          paymentMode: r.paymentMode.trim(),
          status: r.status.trim(),
          comments: r.comments?.trim() || undefined,
        })),
      })
      toast.success(
        result.message?.trim() || `Posted ${result.postedCount || rowsToPost.length} recovery row(s).`
      )
      setFieldErrors(EMPTY_FIELD_ERRORS)
      setRowEdits({})
      setRowSelection({})
      await refetch()
    } catch (err: unknown) {
      const details = getApiErrorDetails(err)
      const mappedFieldErrors = mapApiValidationErrorsToRecoveryFields(details, rowsToPost)
      if (Object.keys(mappedFieldErrors.rows).length > 0 || mappedFieldErrors.collectedBy) {
        setFieldErrors(mappedFieldErrors)
      }
      toast.error(details.message || DEFAULT_API_ERROR_MESSAGE)
    }
  }, [rowSelection, effectiveCollectedById, editableRows, paymentModeDraft, commentsDraft, refetch])

  const columns = useMemo<MRT_ColumnDef<RecoveryPostingRow>[]>(
    () => [
      {
        accessorKey: "loanId",
        header: "Loan Id",
        size: 88,
      },
      {
        accessorKey: "installmentNo",
        header: "Installment",
        size: 100,
      },
      {
        accessorKey: "actualEmiAmount",
        header: "Actual EMI",
        Cell: ({ cell }) => formatCurrency(Number(cell.getValue()) || 0),
      },
      {
        id: "actualPrincipal",
        header: "Actual Principal",
        accessorFn: (row) => row.actualPrincipalAmount,
        Cell: ({ row }) =>
          row.original.actualPrincipalAmount != null
            ? formatCurrency(row.original.actualPrincipalAmount)
            : "—",
      },
      {
        id: "actualInterest",
        header: "Actual Interest",
        accessorFn: (row) => row.actualInterestAmount,
        Cell: ({ row }) =>
          row.original.actualInterestAmount != null
            ? formatCurrency(row.original.actualInterestAmount)
            : "—",
      },
      {
        id: "paymentAmount",
        accessorKey: "paymentAmount",
        header: "Payment Amount",
        size: 120,
        Cell: ({ row }) => {
          const rowFieldErrors = fieldErrors.rows[row.original.rowKey]
          const v = row.original.paymentAmount
          return (
            <div className="space-y-1">
              <input
                type="number"
                step="0.01"
                min={0}
                className={cn(
                  inputClass,
                  "py-1.5 tabular-nums max-w-[7.5rem]",
                  rowFieldErrors?.paymentAmount && "border-destructive"
                )}
                value={Number.isFinite(v) ? v : 0}
                onChange={(e) => {
                  const n = parseFloat(e.target.value)
                  updatePaymentAmount(row.original.rowKey, Number.isNaN(n) ? 0 : n)
                }}
              />
              {rowFieldErrors?.paymentAmount ? (
                <p className="text-xs text-destructive">{rowFieldErrors.paymentAmount}</p>
              ) : null}
              {rowFieldErrors?.general ? (
                <p className="text-xs text-destructive">{rowFieldErrors.general}</p>
              ) : null}
            </div>
          )
        },
      },
      {
        id: "principalAmt",
        header: "Principal Amt",
        accessorFn: (row) => row.principalAmount,
        Cell: ({ row }) => formatCurrency(row.original.principalAmount ?? 0),
      },
      {
        id: "interestAmt",
        header: "Interest Amt",
        accessorFn: (row) => row.interestAmount,
        Cell: ({ row }) => formatCurrency(row.original.interestAmount ?? 0),
      },
      {
        id: "paymentMode",
        header: "Payment Mode",
        size: 140,
        maxSize: 180,
        enableSorting: false,
        Cell: ({ row }) => {
          const rowFieldErrors = fieldErrors.rows[row.original.rowKey]
          const key = row.original.rowKey
          const value =
            paymentModeDraft[key] ??
            row.original.paymentMode ??
            (paymentModeLookups[0]?.lookupValue ?? "")
          return (
            <div>
              <select
                className={cn(
                  inputClass,
                  "py-1.5 w-full max-w-[9.5rem] min-w-0 text-sm",
                  rowFieldErrors?.paymentMode && "border-destructive"
                )}
                value={value || ""}
                onChange={(e) => {
                  setPaymentModeDraft((prev) => ({ ...prev, [key]: e.target.value }))
                  setFieldErrors((prev) => {
                    let next = clearRowFieldError(prev, key, "paymentMode")
                    next = clearRowFieldError(next, key, "general")
                    return next
                  })
                }}
              >
                <option value="">Select</option>
                {paymentModeLookups.map((m) => (
                  <option key={m.id} value={m.lookupValue}>
                    {m.lookupValue}
                  </option>
                ))}
              </select>
              {rowFieldErrors?.paymentMode ? (
                <p className="mt-1 text-xs text-destructive">{rowFieldErrors.paymentMode}</p>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 110,
        Cell: ({ row }) => {
          const rowFieldErrors = fieldErrors.rows[row.original.rowKey]
          const s = normalizeStatusValue(row.original.status)
          const cls =
            s === RECOVERY_STATUS.PAID
              ? "text-green-700 dark:text-green-400"
              : s === RECOVERY_STATUS.PARTIAL_PAID
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground"
          return (
            <div className="space-y-1">
              <span className={cn("text-sm font-medium", cls)}>{row.original.status}</span>
              {rowFieldErrors?.status ? (
                <p className="text-xs text-destructive">{rowFieldErrors.status}</p>
              ) : null}
            </div>
          )
        },
      },
      {
        id: "comments",
        header: "Comments",
        size: 180,
        enableSorting: false,
        Cell: ({ row }) => {
          const rowFieldErrors = fieldErrors.rows[row.original.rowKey]
          const key = row.original.rowKey
          const value = commentsDraft[key] ?? row.original.comments ?? ""
          return (
            <div className="space-y-1">
              <input
                type="text"
                className={cn(inputClass, "py-1.5", rowFieldErrors?.comments && "border-destructive")}
                value={value}
                placeholder="Comments"
                onChange={(e) =>
                  {
                    setCommentsDraft((prev) => ({ ...prev, [key]: e.target.value }))
                    setFieldErrors((prev) => {
                      let next = clearRowFieldError(prev, key, "comments")
                      next = clearRowFieldError(next, key, "general")
                      return next
                    })
                  }
                }
              />
              {rowFieldErrors?.comments ? (
                <p className="text-xs text-destructive">{rowFieldErrors.comments}</p>
              ) : null}
            </div>
          )
        },
      },
    ],
    [paymentModeDraft, commentsDraft, paymentModeLookups, updatePaymentAmount, fieldErrors.rows]
  )

  if (!branchId) {
    return (
      <div className="rounded-lg border bg-card p-6 space-y-2">
        <p className="font-medium text-foreground">Recovery Posting needs branch mode</p>
        <p className="text-sm text-muted-foreground">
          Open the app in a branch context (navigate into a branch from Org), then choose{" "}
          <span className="font-medium text-foreground">Recovery Posting</span> in the sidebar.
        </p>
      </div>
    )
  }

  const hasTableRows = editableRows.length > 0

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Recovery Posting</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Load today&apos;s schedules, adjust payments, then post collections.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Schedule date</p>
          <p className="text-base font-semibold tabular-nums text-foreground">{formatDisplayDate(dateKey)}</p>
        </div>
      </header>

      <section
        aria-label="Schedule filters"
        className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5"
      >
        <div className="grid grid-cols-1 gap-3 min-[500px]:grid-cols-2 lg:grid-cols-3 lg:max-w-4xl lg:gap-4">
            <div className="w-full max-w-[200px] min-w-0">
              <label htmlFor="recovery-date" className="mb-1 block text-sm font-medium text-foreground">
                Schedule date
              </label>
              <input
                id="recovery-date"
                type="date"
                className={cn(inputClass, "w-full max-w-full")}
                value={dateKey}
                onChange={(e) => {
                  setDateKey(e.target.value)
                  resetTableDrafts()
                }}
              />
            </div>
            <div className="w-full max-w-[260px] min-w-0">
              <label className="mb-1 block text-sm font-medium text-foreground">Center</label>
              <Autocomplete
                className="w-full max-w-full"
                options={centers}
                value={centers.find((c) => c.id === centerId) ?? null}
                getOptionLabel={(option) => option?.name ?? ""}
                isOptionEqualToValue={(option, v) => option.id === v.id}
                disablePortal
                ListboxProps={{
                  style: { maxHeight: 280, overflow: "auto", maxWidth: 280 },
                }}
                onChange={(_, newValue) => {
                  setCenterId(newValue?.id ?? 0)
                  setPocId(0)
                  resetTableDrafts()
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="All centers"
                    size="small"
                    fullWidth
                    sx={{
                      maxWidth: 260,
                      "& .MuiInputBase-root": { fontSize: "0.875rem" },
                    }}
                  />
                )}
              />
            </div>
            <div className="w-full max-w-[260px] min-w-0">
              <label className="mb-1 block text-sm font-medium text-foreground">POC</label>
              <Autocomplete
                className="w-full max-w-full"
                options={pocsForCenter}
                value={pocsForCenter.find((p) => p.id === pocId) ?? null}
                getOptionLabel={(option) => option?.name ?? ""}
                isOptionEqualToValue={(option, v) => option.id === v.id}
                disabled={!centerId}
                disablePortal
                ListboxProps={{
                  style: { maxHeight: 280, overflow: "auto", maxWidth: 280 },
                }}
                onChange={(_, newValue) => {
                  setPocId(newValue?.id ?? 0)
                  resetTableDrafts()
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={centerId ? "All POCs in center" : "Choose a center first"}
                    size="small"
                    fullWidth
                    sx={{
                      maxWidth: 260,
                      "& .MuiInputBase-root": { fontSize: "0.875rem" },
                    }}
                  />
                )}
              />
            </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="w-full max-w-[240px] min-w-0 sm:shrink-0">
            <label className="mb-1 block text-sm font-medium text-foreground">Collected by</label>
            <select
              className={cn(
                inputClass,
                "w-full max-w-full text-sm",
                fieldErrors.collectedBy && "border-destructive"
              )}
              value={effectiveCollectedById || ""}
              onChange={(e) => {
                setCollectedById(Number(e.target.value) || 0)
                setFieldErrors((prev) =>
                  prev.collectedBy ? { ...prev, collectedBy: undefined } : prev
                )
              }}
            >
              <option value="">Select staff</option>
              {collectedByOptions.map((s: StaffResponse) => (
                <option key={s.id} value={s.id}>
                  {[s.firstName, s.surname].filter(Boolean).join(" ") || s.email}
                </option>
              ))}
            </select>
            {fieldErrors.collectedBy ? (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.collectedBy}</p>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-row flex-wrap items-end justify-end gap-4 sm:shrink-0">
            <div className="min-w-0 sm:shrink-0">
              <label className="mb-1 block text-sm font-medium text-foreground">Selected total</label>
              <div className="min-w-[9rem] rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(selectedTotal)}
              </div>
            </div>
            <Button type="button" className="gap-2 shrink-0" onClick={handlePost}>
              <Check className="h-4 w-4" aria-hidden />
              Post recovery
            </Button>
          </div>
        </div>
      </section>

      {isError ? (
        <div className="rounded-xl border border-destructive/50 bg-card p-4 text-sm text-destructive shadow-sm">
          {getApiErrorDetails(error).message || DEFAULT_API_ERROR_MESSAGE}{" "}
          <Button variant="outline" size="sm" className="ml-2" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <section aria-label="Recovery schedules" className="rounded-xl border border-border/80 bg-card shadow-sm">
          <MaterialReactTable
            columns={columns}
            data={editableRows}
            getRowId={(row) => row.rowKey}
            enableRowSelection
            onRowSelectionChange={setRowSelection}
            state={{ rowSelection, isLoading }}
            initialState={{ pagination: { pageSize: 20, pageIndex: 0 } }}
            enableSorting
            enableColumnFilters={false}
            enableGrouping={false}
            enableExpanding={false}
            enableColumnPinning
            enableFullScreenToggle={false}
            muiTablePaperProps={{
              elevation: 0,
              sx: {
                backgroundColor: "transparent",
                boxShadow: "none",
              },
            }}
            muiTableContainerProps={{
              sx: {
                // Avoid empty scroll area / gray bar when there are no rows
                maxHeight: hasTableRows || isLoading ? "min(65vh, 680px)" : "none",
                overflowY: hasTableRows || isLoading ? "auto" : "visible",
              },
            }}
          />
        </section>
      )}
    </div>
  )
}

export default RecoveryPostingList
