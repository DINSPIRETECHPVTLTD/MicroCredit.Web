import { useRef, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"
import type { PaymentTermResponse } from "@/types/paymentTerm"
import { paymentTermService } from "@/services/paymentTerm.service"

const baseFields = {
  paymentTerm: z.string().min(1, "Payment term is required"),
  paymentType: z.string().min(1, "Payment type is required"),
  noOfTerms: z.coerce.number().min(1, "No of terms must be at least 1"),
  processingFee: z.coerce.number().min(0, "Processing fee cannot be negative"),
  rateOfInterest: z.coerce.number().min(0, "Rate of interest cannot be negative"),
  insuranceFee: z.coerce.number().min(0, "Insurance fee cannot be negative"),
}

const schema = z.object(baseFields)

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

export type AddEditPaymentTermMode =
  | { mode: "add" }
  | { mode: "edit"; paymentTerm: PaymentTermResponse }

type Props = {
  value: AddEditPaymentTermMode | null
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "string") return data
  if (data && typeof data === "object") {
    const obj = data as { message?: string; error?: string; title?: string }
    return obj.message ?? obj.error ?? obj.title ?? fallback
  }
  return fallback
}

export default function AddEditPaymentTerm({ value, onClose, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)

  const isEdit = value?.mode === "edit"
  const editItem = value?.mode === "edit" ? value.paymentTerm : null

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentTerm: "",
      paymentType: "",
      noOfTerms: 1,
      processingFee: 0,
      rateOfInterest: 0,
      insuranceFee: 0,
    },
  })

  useEffect(() => {
    if (value === null) {
      dialogRef.current?.close()
      return
    }

    dialogRef.current?.showModal()

    if (editItem) {
      form.reset({
        paymentTerm: editItem.paymentTerm,
        paymentType: editItem.paymentType,
        noOfTerms: editItem.noOfTerms,
        processingFee: editItem.processingFee,
        rateOfInterest: editItem.rateOfInterest,
        insuranceFee: editItem.insuranceFee,
      })
    } else {
      form.reset({
        paymentTerm: "",
        paymentType: "",
        noOfTerms: 1,
        processingFee: 0,
        rateOfInterest: 0,
        insuranceFee: 0,
      })
    }
  }, [value, editItem?.id, form])

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  const submit = async (data: FormOutput) => {
    setSaving(true)
    try {
      if (isEdit && editItem) {
        await paymentTermService.updatePaymentTerm(editItem.id, data)
        toast.success("Payment term updated successfully")
      } else {
        await paymentTermService.createPaymentTerm(data)
        toast.success("Payment term saved successfully")
      }

      await onSuccess()
      close()
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          isEdit ? "Failed to update payment term" : "Failed to create payment term"
        )
      )
    } finally {
      setSaving(false)
    }
  }

  if (value === null) return null

  return (
    <dialog
      ref={dialogRef}
      onCancel={close}
      className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-xl w-full"
      aria-labelledby="add-edit-payment-term-title"
    >
      <div className="p-6 border-b">
        <h2 id="add-edit-payment-term-title" className="text-lg font-semibold">
          {isEdit ? "Edit Payment Term" : "Add Payment Term"}
        </h2>
      </div>
      <form onSubmit={form.handleSubmit(submit)} className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">
            Payment Term <span className="text-destructive">*</span>
          </label>
          <input
            {...form.register("paymentTerm")}
            className={cn(inputClass, form.formState.errors.paymentTerm && "border-destructive")}
          />
          {form.formState.errors.paymentTerm && (
            <p className="text-xs text-destructive mt-1">
              {form.formState.errors.paymentTerm.message}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">
            Payment Type <span className="text-destructive">*</span>
          </label>
          <input
            {...form.register("paymentType")}
            className={cn(inputClass, form.formState.errors.paymentType && "border-destructive")}
          />
          {form.formState.errors.paymentType && (
            <p className="text-xs text-destructive mt-1">
              {form.formState.errors.paymentType.message}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">
            No of Terms <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            {...form.register("noOfTerms")}
            className={cn(inputClass, form.formState.errors.noOfTerms && "border-destructive")}
          />
          {form.formState.errors.noOfTerms && (
            <p className="text-xs text-destructive mt-1">
              {form.formState.errors.noOfTerms.message}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">
            Processing Fee <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...form.register("processingFee")}
            className={cn(inputClass, form.formState.errors.processingFee && "border-destructive")}
          />
          {form.formState.errors.processingFee && (
            <p className="text-xs text-destructive mt-1">
              {form.formState.errors.processingFee.message}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">
            Rate Of Interest <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...form.register("rateOfInterest")}
            className={cn(inputClass, form.formState.errors.rateOfInterest && "border-destructive")}
          />
          {form.formState.errors.rateOfInterest && (
            <p className="text-xs text-destructive mt-1">
              {form.formState.errors.rateOfInterest.message}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">
            Insurance Fee <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...form.register("insuranceFee")}
            className={cn(inputClass, form.formState.errors.insuranceFee && "border-destructive")}
          />
          {form.formState.errors.insuranceFee && (
            <p className="text-xs text-destructive mt-1">
              {form.formState.errors.insuranceFee.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? isEdit
                ? "Updating..."
                : "Saving..."
              : isEdit
              ? "Update Payment Term"
              : "Save Payment Term"}
          </Button>
        </div>
      </form>
    </dialog>
  )
}