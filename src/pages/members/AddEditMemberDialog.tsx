/**
 * AddEditMemberDialog.tsx
 * Modal dialog to create a new Member or edit an existing one.
 * Used from MemberList when user clicks "Add Member" or "Edit" on a row.
 */
import React, { useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import toast from "react-hot-toast"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MemberResponse } from "@/types/member"
import { memberService, type MemberSaveRequest } from "@/services/member.service"
import { memberFeeService } from "@/services/memberFee.service"
import { centerService } from "@/services/center.service"
import { getBranch } from "@/services/auth.service"
import { pocService } from "@/services/poc.service"
import type { PocResponse } from "@/types/poc"
import { masterlookupService } from "@/services/masterLookup.service"
import type { MasterLookupResponse } from "@/types/masterLookup"
import { userService } from "@/services/user.service"
import type { UserResponse } from "@/types/user"

const phoneRegex = /^\d{10}$/
const aadhaarRegex = /^\d{12}$/

function calculateAgeFromIso(dobIso: string): number | null {
  if (!dobIso) return null
  const dobDate = new Date(dobIso)
  if (Number.isNaN(dobDate.getTime())) return null
  const today = new Date()
  let years = today.getFullYear() - dobDate.getFullYear()
  const m = today.getMonth() - dobDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
    years--
  }
  return years
}

const baseFields = z.object({
  // Assignment Details
  centerId: z.number({ message: "Center is required" }).min(1, "Center is required"),
  pocId: z.number().min(0).optional(), // 0 = not selected, empty dropdown for now
  // Member Personal Details
  firstName: z.string().min(1, "First name is required").max(100, "First name must be 100 characters or less"),
  middleName: z.string().max(100, "Middle name must be 100 characters or less").optional(),
  lastName: z.string().min(1, "Last name is required").max(100, "Last name must be 100 characters or less"),
  occupation: z.string().min(1, "Occupation is required").max(100, "Occupation must be 100 characters or less"),
  dob: z
    .string()
    .min(1, "Date of birth is required")
    .refine((value) => {
      const age = calculateAgeFromIso(value)
      return age !== null && age >= 18
    }, "Age must be at least 18 years"),
  age: z.union([z.string(), z.number()]).optional(),
  phoneNumber: z
    .string()
    .min(1, "Phone is required")
    .transform((s) => s.trim())
    .refine((s) => phoneRegex.test(s), "Phone must be exactly 10 digits"),
  aadhaar: z
    .string()
    .min(1, "Aadhaar is required")
    .transform((s) => s.trim())
    .refine((s) => aadhaarRegex.test(s), "Aadhaar must be exactly 12 digits"),
  altPhone: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === "" || phoneRegex.test(val.trim()), "Alt phone must be exactly 10 digits"),
  // Address Details
  address1: z.string().max(200, "Address must be 200 characters or less").optional(),
  address2: z.string().max(200, "Address must be 200 characters or less").optional(),
  city: z.string().max(100, "City must be 100 characters or less").optional(),
  state: z.string().optional(),
  zipCode: z.string().max(10, "Zip code must be 10 characters or less").optional(),
  // Member Entry Joining Fee (required)
  paymentMode: z.string().min(1, "Payment mode is required"),
  joiningFeeAmount: z
    .union([z.string(), z.number()])
    .refine((val) => {
      if (val === "" || val == null) return false
      const n = typeof val === "string" ? parseFloat(val) : val
      return !Number.isNaN(n) && n > 0
    }, "Amount is required and must be greater than 0"),
  paidDate: z.string().min(1, "Paid date is required"),
  collectedBy: z.number({ message: "Collected by is required" }).min(1, "Collected by is required"),
  comments: z.string().max(500).optional(),
  // Guardian Details (required)
  guardianFirstName: z.string().min(1, "Guardian first name is required").max(100),
  guardianLastName: z.string().min(1, "Guardian surname is required").max(100),
  guardianPhone: z.string().optional(),
  relationship: z.string().min(1, "Relationship is required"),
  relationshipOther: z.string().max(100, "Relationship must be 100 characters or less").optional(),
  guardianDOB: z.string().min(1, "Guardian DOB is required"),
  guardianAge: z.union([z.string(), z.number()]).optional(),
}).superRefine((data, ctx) => {
  if (data.relationship === "Other") {
    if (!data.relationshipOther || !data.relationshipOther.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify relationship",
        path: ["relationshipOther"],
      })
    }
  }
})

