import { useMemo, useState, useRef, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { type MRT_ColumnDef, MaterialReactTable } from "material-react-table"
import type { PaymentTermResponse } from "../../types/paymentTerm"
import { paymentTermService } from "../../services/paymentTerm.service"
import { Button } from "../../components/ui/button"
import { Plus, Pencil, Trash } from "lucide-react"
import toast from "react-hot-toast"
import AddEditPaymentTerm, { type AddEditPaymentTermMode } from "./AddEditPaymentTerm"

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "string") return data
  if (data && typeof data === "object") {
    const obj = data as { message?: string; error?: string; title?: string }
    return obj.message ?? obj.error ?? obj.title ?? fallback
  }
  return fallback
}

function PaymentTermList() {
  const { data: paymentTerms = [], isLoading, refetch } = useQuery({
    queryKey: ["paymentTerms"],
    queryFn: () => paymentTermService.getPaymentTerms(),
  })

  const [addEditDialog, setAddEditDialog] = useState<AddEditPaymentTermMode | null>(null)

  // Track which payment term we are setting inactive (for the dialog)
  const [inactivePaymentTerm, setInactivePaymentTerm] =
    useState<PaymentTermResponse | null>(null)

  const columns = useMemo<MRT_ColumnDef<PaymentTermResponse>[]>(
    () => [
      {
        accessorKey: "id",
        header: "PaymentTerm Id",
        size: 80,
      },
      {
        header: "Payment Term",
        accessorKey: "paymentTerm",
      },
      {
        header: "Payment Type",
        accessorKey: "paymentType",
      },
      {
        header: "No Of Terms",
        accessorFn: (row) => row.noOfTerms ?? "_",
      },
      {
        header: "Processing Fee",
        accessorFn: (row) => row.processingFee ?? "_",
      },
      {
        header: "Rate Of Interest",
        accessorKey: "rateOfInterest",
      },
      {
        header: "Insurance Fee",
        accessorKey: "insuranceFee",
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
                onClick={() =>
                  setAddEditDialog({ mode: "edit", paymentTerm: row.original })
                }
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInactivePaymentTerm(row.original)}
              >
                <Trash className="h-4 w-4 mr-1" />
                Set inactive
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
        <h1 className="text-2xl font-semibold">All Payment Terms</h1>
        <Button onClick={() => setAddEditDialog({ mode: "add" })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Term
        </Button>
      </div>

      <AddEditPaymentTerm
        value={addEditDialog}
        onClose={() => setAddEditDialog(null)}
        onSuccess={async () => {
          await refetch()
          setAddEditDialog(null)
        }}
      />

      {inactivePaymentTerm && (
        <SetInactivePaymentTermDialog
          paymentTerm={inactivePaymentTerm}
          onClose={() => setInactivePaymentTerm(null)}
          onSuccess={async () => {
            await refetch()
            setInactivePaymentTerm(null)
          }}
        />
      )}

      {!isLoading && paymentTerms.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No payment terms found</p>
          <p className="text-sm mt-1">
            Click &quot;Add Payment Term&quot; to create a new Payment Term
          </p>
          <Button
            className="mt-4"
            onClick={() => setAddEditDialog({ mode: "add" })}
          >
            Add Payment Term
          </Button>
        </div>
      ) : (
        <MaterialReactTable
          columns={columns}
          data={paymentTerms}
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

function SetInactivePaymentTermDialog({
  paymentTerm,
  onClose,
  onSuccess,
}: {
  paymentTerm: PaymentTermResponse
  onClose: () => void
  onSuccess: () => void | Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [paymentTerm.id])

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await paymentTermService.deletePaymentTerm(paymentTerm.id)
      toast.success("Payment term set inactive successfully")
      await onSuccess()
      close()
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Failed to set payment term inactive")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={close}
      className="max-w-md w-full rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50"
      aria-labelledby="set-inactive-payment-term-title"
      aria-describedby="set-inactive-payment-term-desc"
    >
      <div className="p-6">
        <h2 id="set-inactive-payment-term-title" className="text-lg font-semibold">
          Set payment term inactive
        </h2>
        <p
          id="set-inactive-payment-term-desc"
          className="mt-1 mb-6 text-sm text-muted-foreground"
        >
          Set{" "}
          <strong>{paymentTerm.paymentTerm}</strong> as inactive? It will no
          longer be available.
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

export default PaymentTermList