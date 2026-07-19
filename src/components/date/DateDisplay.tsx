import { cn } from "@/lib/utils"
import {
  formatDisplayDate,
  type FormatDisplayDateOptions,
} from "@/lib/date-time"

export type DateDisplayProps = {
  value: string | Date | null | undefined
  empty?: FormatDisplayDateOptions["empty"]
  className?: string
}

/**
 * Shared read-only date display. Change format in `@/lib/date-time`
 * (`formatDisplayDate`) to update every screen that uses this control.
 */
export function DateDisplay({ value, empty, className }: DateDisplayProps) {
  return (
    <span className={cn("tabular-nums", className)}>
      {formatDisplayDate(value, empty !== undefined ? { empty } : undefined)}
    </span>
  )
}
