import { Component, type ErrorInfo, type ReactNode } from "react"

interface AppErrorBoundaryProps {
  children: ReactNode
  /** When this value changes (e.g. route path), the boundary resets so navigation recovers. */
  resetKey?: string
}

interface AppErrorBoundaryState {
  error: Error | null
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack)
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-destructive/30 bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">
            Something went wrong on this page
          </h1>
          <p className="mt-2 break-words rounded-lg bg-muted/60 p-3 text-left font-mono text-xs text-destructive">
            {error.message || String(error)}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Try reloading the page. If it keeps happening, share the message above
            with support.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}

export default AppErrorBoundary
