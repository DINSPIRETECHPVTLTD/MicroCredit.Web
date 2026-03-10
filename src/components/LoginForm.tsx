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
      navigate("/", { replace: true })
    } catch (err: unknown) {
      const message =
        (err as Error)?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Login failed. Please try again."
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errorMessage && <p className="form-error mb-2 px-1">{errorMessage}</p>}
      <div className="form-group">
        <label htmlFor="login-email" className="form-label">Email</label>
        <input
          id="login-email"
          {...register("email")}
          type="email"
          placeholder="Email"
          autoComplete="email"
          className={errors.email ? "input border-destructive" : "input"}
        />
        {errors.email && <p className="form-error">{errors.email.message}</p>}
      </div>
      <div className="form-group">
        <label htmlFor="login-password" className="form-label">Password</label>
        <input
          id="login-password"
          {...register("password")}
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          className={errors.password ? "input border-destructive" : "input"}
        />
        {errors.password && <p className="form-error">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Login"}
      </Button>
    </form>
  )
}
