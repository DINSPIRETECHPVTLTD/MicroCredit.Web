import { cn } from "@/lib/utils"

export type SegmentedToggleOption<T extends string> = {
  value: T
  label: string
}

export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  buttonClassName,
}: {
  value: T
  options: SegmentedToggleOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  buttonClassName?: string
}) {
  return (
    <div
      className={cn("inline-flex rounded-lg border border-border bg-muted p-1", className)}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "min-w-24 rounded-md px-3 py-1.5 text-center text-xs font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
              buttonClassName
            )}
            aria-pressed={active}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
