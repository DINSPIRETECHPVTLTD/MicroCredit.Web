import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { authService } from "@/services/auth.service"
import { getLoginErrorMessage, isBranchModeRequiredError } from "@/lib/auth/login-errors"

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type FormData = z.infer<typeof schema>

type LoginLocationState = {
  from?: { pathname?: string }
}

export default function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const from =
    (location.state as LoginLocationState | null)?.from?.pathname ?? "/dashboard"

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setErrorMessage(null)
    setIsLoading(true)
    try {
      await authService.login({ ...data, mode: "ORG" })
      queryClient.clear()
      navigate(from, { replace: true })
      return
    } catch (firstErr: unknown) {
      if (isBranchModeRequiredError(firstErr)) {
        try {
          await authService.login({ ...data, mode: "BRANCH" })
          queryClient.clear()
          navigate(from, { replace: true })
          return
        } catch (secondErr: unknown) {
          setErrorMessage(getLoginErrorMessage(secondErr))
          return
        }
      }

      setErrorMessage(getLoginErrorMessage(firstErr))
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