type CreateFormData = z.infer<typeof baseFields>

export type AddEditMemberDialogMode =
  | { mode: "add" }
  | { mode: "edit"; member: MemberResponse }

type Props = {
  value: AddEditMemberDialogMode | null
  onClose: () => void
  onSuccess: () => void
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring focus-visible:ring-offset-2"

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "string") return data
  if (data && typeof data === "object") {
    const obj = data as { message?: string; error?: string; title?: string }
    return obj.message ?? obj.error ?? obj.title ?? fallback
  }
  return fallback
}

export function AddEditMemberDialog({ value, onClose, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = React.useState(false)

  const isEdit = value?.mode === "edit"
  const editMember = isEdit && value ? value.member : null
  // Stable key so the load effect runs only when dialog opens/closes or switch add↔edit, not on every parent re-render
  const dialogKey = value === null ? "closed" : value.mode === "edit" ? `edit-${value.member.id}` : "add"

  const isOpen = value !== null
  const branchId = getBranch()?.id ?? null

  // Shared data using React Query so calls are de-duplicated across the app (and under StrictMode).
  const { data: centers = [] } = useQuery({
    queryKey: ["centers"],
    queryFn: () => centerService.getCenters(),
    enabled: isOpen,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
  const { data: allLookups = [] } = useQuery({
    queryKey: ["masterLookups"],
    queryFn: () => masterlookupService.getMasterLookups(),
    enabled: isOpen,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const { data: users = [] } = useQuery<UserResponse[]>({
    queryKey: ["users"],
    queryFn: () => userService.getUsers(),
    enabled: isOpen,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const stateLookups = React.useMemo<MasterLookupResponse[]>(
    () => allLookups.filter((x) => x.lookupKey?.toLowerCase() === "state"),
    [allLookups]
  )

  const relationshipLookups = React.useMemo<MasterLookupResponse[]>(
    () => allLookups.filter((x) => x.lookupKey?.toLowerCase() === "relationship"),
    [allLookups]
  )

  // Payment modes from MasterLookup (e.g. lookupKey = "PaymentMode")
  const paymentModeLookups = React.useMemo<MasterLookupResponse[]>(
    () => allLookups.filter((x) => x.lookupKey?.toLowerCase() === "paymentmode"),
    [allLookups]
  )

  const form = useForm<CreateFormData>({
    resolver: zodResolver(baseFields),
    defaultValues: {
      centerId: 0,
      pocId: 0,
      firstName: "",
      middleName: "",
      lastName: "",
      occupation: "",
      dob: "",
      age: "",
      phoneNumber: "",
      aadhaar: "",
      altPhone: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      paymentMode: "",
      joiningFeeAmount: "",
      paidDate: "",
      collectedBy: 0,
      comments: "",
      guardianFirstName: "",
      guardianLastName: "",
      guardianPhone: "",
      relationship: "",
      relationshipOther: "",
      guardianDOB: "",
      guardianAge: "",
    },
  })

  // Center selection drives POC loading and filtering
  const selectedCenterId = form.watch("centerId") ?? 0
  const dobValue = form.watch("dob") ?? ""
  const guardianDobValue = form.watch("guardianDOB") ?? ""
  const relationshipValue = form.watch("relationship") ?? ""

  // Load POCs for the current branch only AFTER a center is selected.
  const { data: pocsByBranch = [] } = useQuery({
    queryKey: ["pocs", branchId],
    queryFn: () => pocService.getByBranch(branchId!),
    enabled: isOpen && !!branchId && !!selectedCenterId,
  })

  // Filter POCs for the selected centerId
  const pocsForCenter = React.useMemo<PocResponse[]>(() => {
    if (!selectedCenterId) return []
    return pocsByBranch.filter((p) => p.centerId === selectedCenterId)
  }, [pocsByBranch, selectedCenterId])

  // When member DOB changes, auto-calculate age in years and populate Age field (read-only in UI).
  useEffect(() => {
    if (!dobValue) {
      form.setValue("age", "")
      return
    }
    const years = calculateAgeFromIso(dobValue)
    form.setValue("age", years != null ? years.toString() : "")
  }, [dobValue, form])

  // When guardian DOB changes, auto-calculate guardian age and populate Guardian Age field.
  useEffect(() => {
    if (!guardianDobValue) {
      form.setValue("guardianAge", "")
      return
    }
    const years = calculateAgeFromIso(guardianDobValue)
    form.setValue("guardianAge", years != null ? years.toString() : "")
  }, [guardianDobValue, form])

  useEffect(() => {
    if (value === null) return

    dialogRef.current?.showModal()

    // Once centers and lookups are available, reset the form for add/edit.
    if (editMember) {
      form.reset({
        centerId: editMember.centerId ?? 0,
        pocId: editMember.pocId ?? 0,
        firstName: editMember.firstName ?? "",
        middleName: editMember.middleName ?? "",
        lastName: editMember.lastName ?? "",
        occupation: editMember.occupation ?? "",
        dob: editMember.dob ?? "",
        age: editMember.age != null ? String(editMember.age) : "",
        phoneNumber: editMember.phoneNumber ?? editMember.memberPhone ?? "",
        aadhaar: editMember.aadhaar ?? "",
        altPhone: editMember.altPhone ?? editMember.guardianPhone ?? "",
        address1: editMember.address1 ?? "",
        address2: editMember.address2 ?? "",
        city: editMember.city ?? "",
        state: editMember.state ?? "",
        zipCode: editMember.zipCode ?? "",
        paymentMode: "",
        joiningFeeAmount: "",
        paidDate: "",
        collectedBy: 0,
        comments: "",
        guardianFirstName: editMember.guardianFirstName ?? "",
        guardianLastName: editMember.guardianLastName ?? "",
        guardianPhone: editMember.guardianPhone ?? "",
        relationship: editMember.relationship ?? "",
        relationshipOther: "",
        guardianDOB: editMember.guardianDOB ?? "",
        guardianAge: editMember.guardianAge != null ? String(editMember.guardianAge) : "",
      })
    } else {
      form.reset({
        centerId: 0,
        pocId: 0,
        firstName: "",
        middleName: "",
        lastName: "",
        occupation: "",
        dob: "",
        age: "",
        phoneNumber: "",
        aadhaar: "",
        altPhone: "",
        address1: "",
        address2: "",
        city: "",
        state: "",
        zipCode: "",
        paymentMode: "",
        joiningFeeAmount: "",
        paidDate: "",
        collectedBy: 0,
        comments: "",
        guardianFirstName: "",
        guardianLastName: "",
        guardianPhone: "",
        relationship: "",
        relationshipOther: "",
        guardianDOB: "",
        guardianAge: "",
      })
    }
  }, [dialogKey, editMember, form])

  if (value === null) return null

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  const buildRequest = (data: CreateFormData): MemberSaveRequest => ({
    centerId: data.centerId,
    pocId: data.pocId && data.pocId > 0 ? data.pocId : undefined,
    firstName: data.firstName,
    middleName: data.middleName || null,
    lastName: data.lastName,
    occupation: data.occupation || null,
    dob: data.dob || null,
    age: data.age != null && data.age !== "" ? Number(data.age) : undefined,
    phoneNumber: data.phoneNumber,
    aadhaar: data.aadhaar || null,
    altPhone: data.altPhone || null,
    address1: data.address1 || null,
    address2: data.address2 || null,
    city: data.city || null,
    state: data.state || null,
    zipCode: data.zipCode || null,
  })

  const onSubmit = async (data: CreateFormData) => {
    setSaving(true)
    const request = buildRequest(data)
    try {
      if (isEdit && editMember) {
        await memberService.updateMember(editMember.id, request)
        toast.success("Member updated")
      } else {
        const created = await memberService.createMember(request)

        const amountValue =
          data.joiningFeeAmount !== "" && data.joiningFeeAmount != null
            ? Number(data.joiningFeeAmount)
            : NaN

        if (
          created?.id != null &&
          !Number.isNaN(amountValue) &&
          amountValue > 0 &&
          data.paidDate &&
          data.collectedBy && data.collectedBy > 0
        ) {
          await memberFeeService.createFee({
            memberId: created.id,
            amount: amountValue,
            paidDate: data.paidDate,
            collectedBy: data.collectedBy,
            paymentMode: data.paymentMode || null,
            comments: data.comments || null,
          })
        }

        toast.success("Member created")
      }
      onSuccess()
      close()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to save member"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={close}
      className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-2xl w-full max-h-[90vh] flex flex-col"
      aria-labelledby="add-edit-member-title"
    >
      <div className="p-6 border-b shrink-0">
        <h2 id="add-edit-member-title" className="text-lg font-semibold">
          {isEdit ? "Update member" : "Create member"}
        </h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0 overflow-hidden">
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Assignment Details */}
          <section>
            <h3 className="text-sm font-medium mb-3">Assignment Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Center <span className="text-destructive">*</span></label>
                <select
                  {...form.register("centerId", {
                    valueAsNumber: true,
                    onChange: () => form.setValue("pocId", 0),
                  })}
                  className={cn(inputClass, form.formState.errors.centerId && "border-destructive")}
                >
                  <option value={0}>Select Center</option>
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
                <label className="text-sm font-medium mb-1 block">POC (Point of Contact) <span className="text-destructive">*</span></label>
                <select
                  {...form.register("pocId", { valueAsNumber: true })}
                  className={cn(inputClass, form.formState.errors.pocId && "border-destructive")}
                  disabled={!selectedCenterId}
                >
                  <option value={0}>
                    {selectedCenterId ? "Select POC" : "Select Center first"}
                  </option>
                  {pocsForCenter.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.pocId && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.pocId.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Member Personal Details */}
          <section>
            <h3 className="text-sm font-medium mb-3">Member Personal Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">First Name <span className="text-destructive">*</span></label>
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
                <label className="text-sm font-medium mb-1 block">Surname <span className="text-destructive">*</span></label>
                <input
                  {...form.register("lastName")}
                  className={cn(inputClass, form.formState.errors.lastName && "border-destructive")}
                  placeholder="Enter surname"
                  maxLength={100}
                />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.lastName.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Occupation <span className="text-destructive">*</span></label>
                <input
                  {...form.register("occupation")}
                  className={cn(inputClass, form.formState.errors.occupation && "border-destructive")}
                  placeholder="Enter occupation"
                  maxLength={100}
                />
                {form.formState.errors.occupation && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.occupation?.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Date of Birth <span className="text-destructive">*</span></label>
                <input
                  type="date"
                  {...form.register("dob")}
                  className={cn(inputClass, form.formState.errors.dob && "border-destructive")}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Age</label>
                <input
                  type="number"
                  min={18}
                  {...form.register("age")}
                  className={inputClass}
                  placeholder="18+"
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone Number <span className="text-destructive">*</span></label>
                <input
                  {...form.register("phoneNumber")}
                  className={cn(inputClass, form.formState.errors.phoneNumber && "border-destructive")}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter phone number"
                />
                {form.formState.errors.phoneNumber && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.phoneNumber.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Aadhaar <span className="text-destructive">*</span></label>
                <input
                  {...form.register("aadhaar")}
                  className={cn(inputClass, form.formState.errors.aadhaar && "border-destructive")}
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="Enter Aadhaar"
                />
                {form.formState.errors.aadhaar && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.aadhaar.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Alt phone</label>
                <input
                  {...form.register("altPhone")}
                  className={cn(inputClass, form.formState.errors.altPhone && "border-destructive")}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10 digits"
                />
                {form.formState.errors.altPhone && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.altPhone.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Address Details */}
          <section>
            <h3 className="text-sm font-medium mb-3">Address Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Address Line 1 <span className="text-destructive">*</span></label>
                <input {...form.register("address1")} className={inputClass} placeholder="Enter address line 1" maxLength={200} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Address Line 2</label>
                <input {...form.register("address2")} className={inputClass} placeholder="Enter address line 2" maxLength={200} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">City <span className="text-destructive">*</span></label>
                <input {...form.register("city")} className={inputClass} placeholder="Enter city" maxLength={100} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">State <span className="text-destructive">*</span></label>
                <select {...form.register("state")} className={inputClass}>
                  <option value="">Select state</option>
                  {stateLookups.map((s) => (
                    <option key={s.id} value={s.lookupCode}>
                      {s.lookupValue}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pincode <span className="text-destructive">*</span></label>
                <input {...form.register("zipCode")} className={inputClass} placeholder="Enter 6-digit pincode" maxLength={10} />
              </div>
            </div>
          </section>

          {/* Member Entry Joining Fee - only for new member (one-time) */}
          {!isEdit && (
            <section>
              <h3 className="text-sm font-medium mb-3">Member Entry Joining Fee</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Payment Mode <span className="text-destructive">*</span></label>
                  <select
                    {...form.register("paymentMode")}
                    className={cn(inputClass, form.formState.errors.paymentMode && "border-destructive")}
                  >
                    <option value="">Select</option>
                    {paymentModeLookups.map((m) => (
                      <option key={m.id} value={m.lookupValue}>
                        {m.lookupValue}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.paymentMode && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.paymentMode.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Amount (₹) <span className="text-destructive">*</span></label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    {...form.register("joiningFeeAmount")}
                    className={cn(inputClass, form.formState.errors.joiningFeeAmount && "border-destructive")}
                    placeholder="Enter amount"
                  />
                  {form.formState.errors.joiningFeeAmount && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.joiningFeeAmount.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Paid Date <span className="text-destructive">*</span></label>
                  <input
                    type="date"
                    {...form.register("paidDate")}
                    className={cn(inputClass, form.formState.errors.paidDate && "border-destructive")}
                  />
                  {form.formState.errors.paidDate && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.paidDate.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Collected By <span className="text-destructive">*</span></label>
                  <select
                    {...form.register("collectedBy", { valueAsNumber: true })}
                    className={cn(inputClass, form.formState.errors.collectedBy && "border-destructive")}
                  >
                    <option value={0}>Select Collected By</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.surname}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.collectedBy && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.collectedBy.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Comments</label>
                  <textarea
                    {...form.register("comments")}
                    className={inputClass}
                    placeholder="Enter comments"
                    rows={2}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Guardian Details */}
          <section>
            <h3 className="text-sm font-medium mb-3">Guardian Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">First Name <span className="text-destructive">*</span></label>
                <input
                  {...form.register("guardianFirstName")}
                  className={cn(inputClass, form.formState.errors.guardianFirstName && "border-destructive")}
                  placeholder="Enter first name"
                  maxLength={100}
                />
                {form.formState.errors.guardianFirstName && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.guardianFirstName.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Surname <span className="text-destructive">*</span></label>
                <input
                  {...form.register("guardianLastName")}
                  className={cn(inputClass, form.formState.errors.guardianLastName && "border-destructive")}
                  placeholder="Enter surname"
                  maxLength={100}
                />
                {form.formState.errors.guardianLastName && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.guardianLastName.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone Number</label>
                <input
                  {...form.register("guardianPhone")}
                  className={inputClass}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Relationship <span className="text-destructive">*</span></label>
                <select
                  {...form.register("relationship")}
                  className={cn(inputClass, form.formState.errors.relationship && "border-destructive")}
                >
                  <option value="">Select relationship</option>
                  {relationshipLookups.map((r) => (
                    <option key={r.id} value={r.lookupValue}>
                      {r.lookupValue}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {form.formState.errors.relationship && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.relationship.message}</p>
                )}
              </div>
              {relationshipValue === "Other" && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Other Relationship <span className="text-destructive">*</span></label>
                  <input
                    {...form.register("relationshipOther")}
                    className={cn(inputClass, form.formState.errors.relationshipOther && "border-destructive")}
                    placeholder="Enter relationship"
                    maxLength={100}
                  />
                  {form.formState.errors.relationshipOther && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.relationshipOther.message}</p>
                  )}
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">DOB <span className="text-destructive">*</span></label>
                <input
                  type="date"
                  {...form.register("guardianDOB")}
                  className={cn(inputClass, form.formState.errors.guardianDOB && "border-destructive")}
                />
                {form.formState.errors.guardianDOB && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.guardianDOB.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Age</label>
                <input
                  type="number"
                  min={18}
                  {...form.register("guardianAge")}
                  className={inputClass}
                  placeholder="18+"
                  readOnly
                />
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t shrink-0">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (isEdit ? "Updating…" : "Creating…") : isEdit ? "Update member" : "Create member"}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
