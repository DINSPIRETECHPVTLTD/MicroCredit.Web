import { useRef, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
          <div className="form-group">
            <label className="form-label">Name</label>
            <input {...form.register("name")} className={cn("input", form.formState.errors.name && "border-destructive")} />
            {form.formState.errors.name && (
              <p className="form-error">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input {...form.register("address")} className="input" />
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input {...form.register("phoneNumber")} className="input" />
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
