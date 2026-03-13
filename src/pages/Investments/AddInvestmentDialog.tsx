import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"
import type { CreateInvestmentRequest } from "@/types/investment"
import type { UserResponse } from "@/types/user"
import { investmentService } from "@/services/investment.service"
import { getSession } from "@/services/auth.service"
import { X } from "lucide-react"

const schema = z.object({
  userId: z.coerce.number().min(1, "Investor is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  investmentDate: z.string().min(1, "Investment date is required"),
  createdDate: z.string().min(1, "Created date is required"),
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

export default function AddInvestmentDialog({ open, onClose, onSuccess, users }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: async () => {
      const today = new Date().toISOString().slice(0, 10)
      return {
        userId: 0,
        amount: 0,
        investmentDate: today,
        createdDate: today,
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
      userId: 0,
      amount: 0,
      investmentDate: today,
      createdDate: today,
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
      const createdById = session?.userId

      if (!createdById) {
        toast.error("Unable to determine current user.")
        return
      }

      const payload: CreateInvestmentRequest = {
        userId: data.userId,
        amount: data.amount,
        investmentDate: data.investmentDate,
        createdDate: data.createdDate,
      }

      await investmentService.createInvestment(payload)
      toast.success("Investment created")
      onSuccess()
      close()
    } catch {
      toast.error("Failed to create investment")
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
      aria-labelledby="add-investment-title"
    >
      <div className="p-6 border-b relative">
        <h2 id="add-investment-title" className="text-lg font-semibold">
          Add Investment
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
          <label className="text-sm font-medium mb-1 block">Investor</label>
          <select
            {...form.register("userId")}
            className={cn(inputClass, form.formState.errors.userId && "border-destructive")}
          >
            <option value={0}>Select investor</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.surname}
              </option>
            ))}
          </select>
          {form.formState.errors.userId && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.userId.message}</p>
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
          <label className="text-sm font-medium mb-1 block">Investment Date</label>
          <input
            type="date"
            {...form.register("investmentDate")}
            className={cn(inputClass, form.formState.errors.investmentDate && "border-destructive")}
          />
          {form.formState.errors.investmentDate && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.investmentDate.message}</p>
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Investment"}
          </Button>
        </div>
      </form>
    </dialog>
  )
}

