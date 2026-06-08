import { useEffect, useState } from "react"
import {
  BREAKPOINT_QUERIES,
  resolveBreakpoint,
  type Breakpoint,
} from "./breakpoints"

function readBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "desktop"
  const mobile = window.matchMedia(BREAKPOINT_QUERIES.mobile).matches
  const tablet = window.matchMedia(BREAKPOINT_QUERIES.tablet).matches
  return resolveBreakpoint(mobile, tablet)
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(readBreakpoint)

  useEffect(() => {
    const mobileMq = window.matchMedia(BREAKPOINT_QUERIES.mobile)
    const tabletMq = window.matchMedia(BREAKPOINT_QUERIES.tablet)

    const sync = () => {
      setBreakpoint(resolveBreakpoint(mobileMq.matches, tabletMq.matches))
    }

    sync()
    mobileMq.addEventListener("change", sync)
    tabletMq.addEventListener("change", sync)
    return () => {
      mobileMq.removeEventListener("change", sync)
      tabletMq.removeEventListener("change", sync)
    }
  }, [])

  return breakpoint
}

export function useIsMobile(): boolean {
  return useBreakpoint() === "mobile"
}
