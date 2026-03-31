/**
 * AddEditPocDialog.tsx
 * Modal dialog to create a new POC (Point of Contact) or edit an existing one.
 * Used from PocList when user clicks "Add POC" or "Edit" on a row.
 */
import { useRef, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PocResponse } from "@/types/poc"
import { pocService, type PocSaveRequest } from "@/services/poc.service"
import { userService } from "@/services/user.service"
import type { UserResponse } from "@/types/user"
import { centerService } from "@/services/center.service"
import type { CenterResponse } from "@/types/center"
import { masterlookupService } from "@/services/masterLookup.service"
import type { MasterLookupResponse } from "@/types/masterLookup"

// -----------------------------------------------------------------------------
// Validation schema (Zod): defines required/optional fields and rules for the form.
// phoneRegex: exactly 10 digits (used for Phone and Alt phone).
// -----------------------------------------------------------------------------
const sanitizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10)
const sanitizeZip = (value: string) => value.replace(/\D/g, "").slice(0, 5)

type PocFormOptions = {
  usersData: UserResponse[]
  centersData: CenterResponse[]
  masterLookupsData: MasterLookupResponse[]
}

let pocFormOptionsRequest: Promise<PocFormOptions> | null = null

const loadPocFormOptions = async (): Promise<PocFormOptions> => {
  if (!pocFormOptionsRequest) {
    pocFormOptionsRequest = Promise.all([
      userService.getUsers(),
      centerService.getCenters(),
      masterlookupService.getMasterLookups(),
    ]).then(([usersData, centersData, masterLookupsData]) => ({
      usersData,
      centersData,
      masterLookupsData,
    }))
  }

  try {
    return await pocFormOptionsRequest
  } finally {
    pocFormOptionsRequest = null
  }
}

const baseFields = z.object({
  centerId: z.number({ message: "Center is required" }).min(1, "Center is required"),
  firstName: z.string().min(1, "First name is required").max(100, "First name must be 100 characters or less"),
  middleName: z.string().max(100, "Middle name must be 100 characters or less").optional(),
  lastName: z.string().min(1, "Last name is required").max(100, "Last name must be 100 characters or less"),
  phoneNumber: z
    .string()
    .min(1, "Phone is required")
    .refine((val) => /^[6-9]\d{9}$/.test(val), { message: "Invalid mobile number" }),
  altPhone: z
    .string()
    .optional()
    .refine((val) => !val || /^[6-9]\d{9}$/.test(val), { message: "Invalid mobile number" }),
  address1: z.string().max(200, "Address must be 200 characters or less").optional(),
  address2: z.string().max(200, "Address must be 200 characters or less").optional(),
  city: z.string().max(100, "City must be 100 characters or less").optional(),
  state: z.string().optional(),
  zipCode: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{5}$/.test(val), { message: "Zip code must be exactly 5 digits" }),
  collectionDay: z.string().min(1, "Collection day is required"),
  collectionFrequency: z.string().min(1, "Frequency is required"),
  collectionBy: z
    .number({ message: "Collection by is required" })
    .min(1, "Collection by is required"),
})

/** Form values type inferred from the schema (used by react-hook-form). */
type CreateFormData = z.infer<typeof baseFields>

/**
 * Dialog mode: either adding a new POC or editing an existing one.
 * When "edit", we pass the existing poc so the form can be pre-filled.
 */
export type AddEditPocDialogMode =
  | { mode: "add" }
  | { mode: "edit"; poc: PocResponse }

/** Props for AddEditPocDialog. value=null means dialog is closed. */
type Props = {
  value: AddEditPocDialogMode | null
  onClose: () => void
  onSuccess: () => void
}

/** Shared CSS class for all form inputs and selects (consistent look). */
const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring focus-visible:ring-offset-2"

