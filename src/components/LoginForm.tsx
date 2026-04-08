import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { authService } from "@/services/auth.service"

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type FormData = z.infer<typeof schema>

function getLoginErrorMessage(err: unknown): string {
  const responseData = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof responseData === "string" && responseData.trim()) return responseData
  if (responseData && typeof responseData === "object") {
    const obj = responseData as { message?: string; error?: string; title?: string }
    const apiMessage = obj.message ?? obj.error ?? obj.title
    if (apiMessage?.trim()) return apiMessage
  }
  const generic = (err as { message?: string })?.message
  return generic?.trim() || "Login failed. Please try again."
}

export default function LoginForm() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setErrorMessage(null)
    setIsLoading(true)
    try {
      await authService.login(data)
      navigate("/dashboard", { replace: true })
    } catch (err: unknown) {
      setErrorMessage(getLoginErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errorMessage && (
        <p className="text-sm text-destructive mb-2 px-1">{errorMessage}</p>
      )}
      <div className="space-y-2">
        <input
          {...register("email")}
          type="email"
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <input
          {...register("password")}
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Login"}
      </Button>
    </form>
  )
}
