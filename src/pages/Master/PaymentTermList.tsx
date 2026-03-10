import React, { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type MRT_ColumnDef, MaterialReactTable } from "material-react-table"
import type { PaymentTermResponse } from "../../types/paymentTerm"
import { paymentTermService } from "../../services/paymentTerm.service"
import { Button } from "../../components/ui/button"
import { Plus, Pencil, Trash } from "lucide-react"
import toast from "react-hot-toast"


function PaymentTermList() {
    const { data: paymentTerms = [], isLoading } = useQuery({
        queryKey: ["paymentTerms"],
        queryFn: () => paymentTermService.getPaymentTerms(),
    })


    const columns = useMemo<MRT_ColumnDef<PaymentTermResponse>[]>(
        () => [
            {
                accessorKey: "id",
                header: "Id",
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
                Cell: ({ row }) => {
                    return (
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => toast("Edit not implemented")}>
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toast("DeActive not implemented")}>
                                <Trash className="h-4 w-4 mr-1" />
                                DeActive
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
                <Button onClick={() => toast("Add Payment Term not implemented")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add PaymentTerm
                </Button>
            </div>






            {!isLoading && paymentTerms.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                    <p>No paymentterms found</p>
                    <p className="text-sm mt-1">Click &quot;Add PaymentTerm&quot; to create a new PaymentTerm</p>
                    <Button className="mt-4" onClick={() => toast("Add PaymentTerm not implemented")}>
                        Add PaymentTerm
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