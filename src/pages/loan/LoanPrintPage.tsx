import { Link, useLocation } from "react-router-dom"
import LoanAgreementPrint from "@/components/loan/LoanAgreementPrint"
import { getOrganization } from "@/services/auth.service"
import { Button } from "@/components/ui/button"
import type { LoanAgreementMember, LoanScheduleWord } from "@/types/loanAgreement"

type LoanPrintLocationState = {
  member?: LoanAgreementMember & { tenure?: number }
}

function mergeOrganizationName(member: LoanAgreementMember): LoanAgreementMember {
  const org = getOrganization()
  const fromSession = org?.name?.trim()
  if (fromSession && (!member.organizationName || member.organizationName === "—")) {
    return { ...member, organizationName: fromSession }
  }
  return member
}

function normalizeMember(raw: LoanAgreementMember & { tenure?: number }): LoanAgreementMember {
  const merged = mergeOrganizationName(raw)
  const installmentCount =
    merged.installmentCount != null
      ? merged.installmentCount
      : merged.tenure != null
        ? merged.tenure
        : 0
  const scheduleWord: LoanScheduleWord = merged.scheduleWord ?? "monthly"
  return {
    ...merged,
    installmentCount,
    scheduleWord,
  }
}

export default function LoanPrintPage() {
  const location = useLocation()
  const raw = (location.state as LoanPrintLocationState | null)?.member

  if (!raw) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="text-muted-foreground mb-4">No member data was provided for this document.</p>
        <Button asChild>
          <Link to="/members">Back to members</Link>
        </Button>
      </div>
    )
  }

  const member = normalizeMember(raw)

  return (
    <div className="py-6">
      <div className="no-print mb-4 flex justify-between gap-4">
        <Button variant="outline" asChild>
          <Link to="/members">← Back to members</Link>
        </Button>
      </div>
      <LoanAgreementPrint member={member} />
    </div>
  )
}
