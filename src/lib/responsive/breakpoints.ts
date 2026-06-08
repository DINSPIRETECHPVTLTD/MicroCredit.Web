export type Breakpoint = "mobile" | "tablet" | "desktop"

/** Mobile: <768px, Tablet: 768–1023px, Desktop: ≥1024px */
export const BREAKPOINT_QUERIES = {
  mobile: "(max-width: 767px)",
  tablet: "(min-width: 768px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px)",
} as const

export function resolveBreakpoint(mobile: boolean, tablet: boolean): Breakpoint {
  if (mobile) return "mobile"
  if (tablet) return "tablet"
  return "desktop"
}
