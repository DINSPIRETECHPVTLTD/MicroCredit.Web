import {
  type MRT_ColumnDef,
    MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { searchMemberService } from "@/services/searchMemeberAddLoan.service"
import type { SearchMemberResponse } from "@/types/searchMemeber"
import AddLoanDialog from "./AddLoanDialog"
import { getBranch } from "@/services/auth.service"
import { loanService } from "@/services/loan.service"
import type { LoanResponse } from "@/types/loan"

const memberLoansQueryKey = (memberId: number) => ["memberLoansForAction", memberId] as const

function AddLoan() {
    const [selectedMember, setSelectedMember] = useState<SearchMemberResponse | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [openedFromMemberPage, setOpenedFromMemberPage] = useState(false)

    const [checkingLoan, setCheckingLoan] = useState(false)
    const queryClient = useQueryClient()

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
    })

    const memberLoanQueries = useQueries({
      queries: members.map((m) => ({
        queryKey: memberLoansQueryKey(m.id),
        queryFn: () => loanService.getLoanByMemId(m.id) as Promise<LoanResponse[]>,
        enabled: !!branchId && members.length > 0,
        staleTime: 30_000,
      })),
    })

    /** Members with loans: Manage Loan → View Schedule (`/loans/:loanId/scheduler`). Otherwise open Add Loan dialog. */
    const handleMemberLoanAction = useCallback(
      async (member: SearchMemberResponse) => {
        setCheckingLoan(true)
        try {
          // Always read latest state from API so recently closed loans do not remain blocked by cached data.
          const loans = await loanService.getLoanByMemId(member.id)
          queryClient.setQueryData(memberLoansQueryKey(member.id), loans)
          if (loans.length > 0) {
            const loanId = Math.max(...loans.map((l) => l.loanId))
            navigate(`/loans/${loanId}/scheduler`)
            return
          }
          setSelectedMember(member)
          setDialogOpen(true)
        } catch {
          setSelectedMember(member)
          setDialogOpen(true)
        } finally {
          setCheckingLoan(false)
        }
      },
      [navigate, queryClient]
    )

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
        void handleMemberLoanAction(found)
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
      void handleMemberLoanAction(fallbackMember)
    }, [navState, members, dialogOpen, checkingLoan, navigate, location.pathname, handleMemberLoanAction])

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
                const idx = members.findIndex((m) => m.id === row.original.id)
                const q = idx >= 0 ? memberLoanQueries[idx] : undefined
                const hasLoans = (q?.data?.length ?? 0) > 0
                const rowBusy = q?.isLoading || q?.isFetching
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-w-[6.25rem] px-2.5 text-xs font-medium justify-center"
                    disabled={checkingLoan || !!rowBusy}
                    onClick={() => void handleMemberLoanAction(row.original)}
                  >
                    {rowBusy ? "…" : hasLoans ? "View" : "Add Loan"}
                  </Button>
                )
              },
            },

        ],
        [checkingLoan, members, memberLoanQueries, handleMemberLoanAction]
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
      await queryClient.invalidateQueries({ queryKey: ["memberLoansForAction"] })
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
        mode="add"
        />

        
    </div>
  )

}

export default AddLoan