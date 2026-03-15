import { useRef, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "../../components/ui/button"
import { cn } from "../../lib/utils"
import toast from "react-hot-toast"
import { centerService } from "../../services/center.service"
import type { CenterResponse } from "../../types/center"

const baseFields = z.object({
    name: z.string().min(1, "Name is required"),
    address: z.string().optional(),
    city: z.string().optional(),
})

type CreateFormData = z.infer<typeof baseFields>

export type AddEditCenterDialogMode =
    | { mode: "add" }
    | { mode: "edit"; center: CenterResponse }

type Props = {
    value: AddEditCenterDialogMode | null
    onClose: () => void
    onSuccess: () => void
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

export function AddEditCenterDialog({ value, onClose, onSuccess }: Props) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [saving, setSaving] = useState(false)
    const isEdit = value?.mode === "edit"
    const editCenter = isEdit && value ? value.center : null

    const form = useForm<CreateFormData>({
        resolver: zodResolver(baseFields),
        defaultValues: { name: "", address: "", city: "" },
    })

    useEffect(() => {
        if (value === null) return
        dialogRef.current?.showModal()
        if (editCenter) {
            form.reset({
                name: editCenter.name ?? "",
                address: editCenter.address ?? "",
                city: editCenter.city ?? "",
            })
        } else {
            form.reset({ name: "", address: "", city: "" })
        }
    }, [value, editCenter?.id, form])

    if (value === null) return null

    const close = () => {
        dialogRef.current?.close()
        onClose()
    }

    const onSubmit = async (data: CreateFormData) => {
        setSaving(true)
        try {
            if (isEdit && editCenter) {
                await centerService.updateCenter(editCenter.id, {
                    name: data.name,
                    address: data.address || null,
                    city: data.city || null,
                })
                toast.success("Center updated")
            } else {
                await centerService.createCenter({
                    name: data.name,
                    address: data.address || null,
                    city: data.city || null,
                })
                toast.success("Center created")
            }
            onSuccess()
            close()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, "Failed to save center"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <dialog
            ref={dialogRef}
            onCancel={close}
            className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-lg w-full"
            aria-labelledby="add-edit-center-title"
        >
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
                <h2 id="add-edit-center-title" className="text-lg font-semibold mb-4">
                    {isEdit ? "Update center" : "Create center"}
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Center Name</label>
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
                        <label className="text-sm font-medium mb-1 block">City</label>
                        <input {...form.register("city")} className={inputClass} />
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="outline" onClick={close}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? (isEdit ? "Updating�" : "Creating�") : isEdit ? "Update center" : "Create center"}
                    </Button>
                </div>
            </form>
        </dialog>
    )
}
