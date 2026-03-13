// src/pages/pocs/AddEditPocDialog.tsx
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



// Validation schema for the POC form
const baseFields = z.object({
  centerId: z.number({ message: "Center is required" }).min(1, "Center is required"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone is required"),
  altPhone: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  collectionDay: z.string().optional(),
  collectionFrequency: z.string().min(1, "Frequency is required"),
  collectionBy: z
  .number({ message: "Collection by is required" })
  .min(1, "Collection by is required"),
})

type CreateFormData = z.infer<typeof baseFields>

// Mode: add OR edit
export type AddEditPocDialogMode =
  | { mode: "add" }
  | { mode: "edit"; poc: PocResponse }

type Props = {
  value: AddEditPocDialogMode | null
  onClose: () => void
  onSuccess: () => void
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring focus-visible:ring-offset-2"

export function AddEditPocDialog({ value, onClose, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)

  // 1) local state for users
const [users, setUsers] = useState<UserResponse[]>([])
// 2) fetch users on mount/open (or just once)
useEffect(() => {
  async function loadUsers() {
    try {
      const data = await userService.getUsers()
      setUsers(data)
    } catch (e) {
      toast.error("Failed to load users for Collection By")
    }
  }
  loadUsers()
}, [])


  const isEdit = value?.mode === "edit"
  const editPoc = isEdit && value ? value.poc : null

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

  // Open dialog and fill values when editing
  useEffect(() => {
    if (value === null) return

    dialogRef.current?.showModal()

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
      form.reset()
    }
  }, [value, editPoc?.id, form])

  if (value === null) return null

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  // Map form data to backend request
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
        {isEdit ? "Update POC" : "Create POC"}
      </h2>
    </div>

    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0 overflow-hidden">
      <div className="p-6 overflow-y-auto space-y-6 flex-1">
        {/* Basic information */}
        <section>
          <h3 className="text-sm font-medium mb-3">Basic information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">First name</label>
              <input
                {...form.register("firstName")}
                className={cn(inputClass, form.formState.errors.firstName && "border-destructive")}
              />
              {form.formState.errors.firstName && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Middle name</label>
              <input {...form.register("middleName")} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Last name</label>
              <input
                {...form.register("lastName")}
                className={cn(inputClass, form.formState.errors.lastName && "border-destructive")}
              />
              {form.formState.errors.lastName && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.lastName.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <input
                {...form.register("phoneNumber")}
                className={cn(inputClass, form.formState.errors.phoneNumber && "border-destructive")}
              />
              {form.formState.errors.phoneNumber && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.phoneNumber.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Alt phone</label>
              <input {...form.register("altPhone")} className={inputClass} />
            </div>
          </div>
        </section>

        {/* Address */}
        <section>
          <h3 className="text-sm font-medium mb-3">Address</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Address 1</label>
              <input {...form.register("address1")} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Address 2</label>
              <input {...form.register("address2")} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">City</label>
              <input {...form.register("city")} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">State</label>
              <input {...form.register("state")} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1 block">Zip code</label>
              <input {...form.register("zipCode")} className={inputClass} />
            </div>
          </div>
        </section>
        {/* Collection details */}
        <section>
          <h3 className="text-sm font-medium mb-3">Collection details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Center</label>
              <select
                {...form.register("centerId", { valueAsNumber: true })}
                className={cn(inputClass, form.formState.errors.centerId && "border-destructive")}
              >
                <option value={0}>Select center</option>
                {/* TODO: bind actual centers here */}
              </select>
              {form.formState.errors.centerId && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.centerId.message}</p>
              )}
            </div>
            <div>
  <label className="text-sm font-medium mb-1 block">Collection frequency</label>
  <select
    {...form.register("collectionFrequency")}
    className={cn(inputClass, form.formState.errors.collectionFrequency && "border-destructive")}
  >
    <option value="">Select frequency</option>
    <option value="Daily">Daily</option>
    <option value="Weekly">Weekly</option>
    <option value="Monthly">Monthly</option>
  </select>
  {form.formState.errors.collectionFrequency && (
    <p className="text-xs text-destructive mt-1">
      {form.formState.errors.collectionFrequency.message}
    </p>
  )}
</div>

<div>
  <label className="text-sm font-medium mb-1 block">Collection day</label>
  <select
    {...form.register("collectionDay")}
    className={inputClass}
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
</div>
            <div>
              <label className="text-sm font-medium mb-1 block">Collection by</label>
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