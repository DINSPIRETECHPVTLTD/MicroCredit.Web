import type { SearchMemberResponse } from "@/types/searchMemeber"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useEffect, useRef, useState, useMemo } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import type { PaymentTermResponse } from "@/types/paymentTerm"
import { paymentTermService } from "@/services/paymentTerm.service"
import { pocService } from "@/services/poc.service"
import type { PocResponse } from "@/types/poc"
import { getSession } from "@/services/auth.service"
import toast from "react-hot-toast"
import type { AddLoanRequest } from "@/types/loan"
import { loanService } from "@/services/loan.service"
import type { LoanResponse } from "@/types/loan"
import { DEFAULT_API_ERROR_MESSAGE, getApiErrorDetails } from "@/lib/apiErrorHandler"


interface AddLoanDialogProps {
  open: boolean
  onClose: (reason: "cancel" | "success") => void
  onSuccess: () => void
  member: SearchMemberResponse | null
  mode: "add" | "view"
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

function toDateInputValueLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getTodayDateInputValue(): string {
  return toDateInputValueLocal(new Date())
}

function parseDateInputAsLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value ?? "").trim())
  if (!match) return null
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function addDaysDateInputValue(baseDateInput: string, days: number): string {
  const base = parseDateInputAsLocal(baseDateInput)
  if (!base) return baseDateInput
  const shifted = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days)
  return toDateInputValueLocal(shifted)
}

function isBeforeDateInput(a: string, b: string): boolean {
  const left = parseDateInputAsLocal(a)
  const right = parseDateInputAsLocal(b)
  if (!left || !right) return false
  return left.getTime() < right.getTime()
}

