import { useCallback, useMemo, useState, type ReactNode } from "react"
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table"
import { Pencil, UserX, Landmark, FileDown, FileText } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import type { MemberResponse } from "@/types/member"
import { buildPromissoryNoteHtml } from "@/templates/promissoryNoteTemplate"
import { buildMembershipFormHtml } from "@/templates/membershipFormTemplate"

function buildDisplayName(row: MemberResponse): string {
  const primary =
    row.name?.trim() ||
    [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" ").trim()
  return primary || "—"
}

function buildGuardianDisplayName(row: MemberResponse): string {
  const guardianFromParts = [row.guardianFirstName, row.guardianLastName].filter(Boolean).join(" ").trim()
  const guardian = guardianFromParts || row.guardianName?.trim() || ""
  return guardian || "—"
}

type MemberGridProps = {
  members: MemberResponse[]
  isLoading: boolean
  onOpenEdit: (member: MemberResponse) => void
  onOpenSetInactive: (member: MemberResponse) => void
  onOpenAddLoan: (member: MemberResponse) => void
}

export default function MemberGrid({
  members,
  isLoading,
  onOpenEdit,
  onOpenSetInactive,
  onOpenAddLoan,
}: MemberGridProps) {
  const [printingPromissoryMemberId, setPrintingPromissoryMemberId] = useState<number | null>(null)
  const [printingMembershipMemberId, setPrintingMembershipMemberId] = useState<number | null>(null)

  const handleGeneratePromissoryPdf = useCallback((row: MemberResponse) => {
    setPrintingPromissoryMemberId(row.id)
    try {
      const popup = window.open("", "_blank", "width=1200,height=900")
      if (!popup) {
        toast.error("Popup blocked. Allow popups to download PDF.")
        return
      }

      const memberId = String(row.memberId ?? row.id)
      const memberName = buildDisplayName(row)
      const guardianName = buildGuardianDisplayName(row)
      const formattedDate = new Date().toLocaleDateString("en-IN")
      const html = buildPromissoryNoteHtml(memberName, memberId, formattedDate, guardianName)

      popup.document.write(html)
      popup.document.close()
      popup.focus()
      popup.print()
    } catch {
      toast.error("Failed to prepare promissory PDF.")
    } finally {
      setPrintingPromissoryMemberId(null)
    }
  }, [])

  const handleGenerateMembershipPdf = useCallback((row: MemberResponse) => {
    setPrintingMembershipMemberId(row.id)
    try {
      const popup = window.open("", "_blank", "width=1200,height=900")
      if (!popup) {
        toast.error("Popup blocked. Allow popups to download PDF.")
        return
      }

      const formattedDate = new Date().toLocaleDateString("en-IN")
      const html = buildMembershipFormHtml(row, formattedDate)

      popup.document.write(html)
      popup.document.close()
      popup.focus()
      popup.print()
    } catch {
      toast.error("Failed to prepare membership PDF.")
    } finally {
      setPrintingMembershipMemberId(null)
    }
  }, [])

  const columns = useMemo<MRT_ColumnDef<MemberResponse>[]>(
    () => [
      {
        id: "memberId",
        header: "ID",
        size: 80,
        accessorFn: (r) => r.memberId ?? r.id,
      },
      {
        id: "fullName",
        header: "Full Name",
        accessorFn: (r) => formatFullName(r),
      },
      {
        id: "phone",
        header: "Phone",
        accessorFn: (r) => formatPhone(r),
      },
      {
        id: "dob",
        header: "DOB / Age",
        accessorFn: (r) => formatDobForSort(r),
        Cell: ({ row }) => formatDobDisplay(row.original),
      },
      {
        id: "center",
        header: "Center",
        accessorFn: (r) => r.center ?? r.centerName ?? "",
      },
      {
        accessorKey: "fullAddress",
        header: "Address",
      },
      {
        accessorKey: "poc",
        header: "POC",
      },
      {
        id: "actions",
        header: "Actions",
        size: 280,
        minSize: 280,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <MemberRowActions
            onOpenEdit={() => onOpenEdit(row.original)}
            onOpenSetInactive={() => onOpenSetInactive(row.original)}
            onOpenAddLoan={() => onOpenAddLoan(row.original)}
            onGeneratePromissoryPdf={() => handleGeneratePromissoryPdf(row.original)}
            onGenerateMembershipPdf={() => handleGenerateMembershipPdf(row.original)}
            printingPromissory={printingPromissoryMemberId === row.original.id}
            printingMembership={printingMembershipMemberId === row.original.id}
          />
        ),
      },
    ],
    [
      printingPromissoryMemberId,
      onOpenEdit,
      onOpenSetInactive,
      onOpenAddLoan,
      handleGeneratePromissoryPdf,
      handleGenerateMembershipPdf,
    ]
  )

  return (
    <MaterialReactTable
      columns={columns}
      data={members}
      state={{ isLoading }}
      enableSorting
      enableColumnFilters
      enableGrouping
      enableExpanding={false}
      enableColumnPinning
    />
  )
}

