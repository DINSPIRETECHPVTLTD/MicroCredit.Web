import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
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

function UserList() {
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
          <UserRowActions user={row.original} onUpdated={refetch} />
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
    </div>
  )
}

function UserRowActions({
  user,
  onUpdated,
}: {
  user: UserResponse
  onUpdated: () => void
}) {
  const handleResetPassword = () => {
    if (window.confirm(`Send a password reset to ${user.email}?`)) {
      // TODO: POST /api/users/{id}/reset-password
      toast.success("Reset password requested")
      onUpdated()
    }
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
