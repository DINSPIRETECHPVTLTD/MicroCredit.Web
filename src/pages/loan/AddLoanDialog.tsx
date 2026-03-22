import type { SearchMemberResponse } from "@/types/searchMemeber"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useEffect, useRef, useState, useMemo } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import type { PaymentTermResponse } from "@/types/paymentTerm"
import { paymentTermService } from "@/services/paymentTerm.service"
import { pocService } from "@/services/poc.service"
import type { PocResponse } from "@/types/poc"
import { getSession } from "@/services/auth.service"
import toast from "react-hot-toast"
import type { AddLoanRequest } from "@/types/loan"
import { loanService } from "@/services/loan.service"
import type { LoanResponse } from "@/types/loan"


interface AddLoanDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  member: SearchMemberResponse | null
  mode: "add" | "view"
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

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
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>



export default function AddLoanDialog({ open, onClose, onSuccess, member, mode }: AddLoanDialogProps) {

  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)
  const [currentMode, setCurrentMode] = useState<"add" | "view">(mode)

// ADDED
    useEffect(() => {
    setCurrentMode(mode)
    }, [mode])

  const form = useForm<FormInput, unknown, FormOutput>({
      resolver: zodResolver(schema),
      defaultValues: async () => {
        const today = new Date().toISOString().slice(0, 10)
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
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
    const today = new Date().toISOString().slice(0, 10)
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
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
  
    const close = () => {
      dialogRef.current?.close()
      setCurrentMode(mode)
      onClose()
    }

    const {
            data: paymentTerms = [],
            isLoading: paymentTermsLoading,
        } = useQuery({
        queryKey: ["paymentTerms"],
        queryFn: () => paymentTermService.getPaymentTerms() as Promise<PaymentTermResponse[]>, // ✅
    });

    const {
            data: pocs,
            isLoading: pocsLoading,
        } = useQuery({
            queryKey: ["pocs", member?.pocId],
            queryFn: () => pocService.getByid(member!.pocId ?? 0) as Promise<PocResponse>,
            enabled: !!member?.pocId
    });

    const {
            data: loans = [],
            isLoading: loansLoading,
        } = useQuery({
            queryKey: ["memberLoans", member?.id],
            queryFn: () => loanService.getLoanByMemId(member!.id) as Promise<LoanResponse[]>,
            enabled: !!member?.id && open && currentMode === "view",
    })


    console.log(loans)


    const selectedPaymentTermId = form.watch("paymentTermId")

    useEffect(() => {
    const selected = paymentTerms.find((term) => term.id === Number(selectedPaymentTermId))
        if (selected) {
            form.setValue("insuranceFee", selected.insuranceFee)
            form.setValue("processingFee", selected.processingFee)
            form.setValue("noOfTerms", selected.noOfTerms)
            form.setValue("collectionTerm", selected.paymentTerm)
        } else {
            form.setValue("insuranceFee", 0)
            form.setValue("processingFee", 0)
            form.setValue("noOfTerms", 0)
            form.setValue("collectionTerm", "")
        }
    }, [selectedPaymentTermId, paymentTerms])

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


    const submit = async (data: FormOutput) => {
    setSaving(true)
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
        isSavingEnabled: false,
        savingAmount: data.savingAmount,
        totalAmount: data.totalAmount,
        disbursementDate: data.disbursementDate,
        collectionStartDate: data.collectionStartDate,
        collectionTerm: data.collectionTerm,
        noOfTerms: data.noOfTerms
      }

      await loanService.addLoan(payload)
      toast.success("Added Loan successfully")
      onSuccess()
      close()
    } catch(err) {
      toast.error("Failed to add loan")
    } finally {
      setSaving(false)
    }
  }


  if (!open) return null

  return (
    <dialog
  ref={dialogRef}
  onCancel={close}
  className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-lg w-full"
  aria-labelledby="add-loan-title"
>
  <div className="p-6 relative"> 

    
    <div className="flex items-center justify-between mb-4">
      <h2 id="add-loan-title" className="text-lg font-semibold">
        {currentMode === "view" ? "View Loan" : "Add Loan"} — {member?.name}
      </h2>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCurrentMode(currentMode === "view" ? "add" : "view")}
        >
          {currentMode === "view" ? "+ Add Loan" : "View Loans"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={close}
          aria-label="Close"
        >
          <X />
        </Button>
      </div>
    </div>

    {/* ADDED: view mode card */}
    {currentMode === "view" && (
      <div>
        {loansLoading ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            <p>Loading...</p>
          </div>
        ) : loans.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            <p>No loans found for this member.</p>
          </div>
        ) : (() => {
            const latest = loans[loans.length - 1]
            return (
              <div className="rounded-lg border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Most Recent Loan</h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                    Loan # {latest.loanId}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Member Name</p>
                    <p className="text-sm font-semibold">{latest.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Loan Amount</p>
                    <p className="text-sm font-semibold">{latest.loanTotalAmount}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Total Amount Paid</p>
                    <p className="text-sm font-semibold">{latest.totalAmountPaid}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Weeks Paid</p>
                    <p className="text-sm font-semibold">{latest.noOfTerms}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Remaining Balance</p>
                    <p className="text-sm font-semibold">{latest.remainingBal}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Scheduler Total Balance</p>
                    <p className="text-sm font-semibold">{latest.schedulerTotalAmount}</p>
                  </div>
                </div>
              </div>
            )
          })()
        }
      </div>
    )}

    {/* ADDED: condition wrapper — form only shows in add mode */}
    {currentMode === "add" && (
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">  {/* CHANGED: removed p-6 */}
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
            {...form.register("paymentTermId")}
            className={cn(inputClass, form.formState.errors.paymentTermId && "border-destructive")}
          >
            <option value={0}>Select Payment Term</option>
            {paymentTerms.map((p) => (
              <option key={p.id} value={p.id}>{p.paymentType}</option>
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
          />
          {form.formState.errors.totalAmount && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.totalAmount.message}</p>
          )}
        </div>

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
            className={cn(inputClass, form.formState.errors.collectionTerm && "border-destructive")}
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
            className={cn(inputClass, form.formState.errors.noOfTerms && "border-destructive")}
          />
          {form.formState.errors.noOfTerms && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.noOfTerms.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !!collectionDayError}>  {/* CHANGED: added collectionDayError */}
            {saving ? "Adding..." : "Add Loan"}
          </Button>
        </div>
      </form>
    )}

  </div>
</dialog>
  )
}