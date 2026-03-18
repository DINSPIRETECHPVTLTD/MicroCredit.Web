
import { useRef, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "../../components/ui/button"
import { cn } from "../../lib/utils"
import toast from "react-hot-toast"
import { branchService } from "../../services/branch.service"
import type { BranchResponse } from "../../types/branch"

const branchNameSchema = z
    .string()
    .min(1, "Branch name is required")
    .max(200, "Branch name must be at most 200 characters")
    .regex(/^[a-zA-Z0-9 ]*$/, "No special characters allowed; alphanumeric and spaces only")

const alphanumericWithSpacesMax200Schema = z
    .string()
    .max(200, "Must be at most 200 characters")
    .regex(/^[a-zA-Z0-9 ]*$/, "Alphanumeric and spaces only; max 200 characters")

const citySchema = alphanumericWithSpacesMax200Schema

const addressSchema = z.string().max(500, "Address must be at most 500 characters")

const zipcodeSchema = z
    .string()
    .max(6, "Pin code must be at most 6 digits")
    .regex(/^\d*$/, "Numeric only; max 6 digits")

const phoneSchema = z
    .string()
    .max(10, "Phone must be at most 10 digits")
    .regex(/^\d*$/, "Numeric only; max 10 digits")

const baseFields = z.object({
    name: branchNameSchema,
    address1: addressSchema,
    address2: addressSchema,
    city: citySchema,
    state: alphanumericWithSpacesMax200Schema,
    country: alphanumericWithSpacesMax200Schema,
    zipcode: zipcodeSchema,
    phoneNumber: phoneSchema,
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
               // country: editBranch.country ?? "",
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
                    address1: data.address1 || null,
                    address2: data.address2 || null,
                    city: data.city || null,
                    state: data.state || null,
                    country: data.country || null,
                    zipcode: data.zipcode || null,
                    phoneNumber: data.phoneNumber || null,
                })
                toast.success("Branch updated")
            } else {
                await branchService.createBranch({
                    name: data.name,
                    address1: data.address1 || null,
                    address2: data.address2 || null,
                    city: data.city || null,
                    state: data.state || null,
                    country: data.country || null,
                    zipcode: data.zipcode || null,                    
                    phoneNumber: data.phoneNumber || null,
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
                <h2 id="add-edit-branch-title" className="text-lg font-semibold mb-4">
                    {isEdit ? "Update branch" : "Create branch"}
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Branch Name <span className="text-destructive">*</span></label>
                        <input
                            {...form.register("name")}
                            maxLength={200}
                            className={cn(inputClass, form.formState.errors.name && "border-destructive")}
                            placeholder="Alphanumeric and spaces only"
                        />
                        {form.formState.errors.name && (
                            <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Address 1</label>
                            <input
                                {...form.register("address1")}
                                maxLength={500}
                                className={cn(inputClass, form.formState.errors.address1 && "border-destructive")}
                                placeholder="Free text; alphanumeric & special characters"
                            />
                            {form.formState.errors.address1 && (
                                <p className="text-xs text-destructive mt-1">{form.formState.errors.address1.message}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Address 2</label>
                            <input
                                {...form.register("address2")}
                                maxLength={500}
                                className={cn(inputClass, form.formState.errors.address2 && "border-destructive")}
                                placeholder="Free text; alphanumeric & special characters"
                            />
                            {form.formState.errors.address2 && (
                                <p className="text-xs text-destructive mt-1">{form.formState.errors.address2.message}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">City</label>
                            <input
                                {...form.register("city")}
                                maxLength={200}
                                className={cn(inputClass, form.formState.errors.city && "border-destructive")}
                                placeholder="Alphanumeric and spaces, max 200 characters"
                            />
                            {form.formState.errors.city && (
                                <p className="text-xs text-destructive mt-1">{form.formState.errors.city.message}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">State</label>
                            <input
                                {...form.register("state")}
                                maxLength={200}
                                className={cn(inputClass, form.formState.errors.state && "border-destructive")}
                                placeholder="Alphanumeric and spaces, max 200 characters"
                            />
                            {form.formState.errors.state && (
                                <p className="text-xs text-destructive mt-1">{form.formState.errors.state.message}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Country</label>
                            <input
                                {...form.register("country")}
                                maxLength={200}
                                className={cn(inputClass, form.formState.errors.country && "border-destructive")}
                                placeholder="Alphanumeric and spaces, max 200 characters"
                            />
                            {form.formState.errors.country && (
                                <p className="text-xs text-destructive mt-1">{form.formState.errors.country.message}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Zip Code</label>
                            <input
                                {...form.register("zipcode")}
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                className={cn(inputClass, form.formState.errors.zipcode && "border-destructive")}
                                placeholder="Numeric only, max 6 digits"
                            />
                            {form.formState.errors.zipcode && (
                                <p className="text-xs text-destructive mt-1">{form.formState.errors.zipcode.message}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Phone</label>
                            <input
                                {...form.register("phoneNumber")}
                                type="text"
                                inputMode="numeric"
                                maxLength={10}
                                className={cn(inputClass, form.formState.errors.phoneNumber && "border-destructive")}
                                placeholder="Numeric only, max 10 digits"
                            />
                            {form.formState.errors.phoneNumber && (
                                <p className="text-xs text-destructive mt-1">{form.formState.errors.phoneNumber.message}</p>
                            )}
                        </div>
                        <div />
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
            </form>
        </dialog>
    )
}
