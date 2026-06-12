import { useCallback, useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import type { MemberResponse } from "@/types/member"
import type { SearchMemberResponse } from "@/types/searchMemeber"
import { memberService } from "@/services/member.service"
import { AddEditMemberDialog, type AddEditMemberDialogMode } from "@/pages/members/AddEditMemberDialog"
import AddLoanDialog from "@/pages/loan/AddLoanDialog"
import { getBranch } from "@/services/auth.service"
import { memberToSearchMember } from "@/lib/members/member-to-search-member"
import MemberGrid from "@/components/members/MemberGrid"
import { PageHeader } from "@/components/layout/PageHeader"

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "string") return data
  if (data && typeof data === "object") {
    const obj = data as { message?: string; error?: string; title?: string }
    return obj.message ?? obj.error ?? obj.title ?? fallback
  }
  return fallback
}

const INACTIVE_DIALOG_TOASTER_ID = "member-inactive-dialog"

function MemberList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const branch = getBranch()
  const branchId = branch?.id

  const [addEditDialog, setAddEditDialog] = useState<AddEditMemberDialogMode | null>(null)
  const [inactiveMember, setInactiveMember] = useState<MemberResponse | null>(null)
  const [addLoanMember, setAddLoanMember] = useState<SearchMemberResponse | null>(null)

  const {
    data: membersResult,
    isLoading,
  } = useQuery({
    queryKey: ["members", branchId],
    enabled: !!branchId,
    queryFn: () => memberService.getByBranch(branchId!),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
  const members = membersResult?.members ?? []
  const emptyMessage = membersResult?.emptyMessage

  /** Single refresh after create/update/inactive — avoid duplicate GET /Member/by-branch. */
  const refreshMemberList = useCallback(async () => {
    if (branchId == null) return
    await queryClient.invalidateQueries({ queryKey: ["members", branchId] })
  }, [queryClient, branchId])

  return (
    <div>
      <PageHeader
        title="Members"
        actions={
          <Button onClick={() => setAddEditDialog({ mode: "add" })}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        }
      />

      {!isLoading && members.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>{emptyMessage ?? "No members found"}</p>
          <p className="mt-1 text-sm">Click &quot;Add Member&quot; to create one.</p>
          <Button className="mt-4" onClick={() => setAddEditDialog({ mode: "add" })}>
            Add Member
          </Button>
        </div>
      ) : (
        <MemberGrid
          members={members}
          isLoading={isLoading}
          onOpenEdit={(m) => setAddEditDialog({ mode: "edit", member: m })}
          onOpenSetInactive={setInactiveMember}
          onMemberLoanAction={(row) => {
            const loanId = row.primaryOpenLoanId
            if (loanId != null && loanId > 0) {
              navigate(`/loans/${loanId}/scheduler`)
              return
            }
            setAddLoanMember(memberToSearchMember(row))
          }}
        />
      )}

      {inactiveMember && (
        <SetInactiveDialog
          member={inactiveMember}
          onClose={() => setInactiveMember(null)}
          onSuccess={async () => {
            await refreshMemberList()
            setInactiveMember(null)
          }}
        />
      )}
      <AddEditMemberDialog
        value={addEditDialog}
        onClose={() => setAddEditDialog(null)}
        onSuccess={async () => {
          await refreshMemberList()
          setAddEditDialog(null)
        }}
      />

      <AddLoanDialog
        open={addLoanMember != null}
        member={addLoanMember}
        onClose={() => setAddLoanMember(null)}
        onSuccess={async () => {
          await refreshMemberList()
          setAddLoanMember(null)
        }}
      />
    </div>
  )
}

function SetInactiveDialog({
  member,
  onClose,
  onSuccess,
}: {
  member: MemberResponse
  onClose: () => void
  onSuccess: () => void | Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const displayName = (member.name ?? [member.firstName, member.lastName].filter(Boolean).join(" ").trim()) || "Member"

  useEffect(() => {
    dialogRef.current?.showModal()
    setIsDialogOpen(true)
  }, [member.id])

  const close = () => {
    setIsDialogOpen(false)
    dialogRef.current?.close()
    onClose()
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await memberService.setInactive(member.id)
      toast.success("Member set inactive", { toasterId: INACTIVE_DIALOG_TOASTER_ID })
      await onSuccess()
      close()
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to set member inactive"), {
        toasterId: INACTIVE_DIALOG_TOASTER_ID,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={close}
      className="max-w-md w-full rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50"
      aria-labelledby="set-inactive-title"
      aria-describedby="set-inactive-desc"
    >
      {isDialogOpen ? (
        <Toaster
          toasterId={INACTIVE_DIALOG_TOASTER_ID}
          position="top-right"
          containerStyle={{ position: "fixed", top: 16, right: 16, zIndex: 2147483647 }}
          toastOptions={{ style: { zIndex: 2147483647 } }}
        />
      ) : null}
      <div className="p-6">
        <h2 id="set-inactive-title" className="text-lg font-semibold">
          Set member inactive
        </h2>
        <p id="set-inactive-desc" className="mt-1 mb-6 text-sm text-muted-foreground">
          Set <strong>{displayName}</strong> as inactive? They will no longer be available.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Setting…" : "Set inactive"}
          </Button>
        </div>
      </div>
    </dialog>
  )
}

export default MemberList
