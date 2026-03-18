import { useRef, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "../../components/ui/button"
import { cn } from "../../lib/utils"
import toast from "react-hot-toast"
import { branchService } from "../../services/branch.service"
import type { BranchResponse } from "../../types/branch"

const baseFields = z.object({
    name: z.string().min(1, "Name is required"),
    address1: z.string().optional(),    
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipcode: z.string().optional(),
    phoneNumber: z.string().optional(),
})

type CreateFormData = z.infer<typeof baseFields>

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

function getApiErrorMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: unknown } })?.response?.data
    if (typeof data === "string") return data
    if (data && typeof data === "object") {
        const obj = data as { message?: string; error?: string; title?: string }
        return obj.message ?? obj.error ?? obj.title ?? fallback
    }
    return fallback
}

export function AddEditBranchDialog({ value, onClose, onSuccess }: Props) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [saving, setSaving] = useState(false)
    const isEdit = value?.mode === "edit"
    const editBranch = isEdit && value ? value.branch : null

    const form = useForm<CreateFormData>({
        resolver: zodResolver(baseFields),
        defaultValues: { name: "", address1: "",address2:"",city:"",country:"",state:"",zipcode:"" , phoneNumber: "" },
    })

    useEffect(() => {
        if (value === null) return
        dialogRef.current?.showModal()
        if (editBranch) {
            form.reset({
                name: editBranch.name ?? "",
                address1: editBranch.address1 ?? "",
                address2: editBranch.address2 ?? "",
                city: editBranch.city ?? "",
                state: editBranch.state ?? "",
                country: editBranch.country ?? "",
                zipcode: editBranch.zipCode ?? "",
                phoneNumber: editBranch.phoneNumber ?? "",
            })
        } else {
            form.reset({ name: "", address1: "", address2: "", city: "", country: "", state: "", zipcode: "", phoneNumber: "" })
        }
    }, [value, editBranch?.id, form])

    if (value === null) return null

    const close = () => {
        dialogRef.current?.close()
        onClose()
    }

    const onSubmit = async (data: CreateFormData) => {
        setSaving(true)
        try {
            if (isEdit && editBranch) {
                await branchService.updateBranch(editBranch.id, {
                    name: data.name,
                    address1: data.address1 || "",
                    address2: data.address2 || "",
                    city: data.city || "",
                    state: data.state || "",
                    country: data.country || "",
                    zipcode: data.zipcode || "",
                    phoneNumber: data.phoneNumber || "",
                })
                toast.success("Branch updated")
            } else {
                await branchService.createBranch({
                    name: data.name,
                    address1: data.address1 || "",
                    address2: data.address2 || "",
                    city: data.city || "",
                    state: data.state || "",
                    country: data.country || "",
                    zipcode: data.zipcode || "",                    
                    phoneNumber: data.phoneNumber || "",
                })
                toast.success("Branch created")
            }
            onSuccess()
            close()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, "Failed to save branch"))
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
            <div className="p-6 border-b shrink-0">
                <h2 id="add-edit-branch-title" className="text-lg font-semibold mb-4">
                {isEdit ? "Update branch" : "Create branch"}
                </h2>
            </div>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col min-h-0 overflow-hidden"
            >
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    <section>

                   <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Branch Name</label>
                        <input {...form.register("name")} className={cn(inputClass, form.formState.errors.name && "border-destructive")} />
                        {form.formState.errors.name && (
                            <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Address1</label>
                        <input {...form.register("address1")} className={inputClass} />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Address2</label>
                        <input {...form.register("address2")} className={inputClass} />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">City</label>
                        <input {...form.register("city")} className={inputClass} />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">State</label>
                        <input {...form.register("state")} className={inputClass} />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Country</label>
                        <input {...form.register("country")} className={inputClass} />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Zip Code</label>
                        <input {...form.register("zipcode")} className={inputClass} />
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
                        {saving ? (isEdit ? "Updating�" : "Creating�") : isEdit ? "Update branch" : "Create branch"}
                    </Button>
                        </div>
                    </section>
                </div>
            </form>
        </dialog>
    )
}
