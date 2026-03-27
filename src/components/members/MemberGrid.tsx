import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table"
import { Pencil, UserX, Landmark, FileDown } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { loanService } from "@/services/loan.service"
import { getOrganization } from "@/services/auth.service"
import type { MemberResponse } from "@/types/member"
import type { LoanAgreementMember, LoanScheduleWord } from "@/types/loanAgreement"
import { buildPromissoryNoteHtml } from "@/templates/promissoryNoteTemplate"

function toNum(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, ""))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function parseTenureMonths(noOfTerms: unknown): number {
  if (noOfTerms === null || noOfTerms === undefined) return 0
  const s = String(noOfTerms).trim()
  if (!s) return 0
  const digits = s.replace(/\D/g, "")
  const n = Number(digits)
  return Number.isFinite(n) ? n : 0
}

function getCi(obj: Record<string, unknown>, keys: string[]): unknown {
  const map = new Map(Object.keys(obj).map((k) => [k.toLowerCase(), obj[k]]))
  for (const key of keys) {
    const v = map.get(key.toLowerCase())
    if (v !== undefined && v !== null && v !== "") return v
  }
  return undefined
}

function formatLoanFrequencyLabel(term: string): string {
  const s = (term || "").trim().toLowerCase()
  if (!s) return "—"
  if (s.includes("week")) return "Weekly"
  if (s.includes("day") && !s.includes("month")) return "Daily"
  if (s.includes("month")) return "Monthly"
  return term.trim()
}

function scheduleWordForDeclaration(loanTypeLabel: string): LoanScheduleWord {
  const s = (loanTypeLabel || "").toLowerCase()
  if (s.includes("week")) return "weekly"
  if (s.includes("day") && !s.includes("month")) return "daily"
  return "monthly"
}

function deriveInterestPercent(raw: Record<string, unknown>): number | null {
  const direct = getCi(raw, [
    "rateOfInterest",
    "interestRate",
    "interestPercent",
    "annualInterestRate",
    "interestrate",
  ])
  if (direct !== undefined && direct !== null && direct !== "") {
    const n = typeof direct === "number" ? direct : Number(String(direct).replace(/%/g, ""))
    if (Number.isFinite(n)) return n
  }
  const principal = toNum(getCi(raw, ["loanTotalAmount", "totalAmount", "loanAmount", "principal"]))
  const interestAmt = toNum(getCi(raw, ["interestAmount", "totalInterest", "interest"]))
  if (principal > 0 && interestAmt >= 0) {
    return Number(((interestAmt / principal) * 100).toFixed(2))
  }
  return null
}

function extractLoanAgreementFields(raw: Record<string, unknown> | null | undefined) {
  if (!raw || typeof raw !== "object") {
    return {
      collectionTermRaw: "",
      loanTypeLabel: "—" as const,
      interestPercent: null as number | null,
      installmentCount: 0,
      scheduleWord: "monthly" as LoanScheduleWord,
    }
  }
  const collectionTermRaw = String(
    getCi(raw, ["collectionTerm", "collectionterm", "paymentTerm", "paymentterm", "loanType"]) ?? ""
  ).trim()

  const loanTypeLabel = formatLoanFrequencyLabel(collectionTermRaw)
  const interestPercent = deriveInterestPercent(raw)
  const installmentCount = parseTenureMonths(getCi(raw, ["noOfTerms", "numberOfTerms", "noofterms"]))

  return {
    collectionTermRaw,
    loanTypeLabel,
    interestPercent,
    installmentCount,
    scheduleWord: scheduleWordForDeclaration(loanTypeLabel),
  }
}

function buildDisplayName(row: MemberResponse): string {
  const primary =
    row.name?.trim() ||
    [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" ").trim()
  return primary || "—"
}

