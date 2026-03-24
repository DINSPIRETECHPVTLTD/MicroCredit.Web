import { useMemo, useRef, useState, useEffect, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table"
import { Plus, Pencil, UserX, Landmark } from "lucide-react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import type { MemberResponse } from "@/types/member"
import { memberService } from "@/services/member.service"
import { AddEditMemberDialog, type AddEditMemberDialogMode } from "@/pages/members/AddEditMemberDialog"
import { getBranch } from "@/services/auth.service"

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

  const columns = useMemo<MRT_ColumnDef<MemberResponse>[]>(
    () => [
      {
        id: "memberId",
        header: "ID",
        size: 80,
        accessorFn: (row) => row.memberId ?? row.id,
      },
      {
        id: "fullName",
        header: "Full Name",
        accessorFn: (row) => formatFullName(row),
      },
      {
        id: "phone",
        header: "Phone",
        accessorFn: (row) => formatPhone(row),
      },
      {
        id: "dob",
        header: "DOB / Age",
        accessorFn: (row) => formatDobForSort(row),
        Cell: ({ row }) => formatDobDisplay(row.original),
      },
      {
        id: "center",
        header: "Center",
        accessorFn: (row) => row.center ?? row.centerName ?? "",
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
        size: 220,
        minSize: 220,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <MemberRowActions
            onOpenEdit={() => setAddEditDialog({ mode: "edit", member: row.original })}
            onOpenSetInactive={() => setInactiveMember(row.original)}
            onOpenAddLoan={() =>
              navigate("/loans/add", {
                state: {
                  from: "member",
                  fromMemberPage: true,
                  memberId: row.original.id,
                  prefillMember: {
                    id: row.original.id,
                    name: row.original.name ?? [row.original.firstName, row.original.lastName].filter(Boolean).join(" "),
                    phoneNumber: row.original.phoneNumber ?? row.original.memberPhone ?? "",
                    guardianName: row.original.guardianName ?? "",
                    fullAddress: row.original.fullAddress ?? "",
                    center: row.original.center ?? row.original.centerName ?? "",
                    poc: row.original.poc ?? "",
                    pocId: row.original.pocId ?? undefined,
                  },
                },
              })
            }
          />
        ),
      },
    ],
    []
  )

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
  const name = (row.name ?? [row.firstName, row.lastName].filter(Boolean).join(" ").trim()) || "—"
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
}: {
  onOpenEdit: () => void
  onOpenSetInactive: () => void
  onOpenAddLoan: () => void
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
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={onOpenAddLoan}
      >
        <Landmark className="mr-1 h-4 w-4" />
        Add Loan
      </Button>
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
