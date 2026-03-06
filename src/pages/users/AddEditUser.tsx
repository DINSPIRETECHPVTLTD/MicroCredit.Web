import { useNavigate, useParams, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { userService } from "@/services/user.service"
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
    (data) =>
      !data.password || data.password === data.confirmPassword,
    { message: "Passwords do not match", path: ["confirmPassword"] }
  )

const editSchema = z.object(baseFields)

type CreateFormData = z.infer<typeof createSchema>

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const ROLES = ["Owner", "Investor", "BRANCH_ADMIN", "STAFF", "BRANCH_USER"]

function AddEditUser() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { data: user } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const list = await userService.getUsers()
      return list.find((u) => u.id === Number(id)) ?? null
    },
    enabled: isEdit,
  })

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
    if (user) {
      form.reset({
        firstName: user.firstName,
        surname: user.surname,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber || "",
        address1: user.address1 || "",
        address2: user.address2 || "",
        city: user.city || "",
        state: user.state || "",
        pinCode: user.pinCode || "",
        level: "1",
      })
    }
  }, [user, form])

  const onSubmit = async (data: CreateFormData) => {
    setErrorMessage(null)
    setSaving(true)
    try {
      if (isEdit && id) {
        await userService.updateUser(Number(id), {
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
      navigate("/users", { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Something went wrong."
      setErrorMessage(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">
        {isEdit ? "Update user information" : "Create a new organization user"}
      </h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left column: Basic info + Security */}
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-medium mb-4">Basic information</h2>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">First name</label>
                  <input
                    {...form.register("firstName")}
                    className={cn(inputClass, form.formState.errors.firstName && "border-destructive")}
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Surname</label>
                  <input
                    {...form.register("surname")}
                    className={cn(inputClass, form.formState.errors.surname && "border-destructive")}
                  />
                  {form.formState.errors.surname && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.surname.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <input
                    {...form.register("email")}
                    type="email"
                    className={cn(inputClass, form.formState.errors.email && "border-destructive")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone number</label>
                  <input {...form.register("phoneNumber")} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Role</label>
                  <select {...form.register("role")} className={inputClass}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Level</label>
                  <input {...form.register("level")} className={inputClass} />
                </div>
              </div>
            </section>

            {!isEdit && (
              <section>
                <h2 className="text-lg font-medium mb-4">Security</h2>
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Password</label>
                    <input
                      {...form.register("password")}
                      type="password"
                      className={cn(inputClass, form.formState.errors.password && "border-destructive")}
                    />
                    {form.formState.errors.password && (
                      <p className="text-xs text-destructive mt-1">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Confirm password</label>
                    <input
                      {...form.register("confirmPassword")}
                      type="password"
                      className={cn(
                        inputClass,
                        form.formState.errors.confirmPassword && "border-destructive"
                      )}
                    />
                    {form.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive mt-1">
                        {form.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right column: Address */}
          <div>
            <section>
              <h2 className="text-lg font-medium mb-4">Address Details</h2>
              <div className="grid gap-4">
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
                <div>
                  <label className="text-sm font-medium mb-1 block">Pin code</label>
                  <input {...form.register("pinCode")} className={inputClass} />
                </div>
              </div>
            </section>
          </div>
        </div>

        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update User" : "Create User"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/users">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}

export default AddEditUser
