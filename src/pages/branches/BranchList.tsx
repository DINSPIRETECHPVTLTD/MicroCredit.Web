import { useMemo, useRef, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { type MRT_ColumnDef, MaterialReactTable, useMaterialReactTable } from "material-react-table"
import { branchService } from "../../services/branch.service"
import type { BranchResponse } from "../../types/branch"
import { AddEditBranchDialog, type AddEditBranchDialogMode } from "@/pages/branches/AddEditBranchDialog"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, UserX } from "lucide-react"
import toast from "react-hot-toast"

function getApiErrorMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: unknown } })?.response?.data
    if (typeof data === "string") return data
    if (data && typeof data === "object") {
        const obj = data as { message?: string; error?: string; title?: string }
        return obj.message ?? obj.error ?? obj.title ?? fallback
    }
    return fallback
}



function BranchList() {
    const [inactiveBranch, setInactiveBranch] = useState<BranchResponse | null>(null)
    const [addEditDialog, setAddEditDialog] = useState<AddEditBranchDialogMode | null>(null)
    const { data: branches = [], isLoading, refetch, } = useQuery({
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
                accessorFn: (row) => [row.address1, row.address2, row.city, row.state, row.country, row.zipCode]
                    .filter(Boolean)
                    .join(", "),
                    
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
                Cell: ({ row }) =>
                (
                    <UserRowActions
                        branch={row.original}
                        onOpenEdit={() => setAddEditDialog({ mode: "edit", branch: row.original })}
                        onOpenSetInactive={() => setInactiveBranch(row.original)}
                    />
                )

            },
        ],
        [refetch]
    )
    const table = useMaterialReactTable({
        columns,
        data: branches,
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
                <h1 className="page-title">All Branches</h1>
                <Button onClick={() => setAddEditDialog({ mode: "add" })}>
                    <Plus className="h-4 w-4 mr-2" />
                    ADD Branch
                </Button>
            </div>

            {!isLoading && branches.length === 0 ? (
                <div className="card-empty">
                    <p>No branches found</p>
                    <p>Click &quot;Add Branch&quot; to create a new branch</p>
                    <Button className="mt-4" onClick={() => setAddEditDialog({ mode: "add" })}>
                        Add Branch
                    </Button>
                </div>
            ) : (
                <div className="table-wrapper">
                    <div className="table table-row-hover">
                        <MaterialReactTable
                            table={table}
                        />
                    </div>
                </div>
            )}
            {inactiveBranch && (
                <SetInactiveDialog
                    branch={inactiveBranch}
                    onClose={() => setInactiveBranch(null)}
                    onSuccess={() => {
                        refetch()
                        setInactiveBranch(null)
                    }}
                />
            )}
            <AddEditBranchDialog
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

function SetInactiveDialog({
    branch,
    onClose,
    onSuccess,
}: {
    branch: BranchResponse
    onClose: () => void
    onSuccess: () => void
}) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        dialogRef.current?.showModal()
    }, [branch.id])

    const close = () => {
        dialogRef.current?.close()
        onClose()
    }

    const handleConfirm = async () => {
        setSubmitting(true)
        try {
            await branchService.setInactive(branch.id)
            toast.success("Branch set inactive")
            onSuccess()
            close()
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to set branch inactive"))
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
                    Set branch inactive
                </h2>
                <p id="set-inactive-desc" className="text-sm text-muted-foreground mt-1 mb-6">
                    Set <strong>{branch.name}</strong> as inactive? They will no longer be available.
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
    branch,
    onOpenEdit,
    onOpenSetInactive,
}: {
    branch: BranchResponse
    onOpenEdit: (mode: AddEditBranchDialogMode) => void
    onOpenSetInactive: (branch: BranchResponse) => void
}) {


    return (
        <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenEdit({ mode: "edit", branch })}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenSetInactive(branch)}>
                <UserX className="h-4 w-4 mr-1" />
                Set inactive
            </Button>
            <Button variant="ghost" size="sm" onClick={() => toast("Not implemented")}>
                <UserX className="h-4 w-4 mr-1" />
                Navigate
            </Button>
        </div>
    )
}


export default BranchList
