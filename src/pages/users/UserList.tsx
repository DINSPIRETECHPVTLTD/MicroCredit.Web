import { useMemo, useRef, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
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

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

function UserList() {
  const [resetPasswordUser, setResetPasswordUser] = useState<UserResponse | null>(null)
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
            onUpdated={refetch}
            onOpenResetPassword={setResetPasswordUser}
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">All Users</h1>
        <Button asChild>
          <Link to="/users/new">
            <Plus className="h-4 w-4 mr-2" />
            ADD USER
          </Link>
        </Button>
      </div>

      {!isLoading && users.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No users found</p>
          <p className="text-sm mt-1">Click &quot;Add User&quot; to create a new user</p>
          <Button asChild className="mt-4">
            <Link to="/users/new">Add User</Link>
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
            await userService.resetPassword(user.id, { newPassword: data.password })
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
              <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>
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
              <p className="text-xs text-destructive mt-1">{form.formState.errors.confirmPassword.message}</p>
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

function UserRowActions({
  user,
  onUpdated,
  onOpenResetPassword,
}: {
  user: UserResponse
  onUpdated: () => void
  onOpenResetPassword: (user: UserResponse) => void
}) {
  const handleResetPassword = () => {
    onOpenResetPassword(user)
  }

  const handleSetInactive = () => {
    if (
      window.confirm(
        `Set ${user.firstName} ${user.surname} as inactive? They will no longer be able to sign in.`
      )
    ) {
      // TODO: PUT /api/users/{id}/inactive
      toast.success("User set inactive")
      onUpdated()
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/users/${user.id}/edit`}>
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={handleResetPassword}>
        <Key className="h-4 w-4 mr-1" />
        Reset password
      </Button>
      <Button variant="ghost" size="sm" onClick={handleSetInactive}>
        <UserX className="h-4 w-4 mr-1" />
        Set inactive
      </Button>
    </div>
  )
}

export default UserList
