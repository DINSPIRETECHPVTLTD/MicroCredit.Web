import {
  type MRT_ColumnDef,
    MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { searchMemberService } from "@/services/searchMemeberAddLoan.service"
import type { SearchMemberResponse } from "@/types/searchMemeber"
import AddLoanDialog from "./AddLoanDialog"
import { getBranch } from "@/services/auth.service"
import { loanService } from "@/services/loan.service"


function AddLoan() {
    const [selectedMember, setSelectedMember] = useState<SearchMemberResponse | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const [dialogMode, setDialogMode] = useState<"add" | "view">("add")
    const [checkingLoan, setCheckingLoan] = useState(false)

    const [firstName, setFirstName] = useState("")
    const [middleName, setMiddleName] = useState("")
    const [lastName, setLastName] = useState("")

    const branch = getBranch()
    const branchId = branch?.id

    const {
        data: members = [],
        isLoading: membersLoading,
        refetch
        } = useQuery({
        queryKey: ["searchMembers", firstName, middleName, lastName],
        enabled: !!branchId,
        queryFn: () => searchMemberService.getmembers({
            branchId: branchId!,
            firstName: firstName || "",
            middleName: middleName || "",
            lastName: lastName || ""
        }) as Promise<SearchMemberResponse[]>
    });


    
    const columns = useMemo<MRT_ColumnDef<SearchMemberResponse>[]>(
        () => [
            {
              accessorKey: "name",
              header: "Name",
            },
            {
                accessorKey: "fullAddress",
                header: "Address",
            },
            {
                accessorKey: "phoneNumber",
                header: "Phone Number",
            },
            {
                accessorKey: "guardianName",
                header: "Guardian Name",
            },
            {
                accessorKey: "center",
                header: "Center",
            },
            {
                accessorKey: "poc",
                header: "Point of Contact",
            },
            {
              id: "actions",
              header: "Actions",
              enableSorting: false,
              enableColumnFilter: false,
              Cell: ({ row }) => {
                const u = row.original
                return (
                  <Button 
                  variant="outline"
                    disabled={checkingLoan}
                    onClick={async () => {
                        setCheckingLoan(true)
                        try {
                            const loans = await loanService.getLoanByMemId(row.original.id)
                            setSelectedMember(row.original)
                            setDialogMode(loans.length > 0 ? "view" : "add")
                            setDialogOpen(true)
                        } catch {
                            setSelectedMember(row.original)
                            setDialogMode("add")
                            setDialogOpen(true)
                        } finally {
                            setCheckingLoan(false)
                        }
                    }}
                  >
                    Add/View Loan
                  </Button>
                )
              },
            },

        ],
        [members]
    )

    const table = useMaterialReactTable({
        columns,
        data: members,
        state: { isLoading: membersLoading },
        enableSorting: true,
        enableColumnFilters: true,
        enableGrouping: true,
        enableExpanding: false,
        enableColumnPinning: true,
    })

    const handleCreated = async () => {
    await refetch()
  }

    return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Add Loan</h1>
        <div className="flex gap-3 mb-4">
            <input className="border rounded px-3 py-2 text-sm flex-1"
                placeholder="First Name"
                value={firstName} onChange={e => setFirstName(e.target.value)} />
            <input className="border rounded px-3 py-2 text-sm flex-1"
                placeholder="Middle Name"
                value={middleName} onChange={e => setMiddleName(e.target.value)} />
            <input className="border rounded px-3 py-2 text-sm flex-1"
                placeholder="Last Name"
                value={lastName} onChange={e => setLastName(e.target.value)} />
        </div>
      </div>

      {!membersLoading && members.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No members found</p>
        </div>
      ) : (
        <MaterialReactTable table={table} />
      )}

      <AddLoanDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleCreated}
        member={selectedMember}
        mode={dialogMode}
        />

        
    </div>
  )

}

export default AddLoan