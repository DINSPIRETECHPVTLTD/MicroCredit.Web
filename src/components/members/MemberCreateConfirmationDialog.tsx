import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MemberPreviewFieldKey } from "@/components/members/member-preview-utils"

export type MemberCreatePreviewData = {
  memberId?: string
  firstName: string
  middleName?: string
  lastName: string
  occupation: string
  dob: string
  age: string
  aadhaar: string
  phoneNumber: string
  altPhone?: string
  address1: string
  address2?: string
  city: string
  stateLabel: string
  zipCode: string
  guardianFirstName: string
  guardianLastName: string
  guardianPhone?: string
  relationshipLabel: string
  guardianDOB: string
  guardianAge: string
  branchName: string
  centerName: string
  pocName: string
  paymentModeLabel: string
  joiningFeeAmount: string
  paidDate: string
  collectedByName: string
  comments?: string
}

type MemberCreateConfirmationDialogProps = {
  open: boolean
  mode: "create" | "edit"
  preview: MemberCreatePreviewData | null
  changedFields?: Set<MemberPreviewFieldKey>
  isSubmitting: boolean
  errorMessage: string | null
  onEdit: () => void
  onConfirm: () => void
}

function formatPreviewDate(value: string | undefined): string {
  if (!value?.trim()) return "—"
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    }
  }
  return value
}

function displayValue(value: string | undefined | null): string {
  const v = value?.trim()
  return v ? v : "—"
}