const schema = z.object({
  memberId: z.coerce.number().min(1, "Member is required"),
  loanAmount: z.coerce.number().positive("Loan amount must be a positive number"),
  paymentTermId: z.coerce.number().min(1, "Payment term is required"),
  interestAmount: z.coerce.number().nonnegative("Interest amount cannot be negative"),
  processingFee: z.coerce.number().nonnegative("Processing fee cannot be negative"),
  insuranceFee: z.coerce.number().nonnegative("Insurance fee cannot be negative"),
  isSavingEnabled: z.boolean(),
  savingAmount: z.coerce.number().nonnegative("Saving amount cannot be negative"),
  totalAmount: z.coerce.number().nonnegative("Total amount cannot be negative"),
  disbursementDate: z.string().min(1, "Payment date is required"),
  collectionStartDate: z.string().min(1, "Payment date is required"),
  collectionTerm: z.string().min(2, "Collection term is required"),
  noOfTerms: z.coerce.number().min(1, "Number of terms is required")
}).superRefine((data, ctx) => {
  if (
    data.disbursementDate &&
    data.collectionStartDate &&
    isBeforeDateInput(data.collectionStartDate, data.disbursementDate)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["collectionStartDate"],
      message: "Collection start date must be on or after disbursement date",
    })
  }
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatMoney(value: number): string {
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusBadgeClass(status: string): string {
  const s = (status ?? "").trim().toLowerCase()
  if (s === "active") return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
  if (s === "pending") return "bg-amber-500/15 text-amber-900 dark:text-amber-200"
  if (s === "claimed") return "bg-violet-500/15 text-violet-900 dark:text-violet-200"
  if (s === "closed") return "bg-muted text-muted-foreground"
  if (s === "defaulted") return "bg-destructive/15 text-destructive"
  return "bg-muted text-foreground"
}

export default function AddLoanDialog({ open, onClose, onSuccess, member, mode }: AddLoanDialogProps) {

  const dialogRef = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [currentMode, setCurrentMode] = useState<"add" | "view">(mode)
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setCurrentMode(mode)
  }, [mode])

  const form = useForm<FormInput, unknown, FormOutput>({
      resolver: zodResolver(schema),
      defaultValues: async () => {
        const today = getTodayDateInputValue()
        const nextWeek = addDaysDateInputValue(today, 7)
        return {
            memberId: member?.id ?? 0,
            loanAmount: 0,
            paymentTermId: 0,
            interestAmount: 0,
            processingFee: 0,
            insuranceFee: 0,
            isSavingEnabled: false,
            savingAmount: 0,
            totalAmount: 0,
            disbursementDate: today,
            collectionStartDate: nextWeek,
            collectionTerm: "",
            noOfTerms: 0
        }
      },
    })

   useEffect(() => {
      if (!open) {
        dialogRef.current?.close()
        return
      }
    setApiErrorMessage(null)
    const today = getTodayDateInputValue()
    const nextWeek = addDaysDateInputValue(today, 7)
    form.reset({
    memberId: member?.id ?? 0,
    loanAmount: 0,
    paymentTermId: 0,
    interestAmount: 0,
    processingFee: 0,
    insuranceFee: 0,
    isSavingEnabled: false,
    savingAmount: 0,
    totalAmount: 0,
    disbursementDate: today,
    collectionStartDate: nextWeek,
    collectionTerm: "",
    noOfTerms: 0
    })
      dialogRef.current?.showModal()
    }, [open])
  
    const close = (reason: "cancel" | "success" = "cancel") => {
      dialogRef.current?.close()
      setCurrentMode(mode)
      setApiErrorMessage(null)
      onClose(reason)
    }

    const {
            data: paymentTerms = [],
        } = useQuery({
        queryKey: ["paymentTerms"],
        queryFn: () => paymentTermService.getPaymentTerms() as Promise<PaymentTermResponse[]>,
        enabled: open,
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
    })

    const {
            data: pocs,
        } = useQuery({
            queryKey: ["pocs", member?.pocId],
            queryFn: () => pocService.getByid(member!.pocId ?? 0) as Promise<PocResponse>,
            enabled: !!member?.pocId && open
    });

    const {
            data: loans = [],
            isLoading: loansLoading,
            refetch: refetchMemberLoans,
        } = useQuery({
            queryKey: ["memberLoans", member?.id],
            queryFn: () => loanService.getLoanByMemId(member!.id) as Promise<LoanResponse[]>,
            enabled: !!member?.id && open && currentMode === "view",
    })
    const hasExistingLoan = loans.length > 0

    const selectedPaymentTermId = form.watch("paymentTermId")
    const loanAmountValue = form.watch("loanAmount")
    const totalAmountValue = form.watch("totalAmount")
    const noOfTermsValue = form.watch("noOfTerms")
    const paymentTermField = form.register("paymentTermId", { valueAsNumber: true })

    const selectablePaymentTerms = useMemo(
      () =>
        paymentTerms.map((term, idx) => ({
          term,
          selectionId: idx + 1,
        })),
      [paymentTerms]
    )

    const selectedPaymentTerm = useMemo(
      () => selectablePaymentTerms.find((item) => item.selectionId === Number(selectedPaymentTermId))?.term ?? null,
      [selectablePaymentTerms, selectedPaymentTermId]
    )

    useEffect(() => {
      const loanAmount = toNumber(loanAmountValue)
      const interestRate = toNumber(selectedPaymentTerm?.rateOfInterest ?? 0)
      const processingRate = toNumber(selectedPaymentTerm?.processingFee ?? 0)
      const insuranceRate = toNumber(selectedPaymentTerm?.insuranceFee ?? 0)
      const interest = Number(((loanAmount * interestRate) / 100).toFixed(2))
      const processing = Number(((loanAmount * processingRate) / 100).toFixed(2))
      const insurance = Number(((loanAmount * insuranceRate) / 100).toFixed(2))
      const total = Number((loanAmount + interest).toFixed(2))

      form.setValue("interestAmount", interest, { shouldValidate: true })
      form.setValue("processingFee", processing, { shouldValidate: true })
      form.setValue("insuranceFee", insurance, { shouldValidate: true })
      form.setValue("totalAmount", total, { shouldValidate: true })
      form.setValue("noOfTerms", selectedPaymentTerm?.noOfTerms ?? 0, { shouldValidate: true })
      form.setValue("collectionTerm", selectedPaymentTerm?.paymentTerm ?? "", { shouldValidate: true })
    }, [loanAmountValue, selectedPaymentTerm, form])

    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    const collectionStartDate = form.watch("collectionStartDate")

    const collectionDayError = useMemo(() => {
        if (!pocs?.collectionDay || !collectionStartDate) return null
        const selectedDay = DAYS[new Date(collectionStartDate).getDay()]
        if (selectedDay !== pocs.collectionDay) {
            return `Collection start date must be a ${pocs.collectionDay}`
        }
        return null
    }, [collectionStartDate, pocs?.collectionDay])

    const emiPreviewRows = useMemo(() => {
      const totalAmount = toNumber(totalAmountValue)
      const noOfTerms = Math.trunc(toNumber(noOfTermsValue))
      if (totalAmount <= 0 || noOfTerms <= 0) return []

      const emiPerTerm = Number((totalAmount / noOfTerms).toFixed(2))
      return Array.from({ length: noOfTerms }, (_, idx) => ({
        termNo: idx + 1,
        emiAmount: emiPerTerm,
      }))
    }, [totalAmountValue, noOfTermsValue])


    const submit = async (data: FormOutput) => {
    setSaving(true)
    setApiErrorMessage(null)
    try {
      const session = getSession()
      const createdById = session?.userId

      if (!createdById) {
        toast.error("Unable to determine current user.")
        return
      }

      const payload: AddLoanRequest = {
        memberId: data.memberId,
        loanAmount: data.loanAmount,
        interestAmount: data.interestAmount,
        processingFee: data.processingFee,
        insuranceFee: data.insuranceFee,
        insuranceAmount: data.insuranceFee,
        isSavingEnabled: false,
        savingAmount: data.savingAmount,
        totalAmount: data.totalAmount,
        disbursementDate: data.disbursementDate,
        collectionStartDate: data.collectionStartDate,
        collectionTerm: data.collectionTerm,
        noOfTerms: data.noOfTerms
      }

      await loanService.addLoan(payload)
      await refetchMemberLoans()
      toast.success("Added Loan successfully")
      onSuccess()
      close("success")
    } catch(err) {
      const details = getApiErrorDetails(err)
      setApiErrorMessage(details.message || DEFAULT_API_ERROR_MESSAGE)
    } finally {
      setSaving(false)
    }
  }


  const isExistingLoanView = currentMode === "view" && hasExistingLoan

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      onCancel={() => close("cancel")}
      className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-2xl w-full max-h-[90vh] flex flex-col"
      aria-labelledby="add-loan-title"
    >
      <div className="p-6 border-b shrink-0">
        <div className="flex items-center justify-between">
          <h2 id="add-loan-title" className="text-lg font-semibold">
            {currentMode === "view" ? "View Loan" : "Add Loan"} — {member?.name}
          </h2>
          <div className="flex items-center gap-2">
            {currentMode === "view" && loans.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const latest = loans[loans.length - 1]
                  close("cancel")
                  navigate(`/loans/${latest.loanId}/scheduler`)
                }}
              >
                View Loan
              </Button>
            ) : null}
            {isExistingLoanView ? (
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                Existing Loan
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentMode(currentMode === "view" ? "add" : "view")}
              >
                {currentMode === "view" ? "+ Add Loan" : "View Loans"}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => close("cancel")}
              aria-label="Close"
            >
              <X />
            </Button>
          </div>
        </div>
      </div>

      {currentMode === "view" && (
        <div className="p-6 overflow-y-auto flex-1">
          {loansLoading ? (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              <p>Loading...</p>
            </div>
          ) : loans.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              <p>No loans found for this member.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Member loans
              </h3>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Loan #</th>
                      <th className="text-left font-medium px-3 py-2">Status</th>
                      <th className="text-left font-medium px-3 py-2">Member</th>
                      <th className="text-right font-medium px-3 py-2">Loan total</th>
                      <th className="text-center font-medium px-3 py-2">EMIs</th>
                      <th className="text-right font-medium px-3 py-2">Paid</th>
                      <th className="text-right font-medium px-3 py-2">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((row) => (
                      <tr key={row.loanId} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono tabular-nums">{row.loanId}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}
                          >
                            {row.status?.trim() || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-[180px] truncate" title={row.fullName}>
                          {row.fullName}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.loanTotalAmount)}</td>
                        <td className="px-3 py-2 text-center tabular-nums whitespace-nowrap">{row.noOfTerms || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.totalAmountPaid)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.remainingBal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {currentMode === "add" && (
        <form onSubmit={form.handleSubmit(submit)} className="flex flex-col min-h-0 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {apiErrorMessage ? (
              <div
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Error</p>
                    <p className="text-sm">{apiErrorMessage}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setApiErrorMessage(null)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : null}
            <section>
              <h3 className="text-sm font-medium mb-3">Loan Details</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Loan Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    {...form.register("loanAmount")}
                    className={cn(inputClass, form.formState.errors.loanAmount && "border-destructive")}
                  />
                  {form.formState.errors.loanAmount && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.loanAmount.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Payment Term</label>
                  <select
                    {...paymentTermField}
                    onChange={(event) => {
                      paymentTermField.onChange(event)
                      void form.trigger("paymentTermId")
                    }}
                    className={cn(inputClass, form.formState.errors.paymentTermId && "border-destructive")}
                  >
                    <option value={0}>Select Payment Term</option>
                    {selectablePaymentTerms.map((item) => (
                      <option key={`${item.term.id}-${item.selectionId}-${item.term.paymentType}`} value={item.selectionId}>
                        {item.term.paymentType}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.paymentTermId && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.paymentTermId.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Interest Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    {...form.register("interestAmount")}
                    className={cn(inputClass, form.formState.errors.interestAmount && "border-destructive")}
                    readOnly
                  />
                  {form.formState.errors.interestAmount && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.interestAmount.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Processing Fee</label>
                  <input
                    type="number"
                    step="0.01"
                    {...form.register("processingFee")}
                    className={cn(inputClass, form.formState.errors.processingFee && "border-destructive")}
                    readOnly
                  />
                  {form.formState.errors.processingFee && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.processingFee.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Insurance Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    {...form.register("insuranceFee")}
                    className={cn(inputClass, form.formState.errors.insuranceFee && "border-destructive")}
                    readOnly
                  />
                  {form.formState.errors.insuranceFee && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.insuranceFee.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Savings Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    {...form.register("savingAmount")}
                    className={cn(inputClass, form.formState.errors.savingAmount && "border-destructive")}
                  />
                  {form.formState.errors.savingAmount && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.savingAmount.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Total Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    {...form.register("totalAmount")}
                    className={cn(inputClass, form.formState.errors.totalAmount && "border-destructive")}
                    readOnly
                  />
                  {form.formState.errors.totalAmount && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.totalAmount.message}</p>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium mb-3">Collection Schedule</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Disbursement Date</label>
                  <input
                    type="date"
                    {...form.register("disbursementDate")}
                    className={cn(inputClass, form.formState.errors.disbursementDate && "border-destructive")}
                  />
                  {form.formState.errors.disbursementDate && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.disbursementDate.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Collection Start Date</label>
                  <input
                    type="date"
                    {...form.register("collectionStartDate")}
                    className={cn(inputClass, (form.formState.errors.collectionStartDate || collectionDayError) && "border-destructive")}
                  />
                  {form.formState.errors.collectionStartDate && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.collectionStartDate.message}</p>
                  )}
                  {collectionDayError && (
                    <p className="text-xs text-destructive mt-1">{collectionDayError}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Collection Term</label>
                  <input
                    type="text"
                    {...form.register("collectionTerm")}
                    className={cn(
                      inputClass,
                      form.formState.errors.collectionTerm && "border-destructive"
                    )}
                    readOnly
                  />
                  {form.formState.errors.collectionTerm && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.collectionTerm.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">No Of Terms</label>
                  <input
                    type="number"
                    {...form.register("noOfTerms")}
                    className={cn(
                      inputClass,
                      form.formState.errors.noOfTerms && "border-destructive"
                    )}
                    readOnly
                  />
                  {form.formState.errors.noOfTerms && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.noOfTerms.message}</p>
                  )}
                </div>
              </div>
            </section>

            {emiPreviewRows.length > 0 ? (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">EMI Preview</h3>
                  <p className="text-xs text-muted-foreground">
                    Per-term EMI = Total Amount / No Of Terms
                  </p>
                </div>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Term #</th>
                        <th className="text-right px-3 py-2 font-medium">EMI Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emiPreviewRows.map((row) => (
                        <tr key={row.termNo} className="border-t">
                          <td className="px-3 py-2">{row.termNo}</td>
                          <td className="px-3 py-2 text-right">{row.emiAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 p-6 border-t shrink-0">
            <Button type="button" variant="outline" onClick={() => close("cancel")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !!collectionDayError}>
              {saving ? "Adding..." : "Add Loan"}
            </Button>
          </div>
        </form>
      )}
    </dialog>
  )
}