import { useMemo } from "react"
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
                Cell: () => {
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
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">All Master Lookups</h1>
                <Button onClick={() => toast("Add Master Lookup not implemented")}>
                    <Plus className="h-4 w-4 mr-2" />
                    ADD
                </Button>
            </div>

       


          

            {!isLoading && masterLookups.length === 0 ? (
                <div className="card-empty">
                    <p>No masterLookups found</p>
                    <p className="text-sm mt-1">Click &quot;Add Branch&quot; to create a new branch</p>
                    <Button className="mt-4" onClick={() => toast("Add Branch not implemented")}>
                        Add Branch
                    </Button>
                </div>
            ) : (
                <div className="table-wrapper">
                    <div className="table table-row-hover">
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
                    </div>
                </div>
            )}
        </div>
    )
}

export default MasterLookupList