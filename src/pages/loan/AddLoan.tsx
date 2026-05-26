import {
  type MRT_ColumnDef,
    MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { useCallback, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { searchMemberService } from "@/services/searchMemeberAddLoan.service"
import type { SearchMemberResponse } from "@/types/searchMemeber"
import AddLoanDialog from "./AddLoanDialog"
import { getBranch } from "@/services/auth.service"

function AddLoan() {
    const [selectedMember, setSelectedMember] = useState<SearchMemberResponse | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const queryClient = useQueryClient()

    const [firstName, setFirstName] = useState("")
    const [middleName, setMiddleName] = useState("")
    const [lastName, setLastName] = useState("")

    const branch = getBranch()
    const branchId = branch?.id
    const navigate = useNavigate()

    const searchBoxClass = "border-2 border-primary rounded-md px-3 py-2 text-sm flex-1 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary"

    /** Initial load + search: includes `primaryOpenLoanId` per member (open loan check). */
    const {
        data: members = [],
        isLoading: membersLoading,
        } = useQuery({
        queryKey: ["searchMembers", branchId, firstName, middleName, lastName],
        enabled: !!branchId,
        queryFn: () => searchMemberService.getmembers({
            branchId: branchId!,
            firstName: firstName || "",
            middleName: middleName || "",
            lastName: lastName || ""
        }) as Promise<SearchMemberResponse[]>,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    })

    /** One refresh after loan create so `primaryOpenLoanId` updates (View Loan vs Add Loan). */
    const refreshAfterLoanChange = useCallback(async () => {
      if (branchId == null) return
      await queryClient.invalidateQueries({ queryKey: ["searchMembers", branchId] })
    }, [queryClient, branchId])

    /** Members with loans: Manage Loan → View Schedule (`/loans/:loanId/scheduler`). Otherwise open Add Loan dialog. */
    const handleMemberLoanAction = useCallback(
      (member: SearchMemberResponse) => {
        const knownLoanId = member.primaryOpenLoanId
        if (knownLoanId != null && knownLoanId > 0) {
          navigate(`/loans/${knownLoanId}/scheduler`)
          return
        }
        setSelectedMember(member)
        setDialogOpen(true)
      },
      [navigate]
    )

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
                const hasLoans =
                  row.original.primaryOpenLoanId != null &&
                  row.original.primaryOpenLoanId > 0
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-w-[6.25rem] px-2.5 text-xs font-medium justify-center"
                    onClick={() => void handleMemberLoanAction(row.original)}
                  >
                    {hasLoans ? "View Loan" : "Add Loan"}
                  </Button>
                )
              },
            },

        ],
        [handleMemberLoanAction]
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
        renderTopToolbarCustomActions: () => (
        <span className="text-base font-semibold self-center">{firstName || lastName || middleName ? "Members" : "Recent Memebers"}</span>
    ),
    })

    const handleCreated = async () => {
      await refreshAfterLoanChange()
    }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setSelectedMember(null)
  }

    return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Add Loan</h1>
        <div className="flex gap-3 mb-4">
            <input className= {searchBoxClass}
                placeholder="First Name"
                value={firstName} onChange={e => setFirstName(e.target.value)} />
            <input className= {searchBoxClass}
                placeholder="Middle Name"
                value={middleName} onChange={e => setMiddleName(e.target.value)} />
            <input className= {searchBoxClass}
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
        onClose={handleDialogClose}
        onSuccess={handleCreated}
        member={selectedMember}
      />

        
    </div>
  )

}

export default AddLoan