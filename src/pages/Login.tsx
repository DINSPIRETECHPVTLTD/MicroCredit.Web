import LoginForm from "@/components/LoginForm"

function Login() {
  return (
    <div className="login-container flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <div className="login-card w-full max-w-[400px] rounded-xl border bg-card p-8 shadow-sm">
        <div className="logo-section text-center mb-8">
          <h1 className="text-xl font-semibold tracking-tight mb-1">Welcome to MCS</h1>
          <p className="text-muted-foreground text-sm">Sign in to continue</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

export default Login
