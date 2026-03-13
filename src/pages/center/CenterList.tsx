import React, { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { type MRT_ColumnDef, MaterialReactTable } from "material-react-table"
import { Plus, Pencil, UserX } from "lucide-react"
import toast from "react-hot-toast"
import { AddEditCenterDialog, type AddEditCenterDialogMode } from "@/pages/center/AddEditCenterDialog"
import { Button } from "../../components/ui/button"
import { centerService } from "../../services/center.service"
import type { CenterResponse } from "../../types/center"

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "string") return data
  if (data && typeof data === "object") {
    const obj = data as { message?: string; error?: string; title?: string }
    return obj.message ?? obj.error ?? obj.title ?? fallback
  }
  return fallback
}

function CenterList() {
  const [inactiveCenter, setInactiveCenter] = useState<CenterResponse | null>(null)
  const [addEditDialog, setAddEditDialog] = useState<AddEditCenterDialogMode | null>(null)

  const { data: centers = [], isLoading, refetch } = useQuery({
    queryKey: ["centers"],
    queryFn: () => centerService.getCenters(),
  })

  const columns = useMemo<MRT_ColumnDef<CenterResponse>[]>(
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
        accessorKey: "address",
        header: "Address",
      },
      {
        accessorKey: "city",
        header: "City",
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <CenterRowActions
            onOpenEdit={() => setAddEditDialog({ mode: "edit", center: row.original })}
            onOpenSetInactive={() => setInactiveCenter(row.original)}
          />
        ),
      },
    ],
    []
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">All Centers</h1>
        <Button onClick={() => setAddEditDialog({ mode: "add" })}>
          <Plus className="mr-2 h-4 w-4" />
          ADD Center
        </Button>
      </div>

      {!isLoading && centers.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No centers found</p>
          <p className="mt-1 text-sm">Click &quot;Add Center&quot; to create a new center</p>
          <Button className="mt-4" onClick={() => setAddEditDialog({ mode: "add" })}>
            Add Center
          </Button>
        </div>
      ) : (
        <MaterialReactTable
          columns={columns}
          data={centers}
          state={{ isLoading }}
          enableSorting
          enableColumnFilters
          enableGrouping
          enableExpanding={false}
          enableColumnPinning
        />
      )}

      {inactiveCenter && (
        <SetInactiveDialog
          center={inactiveCenter}
          onClose={() => setInactiveCenter(null)}
          onSuccess={async () => {
            await refetch()
            setInactiveCenter(null)
          }}
        />
      )}

      <AddEditCenterDialog
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
  center,
  onClose,
  onSuccess,
}: {
  center: CenterResponse
  onClose: () => void
  onSuccess: () => void | Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [center.id])

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await centerService.setInactive(center.id)
      toast.success("Center set inactive")
      await onSuccess()
      close()
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to set center inactive"))
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
          Set center inactive
        </h2>
        <p id="set-inactive-desc" className="mt-1 mb-6 text-sm text-muted-foreground">
          Set <strong>{center.name}</strong> as inactive? It will no longer be available.
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

function CenterRowActions({
  onOpenEdit,
  onOpenSetInactive,
}: {
  onOpenEdit: () => void
  onOpenSetInactive: () => void
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
    </div>
  )
}

export default CenterList
