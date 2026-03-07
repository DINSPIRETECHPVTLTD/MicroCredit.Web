import React, { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type MRT_ColumnDef, MaterialReactTable } from "material-react-table"
import { branchService } from "../../services/branch.service"
import type { BranchResponse } from "../../types/branch"
import { Button } from "../../components/ui/button"
import { Plus, Pencil, UserX, MapPin } from "lucide-react"
import toast from "react-hot-toast"

function BranchList() {
  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchService.getBranches(),
  })

  const columns = useMemo<MRT_ColumnDef<BranchResponse>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Id",
        size: 80,
      },
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        id: "address",
        header: "Address",
        accessorFn: (row) => row.address ?? "—",
      },
      {
        accessorKey: "phoneNumber",
        header: "Phone",
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => {
          return (
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => toast("Edit not implemented")}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toast("Set inactive not implemented")}>
                <UserX className="h-4 w-4 mr-1" />
                Set inactive
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toast("Navigate not implemented")}>
                <MapPin className="h-4 w-4 mr-1" />
                Navigate
              </Button>
            </div>
          )
        },
      },
    ],
    []
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">All Branches</h1>
        <Button onClick={() => toast("Add Branch not implemented")}>
          <Plus className="h-4 w-4 mr-2" />
          ADD Branch
        </Button>
      </div>

      {!isLoading && branches.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No branches found</p>
          <p className="text-sm mt-1">Click &quot;Add Branch&quot; to create a new branch</p>
          <Button className="mt-4" onClick={() => toast("Add Branch not implemented")}>
            Add Branch
          </Button>
        </div>
      ) : (
        <MaterialReactTable
          columns={columns}
          data={branches}
          state={{ isLoading }}
          enableSorting
          enableColumnFilters
          enableGrouping
          enableExpanding={false}
          enableColumnPinning
        />
      )}
    </div>
  )
}

export default BranchList
