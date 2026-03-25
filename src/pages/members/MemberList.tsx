import { useRef, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import type { MemberResponse } from "@/types/member"
import { memberService } from "@/services/member.service"
import { AddEditMemberDialog, type AddEditMemberDialogMode } from "@/pages/members/AddEditMemberDialog"
import { getBranch } from "@/services/auth.service"
import MemberGrid from "@/components/members/MemberGrid"

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "string") return data
  if (data && typeof data === "object") {
    const obj = data as { message?: string; error?: string; title?: string }
    return obj.message ?? obj.error ?? obj.title ?? fallback
  }
  return fallback
}

function MemberList() {
  const navigate = useNavigate()
  const branch = getBranch()
  const branchId = branch?.id

  const [addEditDialog, setAddEditDialog] = useState<AddEditMemberDialogMode | null>(null)
  const [inactiveMember, setInactiveMember] = useState<MemberResponse | null>(null)

  const {
    data: members = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["members", branchId],
    enabled: !!branchId,
    queryFn: () => memberService.getByBranch(branchId!),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        <Button onClick={() => setAddEditDialog({ mode: "add" })}>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      {!isLoading && members.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No members found</p>
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
          onOpenAddLoan={(row) =>
            navigate("/loans/add", {
              state: {
                from: "member",
                fromMemberPage: true,
                memberId: row.id,
                prefillMember: {
                  id: row.id,
                  name: row.name ?? [row.firstName, row.lastName].filter(Boolean).join(" "),
                  phoneNumber: row.phoneNumber ?? row.memberPhone ?? "",
                  guardianName: row.guardianName ?? "",
                  fullAddress: row.fullAddress ?? "",
                  center: row.center ?? row.centerName ?? "",
                  poc: row.poc ?? "",
                  pocId: row.pocId ?? undefined,
                },
              },
            })
          }
        />
      )}

      {inactiveMember && (
        <SetInactiveDialog
          member={inactiveMember}
          onClose={() => setInactiveMember(null)}
          onSuccess={async () => {
            await refetch()
            setInactiveMember(null)
          }}
        />
      )}
      <AddEditMemberDialog
        value={addEditDialog}
        onClose={() => setAddEditDialog(null)}
        onSuccess={async () => {
          await refetch()
          setAddEditDialog(null)
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
  const displayName = (member.name ?? [member.firstName, member.lastName].filter(Boolean).join(" ").trim()) || "Member"

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [member.id])

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await memberService.setInactive(member.id)
      toast.success("Member set inactive")
      await onSuccess()
      close()
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to set member inactive"))
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
