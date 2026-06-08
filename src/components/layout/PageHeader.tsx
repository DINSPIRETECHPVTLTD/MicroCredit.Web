import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: string
  description?: string
  /** Primary actions (buttons) — stacks below title on mobile */
  actions?: ReactNode
  /** Secondary toolbar (search, filters) — full width below title/actions */
  toolbar?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  toolbar,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-6 space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {toolbar ? <div className="min-w-0">{toolbar}</div> : null}
    </header>
  )
}
