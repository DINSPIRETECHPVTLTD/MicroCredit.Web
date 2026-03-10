import { useRef, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { userService } from "@/services/user.service"
import type { UserResponse } from "@/types/user"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const baseFields = {
  firstName: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Surname is required"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  role: z.string().min(1, "Role is required"),
  phoneNumber: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.string().optional(),
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
          ?.message ?? "Something went wrong."
      setErrorMessage(msg)
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
              <div className="form-group">
                <label className="form-label">First name</label>
                <input
                  {...form.register("firstName")}
                  className={cn("input", form.formState.errors.firstName && "border-destructive")}
                />
                {form.formState.errors.firstName && (
                  <p className="form-error">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Surname</label>
                <input
                  {...form.register("surname")}
                  className={cn("input", form.formState.errors.surname && "border-destructive")}
                />
                {form.formState.errors.surname && (
                  <p className="form-error">{form.formState.errors.surname.message}</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  {...form.register("email")}
                  type="email"
                  className={cn("input", form.formState.errors.email && "border-destructive")}
                />
                {form.formState.errors.email && (
                  <p className="form-error">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input {...form.register("phoneNumber")} className="input" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select {...form.register("role")} className="input">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Level</label>
                <input {...form.register("level")} className="input" />
              </div>
            </div>
          </section>

          {!isEdit && (
            <section>
              <h3 className="text-sm font-medium mb-3">Security</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    {...form.register("password")}
                    type="password"
                    autoComplete="new-password"
                    className={cn("input", form.formState.errors.password && "border-destructive")}
                  />
                  {form.formState.errors.password && (
                    <p className="form-error">{form.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm password</label>
                  <input
                    {...form.register("confirmPassword")}
                    type="password"
                    autoComplete="new-password"
                    className={cn("input", form.formState.errors.confirmPassword && "border-destructive")}
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="form-error">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-medium mb-3">Address</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="form-group">
                <label className="form-label">Address 1</label>
                <input {...form.register("address1")} className="input" />
              </div>
              <div className="form-group">
                <label className="form-label">Address 2</label>
                <input {...form.register("address2")} className="input" />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input {...form.register("city")} className="input" />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input {...form.register("state")} className="input" />
              </div>
              <div className="form-group sm:col-span-2">
                <label className="form-label">Zip code</label>
                <input {...form.register("pinCode")} className="input" />
              </div>
            </div>
          </section>

          {errorMessage && <p className="form-error">{errorMessage}</p>}
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
