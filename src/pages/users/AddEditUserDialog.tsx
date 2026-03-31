import { useRef, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery } from "@tanstack/react-query"
import { userService } from "@/services/user.service"
import type { UserResponse } from "@/types/user"
import { masterlookupService } from "@/services/masterLookup.service"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const nameRegex = /^[A-Za-z ]+$/

const sanitizeName = (value: string) => value.replace(/[^A-Za-z ]/g, "")
const sanitizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 10)
  return digits
}
const sanitizeZip = (value: string) => value.replace(/\D/g, "").slice(0, 6)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/
const passwordValidationMessage =
  "Password must be at least 8 characters and include uppercase, lowercase, number, special character (@$!%*?&#), and no spaces"
const duplicateRecordMessage = "A record with the same unique value already exists."
const duplicateEmailUiMessage = "Email already exists. Please use a different email."

const baseFields = {
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(225, "First name must be at most 225 characters")
    .regex(nameRegex, "First name can contain only letters and spaces"),
  surname: z
    .string()
    .min(1, "Surname is required")
    .max(225, "Surname must be at most 225 characters")
    .regex(nameRegex, "Surname can contain only letters and spaces"),
  email: z
    .string()
    .min(1, "Email is required")
    .max(225, "Email must be at most 225 characters")
    .email("Invalid email"),
  role: z.string().min(1, "Role is required"),
  phoneNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[6-9]\d{9}$/.test(val),
      { message: "Invalid mobile number" }
    ),
  address1: z.string().max(225, "Address 1 must be at most 225 characters").optional(),
  address2: z.string().max(225, "Address 2 must be at most 225 characters").optional(),
  city: z
    .string()
    .optional()
    .refine((val) => !val || nameRegex.test(val), {
      message: "City can contain only letters and spaces",
    }),
  state: z
    .string()
    .optional()
    .refine((val) => !val || nameRegex.test(val), {
      message: "State can contain only letters and spaces",
    }),
  pinCode: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{6}$/.test(val),
      { message: "Zip code must be exactly 6 digits" }
    ),
  level: z.string().min(1, "Level is required"),
}

