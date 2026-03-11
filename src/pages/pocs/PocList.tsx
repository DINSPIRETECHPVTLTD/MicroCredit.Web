import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  type MRT_ColumnDef,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { Plus, Pencil, UserX } from "lucide-react"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { pocService } from "@/services/poc.service"
import { getBranch } from "@/services/auth.service"
import type { PocResponse } from "@/types/poc"

function PocList() {
  const branchId = getBranch()?.id

  const {
    data: pocs = [],
    isLoading,
  } =  useQuery({
    queryKey: ["pocs", branchId],
    queryFn: () => pocService.getPocsByBranch(branchId!),
    enabled: !!branchId,
  })

  const columns = useMemo<MRT_ColumnDef<PocResponse>[]>(
    () => [
      {
        accessorKey: "name",
        header: "POC Name",
      },
      {
        accessorKey: "phoneNumber",
        header: "Phone",
      },
      {
        accessorKey: "fullAddress",
        header: "Address",
      },
      {
        accessorKey: "centerName",
        header: "Center Name",
      },
      {
        accessorKey: "collectionDay",
        header: "Collection Day",
      },
      {
        accessorKey: "collectionBy",
        header: "Collection By",
      },
      {
        accessorKey: "collectionFrequency",
        header: "Collection Frequency",
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        Cell: () => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast("Edit POC API/UI not implemented yet")}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast("Set inactive API/UI not implemented yet")}
            >
              <UserX className="h-4 w-4 mr-1" />
              Set inactive
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const table = useMaterialReactTable({
    columns,
    data: pocs,
    state: { isLoading },
    enableSorting: true,
    enableColumnFilters: true,
    enableGrouping: true,
    enableExpanding: false,
    enableColumnPinning: true,
  })

  if (!branchId) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p>No active branch selected.</p>
        <p className="text-sm mt-1">Navigate to a branch first, then open POCs.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">All POCs</h1>
        <Button onClick={() => toast("Add POC API/UI not implemented yet")}>
          <Plus className="h-4 w-4 mr-2" />
          Add POC
        </Button>
      </div>

      {!isLoading && pocs.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No POCs found</p>
          <p className="text-sm mt-1">Click &quot;Add POC&quot; to create a new POC</p>
          <Button
            className="mt-4"
            onClick={() => toast("Add POC API/UI not implemented yet")}
          >
            Add POC
          </Button>
        </div>
      ) : (
        <MaterialReactTable table={table} />
      )}
    </div>
  )
}

export default PocList