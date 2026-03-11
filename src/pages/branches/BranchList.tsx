import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { type MRT_ColumnDef, MaterialReactTable } from "material-react-table"
import { useNavigate } from "react-router-dom"
import { Plus, Pencil, UserX } from "lucide-react"
import toast from "react-hot-toast"
import { AddEditBranchDialog, type AddEditBranchDialogMode } from "@/pages/branches/AddEditBranchDialog"
import { authService } from "@/services/auth.service"
import { Button } from "../../components/ui/button"
import { branchService } from "../../services/branch.service"
import type { BranchResponse } from "../../types/branch"

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
    const navigate = useNavigate()
    const [inactiveBranch, setInactiveBranch] = useState<BranchResponse | null>(null)
    const [addEditDialog, setAddEditDialog] = useState<AddEditBranchDialogMode | null>(null)

    const { data: branches = [], isLoading, refetch } = useQuery({
        queryKey: ["branches"],
        queryFn: () => branchService.getBranches(),
    })

    const handleNavigateToBranch = useCallback(async (branch: BranchResponse) => {
        try {
            await authService.navigateToBranch(branch.id)
            toast.success(`Switched to ${branch.name}`)
            navigate("/", { replace: true })
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to switch branch"))
        }
    }, [navigate])

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
                accessorFn: (row) =>
                    [row.address1, row.address2, row.city, row.state, row.country, row.zipCode]
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
                Cell: ({ row }) => (
                    <UserRowActions
                        onOpenEdit={() => setAddEditDialog({ mode: "edit", branch: row.original })}
                        onOpenSetInactive={() => setInactiveBranch(row.original)}
                        onNavigate={() => handleNavigateToBranch(row.original)}
                    />
                ),
            },
        ],
        [handleNavigateToBranch]
    )

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">All Branches</h1>
                <Button onClick={() => setAddEditDialog({ mode: "add" })}>
                    <Plus className="mr-2 h-4 w-4" />
                    ADD Branch
                </Button>
            </div>

            {!isLoading && branches.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                    <p>No branches found</p>
                    <p className="mt-1 text-sm">Click &quot;Add Branch&quot; to create a new branch</p>
                    <Button className="mt-4" onClick={() => setAddEditDialog({ mode: "add" })}>
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

            {inactiveBranch && (
                <SetInactiveDialog
                    branch={inactiveBranch}
                    onClose={() => setInactiveBranch(null)}
                    onSuccess={async () => {
                        await refetch()
                        setInactiveBranch(null)
                    }}
                />
            )}

            <AddEditBranchDialog
                value={addEditDialog}
                onClose={() => setAddEditDialog(null)}
                onSuccess={async () => {
                    await refetch()
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
    onSuccess: () => void | Promise<void>
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
            await onSuccess()
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
            className="max-w-md w-full rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50"
            aria-labelledby="set-inactive-title"
            aria-describedby="set-inactive-desc"
        >
            <div className="p-6">
                <h2 id="set-inactive-title" className="text-lg font-semibold">
                    Set branch inactive
                </h2>
                <p id="set-inactive-desc" className="mt-1 mb-6 text-sm text-muted-foreground">
                    Set <strong>{branch.name}</strong> as inactive? It will no longer be available.
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

function UserRowActions({
    onOpenEdit,
    onOpenSetInactive,
    onNavigate,
}: {
    onOpenEdit: () => void
    onOpenSetInactive: () => void
    onNavigate: () => void | Promise<void>
}) {
    return (
        <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onOpenEdit}>
                <Pencil className="mr-1 h-4 w-4" />
                Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onOpenSetInactive}>
                <UserX className="mr-1 h-4 w-4" />
                Set inactive
            </Button>
            <Button variant="ghost" size="sm" onClick={onNavigate}>
                <UserX className="mr-1 h-4 w-4" />
                Navigate
            </Button>
        </div>
    )
}

export default BranchList
