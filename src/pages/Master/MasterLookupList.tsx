import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { type MRT_ColumnDef, MaterialReactTable } from "material-react-table"
import type { MasterLookupResponse } from "../../types/masterLookup"
import { masterlookupService } from "../../services/masterLookup.service"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash } from "lucide-react"
import toast from "react-hot-toast"
import AddMasterLookupDialog, { type AddEditMasterLookupDialogMode } from "./AddMasterLookupDialog"

function getApiErrorMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: unknown } })?.response?.data
    if (typeof data === "string") return data
    if (data && typeof data === "object") {
        const obj = data as { message?: string; error?: string; title?: string }
        return obj.message ?? obj.error ?? obj.title ?? fallback
    }
    return fallback
}

// Use MasterLookupResponse from types
function MasterLookupList() {
    const [addEditDialog, setAddEditDialog] = useState<AddEditMasterLookupDialogMode | null>(null)
    const [inactiveLookup, setInactiveLookup] = useState<MasterLookupResponse | null>(null)
    const { data: masterLookups = [], isLoading, refetch } = useQuery({
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
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAddEditDialog({ mode: "edit", lookup: row.original })}
                            >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setInactiveLookup(row.original)}
                            >
                                <Trash className="h-4 w-4 mr-1" />
                                Set inactive
                            </Button>
                        </div>
                    )
                },
            },
        ],
        [refetch]
    )

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">All Master Lookups</h1>
                <Button onClick={() => setAddEditDialog({ mode: "add" })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add LookUp
                </Button>
            </div>

            {!isLoading && masterLookups.length === 0 ? (
                <div className="card-empty">
                    <p>No masterLookups found</p>
                    <p className="text-sm mt-1">Click &quot;Add LookUp&quot; to create a new lookup.</p>
                    <Button className="mt-4" onClick={() => setAddEditDialog({ mode: "add" })}>
                        Add LookUp
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
            <AddMasterLookupDialog
                value={addEditDialog}
                onClose={() => setAddEditDialog(null)}
                onSuccess={() => {
                    setAddEditDialog(null)
                }}
                onSubmit={async (payload, mode, id) => {
                    if (mode === "add") {
                        await masterlookupService.createMasterLookup(payload)
                    } else if (mode === "edit" && id) {
                        await masterlookupService.updateMasterLookup(id, payload)
                    }
                    await refetch()
                }}
            />
            {inactiveLookup && (
                <SetInactiveDialog
                    lookup={inactiveLookup}
                    onClose={() => setInactiveLookup(null)}
                    onSuccess={async () => {
                        await refetch()
                        setInactiveLookup(null)
                    }}
                />
            )}
        </div>
    )
}

function SetInactiveDialog({
    lookup,
    onClose,
    onSuccess,
}: {
    lookup: MasterLookupResponse
    onClose: () => void
    onSuccess: () => void | Promise<void>
}) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        dialogRef.current?.showModal()
    }, [lookup.id])

    const close = () => {
        dialogRef.current?.close()
        onClose()
    }

    const handleConfirm = async () => {
        setSubmitting(true)
        try {
            await masterlookupService.setInactive(lookup.id)
            toast.success("Lookup set inactive successfully")
            await onSuccess()
            close()
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to set lookup inactive"))
        } finally {
            setSubmitting(false)
        }
    }

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
                    Set lookup inactive
                </h2>
                <p id="set-inactive-desc" className="text-sm text-muted-foreground mt-1 mb-6">
                    Set <strong>{lookup.lookupValue}</strong> as inactive? It will no longer be available.
                </p>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={close}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleConfirm} disabled={submitting}>
                        {submitting ? "Setting..." : "Set inactive"}
                    </Button>
                </div>
            </div>
        </dialog>
    )
}

export default MasterLookupList