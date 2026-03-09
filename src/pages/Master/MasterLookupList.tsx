import React, { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type MRT_ColumnDef, MaterialReactTable } from "material-react-table"
import type { MasterLookupResponse } from "../../types/masterLookup"
import { masterlookupService } from "../../services/masterLookup.service"
import { Button } from "../../components/ui/button"
import { Plus, Pencil, Trash } from "lucide-react"
import toast from "react-hot-toast"

// Use MasterLookupResponse from types
function MasterLookupList() {
    const { data: masterLookups = [], isLoading } = useQuery({
        queryKey: ["masterLookups"],
        queryFn: () => masterlookupService.getMasterLookups(),
    })


    const columns = useMemo<MRT_ColumnDef<MasterLookupResponse>[]>(
        () => [
            {
                accessorKey: "id",
                header: "Id",
                size: 80,
            },
            {
                accessorKey: "lookupKey",
                header: "Key",
            },
            {
                accessorKey: "lookupValue",
                header: "Value",
            },
            {
                header: "Code",
                accessorFn: (row) => row.lookupCode ?? "_",
            },

            {
                header: "Numeric Value",
                accessorFn: (row) => (row.numericValue ?? "_"),
            },
            {
                accessorKey: "sortOrder",
                header: "Sort Order",
            },
            {
                header: "Status",
                accessorFn:()=> "Active",
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
                            <Button variant="ghost" size="sm" onClick={() => toast("Delete not implemented")}>
                                <Trash className="h-4 w-4 mr-1" />
                                Delete
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
                <h1 className="text-2xl font-semibold">All Master Lookups</h1>
                <Button onClick={() => toast("Add Master Lookup not implemented")}>
                    <Plus className="h-4 w-4 mr-2" />
                    ADD
                </Button>
            </div>

       


          

            {!isLoading && masterLookups.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                    <p>No masterLookups found</p>
                    <p className="text-sm mt-1">Click &quot;Add Branch&quot; to create a new branch</p>
                    <Button className="mt-4" onClick={() => toast("Add Branch not implemented")}>
                        Add Branch
                    </Button>
                </div>
            ) : (
                <MaterialReactTable
                    columns={columns}
                        data={masterLookups}
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

export default MasterLookupList