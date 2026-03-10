import { useMemo, useRef, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  type MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { userService } from "@/services/user.service"
import type { UserResponse } from "@/types/user"
import { Button } from "@/components/ui/button"
import { AddEditUserDialog, type AddEditUserDialogMode } from "@/pages/users/AddEditUserDialog"
import { Plus, Pencil, Key, UserX } from "lucide-react"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

function UserList() {
  const [resetPasswordUser, setResetPasswordUser] = useState<UserResponse | null>(null)
  const [setInactiveUser, setSetInactiveUser] = useState<UserResponse | null>(null)
  const [addEditDialog, setAddEditDialog] = useState<AddEditUserDialogMode | null>(null)
  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.getUsers(),
  })

  const columns = useMemo<MRT_ColumnDef<UserResponse>[]>(
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
        accessorFn: (row) => row.address || row.address1 || "—",
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
    data: users,
    state: { isLoading },
    enableSorting: true,
    enableColumnFilters: true,
    enableGrouping: true,
    enableExpanding: false,
    enableColumnPinning: true,
  })

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">All Users</h1>
        <Button onClick={() => setAddEditDialog({ mode: "add" })}>
          <Plus className="h-4 w-4 mr-2" />
          ADD USER
        </Button>
      </div>

      {!isLoading && users.length === 0 ? (
        <div className="card-empty">
          <p>No users found</p>
          <p>Click &quot;Add User&quot; to create a new user</p>
          <Button className="mt-4" onClick={() => setAddEditDialog({ mode: "add" })}>
            Add User
          </Button>
        </div>
      ) : (
        <div className="table-wrapper">
          <div className="table table-row-hover">
            <MaterialReactTable table={table} />
          </div>
        </div>
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

      <AddEditUserDialog
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
  user: UserResponse
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
      className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50"
      aria-labelledby="reset-password-title"
      aria-describedby="reset-password-desc"
    >
      <form
        onSubmit={form.handleSubmit(async (data) => {
          setSubmitting(true)
          try {
            await userService.resetPassword(user.id, { password: data.password })
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
          <div className="form-group">
            <label htmlFor="reset-password-new" className="form-label">
              New password
            </label>
            <input
              id="reset-password-new"
              type="password"
              autoComplete="new-password"
              className={cn("input", form.formState.errors.password && "border-destructive")}
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="form-error">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="reset-password-confirm" className="form-label">
              Confirm password
            </label>
            <input
              id="reset-password-confirm"
              type="password"
              autoComplete="new-password"
              className={cn("input", form.formState.errors.confirmPassword && "border-destructive")}
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <p className="form-error">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Resetting…" : "Reset password"}
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
  user: UserResponse
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
      await userService.setInactive(user.id)
      toast.success("User set inactive")
      onSuccess()
        close()
      } catch (err) {
        toast.error(
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to set user inactive"
            : "Failed to set user inactive"
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
            {submitting ? "Setting…" : "Set inactive"}
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
  user: UserResponse
  onOpenResetPassword: (user: UserResponse) => void
  onOpenEdit: (mode: AddEditUserDialogMode) => void
  onOpenSetInactive: (user: UserResponse) => void
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

export default UserList