const createSchema = z
  .object({
    ...baseFields,
    password: z
      .string()
      .min(1, "Password is required")
      .regex(passwordRegex, passwordValidationMessage),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => !data.password || data.password === data.confirmPassword,
    { message: "Passwords do not match", path: ["confirmPassword"] }
  )

const editSchema = z.object({
  ...baseFields,
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
})

type CreateFormData = z.infer<typeof createSchema>

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const ROLE_OPTIONS = [
  { label: "Owner", value: "Owner" },
  { label: "Investor", value: "Investor" },
  { label: "Branch Admin", value: "BranchAdmin" },
  { label: "Staff", value: "Staff" },
]

export type AddEditUserDialogMode = { mode: "add" } | { mode: "edit"; user: UserResponse }

type Props = {
  value: AddEditUserDialogMode | null
  onClose: () => void
  onSuccess: () => void
}

const defaultFormValues = {
  firstName: "",
  surname: "",
  email: "",
  role: "Owner",
  phoneNumber: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  pinCode: "",
  level: "1",
}

export function AddEditUserDialog({ value, onClose, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isEdit = value?.mode === "edit"
  const editUser = value?.mode === "edit" ? value.user : null

  const { data: stateLookups = [] } = useQuery({
    queryKey: ["masterLookups", "state"],
    queryFn: () => masterlookupService.getMasterLookupsByKey("STATE"),
    enabled: value !== null,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })

  const form = useForm<CreateFormData>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: defaultFormValues,
  })

  useEffect(() => {
    if (value === null) return
    dialogRef.current?.showModal()
    setErrorMessage(null)
    if (editUser) {
      form.reset({
        firstName: editUser.firstName,
        surname: editUser.surname,
        email: editUser.email,
        role: editUser.role,
        phoneNumber: editUser.phoneNumber || "",
        address1: editUser.address1 || "",
        address2: editUser.address2 || "",
        city: editUser.city || "",
        state: editUser.state || "",
        pinCode: editUser.pinCode || "",
        level: "1",
      })
    } else {
      form.reset(defaultFormValues)
    }
  }, [value, editUser?.id, form])

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  const extractApiMessage = (err: unknown) => {
    const responseData = (err as { response?: { data?: { message?: string; error?: string } } })
      ?.response?.data
    return responseData?.message ?? responseData?.error ?? ""
  }

  const onSubmit = async (data: CreateFormData) => {
    setErrorMessage(null)
    setSaving(true)
    const commonPayload = {
      firstName: data.firstName,
      surname: data.surname,
      email: data.email,
      role: data.role,
      phoneNumber: data.phoneNumber || null,
      address1: data.address1 || null,
      address2: data.address2 || null,
      city: data.city || null,
      state: data.state || null,
      pinCode: data.pinCode || null,
    }
    try {
      if (isEdit && editUser) {
        await userService.updateUser(editUser.id, {
          ...commonPayload,
          level: data.level,
        })
        toast.success("User updated")
      } else {
        if (!data.confirmPassword) {
          form.setError("confirmPassword", { message: "Confirm password is required" })
          setSaving(false)
          return
        }
        const { confirmPassword: _, ...rest } = data
        await userService.createUser({
          ...rest,
          ...commonPayload,
          password: data.password!,
        })
        toast.success("User created")
      }
      onSuccess()
      close()
    } catch (err: unknown) {
      const apiMessage = extractApiMessage(err)
      const isDuplicateError =
        apiMessage.toLowerCase().includes(duplicateRecordMessage.toLowerCase()) ||
        apiMessage.toLowerCase().includes("already exists") ||
        apiMessage.toLowerCase().includes("duplicate")

      if (isDuplicateError) {
        form.setError("email", { message: duplicateEmailUiMessage })
        setErrorMessage(`${duplicateEmailUiMessage} (Unique field: Email)`)
        toast.error(`${duplicateEmailUiMessage} (Unique field: Email)`)
        return
      }

      const msg = apiMessage || "Something went wrong while creating/updating the user."
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const onInvalid = (errors: typeof form.formState.errors) => {
    const passwordError = errors.password?.message
    if (passwordError) {
      toast.error(passwordError)
      return
    }
    const firstError = Object.values(errors)[0]?.message
    if (firstError) {
      toast.error(firstError)
    }
  }

  if (value === null) return null

  return (
    <dialog
      ref={dialogRef}
      onCancel={close}
      className="rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-2xl w-full max-h-[90vh] flex flex-col"
      aria-labelledby="add-edit-user-title"
    >
      <div className="p-6 border-b shrink-0">
        <h2 id="add-edit-user-title" className="text-lg font-semibold">
          {isEdit ? "Update user" : "Create user"}
        </h2>
      </div>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="flex flex-col min-h-0 overflow-hidden"
      >
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <section>
            <h3 className="text-sm font-medium mb-3">Basic information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">First name <span className="text-destructive">*</span></label>
                <input
                  {...form.register("firstName", {
                    onChange: (e) => {
                      e.target.value = sanitizeName(e.target.value)
                    },
                  })}
                  maxLength={225}
                  placeholder="Enter first name"
                  className={cn(inputClass, form.formState.errors.firstName && "border-destructive")}
                />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Surname <span className="text-destructive">*</span></label>
                <input
                  {...form.register("surname", {
                    onChange: (e) => {
                      e.target.value = sanitizeName(e.target.value)
                    },
                  })}
                  maxLength={225}
                  placeholder="Enter surname"
                  className={cn(inputClass, form.formState.errors.surname && "border-destructive")}
                />
                {form.formState.errors.surname && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.surname.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email <span className="text-destructive">*</span></label>
                <input
                  {...form.register("email")}
                  type="email"
                  maxLength={225}
                  placeholder="Enter email"
                  className={cn(inputClass, form.formState.errors.email && "border-destructive")}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone number</label>
                <input
                  {...form.register("phoneNumber", {
                    onChange: (e) => {
                      e.target.value = sanitizePhone(e.target.value)
                    },
                  })}
                  maxLength={10}
                  placeholder="Enter phone number"
                  className={cn(inputClass, form.formState.errors.phoneNumber && "border-destructive")}
                  onKeyDown={(e) => {
                    const allowedKeys = [
                      "Backspace",
                      "Tab",
                      "ArrowLeft",
                      "ArrowRight",
                      "Delete",
                    ]
                    if (allowedKeys.includes(e.key)) return

                    const isDigit = /^\d$/.test(e.key)

                    if (!isDigit) {
                      e.preventDefault()
                    }
                  }}
                />
                {form.formState.errors.phoneNumber && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.phoneNumber.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Role <span className="text-destructive">*</span></label>
                <select {...form.register("role")} className={inputClass}>
                  {ROLE_OPTIONS.map((roleOption) => (
                    <option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {!isEdit && (
            <section>
              <h3 className="text-sm font-medium mb-3">Security</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Password <span className="text-destructive">*</span></label>
                  <input
                    {...form.register("password")}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter password"
                    className={cn(inputClass, form.formState.errors.password && "border-destructive")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Confirm password <span className="text-destructive">*</span></label>
                  <input
                    {...form.register("confirmPassword")}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    className={cn(inputClass, form.formState.errors.confirmPassword && "border-destructive")}
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-medium mb-3">Address</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Address 1</label>
                <input
                  {...form.register("address1")}
                  maxLength={225}
                  placeholder="Enter address line 1"
                  className={cn(inputClass, form.formState.errors.address1 && "border-destructive")}
                />
                {form.formState.errors.address1 && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.address1.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Address 2</label>
                <input
                  {...form.register("address2")}
                  maxLength={225}
                  placeholder="Enter address line 2"
                  className={cn(inputClass, form.formState.errors.address2 && "border-destructive")}
                />
                {form.formState.errors.address2 && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.address2.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">City</label>
                <input
                  {...form.register("city", {
                    onChange: (e) => {
                      e.target.value = sanitizeName(e.target.value)
                    },
                  })}
                  placeholder="Enter city"
                  className={cn(inputClass, form.formState.errors.city && "border-destructive")}
                />
                {form.formState.errors.city && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.city.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">State</label>
                <select
                  {...form.register("state")}
                  className={cn(inputClass, form.formState.errors.state && "border-destructive")}
                >
                  <option value="">Select state</option>
                  {stateLookups.map((s) => (
                    <option key={s.id} value={s.lookupValue}>
                      {s.lookupValue}
                    </option>
                  ))}
                </select>
                {form.formState.errors.state && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.state.message}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1 block">Zip code</label>
                <input
                  {...form.register("pinCode", {
                    onChange: (e) => {
                      e.target.value = sanitizeZip(e.target.value)
                    },
                  })}
                  maxLength={6}
                  placeholder="Enter zip code"
                  className={cn(inputClass, form.formState.errors.pinCode && "border-destructive")}
                  onKeyDown={(e) => {
                    const allowedKeys = [
                      "Backspace",
                      "Tab",
                      "ArrowLeft",
                      "ArrowRight",
                      "Delete",
                    ]
                    if (allowedKeys.includes(e.key)) return

                    const isDigit = /^\d$/.test(e.key)
                    if (!isDigit) {
                      e.preventDefault()
                    }
                  }}
                />
                {form.formState.errors.pinCode && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.pinCode.message}</p>
                )}
              </div>
            </div>
          </section>

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 p-6 border-t shrink-0">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update user" : "Create user"}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
