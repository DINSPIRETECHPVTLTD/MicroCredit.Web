import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { pocService } from "@/services/poc.service"
import { masterlookupService } from "@/services/masterLookup.service"
import { userService } from "@/services/user.service"
import type { PocRequest, PocResponse } from "@/types/poc"
import { getOrganization } from "@/services/auth.service"

type EditPocWithLegacyFields = PocResponse & {
  pincode?: string | null
  CollectionFrequency?: string | null
  CollectionDay?: string | null
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

const COLLECTION_OPTIONS = ["Daily", "Weekly", "BiWeekly", "Monthly"] as const

// TODO: replace with real center API when available
const CENTER_OPTIONS = [
  { id: 1, name: "Center 1" },
  { id: 2, name: "Center 2" },
]

const formSchema = z.object({
    centerId: z.string().min(1, "Center is required"),
    firstName: z.string().min(1, "Firstname is required"),
    surname: z.string().min(1, "Surname is required"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    middleName: z.string().optional(),
  address1: z.string().min(1, "Address 1 is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().optional(),
  collectionFrequency: z.string().min(1, "Collection is required"),
  collectionDay: z.string().min(1, "Collected Day is required"),
  collectedByUserId: z.string().min(1, "Collected By is required"),
})

type FormData = z.infer<typeof formSchema>

export type AddEditPocDialogMode =
  | { mode: "add" }
  | { mode: "edit"; poc: PocResponse }

type Props = {
  value: AddEditPocDialogMode | null
  onClose: () => void
  onSuccess: () => void | Promise<void>
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "string") return data
  if (data && typeof data === "object") {
    const obj = data as { message?: string; error?: string; title?: string }
    return obj.message ?? obj.error ?? obj.title ?? fallback
  }
  return fallback
}

export default function AddEditPocDialog({
  value,

  onClose,
  onSuccess,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)

  const isEdit = value?.mode === "edit"
  const editPoc = value?.mode === "edit" ? value.poc : null

  const { data: stateLookups = [] } = useQuery({
    queryKey: ["masterLookup", "state"],
    queryFn: () => masterlookupService.getMasterLookupsByKey("state"),
  })

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.getUsers(),
  })

  const org = getOrganization()

  const defaultStateFromOrg = useMemo(() => {
    if (!org?.address || stateLookups.length === 0) return ""

    const addr = org.address.toLowerCase()
    const match = stateLookups.find((s) =>
      addr.includes(s.lookupValue.toLowerCase())
    )

    return match?.lookupValue ?? ""
  }, [org?.address, stateLookups])

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      centerId: "",
      firstName: "",
      surname: "",
      phoneNumber: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      pincode: "",
      collectionFrequency: "",
      collectionDay: "",
      collectedByUserId: "",
    },
  })

  useEffect(() => {
    if (value === null) return
    dialogRef.current?.showModal()
    if (editPoc) {
      const raw = editPoc as EditPocWithLegacyFields
      form.reset({
        centerId: raw.centerId ? String(raw.centerId) : "",
        firstName: raw.firstName ?? "",
        surname: raw.lastName ?? "",          // or raw.surname if your API uses that
        middleName: raw.middleName ?? "",
        phoneNumber: raw.phoneNumber ?? "",
        address1: raw.address1 ?? "",
        address2: raw.address2 ?? "",
        city: raw.city ?? "",
        state: raw.state ?? "",
        pincode: raw.pincode ?? "",
        collectionFrequency:
          raw.collectionFrequency ?? raw.CollectionFrequency ?? "",
        collectionDay:
          raw.collectionDay ?? raw.CollectionDay ?? "",
        collectedByUserId: raw.collectionBy
          ? String(raw.collectionBy)
          : "",
      })
    } else {
      form.reset({
        centerId: "",
        firstName: "",
        surname: "",
        phoneNumber: "",
        address1: "",
        address2: "",
        city: "",
        state: defaultStateFromOrg,
        pincode: "",
        collectionFrequency: "",
        collectionDay: "",
        collectedByUserId: "",
      })
    }
  }, [value, editPoc, form, defaultStateFromOrg])

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        id: u.id,
        label: `${u.firstName ?? ""} ${u.surname ?? ""}`.trim() || u.email,
      })),
    [users]
  )

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      const payload: PocRequest = {
        centerId: Number(data.centerId),
        firstName: data.firstName,
        lastName: data.firstName,
        middleName: data.middleName || null,
        phoneNumber: data.phoneNumber,
        address1: data.address1 || null,
        address2: data.address2 || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        collectionFrequency: data.collectionFrequency || null,
        collectionDay: data.collectionDay || null,
        collectedByUserId: data.collectedByUserId
          ? Number(data.collectedByUserId) : null,
        
      }

      if (isEdit && editPoc) {
        await pocService.updatePoc(editPoc.id, payload)
        toast.success("POC updated successfully")
      } else {
        await pocService.createPoc(payload)
        toast.success("POC created successfully")
      }

      await onSuccess()
      close()
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          isEdit ? "Failed to update POC" : "Failed to create POC"
        )
      )
    } finally {
      setSaving(false)
    }
  }

  if (value === null) return null

  return (
    <dialog
      ref={dialogRef}
      onCancel={close}
      className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-2xl w-full max-h-[90vh] flex flex-col"
      aria-labelledby="add-edit-poc-title"
    >
      <div className="p-6 border-b shrink-0">
        <h2 id="add-edit-poc-title" className="text-lg font-semibold">
          {isEdit ? "Update POC" : "Add POC"}
        </h2>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col min-h-0 overflow-hidden"
      >
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Basic information */}
          <section>
            <h3 className="text-sm font-medium mb-3">Basic information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Center <span className="text-destructive">*</span>
                </label>
                <select
                  {...form.register("centerId")}
                  className={cn(
                    inputClass,
                    form.formState.errors.centerId && "border-destructive"
                  )}
                >
                  <option value="">Select Center</option>
                  {CENTER_OPTIONS.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.centerId && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.centerId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Firstname <span className="text-destructive">*</span>
                </label>
                <input
                  {...form.register("firstName")}
                  className={cn(
                    inputClass,
                    form.formState.errors.firstName && "border-destructive"
                  )}
                />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
  Last Name <span className="text-destructive">*</span>
</label>
<input
  {...form.register("surname")}
  className={cn(
    inputClass,
    form.formState.errors.surname && "border-destructive"
  )}
/>
{form.formState.errors.surname && (
  <p className="text-xs text-destructive mt-1">
    {form.formState.errors.surname.message}
  </p>
)}
                
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Middle name
                </label>
                <input
                  {...form.register("middleName")}
                  className={inputClass}
                />
              </div>
              {form.formState.errors.middleName && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.middleName.message}
                </p>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Phonenumber <span className="text-destructive">*</span>
                </label>
                <input
                  {...form.register("phoneNumber")}
                  className={cn(
                    inputClass,
                    form.formState.errors.phoneNumber && "border-destructive"
                  )}
                />
                {form.formState.errors.phoneNumber && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.phoneNumber.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Address */}
          <section>
            <h3 className="text-sm font-medium mb-3">Address</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Address 1 <span className="text-destructive">*</span>
                </label>
                <input {...form.register("address1")} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Address 2
                </label>
                <input {...form.register("address2")} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  City <span className="text-destructive">*</span>
                </label>
                <input {...form.register("city")} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  State <span className="text-destructive">*</span>
                </label>
                <select {...form.register("state")} className={inputClass}>
                  <option value="">Select State</option>
                  {stateLookups.map((s) => (
                    <option key={s.id} value={s.lookupValue}>
                      {s.lookupValue}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1 block">
                  Pincode
                </label>
                <input {...form.register("pincode")} className={inputClass} />
              </div>
            </div>
          </section>

          {/* Collection details */}
          <section>
            <h3 className="text-sm font-medium mb-3">Collection details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Collection <span className="text-destructive">*</span>
                </label>
                <select
                  {...form.register("collectionFrequency")}
                  className={cn(
                    inputClass,
                    form.formState.errors.collectionFrequency &&
                      "border-destructive"
                  )}
                >
                  <option value="">Select Collection</option>
                  {COLLECTION_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
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
                <label className="text-sm font-medium mb-1 block">
                  Collected Day <span className="text-destructive">*</span>
                </label>
                <select
                  {...form.register("collectionDay")}
                  className={cn(
                    inputClass,
                    form.formState.errors.collectionDay && "border-destructive"
                  )}
                >
                  <option value="">Select Day</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {form.formState.errors.collectionDay && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.collectionDay.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1 block">
                  CollectedBy <span className="text-destructive">*</span>
                </label>
                <select
                  {...form.register("collectedByUserId")}
                  className={cn(
                    inputClass,
                    form.formState.errors.collectedByUserId &&
                      "border-destructive"
                  )}
                >
                  <option value="">Select User</option>
                  {userOptions.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.label}
                    </option>
                  ))}
                </select>
                {form.formState.errors.collectedByUserId && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.collectedByUserId.message}
                  </p>
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
            {saving
              ? isEdit
                ? "Updating..."
                : "Submitting..."
              : isEdit
              ? "Update POC"
              : "Submit"}
          </Button>
        </div>
      </form>
    </dialog>
  )
}