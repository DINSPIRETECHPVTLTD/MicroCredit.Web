import { useRef, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { userService } from "@/services/user.service"
import type { UserResponse } from "@/types/user"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const nameRegex = /^[A-Za-z ]+$/

const sanitizeName = (value: string) => value.replace(/[^A-Za-z ]/g, "")
const sanitizePhone = (value: string) => value.replace(/\D/g, "")
const sanitizeZip = (value: string) => value.replace(/\D/g, "")

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
      (val) => !val || /^\d+$/.test(val),
      { message: "Phone can contain digits only" }
    )
    .refine(
      (val) => !val || val.length <= 15,
      { message: "Phone must be at most 15 digits" }
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
      (val) => !val || /^\d+$/.test(val),
      { message: "Zip code can contain digits only" }
    )
    .refine(
      (val) => !val || val.length <= 10,
      { message: "Zip code must be at most 10 digits" }
    ),
  level: z.string().min(1, "Level is required"),
}

const createSchema = z
  .object({
    ...baseFields,
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => !data.password || data.password === data.confirmPassword,
    { message: "Passwords do not match", path: ["confirmPassword"] }
  )

const editSchema = z.object(baseFields)

type CreateFormData = z.infer<typeof createSchema>

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const ROLES = ["Owner", "Investor", "BRANCH_ADMIN", "STAFF", "BRANCH_USER"]

export type AddEditUserDialogMode = { mode: "add" } | { mode: "edit"; user: UserResponse }

type Props = {
  value: AddEditUserDialogMode | null
  onClose: () => void
  onSuccess: () => void
}

export function AddEditUserDialog({ value, onClose, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isEdit = value?.mode === "edit"
  const editUser = value?.mode === "edit" ? value.user : null

  const form = useForm<CreateFormData>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
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
    },
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
      form.reset({
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
      })
    }
  }, [value, editUser?.id, form])

  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  const onSubmit = async (data: CreateFormData) => {
    setErrorMessage(null)
    setSaving(true)
    try {
      if (isEdit && editUser) {
        await userService.updateUser(editUser.id, {
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
          level: data.level,
        })
        toast.success("User updated")
      } else {
        if (!data.password) {
          form.setError("password", { message: "Password is required" })
          setSaving(false)
          return
        }
        const { confirmPassword: _, ...rest } = data
        await userService.createUser({
          ...rest,
          password: data.password!,
          phoneNumber: data.phoneNumber || null,
          address1: data.address1 || null,
          address2: data.address2 || null,
          city: data.city || null,
          state: data.state || null,
          pinCode: data.pinCode || null,
        })
        toast.success("User created")
      }
      onSuccess()
      close()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Something went wrong while creating/updating the user."
      setErrorMessage(msg)
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
      aria-labelledby="add-edit-user-title"
    >
      <div className="p-6 border-b shrink-0">
        <h2 id="add-edit-user-title" className="text-lg font-semibold">
          {isEdit ? "Update user" : "Create user"}
        </h2>
      </div>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col min-h-0 overflow-hidden"
      >
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <section>
            <h3 className="text-sm font-medium mb-3">Basic information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">First name</label>
                <input
                  {...form.register("firstName", {
                    onChange: (e) => {
                      e.target.value = sanitizeName(e.target.value)
                    },
                  })}
                  maxLength={225}
                  className={cn(inputClass, form.formState.errors.firstName && "border-destructive")}
                />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Surname</label>
                <input
                  {...form.register("surname", {
                    onChange: (e) => {
                      e.target.value = sanitizeName(e.target.value)
                    },
                  })}
                  maxLength={225}
                  className={cn(inputClass, form.formState.errors.surname && "border-destructive")}
                />
                {form.formState.errors.surname && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.surname.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <input
                  {...form.register("email")}
                  type="email"
                  maxLength={225}
                  className={cn(inputClass, form.formState.errors.email && "border-destructive")}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <input
                  {...form.register("phoneNumber", {
                    onChange: (e) => {
                      e.target.value = sanitizePhone(e.target.value)
                    },
                  })}
                  maxLength={15}
                  className={inputClass}
                />
                {form.formState.errors.phoneNumber && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.phoneNumber.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Role</label>
                <select {...form.register("role")} className={inputClass}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
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
                  <label className="text-sm font-medium mb-1 block">Password</label>
                  <input
                    {...form.register("password")}
                    type="password"
                    autoComplete="new-password"
                    className={cn(inputClass, form.formState.errors.password && "border-destructive")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Confirm password</label>
                  <input
                    {...form.register("confirmPassword")}
                    type="password"
                    autoComplete="new-password"
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
                  className={cn(inputClass, form.formState.errors.city && "border-destructive")}
                />
                {form.formState.errors.city && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.city.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">State</label>
                <input
                  {...form.register("state", {
                    onChange: (e) => {
                      e.target.value = sanitizeName(e.target.value)
                    },
                  })}
                  className={cn(inputClass, form.formState.errors.state && "border-destructive")}
                />
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
                  maxLength={10}
                  className={cn(inputClass, form.formState.errors.pinCode && "border-destructive")}
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
