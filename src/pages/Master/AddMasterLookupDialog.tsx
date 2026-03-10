import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"
import type { CreateMasterLookupRequest, MasterLookupResponse } from "@/types/masterLookup"

const schema = z.object({
  lookupKey: z.string().min(1, "LookupKey is required"),
  lookupCode: z.string().min(1, "LookupCode is required"),
  lookupValue: z.string().min(1, "LookupValue is required"),
  numericValue: z
    .union([z.coerce.number(), z.nan()])
    .optional()
    .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined)),
  sortOrder: z.coerce.number().int().min(0, "SortOrder must be 0 or greater"),
  description: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

export type AddEditMasterLookupDialogMode =
  | { mode: "add" }
  | { mode: "edit"; lookup: MasterLookupResponse }

type Props = {
  value: AddEditMasterLookupDialogMode | null
  onClose: () => void
  onSuccess: () => void
  onSubmit: (payload: CreateMasterLookupRequest, mode: "add" | "edit", id?: number) => Promise<void>
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "string") return data
  if (data && typeof data === "object") {
    const obj = data as { message?: string; error?: string; title?: string }
    return obj.message ?? obj.error ?? obj.title ?? fallback
  }
  return fallback
}

export default function AddMasterLookupDialog({ value, onClose, onSuccess, onSubmit }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)
  const isEdit = value?.mode === "edit"
  const editLookup = value?.mode === "edit" ? value.lookup : null

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      lookupKey: "",
      lookupCode: "",
      lookupValue: "",
      numericValue: undefined,
      sortOrder: 0,
      description: "",
    },
  })

  useEffect(() => {
    if (!value) {
      dialogRef.current?.close()
      return
    }
    dialogRef.current?.showModal()
    if (editLookup) {
      form.reset({
        lookupKey: editLookup.lookupKey ?? "",
        lookupCode: editLookup.lookupCode ?? "",
        lookupValue: editLookup.lookupValue ?? "",
        numericValue: editLookup.numericValue ?? undefined,
        sortOrder: editLookup.sortOrder ?? 0,
        description: editLookup.description ?? "",
      })
    } else {
      form.reset({
        lookupKey: "",
        lookupCode: "",
        lookupValue: "",
        numericValue: undefined,
        sortOrder: 0,
        description: "",
      })
    }
  }, [value, editLookup?.id, form])

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  const submit = async (data: FormOutput) => {
    setSaving(true)
    try {
      await onSubmit({
        lookupKey: data.lookupKey,
        lookupCode: data.lookupCode,
        lookupValue: data.lookupValue,
        numericValue: data.numericValue ?? null,
        sortOrder: data.sortOrder,
        description: data.description?.trim() ? data.description.trim() : null,
      }, isEdit ? "edit" : "add", editLookup?.id)
      toast.success(isEdit ? "Master lookup updated" : "Master lookup created")
      onSuccess()
      close()
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save master lookup"))
    } finally {
      setSaving(false)
    }
  }

  if (!value) return null

  return (
    <dialog
      ref={dialogRef}
      onCancel={close}
      className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-xl w-full"
      aria-labelledby="add-edit-master-lookup-title"
    >
      <div className="p-6 border-b">
        <h2 id="add-edit-master-lookup-title" className="text-lg font-semibold">
          {isEdit ? "Edit Master Lookup" : "Add Master Lookup"}
        </h2>
      </div>
      <form onSubmit={form.handleSubmit(submit)} className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">LookupKey</label>
          <input
            {...form.register("lookupKey")}
            className={cn(inputClass, form.formState.errors.lookupKey && "border-destructive")}
          />
          {form.formState.errors.lookupKey && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.lookupKey.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">LookupCode</label>
          <input
            {...form.register("lookupCode")}
            className={cn(inputClass, form.formState.errors.lookupCode && "border-destructive")}
          />
          {form.formState.errors.lookupCode && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.lookupCode.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">LookupValue</label>
          <input
            {...form.register("lookupValue")}
            className={cn(inputClass, form.formState.errors.lookupValue && "border-destructive")}
          />
          {form.formState.errors.lookupValue && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.lookupValue.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">NumericValue</label>
          <input type="number" step="0.01" {...form.register("numericValue")} className={inputClass} />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">SortOrder</label>
          <input
            type="number"
            {...form.register("sortOrder")}
            className={cn(inputClass, form.formState.errors.sortOrder && "border-destructive")}
          />
          {form.formState.errors.sortOrder && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.sortOrder.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Description</label>
          <textarea {...form.register("description")} className={inputClass} rows={3} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Submit"}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
