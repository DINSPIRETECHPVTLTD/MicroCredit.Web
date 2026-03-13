// src/pages/pocs/PocList.tsx
import { useMemo, useRef, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import type { PocResponse } from "@/types/poc"
import { pocService } from "@/services/poc.service"
import { AddEditPocDialog, type AddEditPocDialogMode } from "@/pages/pocs/AddEditBranchDialog"
import { getBranch } from "@/services/auth.service"

function PocList() {
  const branch = getBranch()
  const branchId = branch?.id

  const [addEditDialog, setAddEditDialog] =
    useState<AddEditPocDialogMode | null>(null)
  const [inactivePoc, setInactivePoc] = useState<PocResponse | null>(null)

  const {
    data: pocs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["pocs", branchId],
    enabled: !!branchId,
    queryFn: () => pocService.getByBranch(branchId!),
  })

  const columns = useMemo<MRT_ColumnDef<PocResponse>[]>(
    () => [
      { accessorKey: "id", header: "Id", size: 60 },
      { accessorKey: "name", header: "Name" }, // from backend
      { accessorKey: "phoneNumber", header: "Phone" },
      { accessorKey: "centerName", header: "Center Name" },
      { accessorKey: "fullAddress", header: "Address" },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <PocRowActions
            poc={row.original}
            onOpenEdit={() => setAddEditDialog({ mode: "edit", poc: row.original })}
            onOpenSetInactive={() => setInactivePoc(row.original)}
          />
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">POCs</h1>
        <Button onClick={() => setAddEditDialog({ mode: "add" })}>Add POC</Button>
      </div>

      {!isLoading && pocs.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No POCs found</p>
          <p className="text-sm mt-1">Click "Add POC" to create one.</p>
          <Button className="mt-4" onClick={() => setAddEditDialog({ mode: "add" })}>
            Add POC
          </Button>
        </div>
      ) : (
        <MaterialReactTable table={table} />
      )}

      {inactivePoc && (
        <SetInactiveDialog
          poc={inactivePoc}
          onClose={() => setInactivePoc(null)}
          onSuccess={() => {
            refetch()
            setInactivePoc(null)
          }}
        />
      )}

      <AddEditPocDialog
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

function PocRowActions({
  poc,
  onOpenEdit,
  onOpenSetInactive,
}: {
  poc: PocResponse
  onOpenEdit: (mode: AddEditPocDialogMode) => void
  onOpenSetInactive: (poc: PocResponse) => void
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={() => onOpenEdit({ mode: "edit", poc })}>
        Edit
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onOpenSetInactive(poc)}>
        Inactive
      </Button>
    </div>
  )
}

function SetInactiveDialog({
  poc,
  onClose,
  onSuccess,
}: {
  poc: PocResponse
  onClose: () => void
  onSuccess: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [poc.id])

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await pocService.setInactive(poc.id)
      toast.success("POC set inactive")
      onSuccess()
      close()
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to set POC inactive"
      toast.error(msg)
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
          Set POC inactive
        </h2>
        <p id="set-inactive-desc" className="text-sm text-muted-foreground mt-1 mb-6">
          Set <strong>{poc.name}</strong> as inactive? They will no longer be available.
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

export default PocList