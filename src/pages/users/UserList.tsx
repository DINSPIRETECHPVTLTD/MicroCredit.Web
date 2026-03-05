import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
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

      {isLoading ? (
        <p className="text-muted-foreground">Loading users...</p>
      ) : users.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No users found</p>
          <p className="text-sm mt-1">Click &quot;Add User&quot; to create a new user</p>
          <Button asChild className="mt-4">
            <Link to="/users/new">Add User</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Full Name</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Role</th>
                  <th className="text-left p-3 font-medium">Address</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <UserRow key={user.id} user={user} onUpdated={refetch} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function UserRow({
  user,
  onUpdated,
}: {
  user: UserResponse
  onUpdated: () => void
}) {
  const fullName = [user.firstName, user.surname].filter(Boolean).join(" ")

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
    <tr className="border-b hover:bg-muted/30">
      <td className="p-3">{user.id}</td>
      <td className="p-3">{fullName}</td>
      <td className="p-3">{user.email}</td>
      <td className="p-3">{user.role}</td>
      <td className="p-3">{user.address || user.address1 || "—"}</td>
      <td className="p-3 text-right">
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
      </td>
    </tr>
  )
}

export default UserList