function PreviewField({
  fieldKey,
  label,
  value,
  highlight,
  changed,
  mode,
  changedFields,
  className,
  forceShow,
}: {
  fieldKey: MemberPreviewFieldKey
  label: string
  value: string
  highlight?: boolean
  changed?: boolean
  mode: "create" | "edit"
  changedFields: Set<MemberPreviewFieldKey>
  className?: string
  forceShow?: boolean
}) {
  const isChanged = changed ?? changedFields.has(fieldKey)
  if (mode === "edit" && !isChanged && !forceShow) return null

  return (
    <div className={className}>
      <dt
        className={cn(
          "text-xs font-medium text-muted-foreground",
          highlight && "font-semibold text-foreground"
        )}
      >
        {label}
        {mode === "edit" && isChanged ? (
          <span className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:text-amber-200">
            Changed
          </span>
        ) : null}
      </dt>
      <dd
        className={cn(
          "mt-0.5 break-words text-sm text-foreground",
          (highlight || isChanged) && "font-semibold",
          isChanged && "rounded-md bg-amber-500/10 px-2 py-1"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function PreviewSection({
  title,
  fieldKeys,
  mode,
  changedFields,
  children,
}: {
  title: string
  fieldKeys: MemberPreviewFieldKey[]
  mode: "create" | "edit"
  changedFields: Set<MemberPreviewFieldKey>
  children: React.ReactNode
}) {
  const visible =
    mode === "create" || fieldKeys.some((key) => changedFields.has(key))
  if (!visible) return null

  return (
    <section className="rounded-lg border border-border bg-muted/20 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

function buildMemberDisplayName(preview: MemberCreatePreviewData): string {
  return [preview.firstName, preview.middleName, preview.lastName]
    .filter(Boolean)
    .join(" ")
    .trim()
}

export function MemberCreateConfirmationDialog({
  open,
  mode,
  preview,
  changedFields = new Set(),
  isSubmitting,
  errorMessage,
  onEdit,
  onConfirm,
}: MemberCreateConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (open) {
      setConfirmed(false)
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [open])

  if (!open || !preview) return null

  const memberName = buildMemberDisplayName(preview)
  const fullAddress = [
    preview.address1,
    preview.address2,
    preview.city,
    preview.stateLabel,
    preview.zipCode,
  ]
    .filter(Boolean)
    .join(", ")

  const isEdit = mode === "edit"
  const title = isEdit ? "Confirm member update" : "Confirm new member"
  const description = isEdit
    ? "Review the changes below before saving this member."
    : "Review the details below before creating this member."
  const confirmLabel = isEdit ? "Confirm & Save" : "Confirm & Create"
  const loadingLabel = isEdit ? "Saving…" : "Creating…"

  const personalKeys: MemberPreviewFieldKey[] = [
    "firstName",
    "middleName",
    "lastName",
    "occupation",
    "dob",
    "age",
    "aadhaar",
  ]
  const contactKeys: MemberPreviewFieldKey[] = ["phoneNumber", "altPhone"]
  const addressKeys: MemberPreviewFieldKey[] = [
    "address1",
    "address2",
    "city",
    "state",
    "zipCode",
  ]
  const guardianKeys: MemberPreviewFieldKey[] = [
    "guardianFirstName",
    "guardianLastName",
    "guardianPhone",
    "relationship",
    "guardianDOB",
    "guardianAge",
  ]
  const branchKeys: MemberPreviewFieldKey[] = ["centerId", "pocId"]

  return (
    <dialog
      ref={dialogRef}
      onCancel={onEdit}
      className="fixed inset-0 z-[100] m-auto flex max-h-[min(90vh,900px)] w-[min(100vw-2rem,42rem)] max-w-lg flex-col rounded-xl border border-border bg-card p-0 shadow-xl backdrop:bg-black/50 open:flex"
      aria-labelledby="member-save-confirm-title"
      aria-describedby="member-save-confirm-desc"
    >
      <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
        <h2 id="member-save-confirm-title" className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p id="member-save-confirm-desc" className="mt-1 text-sm font-medium text-red-700 dark:text-red-400">
          {description}
        </p>
        {isEdit && changedFields.size > 0 ? (
          <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
            {changedFields.size} field{changedFields.size === 1 ? "" : "s"} changed
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Summary</p>
          {preview.memberId ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Member ID: <span className="font-semibold text-foreground">{preview.memberId}</span>
            </p>
          ) : null}
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <PreviewField
              fieldKey="firstName"
              mode={mode}
              changedFields={changedFields}
              label="Member Name"
              value={displayValue(memberName)}
              highlight
              forceShow
            />
            <PreviewField
              fieldKey="pocId"
              mode={mode}
              changedFields={changedFields}
              label="POC"
              value={displayValue(preview.pocName)}
              highlight
              forceShow
            />
            <PreviewField
              fieldKey="firstName"
              mode={mode}
              changedFields={changedFields}
              label="Branch"
              value={displayValue(preview.branchName)}
              highlight
              forceShow
            />
            <PreviewField
              fieldKey="centerId"
              mode={mode}
              changedFields={changedFields}
              label="Center"
              value={displayValue(preview.centerName)}
              highlight
              forceShow
            />
          </dl>
        </div>

        <PreviewSection
          title="Personal details"
          fieldKeys={personalKeys}
          mode={mode}
          changedFields={changedFields}
        >
          <PreviewField fieldKey="firstName" mode={mode} changedFields={changedFields} label="First name" value={displayValue(preview.firstName)} />
          <PreviewField fieldKey="middleName" mode={mode} changedFields={changedFields} label="Middle name" value={displayValue(preview.middleName)} />
          <PreviewField fieldKey="lastName" mode={mode} changedFields={changedFields} label="Last name" value={displayValue(preview.lastName)} />
          <PreviewField fieldKey="occupation" mode={mode} changedFields={changedFields} label="Occupation" value={displayValue(preview.occupation)} />
          <PreviewField fieldKey="dob" mode={mode} changedFields={changedFields} label="Date of birth" value={formatPreviewDate(preview.dob)} />
          <PreviewField fieldKey="age" mode={mode} changedFields={changedFields} label="Age" value={displayValue(preview.age)} />
          <PreviewField fieldKey="aadhaar" mode={mode} changedFields={changedFields} label="Aadhaar" value={displayValue(preview.aadhaar)} className="sm:col-span-2" />
        </PreviewSection>

        <PreviewSection title="Contact details" fieldKeys={contactKeys} mode={mode} changedFields={changedFields}>
          <PreviewField fieldKey="phoneNumber" mode={mode} changedFields={changedFields} label="Phone number" value={displayValue(preview.phoneNumber)} highlight />
          <PreviewField fieldKey="altPhone" mode={mode} changedFields={changedFields} label="Alternate phone" value={displayValue(preview.altPhone)} />
        </PreviewSection>

        <PreviewSection title="Address details" fieldKeys={addressKeys} mode={mode} changedFields={changedFields}>
          <PreviewField fieldKey="address1" mode={mode} changedFields={changedFields} label="Address line 1" value={displayValue(preview.address1)} className="sm:col-span-2" />
          <PreviewField fieldKey="address2" mode={mode} changedFields={changedFields} label="Address line 2" value={displayValue(preview.address2)} />
          <PreviewField fieldKey="city" mode={mode} changedFields={changedFields} label="City" value={displayValue(preview.city)} />
          <PreviewField fieldKey="state" mode={mode} changedFields={changedFields} label="State" value={displayValue(preview.stateLabel)} />
          <PreviewField fieldKey="zipCode" mode={mode} changedFields={changedFields} label="Pincode" value={displayValue(preview.zipCode)} />
          {(mode === "create" || addressKeys.some((k) => changedFields.has(k))) && (
            <PreviewField
              fieldKey="address1"
              mode="create"
              changedFields={changedFields}
              label="Full address"
              value={displayValue(fullAddress)}
              className="sm:col-span-2"
            />
          )}
        </PreviewSection>

        <PreviewSection title="Nominee / guardian details" fieldKeys={guardianKeys} mode={mode} changedFields={changedFields}>
          <PreviewField fieldKey="guardianFirstName" mode={mode} changedFields={changedFields} label="First name" value={displayValue(preview.guardianFirstName)} />
          <PreviewField fieldKey="guardianLastName" mode={mode} changedFields={changedFields} label="Surname" value={displayValue(preview.guardianLastName)} />
          <PreviewField fieldKey="guardianPhone" mode={mode} changedFields={changedFields} label="Phone" value={displayValue(preview.guardianPhone)} />
          <PreviewField fieldKey="relationship" mode={mode} changedFields={changedFields} label="Relationship" value={displayValue(preview.relationshipLabel)} />
          <PreviewField fieldKey="guardianDOB" mode={mode} changedFields={changedFields} label="Date of birth" value={formatPreviewDate(preview.guardianDOB)} />
          <PreviewField fieldKey="guardianAge" mode={mode} changedFields={changedFields} label="Age" value={displayValue(preview.guardianAge)} />
        </PreviewSection>

        <PreviewSection title="Branch details" fieldKeys={branchKeys} mode={mode} changedFields={changedFields}>
          <PreviewField fieldKey="pocId" mode={mode} changedFields={changedFields} label="POC" value={displayValue(preview.pocName)} />
          <PreviewField fieldKey="centerId" mode={mode} changedFields={changedFields} label="Branch" value={displayValue(preview.branchName)} highlight />
          <PreviewField fieldKey="centerId" mode={mode} changedFields={changedFields} label="Center" value={displayValue(preview.centerName)} className="sm:col-span-2" />
        </PreviewSection>

        {!isEdit ? (
          <section className="rounded-lg border border-border bg-muted/20 p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Membership / account details</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <PreviewField fieldKey="firstName" mode="create" changedFields={changedFields} label="Payment mode" value={displayValue(preview.paymentModeLabel)} forceShow />
              <PreviewField fieldKey="firstName" mode="create" changedFields={changedFields} label="Joining fee (₹)" value={displayValue(preview.joiningFeeAmount)} forceShow />
              <PreviewField fieldKey="firstName" mode="create" changedFields={changedFields} label="Paid date" value={formatPreviewDate(preview.paidDate)} forceShow />
              <PreviewField fieldKey="firstName" mode="create" changedFields={changedFields} label="Collected by" value={displayValue(preview.collectedByName)} forceShow />
              <PreviewField fieldKey="firstName" mode="create" changedFields={changedFields} label="Comments" value={displayValue(preview.comments)} className="sm:col-span-2" forceShow />
            </dl>
          </section>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-input"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="text-muted-foreground">
            {isEdit
              ? "I confirm these changes are correct and ready to be saved."
              : "I confirm the above details are correct and ready to be submitted."}
          </span>
        </label>

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <Button type="button" variant="outline" onClick={onEdit} disabled={isSubmitting}>
          Edit
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting || !confirmed}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {loadingLabel}
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </div>
    </dialog>
  )
}
