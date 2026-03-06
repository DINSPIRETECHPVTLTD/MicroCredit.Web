import LoginForm from "@/components/LoginForm"

function Login() {
  return (
    <div className="fixed inset-0 flex min-h-screen w-screen overflow-auto bg-background">
      {/* Left panel: branding */}
      <div className="hidden w-full flex-shrink-0 flex-col justify-between bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-10 text-primary-foreground md:flex md:max-w-[48%] lg:max-w-[52%] lg:p-16">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight lg:text-3xl">MCS</span>
        </div>
        <div className="space-y-4">
          <h2 className="max-w-sm text-2xl font-semibold leading-tight lg:text-3xl xl:text-4xl">
            MicroCredit System
          </h2>
          <p className="max-w-xs text-sm opacity-90 lg:text-base">
            Secure sign-in to manage your organization and branches.
          </p>
        </div>
        <p className="text-xs opacity-75">© MCS. All rights reserved.</p>
      </div>

      {/* Right panel: form — full width on mobile, centered on desktop */}
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-10 md:px-12 lg:px-16">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 md:text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Welcome to MCS
            </h1>
            <p className="mt-1.5 text-muted-foreground">Sign in to continue</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