function buildAddressLine(row: MemberResponse): string {
  if (row.fullAddress?.trim()) return row.fullAddress.trim()
  const parts = [row.address1, row.address2, row.city, row.state, row.zipCode].filter((x) => x?.trim())
  return parts.length ? parts.join(", ") : "—"
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
  const navigate = useNavigate()
  const [printingMemberId, setPrintingMemberId] = useState<number | null>(null)
  const [printingPromissoryMemberId, setPrintingPromissoryMemberId] = useState<number | null>(null)

  const { data: branchLoans = [] } = useQuery({
    queryKey: ["loans", "list-for-member-grid"],
    queryFn: () => loanService.getLoans(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const memberIdsWithLoan = useMemo(() => {
    const set = new Set<number>()
    for (const l of branchLoans) {
      if (l.memberId != null) set.add(l.memberId)
    }
    return set
  }, [branchLoans])

  const handleGeneratePdf = useCallback(
    async (row: MemberResponse) => {
      setPrintingMemberId(row.id)
      try {
        const loans = await loanService.getLoanByMemId(row.id)
        const loan = loans[0]
        if (!loan) {
          toast.error("No loan found for this member.")
          return
        }
        const org = getOrganization()
        const raw = loan as unknown as Record<string, unknown>
        const fields = extractLoanAgreementFields(raw)

        const agreementMember: LoanAgreementMember = {
          memberId: row.memberId ?? row.id,
          name: buildDisplayName(row),
          address: buildAddressLine(row),
          loanAmount: loan.loanTotalAmount ?? 0,
          loanType: fields.loanTypeLabel,
          interestRate: fields.interestPercent != null ? fields.interestPercent : "",
          installmentCount: fields.installmentCount,
          scheduleWord: fields.scheduleWord,
          organizationName: org?.name?.trim() || "—",
        }

        navigate("/loan-print", { state: { member: agreementMember } })
      } catch (err) {
        const msg =
          err && typeof err === "object" && "message" in err && typeof (err as Error).message === "string"
            ? (err as Error).message
            : "Could not prepare loan agreement."
        toast.error(msg)
      } finally {
        setPrintingMemberId(null)
      }
    },
    [navigate]
  )

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
      const formattedDate = new Date().toLocaleDateString("en-IN")
      const html = buildPromissoryNoteHtml(memberName, memberId, formattedDate)

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
            printing={printingMemberId === row.original.id}
            hasLoan={memberIdsWithLoan.has(row.original.id)}
            onOpenEdit={() => onOpenEdit(row.original)}
            onOpenSetInactive={() => onOpenSetInactive(row.original)}
            onOpenAddLoan={() => onOpenAddLoan(row.original)}
            onGeneratePdf={() => void handleGeneratePdf(row.original)}
            onGeneratePromissoryPdf={() => handleGeneratePromissoryPdf(row.original)}
            printingPromissory={printingPromissoryMemberId === row.original.id}
          />
        ),
      },
    ],
    [
      printingMemberId,
      printingPromissoryMemberId,
      memberIdsWithLoan,
      onOpenEdit,
      onOpenSetInactive,
      onOpenAddLoan,
      handleGeneratePdf,
      handleGeneratePromissoryPdf,
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
  return `${y}-${m}-${day}`
}

function formatDobForSort(row: MemberResponse): string {
  return formatDob(row.dob) ?? ""
}

function formatDobDisplay(row: MemberResponse): ReactNode {
  const memberDob = formatDob(row.dob)
  if (!memberDob) return "—"

  const age = calculateAge(row.dob)
  return <span>{age != null ? `${memberDob} / ${age}` : memberDob}</span>
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
  onGeneratePdf,
  onGeneratePromissoryPdf,
  printing,
  printingPromissory,
  hasLoan,
}: {
  onOpenEdit: () => void
  onOpenSetInactive: () => void
  onOpenAddLoan: () => void
  onGeneratePdf: () => void
  onGeneratePromissoryPdf: () => void
  printing: boolean
  printingPromissory: boolean
  hasLoan: boolean
}) {
  const pdfDisabled = printing || !hasLoan
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
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={onGeneratePdf}
        disabled={pdfDisabled}
        title={hasLoan ? "Open loan agreement PDF" : "Create a loan for this member to generate PDF"}
      >
        <FileDown className="mr-1 h-4 w-4" />
        {printing ? "…" : "Generate PDF"}
      </Button>
      <Button variant="ghost" size="sm" type="button" onClick={onGeneratePromissoryPdf} disabled={printingPromissory}>
        <FileDown className="mr-1 h-4 w-4" />
        {printingPromissory ? "…" : "promisorydownloadasPDF"}
      </Button>
    </div>
  )
}