function formatDob(iso?: string | null): string | null {
  if (!iso?.trim()) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${day}-${m}-${y}`
}

function formatDobForSort(row: MemberResponse): string {
  const memberDob = formatDob(row.dob) ?? ""
  const guardianDob = formatDob(row.guardianDOB) ?? ""
  return `${memberDob}|${guardianDob}`
}

function formatDobDisplay(row: MemberResponse): ReactNode {
  const memberDob = formatDob(row.dob)
  const guardianDob = formatDob(row.guardianDOB)
  const memberAge = calculateAge(row.dob)
  const guardianAge = calculateAge(row.guardianDOB)

  const memberDisplay = memberDob ? `${memberDob} ${memberAge ?? "—"}` : "—"
  const guardianDisplay = guardianDob ? `${guardianDob} ${guardianAge ?? "—"}` : "—"

  if (!memberDob && !guardianDob) return "—"
  return (
    <span className="whitespace-nowrap">
      {`${memberDisplay} /`}
      <br />
      {guardianDisplay}
    </span>
  )
}

function calculateAge(iso?: string | null): number | null {
  if (!iso?.trim()) return null
  const dob = new Date(iso)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

function formatFullName(row: MemberResponse): string {
  const name =
    (row.name ?? [row.firstName, row.lastName].filter(Boolean).join(" ").trim()) || "—"
  const guardian = row.guardianName?.trim()
  return guardian ? `${name} / ${guardian}` : `${name} / (-)`
}

function formatPhone(row: MemberResponse): string {
  const parts = [row.memberPhone ?? row.phoneNumber, row.guardianPhone].filter(Boolean) as string[]
  return parts.length ? parts.join(" / ") : "—"
}

function MemberRowActions({
  onOpenEdit,
  onOpenSetInactive,
  onOpenAddLoan,
  onGeneratePromissoryPdf,
  onGenerateMembershipPdf,
  printingPromissory,
  printingMembership,
}: {
  onOpenEdit: () => void
  onOpenSetInactive: () => void
  onOpenAddLoan: () => void
  onGeneratePromissoryPdf: () => void
  onGenerateMembershipPdf: () => void
  printingPromissory: boolean
  printingMembership: boolean
}) {
  return (
    <div className="flex items-center justify-end gap-1 flex-nowrap whitespace-nowrap">
      <Button variant="ghost" size="sm" onClick={onOpenEdit}>
        <Pencil className="mr-1 h-4 w-4" />
        Edit
      </Button>
      <Button variant="ghost" size="sm" onClick={onOpenSetInactive}>
        <UserX className="mr-1 h-4 w-4" />
        Inactive
      </Button>
      <Button variant="ghost" size="sm" type="button" onClick={onOpenAddLoan}>
        <Landmark className="mr-1 h-4 w-4" />
        Add Loan
      </Button>
      <Button variant="ghost" size="sm" type="button" onClick={onGeneratePromissoryPdf} disabled={printingPromissory}>
        <FileDown className="mr-1 h-4 w-4" />
        {printingPromissory ? "…" : "PN"}
      </Button>
      <Button variant="ghost" size="sm" type="button" onClick={onGenerateMembershipPdf} disabled={printingMembership}>
        <FileText className="mr-1 h-4 w-4" />
        {printingMembership ? "…" : "MF"}
      </Button>
    </div>
  )
}
