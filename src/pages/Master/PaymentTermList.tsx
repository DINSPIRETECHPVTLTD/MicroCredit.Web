import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { type MRT_ColumnDef, MaterialReactTable } from "material-react-table"
import type { PaymentTermResponse } from "../../types/paymentTerm"
import { paymentTermService } from "../../services/paymentTerm.service"
import { Button } from "../../components/ui/button"
import { Plus, Pencil, Trash } from "lucide-react"
import toast from "react-hot-toast"
import AddEditPaymentTerm, { type AddEditPaymentTermMode } from "./AddEditPaymentTerm"


function PaymentTermList() {
    const { data: paymentTerms = [], isLoading, refetch } = useQuery({
        queryKey: ["paymentTerms"],
        queryFn: () => paymentTermService.getPaymentTerms(),
    })
    const [addEditDialog, setAddEditDialog] = useState<AddEditPaymentTermMode | null>(null)

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
            accessorFn: (row) => (row.processingFee ?? "_"),
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
            Cell: ({ row })  => {
              return (
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setAddEditDialog({ mode: "edit", paymentTerm: row.original })}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const ok = window.confirm("Are you sure you want to deactivate this payment term?")
                      if (!ok) return
                      await paymentTermService.deletePaymentTerm(row.original.id)
                      toast.success("Payment term deactivated successfully")
                      await refetch()
                    }}
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    Deactivate
                  </Button>
                </div>
              )
            },
          },
        ],
        [refetch]   // ✅ new dependency
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
                    onSuccess={async (data, mode, id) => {
                        if (mode === "add") {
                          await paymentTermService.createPaymentTerm(data)
                          toast.success("Payment term saved successfully")
                        } else if (mode === "edit" && id) {
                          await paymentTermService.updatePaymentTerm(id, data)
                          toast.success("Payment term updated successfully")
                        }
                        await refetch()
                        setAddEditDialog(null)
                      }}/>
            

            {!isLoading && paymentTerms.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                    <p>No payment terms found</p>
                    <p className="text-sm mt-1">Click &quot;Add Payment Term&quot; to create a new Payment Term</p>
                    <Button className="mt-4" onClick={() => setAddEditDialog({ mode: "add" })}>
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

export default PaymentTermList