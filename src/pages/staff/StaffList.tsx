import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
    type MRT_ColumnDef,
    MaterialReactTable,
    useMaterialReactTable,
} from "material-react-table"
import { useQuery } from "@tanstack/react-query"
import { staffService } from "@/services/staff.service"
import type { StaffResponse } from "@/types/staff"
import { Button } from "@/components/ui/button"
import { AddEditStaffDialog, type AddEditStaffDialogMode } from "@/pages/staff/AddEditStaffDialog"
import { Plus, Pencil, Key, UserX } from "lucide-react"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useRef, useState } from "react"

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/
const passwordValidationMessage =
  "Password must be at least 8 characters and include uppercase, lowercase, number, special character (@$!%*?&#), and no spaces"

const resetPasswordSchema = z
    .object({
        password: z
            .string()
            .min(1, "Password is required")
            .refine((value) => passwordRegex.test(value), passwordValidationMessage),
        confirmPassword: z.string().min(1, "Confirm password is required"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

type AddEditDialogMode = { mode: "add" } | { mode: "edit"; user: StaffResponse }

function StaffList() {
    const [resetPasswordUser, setResetPasswordUser] = useState<StaffResponse | null>(null)
    const [setInactiveUser, setSetInactiveUser] = useState<StaffResponse | null>(null)
    const [addEditDialog, setAddEditDialog] = useState<AddEditDialogMode | null>(null)
    const {
        data: staffs = [],
        isLoading,
        refetch,
    } = useQuery({
        queryKey: ["staff"],
        queryFn: () => staffService.getStaffs(),
    })

    const columns = useMemo<MRT_ColumnDef<StaffResponse>[]>(
        () => [
            {
                accessorKey: "id",
                header: "Id",
                size: 80,
            },
            {
                id: "fullName",
                header: "Full Name",
                accessorFn: (row) => [row.firstName, row.surname].filter(Boolean).join(" "),
            },
            {
                accessorKey: "email",
                header: "Email",
            },
            {
                accessorKey: "role",
                header: "Role",
            },
            {
                id: "address",
                header: "Address",
                accessorFn: (row) => row.address || row.address1 || "ù",
            },
            {
                id: "actions",
                header: "Actions",
                enableSorting: false,
                enableColumnFilter: false,
                Cell: ({ row }) => (
                    <UserRowActions
                        user={row.original}
                        onOpenResetPassword={setResetPasswordUser}
                        onOpenEdit={setAddEditDialog}
                        onOpenSetInactive={setSetInactiveUser}
                    />
                ),
            },
        ],
        [refetch]
    )

    const table = useMaterialReactTable({
        columns,
        data: staffs,
        state: { isLoading },
        enableSorting: true,
        enableColumnFilters: true,
        enableGrouping: true,
        enableExpanding: false,
        enableColumnPinning: true,
    })

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">All Staff</h1>
                <Button onClick={() => setAddEditDialog({ mode: "add" })}>
                    <Plus className="h-4 w-4 mr-2" />
                    ADD STAFF
                </Button>
            </div>

            {!isLoading && staffs.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                    <p>No staff found</p>
                    <p className="text-sm mt-1">Click &quot;Add Staff&quot; to create a new staff member</p>
                    <Button className="mt-4" onClick={() => setAddEditDialog({ mode: "add" })}>
                        Add Staff
                    </Button>
                </div>
            ) : (
                <MaterialReactTable table={table} />
            )}

            {resetPasswordUser && (
                <ResetPasswordDialog
                    user={resetPasswordUser}
                    onClose={() => setResetPasswordUser(null)}
                    onSuccess={() => {
                        refetch()
                        setResetPasswordUser(null)
                    }}
                />
            )}

            {setInactiveUser && (
                <SetInactiveDialog
                    user={setInactiveUser}
                    onClose={() => setSetInactiveUser(null)}
                    onSuccess={() => {
                        refetch()
                        setSetInactiveUser(null)
                    }}
                />
            )}

            <AddEditStaffDialog
                value={addEditDialog}
                onClose={() => setAddEditDialog(null)}
                onSuccess={() => {
                    refetch()
                    setAddEditDialog(null)
                }}
            />
        </div>
    )
}

function ResetPasswordDialog({
    user,
    onClose,
    onSuccess,
}: {
    user: StaffResponse
    onClose: () => void
    onSuccess: () => void
}) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [submitting, setSubmitting] = useState(false)

    const form = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { password: "", confirmPassword: "" },
    })

    useEffect(() => {
        dialogRef.current?.showModal()
        form.reset({ password: "", confirmPassword: "" })
    }, [user.id, form])

    const close = () => {
        dialogRef.current?.close()
        onClose()
    }

    return (
        <dialog
            ref={dialogRef}
            onCancel={close}
            className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-md w-full"
            aria-labelledby="reset-password-title"
            aria-describedby="reset-password-desc"
        >
            <form
                onSubmit={form.handleSubmit(async (data) => {
                    setSubmitting(true)
                    try {
                        await staffService.resetPassword(user.id, { password: data.password })
                        toast.success("Password has been reset.")
                        onSuccess()
                        close()
                    } catch (err) {
                        toast.error(
                            err && typeof err === "object" && "response" in err
                                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to reset password"
                                : "Failed to reset password"
                        )
                    } finally {
                        setSubmitting(false)
                    }
                })}
                className="p-6"
            >
                <h2 id="reset-password-title" className="text-lg font-semibold">
                    Reset password
                </h2>
                <p id="reset-password-desc" className="text-sm text-muted-foreground mt-1 mb-4">
                    Set a new password for {user.firstName} {user.surname} ({user.email}).
                </p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="reset-password-new" className="text-sm font-medium mb-1 block">
                            New password
                        </label>
                        <input
                            id="reset-password-new"
                            type="password"
                            autoComplete="new-password"
                            className={cn(inputClass, form.formState.errors.password && "border-destructive")}
                            {...form.register("password")}
                        />
                        {form.formState.errors.password && (
                            <p className="text-xs text-destructive mt-1 break-words whitespace-normal">
                                {form.formState.errors.password.message}
                            </p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="reset-password-confirm" className="text-sm font-medium mb-1 block">
                            Confirm password
                        </label>
                        <input
                            id="reset-password-confirm"
                            type="password"
                            autoComplete="new-password"
                            className={cn(inputClass, form.formState.errors.confirmPassword && "border-destructive")}
                            {...form.register("confirmPassword")}
                        />
                        {form.formState.errors.confirmPassword && (
                            <p className="text-xs text-destructive mt-1 break-words whitespace-normal">
                                {form.formState.errors.confirmPassword.message}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="outline" onClick={close}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? "Resettingù" : "Reset password"}
                    </Button>
                </div>
            </form>
        </dialog>
    )
}

function SetInactiveDialog({
    user,
    onClose,
    onSuccess,
}: {
    user: StaffResponse
    onClose: () => void
    onSuccess: () => void
}) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        dialogRef.current?.showModal()
    }, [user.id])

    const close = () => {
        dialogRef.current?.close()
        onClose()
    }

    const handleConfirm = async () => {
        setSubmitting(true)
        try {
            await staffService.setInactive(user.id)
            toast.success("Staff set inactive")
            onSuccess()
            close()
        } catch (err) {
            toast.error(
                err && typeof err === "object" && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to set user inactive"
                    : "Failed to set staff inactive"
            )
        } finally {
            setSubmitting(false)
        }
    }

    const fullName = [user.firstName, user.surname].filter(Boolean).join(" ") || user.email

    return (
        <dialog
            ref={dialogRef}
            onCancel={close}
            className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-md w-full"
            aria-labelledby="set-inactive-title"
            aria-describedby="set-inactive-desc"
        >
            <div className="p-6">
                <h2 id="set-inactive-title" className="text-lg font-semibold">
                    Set user inactive
                </h2>
                <p id="set-inactive-desc" className="text-sm text-muted-foreground mt-1 mb-6">
                    Set <strong>{fullName}</strong> as inactive? They will no longer be able to sign in.
                </p>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={close}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleConfirm} disabled={submitting}>
                        {submitting ? "Settingù" : "Set inactive"}
                    </Button>
                </div>
            </div>
        </dialog>
    )
}

function UserRowActions({
    user,
    onOpenResetPassword,
    onOpenEdit,
    onOpenSetInactive,
}: {
    user: StaffResponse
    onOpenResetPassword: (user: StaffResponse) => void
        onOpenEdit: (mode: AddEditStaffDialogMode) => void
    onOpenSetInactive: (user: StaffResponse) => void
}) {
    const handleResetPassword = () => {
        onOpenResetPassword(user)
    }

    return (
        <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenEdit({ mode: "edit", user })}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetPassword}>
                <Key className="h-4 w-4 mr-1" />
                Reset password
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenSetInactive(user)}>
                <UserX className="h-4 w-4 mr-1" />
                Set inactive
            </Button>
        </div>
    )
}

export default StaffList
