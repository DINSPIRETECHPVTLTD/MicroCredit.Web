import React, { useRef, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { staffService } from "@/services/staff.service"
import type { StaffResponse } from "@/types/staff"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const baseFields = {
    firstName: z.string().min(1, "First name is required"),
    surname: z.string().min(1, "Surname is required"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    role: z.string().min(1, "Role is required"),
    phoneNumber: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pinCode: z.string().optional(),
}

const createSchema = z
    .object({
        ...baseFields,
        password: z.string().min(6, "Password must be at least 6 characters").optional(),
        confirmPassword: z.string().optional(),
    })
    .refine(
        (data) => !data.password || data.password === data.confirmPassword,
        { message: "Passwords do not match", path: ["confirmPassword"] }
    )

const editSchema = z.object(baseFields)

type CreateFormData = z.infer<typeof createSchema>

const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const ROLES = ["Staff", "BranchAdmin"]

export type AddEditStaffDialogMode = { mode: "add" } | { mode: "edit"; user: StaffResponse }

type Props = {
    value: AddEditStaffDialogMode | null
    onClose: () => void
    onSuccess: () => void
}

export function AddEditStaffDialog({ value, onClose, onSuccess }: Props) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [saving, setSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const isEdit = value?.mode === "edit"
    const editUser = value?.mode === "edit" ? value.user : null

    const form = useForm<CreateFormData>({
        resolver: zodResolver(isEdit ? editSchema : createSchema),
        defaultValues: {
            firstName: "",
            surname: "",
            email: "",
            role: "Staff",
            phoneNumber: "",
            address1: "",
            address2: "",
            city: "",
            state: "",
            pinCode: "",
        },
    })

    useEffect(() => {
        if (value === null) return
        dialogRef.current?.showModal()
        setErrorMessage(null)
        if (editUser) {
            form.reset({
                firstName: editUser.firstName,
                surname: editUser.surname,
                email: editUser.email,
                role: editUser.role,
                phoneNumber: editUser.phoneNumber || "",
                address1: editUser.address1 || "",
                address2: editUser.address2 || "",
                city: editUser.city || "",
                state: editUser.state || "",
                pinCode: editUser.pinCode || "",
            })
        } else {
            form.reset({
                firstName: "",
                surname: "",
                email: "",
                role: "Staff",
                phoneNumber: "",
                address1: "",
                address2: "",
                city: "",
                state: "",
                pinCode: "",
            })
        }
    }, [value, editUser?.id, form])

    const close = () => {
        dialogRef.current?.close()
        onClose()
    }

    const onSubmit = async (data: CreateFormData) => {
        setErrorMessage(null)
        setSaving(true)
        try {
            if (isEdit && editUser) {
                await staffService.updateStaff(editUser.id, {
                    firstName: data.firstName,
                    surname: data.surname,
                    email: data.email,
                    role: data.role,
                    phoneNumber: data.phoneNumber || null,
                    address1: data.address1 || null,
                    address2: data.address2 || null,
                    city: data.city || null,
                    state: data.state || null,
                    pinCode: data.pinCode || null,
                })
                toast.success("Staff updated")
            } else {
                if (!data.password) {
                    form.setError("password", { message: "Password is required" })
                    setSaving(false)
                    return
                }
                const { confirmPassword: _, ...rest } = data
                await staffService.createStaff({
                    ...rest,
                    password: data.password!,
                    phoneNumber: data.phoneNumber || null,
                    address1: data.address1 || null,
                    address2: data.address2 || null,
                    city: data.city || null,
                    state: data.state || null,
                    pinCode: data.pinCode || null,
                })
                toast.success("Staff created")
            }
            onSuccess()
            close()
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? "Something went wrong."
            setErrorMessage(msg)
        } finally {
            setSaving(false)
        }
    }

    if (value === null) return null

    return (
        <dialog
            ref={dialogRef}
            onCancel={close}
            className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-2xl w-full max-h-[90vh] flex flex-col"
            aria-labelledby="add-edit-staff-title"
        >
            <div className="p-6 border-b shrink-0">
                <h2 id="add-edit-staff-title" className="text-lg font-semibold">
                    {isEdit ? "Update staff" : "Create staff"}
                </h2>
            </div>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col min-h-0 overflow-hidden"
            >
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    <section>
                        <h3 className="text-sm font-medium mb-3">Basic information</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium mb-1 block">First name</label>
                                <input
                                    {...form.register("firstName")}
                                    className={cn(inputClass, form.formState.errors.firstName && "border-destructive")}
                                />
                                {form.formState.errors.firstName && (
                                    <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Surname</label>
                                <input
                                    {...form.register("surname")}
                                    className={cn(inputClass, form.formState.errors.surname && "border-destructive")}
                                />
                                {form.formState.errors.surname && (
                                    <p className="text-xs text-destructive mt-1">{form.formState.errors.surname.message}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Email</label>
                                <input
                                    {...form.register("email")}
                                    type="email"
                                    className={cn(inputClass, form.formState.errors.email && "border-destructive")}
                                />
                                {form.formState.errors.email && (
                                    <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Phone</label>
                                <input {...form.register("phoneNumber")} className={inputClass} />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Role</label>
                                <select {...form.register("role")} className={inputClass}>
                                    {ROLES.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {!isEdit && (
                        <section>
                            <h3 className="text-sm font-medium mb-3">Security</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Password</label>
                                    <input
                                        {...form.register("password")}
                                        type="password"
                                        autoComplete="new-password"
                                        className={cn(inputClass, form.formState.errors.password && "border-destructive")}
                                    />
                                    {form.formState.errors.password && (
                                        <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Confirm password</label>
                                    <input
                                        {...form.register("confirmPassword")}
                                        type="password"
                                        autoComplete="new-password"
                                        className={cn(inputClass, form.formState.errors.confirmPassword && "border-destructive")}
                                    />
                                    {form.formState.errors.confirmPassword && (
                                        <p className="text-xs text-destructive mt-1">{form.formState.errors.confirmPassword.message}</p>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    <section>
                        <h3 className="text-sm font-medium mb-3">Address</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Address 1</label>
                                <input {...form.register("address1")} className={inputClass} />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Address 2</label>
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
                            <div className="sm:col-span-2">
                                <label className="text-sm font-medium mb-1 block">Zip code</label>
                                <input {...form.register("pinCode")} className={inputClass} />
                            </div>
                        </div>
                    </section>

                    {errorMessage && (
                        <p className="text-sm text-destructive">{errorMessage}</p>
                    )}
                </div>

                <div className="flex justify-end gap-2 p-6 border-t shrink-0">
                    <Button type="button" variant="outline" onClick={close}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? "Saving…" : isEdit ? "Update staff" : "Create staff"}
                    </Button>
                </div>
            </form>
        </dialog>
    )
}
