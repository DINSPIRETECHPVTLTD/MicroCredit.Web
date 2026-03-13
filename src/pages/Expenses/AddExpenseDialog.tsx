import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"
import type { UserResponse } from "@/types/user"
import { getSession } from "@/services/auth.service"
import { ledgerTransactionService } from "@/services/ledgerTransaction.service"
import type { CreateExpenseRequest } from "@/types/ledgerTransaction"
import { X } from "lucide-react"

const schema = z.object({
  paidFromUserId: z.coerce.number().min(1, "Paid from user is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paymentDate: z.string().min(1, "Payment date is required"),
  createdDate: z.string().min(1, "Created date is required"),
  comments: z.string().min(2, "Enter why the expense was made"),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  users: UserResponse[]
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

export default function AddExpenseDialog({ open, onClose, onSuccess, users }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: async () => {
      const today = new Date().toISOString().slice(0, 10)
      return {
        paidFromUserId: 0,
        amount: 0,
        paymentDate: today,
        createdDate: today,
        comments: "",
      }
    },
  })

  useEffect(() => {
    if (!open) {
      dialogRef.current?.close()
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    form.reset({
      paidFromUserId: 0,
      amount: 0,
      paymentDate: today,
      createdDate: today,
      comments: "",
    })
    dialogRef.current?.showModal()
  }, [open, form])

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  const submit = async (data: FormOutput) => {
    setSaving(true)
    try {
      const session = getSession()
      const createdBy = session?.userId
      if (!createdBy) {
        toast.error("Unable to determine current user.")
        return
      }

      const payload: CreateExpenseRequest = {
        paidFromUserId: data.paidFromUserId,
        amount: data.amount,
        paymentDate: data.paymentDate,
        createdDate: data.createdDate,
        comments: data.comments?.trim() ? data.comments.trim() : null,
      }

      await ledgerTransactionService.createExpense(payload)
      toast.success("Expense created")
      onSuccess()
      close()
    } catch {
      toast.error("Failed to create expense")
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
      aria-labelledby="add-expense-title"
    >
      <div className="p-6 border-b relative">
        <h2 id="add-expense-title" className="text-lg font-semibold">
          Add Expense
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={close}
          className="absolute right-3 top-3"
          aria-label="Close"
        >
          <X />
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(submit)} className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Paid From User</label>
          <select
            {...form.register("paidFromUserId")}
            className={cn(inputClass, form.formState.errors.paidFromUserId && "border-destructive")}
          >
            <option value={0}>Select paid from user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.surname}
              </option>
            ))}
          </select>
          {form.formState.errors.paidFromUserId && (
            <p className="text-xs text-destructive mt-1">
              {form.formState.errors.paidFromUserId.message}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Amount</label>
          <input
            type="number"
            step="0.01"
            {...form.register("amount")}
            className={cn(inputClass, form.formState.errors.amount && "border-destructive")}
          />
          {form.formState.errors.amount && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.amount.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Payment Date</label>
          <input
            type="date"
            {...form.register("paymentDate")}
            className={cn(inputClass, form.formState.errors.paymentDate && "border-destructive")}
          />
          {form.formState.errors.paymentDate && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.paymentDate.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Created Date</label>
          <input
            type="date"
            {...form.register("createdDate")}
            className={cn(inputClass, form.formState.errors.createdDate && "border-destructive")}
          />
          {form.formState.errors.createdDate && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.createdDate.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Comments</label>
          <textarea {...form.register("comments")} className={inputClass} rows={3} />
          {form.formState.errors.comments && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.comments.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Expense"}
          </Button>
        </div>
      </form>
    </dialog>
  )
}

