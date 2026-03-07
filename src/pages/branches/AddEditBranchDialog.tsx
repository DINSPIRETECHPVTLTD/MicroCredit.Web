import * as React from "react"
import { useRef, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import * as React from "react"
import { Button } from "../../components/ui/button"
import { cn } from "../../lib/utils"
import toast from "react-hot-toast"
import { branchService } from "../../services/branch.service"
import type { BranchResponse } from "../../types/branch"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export type AddEditBranchDialogMode =
  | { mode: "add" }
  | { mode: "edit"; branch: BranchResponse }

type Props = {
  value: AddEditBranchDialogMode | null
  onClose: () => void
  onSuccess: () => void
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

export function AddEditBranchDialog({ value, onClose, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)
  const isEdit = value?.mode === "edit"
  const editBranch = isEdit && value ? value.branch : null

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", address: "", phoneNumber: "" },
  })

  useEffect(() => {
    if (value === null) return
    dialogRef.current?.showModal()
    if (editBranch) {
      form.reset({
        name: editBranch.name ?? "",
        address: editBranch.address ?? "",
        phoneNumber: editBranch.phoneNumber ?? "",
      })
    } else {
      form.reset({ name: "", address: "", phoneNumber: "" })
    }
  }, [value, editBranch?.id, form])

  if (value === null) return null

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      if (isEdit && editBranch) {
        await branchService.updateBranch(editBranch.id, {
          name: data.name,
          address: data.address || null,
          phoneNumber: data.phoneNumber || null,
        })
        toast.success("Branch updated")
      } else {
        await branchService.createBranch({
          name: data.name,
          address: data.address || null,
          phoneNumber: data.phoneNumber || null,
        })
        toast.success("Branch created")
      }
      onSuccess()
      close()
    } catch (err: unknown) {
      const msg = (err as unknown as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save branch"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={close}
      className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-lg w-full"
      aria-labelledby="add-edit-branch-title"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
        <h2 id="add-edit-branch-title" className="text-lg font-semibold mb-4">
          {isEdit ? "Update branch" : "Create branch"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <input {...form.register("name")} className={cn(inputClass, form.formState.errors.name && "border-destructive")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Address</label>
            <input {...form.register("address")} className={inputClass} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Phone</label>
            <input {...form.register("phoneNumber")} className={inputClass} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (isEdit ? "Updating…" : "Creating…") : isEdit ? "Update branch" : "Create branch"}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
