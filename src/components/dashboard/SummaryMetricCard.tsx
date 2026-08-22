import type { ComponentType } from "react"

export function SummaryMetricCard({
  title,
  value,
  icon: Icon,
  loading = false,
  compact = false,
}: {
  title: string
  value: string
  icon: ComponentType<{ className?: string }>
  loading?: boolean
  compact?: boolean
}) {
  if (compact) {
    return (
      <div className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          {loading ? (
            <div className="mt-0.5 h-4 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="truncate text-sm font-semibold tabular-nums text-foreground">{value}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  )
}