export function AddEditPocDialog({ value, onClose, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)

  // Dropdown options: loaded when dialog opens. Form is reset only after these load so State, Center, Collection by display correctly.
  const [users, setUsers] = useState<UserResponse[]>([])
  const [centers, setCenters] = useState<CenterResponse[]>([])
  const [stateLookups, setStateLookups] = useState<MasterLookupResponse[]>([])
  const [collectionFrequencyLookups, setCollectionFrequencyLookups] = useState<MasterLookupResponse[]>([])

  // Whether we are editing (vs adding). editPoc is the existing POC when in edit mode.
  const isEdit = value?.mode === "edit"
  const editPoc = isEdit && value ? value.poc : null

  // React Hook Form: handles form state, validation (via zodResolver + baseFields), and submit.
  const form = useForm<CreateFormData>({
    resolver: zodResolver(baseFields),
    defaultValues: {
      centerId: 0,
      firstName: "",
      middleName: "",
      lastName: "",
      phoneNumber: "",
      altPhone: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      collectionDay: "",
      collectionFrequency: "",
      collectionBy: 0,
    },
  })

  // When dialog opens: show modal, load dropdowns, then reset form (after options exist so State/Center/Collection by show correctly).
  useEffect(() => {
    if (value === null) return

    dialogRef.current?.showModal()

    const loadAndReset = async () => {
      try {
        const { usersData, centersData, masterLookupsData } = await loadPocFormOptions()
        setUsers(usersData)
        setCenters(centersData)
        setStateLookups(masterLookupsData.filter((x) => x.lookupKey.toUpperCase() === "STATE"))
        setCollectionFrequencyLookups(
          masterLookupsData.filter((x) => x.lookupKey.toUpperCase() === "PAYMENT_TERM")
        )

        // Reset form after dropdown options are set so selects display the right value
        if (editPoc) {
          form.reset({
            centerId: editPoc.centerId,
            firstName: editPoc.firstName,
            middleName: editPoc.middleName ?? "",
            lastName: editPoc.lastName,
            phoneNumber: editPoc.phoneNumber,
            altPhone: editPoc.altPhone ?? "",
            address1: editPoc.address1 ?? "",
            address2: editPoc.address2 ?? "",
            city: editPoc.city ?? "",
            state: editPoc.state ?? "",
            zipCode: editPoc.zipCode ?? "",
            collectionDay: editPoc.collectionDay ?? "",
            collectionFrequency: editPoc.collectionFrequency,
            collectionBy: editPoc.collectionBy,
          })
        } else {
          form.reset({
            centerId: 0,
            firstName: "",
            middleName: "",
            lastName: "",
            phoneNumber: "",
            altPhone: "",
            address1: "",
            address2: "",
            city: "",
            state: "",
            zipCode: "",
            collectionDay: "",
            collectionFrequency: "",
            collectionBy: 0,
          })
        }
      } catch (e) {
        toast.error("Failed to load form options")
      }
    }
    loadAndReset()
  }, [value, editPoc?.id, form])

  if (value === null) return null

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  // Converts form data to the shape expected by the POC API (create/update).
  const buildRequest = (data: CreateFormData): PocSaveRequest => ({
    centerId: data.centerId,
    firstName: data.firstName,
    middleName: data.middleName || null,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    altPhone: data.altPhone || null,
    address1: data.address1 || null,
    address2: data.address2 || null,
    city: data.city || null,
    state: data.state || null,
    zipCode: data.zipCode || null,
    collectionDay: data.collectionDay || null,
    collectionFrequency: data.collectionFrequency,
    collectionBy: data.collectionBy,
  })

  // On submit: call create or update API, show toast, then close and notify parent to refresh list.
  const onSubmit = async (data: CreateFormData) => {
    setSaving(true)
    const request = buildRequest(data)

    try {
      if (isEdit && editPoc) {
        await pocService.updatePoc(editPoc.id, request)
        toast.success("POC updated")
      } else {
        await pocService.createPoc(request)
        toast.success("POC created")
      }
      onSuccess()
      close()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save POC"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
  <dialog
    ref={dialogRef}
    onCancel={close}
    className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-2xl w-full max-h-[90vh] flex flex-col"
    aria-labelledby="add-edit-poc-title"
  >
    <div className="p-6 border-b shrink-0">
      <h2 id="add-edit-poc-title" className="text-lg font-semibold">
        {isEdit ? "Update POC" : "Create POC"}
      </h2>
    </div>

    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0 overflow-hidden">
      <div className="p-6 overflow-y-auto space-y-6 flex-1">
        {/* Section 1: Name and phone (mandatory fields marked with *). */}
        <section>
          <h3 className="text-sm font-medium mb-3">Basic information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">First name <span className="text-destructive">*</span></label>
              <input
                {...form.register("firstName")}
                className={cn(inputClass, form.formState.errors.firstName && "border-destructive")}
                placeholder="Enter first name"
                maxLength={100}
              />
              {form.formState.errors.firstName && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Middle name</label>
              <input {...form.register("middleName")} className={inputClass} placeholder="Enter middle name" maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Last name <span className="text-destructive">*</span></label>
              <input
                {...form.register("lastName")}
                className={cn(inputClass, form.formState.errors.lastName && "border-destructive")}
                placeholder="Enter last name"
                maxLength={100}
              />
              {form.formState.errors.lastName && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.lastName.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone number<span className="text-destructive">*</span></label>
              <input
                {...form.register("phoneNumber", {
                  onChange: (e) => {
                    e.target.value = sanitizePhone(e.target.value)
                  },
                })}
                className={cn(inputClass, form.formState.errors.phoneNumber && "border-destructive")}
                inputMode="numeric"
                minLength={10}
                maxLength={10}
                placeholder="Enter phone number"
                onKeyDown={(e) => {
                  const allowedKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"]
                  if (allowedKeys.includes(e.key)) return
                  if (!/^\d$/.test(e.key)) e.preventDefault()
                }}
              />
              {form.formState.errors.phoneNumber && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.phoneNumber.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Alt phone</label>
              <input
                {...form.register("altPhone", {
                  onChange: (e) => {
                    e.target.value = sanitizePhone(e.target.value)
                  },
                })}
                className={cn(inputClass, form.formState.errors.altPhone && "border-destructive")}
                inputMode="numeric"
                minLength={10}
                maxLength={10}
                placeholder="Enter phone number"
                onKeyDown={(e) => {
                  const allowedKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"]
                  if (allowedKeys.includes(e.key)) return
                  if (!/^\d$/.test(e.key)) e.preventDefault()
                }}
              />
              {form.formState.errors.altPhone && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.altPhone.message}</p>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Address (optional). State options come from MasterLookup. */}
        <section>
          <h3 className="text-sm font-medium mb-3">Address</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Address 1</label>
              <input {...form.register("address1")} className={inputClass} placeholder="Enter address line 1" maxLength={200} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Address 2</label>
              <input {...form.register("address2")} className={inputClass} placeholder="Enter address line 2" maxLength={200} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">City</label>
              <input {...form.register("city")} className={inputClass} placeholder="Enter city" maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">State</label>
              <select {...form.register("state")} className={inputClass}>
                <option value="">Select state</option>
                {stateLookups.map((s) => (
                  <option key={s.id} value={s.lookupValue}>
                    {s.lookupValue}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1 block">Zip code</label>
              <input
                {...form.register("zipCode", {
                  onChange: (e) => {
                    e.target.value = sanitizeZip(e.target.value)
                  },
                })}
                className={cn(inputClass, form.formState.errors.zipCode && "border-destructive")}
                inputMode="numeric"
                minLength={5}
                maxLength={5}
                placeholder="Enter zip code"
                onKeyDown={(e) => {
                  const allowedKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"]
                  if (allowedKeys.includes(e.key)) return
                  if (!/^\d$/.test(e.key)) e.preventDefault()
                }}
              />
              {form.formState.errors.zipCode && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.zipCode.message}</p>
              )}
            </div>
          </div>
        </section>
        {/* Section 3: Center, frequency, day, and collection-by user (all mandatory). */}
        <section>
          <h3 className="text-sm font-medium mb-3">Collection details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Center <span className="text-destructive">*</span></label>
              <select
                {...form.register("centerId", { valueAsNumber: true })}
                className={cn(inputClass, form.formState.errors.centerId && "border-destructive")}
              >
                <option value={0}>Select center</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.centerId && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.centerId.message}</p>
              )}
            </div>
            <div>
  <label className="text-sm font-medium mb-1 block">Collection frequency <span className="text-destructive">*</span></label>
  <select
    {...form.register("collectionFrequency")}
    className={cn(inputClass, form.formState.errors.collectionFrequency && "border-destructive")}
  >
    <option value="">Select frequency</option>
    {collectionFrequencyLookups.map((item) => (
      <option key={item.id} value={item.lookupValue}>
        {item.lookupValue}
      </option>
    ))}
  </select>
  {form.formState.errors.collectionFrequency && (
    <p className="text-xs text-destructive mt-1">
      {form.formState.errors.collectionFrequency.message}
    </p>
  )}
</div>

<div>
  <label className="text-sm font-medium mb-1 block">Collection day <span className="text-destructive">*</span></label>
  <select
    {...form.register("collectionDay")}
    className={cn(inputClass, form.formState.errors.collectionDay && "border-destructive")}
  >
    <option value="">Select day</option>
    <option value="Monday">Monday</option>
    <option value="Tuesday">Tuesday</option>
    <option value="Wednesday">Wednesday</option>
    <option value="Thursday">Thursday</option>
    <option value="Friday">Friday</option>
    <option value="Saturday">Saturday</option>
    <option value="Sunday">Sunday</option>
  </select>
  {form.formState.errors.collectionDay && (
    <p className="text-xs text-destructive mt-1">{form.formState.errors.collectionDay.message}</p>
  )}
</div>
            <div>
              <label className="text-sm font-medium mb-1 block">Collection by <span className="text-destructive">*</span></label>
              <select
                {...form.register("collectionBy", { valueAsNumber: true })}
                className={cn(inputClass, form.formState.errors.collectionBy && "border-destructive")}
              >
                <option value={0}>Select user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.surname}
                  </option>
                ))}
              </select>
              {form.formState.errors.collectionBy && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.collectionBy.message}</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-2 p-6 border-t shrink-0">
        <Button type="button" variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (isEdit ? "Updating…" : "Creating…") : isEdit ? "Update POC" : "Create POC"}
        </Button>
      </div>
    </form>
  </dialog>
)
}
