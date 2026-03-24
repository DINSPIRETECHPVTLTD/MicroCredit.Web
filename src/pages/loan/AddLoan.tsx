import {
  type MRT_ColumnDef,
    MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { searchMemberService } from "@/services/searchMemeberAddLoan.service"
import type { SearchMemberResponse } from "@/types/searchMemeber"
import AddLoanDialog from "./AddLoanDialog"
import { getBranch } from "@/services/auth.service"
import { loanService } from "@/services/loan.service"


function AddLoan() {
    const [selectedMember, setSelectedMember] = useState<SearchMemberResponse | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [openedFromMemberPage, setOpenedFromMemberPage] = useState(false)

    const [dialogMode, setDialogMode] = useState<"add" | "view">("add")
    const [checkingLoan, setCheckingLoan] = useState(false)

    const [firstName, setFirstName] = useState("")
    const [middleName, setMiddleName] = useState("")
    const [lastName, setLastName] = useState("")

    const branch = getBranch()
    const branchId = branch?.id
    const location = useLocation()
    const navigate = useNavigate()
    const navState = location.state as
      | {
          from?: string
          fromMemberPage?: boolean
          memberId?: number
          prefillMember?: Partial<SearchMemberResponse>
        }
      | null

    const searchBoxClass = "border-2 border-primary rounded-md px-3 py-2 text-sm flex-1 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary"

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


    const openLoanDialogForMember = async (member: SearchMemberResponse) => {
      setCheckingLoan(true)
      try {
        const loans = await loanService.getLoanByMemId(member.id)
        setSelectedMember(member)
        setDialogMode(loans.length > 0 ? "view" : "add")
        setDialogOpen(true)
      } catch {
        setSelectedMember(member)
        setDialogMode("add")
        setDialogOpen(true)
      } finally {
        setCheckingLoan(false)
      }
    }

    useEffect(() => {
      if (!navState?.memberId && !navState?.prefillMember?.id) return
      if (dialogOpen || checkingLoan) return
      const launchedFromMember = navState.from === "member" || navState.fromMemberPage === true

      const selectedId = navState.memberId ?? navState.prefillMember?.id
      if (!selectedId) return

      const found = members.find((m) => m.id === selectedId)
      const memberFromState = navState.prefillMember
      if (found) {
        setOpenedFromMemberPage(launchedFromMember)
        // Consume preselected member state once so Cancel won't reopen dialog.
        navigate(location.pathname, { replace: true, state: null })
        void openLoanDialogForMember(found)
        return
      }
      if (!memberFromState?.id) return

      const fallbackMember: SearchMemberResponse = {
        id: memberFromState.id,
        firstName: memberFromState.firstName ?? "",
        middleName: memberFromState.middleName,
        lastName: memberFromState.lastName ?? "",
        phoneNumber: memberFromState.phoneNumber ?? "",
        altPhone: memberFromState.altPhone,
        address1: memberFromState.address1,
        address2: memberFromState.address2,
        city: memberFromState.city,
        state: memberFromState.state,
        zipCode: memberFromState.zipCode,
        centerId: memberFromState.centerId,
        branchId: memberFromState.branchId,
        aadhaar: memberFromState.aadhaar,
        occupation: memberFromState.occupation,
        relationship: memberFromState.relationship,
        dOB: memberFromState.dOB,
        age: memberFromState.age,
        guardianFirstName: memberFromState.guardianFirstName,
        guardianMiddleName: memberFromState.guardianMiddleName,
        guardianLastName: memberFromState.guardianLastName,
        guardianPhone: memberFromState.guardianPhone,
        guardianDOB: memberFromState.guardianDOB,
        guardianAge: memberFromState.guardianAge,
        pocId: memberFromState.pocId,
        center: memberFromState.center ?? "",
        poc: memberFromState.poc ?? "",
        guardianName: memberFromState.guardianName ?? "",
        name: memberFromState.name ?? "",
        fullAddress: memberFromState.fullAddress ?? "",
      }
      setOpenedFromMemberPage(launchedFromMember)
      // Consume preselected member state once so Cancel won't reopen dialog.
      navigate(location.pathname, { replace: true, state: null })
      void openLoanDialogForMember(fallbackMember)
    }, [navState, members, dialogOpen, checkingLoan, navigate, location.pathname])

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
                return (
                  <Button 
                  variant="outline"
                    disabled={checkingLoan}
                    onClick={() => void openLoanDialogForMember(row.original)}
                  >
                    Add/View Loan
                  </Button>
                )
              },
            },

        ],
        [checkingLoan]
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
    await refetch()
  }

  const handleDialogClose = (reason: "cancel" | "success") => {
    setDialogOpen(false)
    if (reason === "cancel" && openedFromMemberPage) {
      setOpenedFromMemberPage(false)
      navigate("/members", { replace: true })
      return
    }
    if (reason === "success") {
      setOpenedFromMemberPage(false)
    }
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
        mode={dialogMode}
        />

        
    </div>
  )

}

export default AddLoan