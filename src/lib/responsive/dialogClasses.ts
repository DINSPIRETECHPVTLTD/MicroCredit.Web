/** Shared responsive dialog shell — viewport margin on small screens, capped height with scroll body. */
export const dialogShellClass =
  "rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 w-[calc(100vw-1rem)] sm:w-full max-h-[90vh] flex flex-col"

export const dialogShellSmClass =
  "rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-md w-[calc(100vw-1rem)] sm:w-full"

export const dialogShellMdClass =
  "rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-lg w-[calc(100vw-1rem)] sm:w-full"

export const dialogShellLgClass =
  `${dialogShellClass} max-w-2xl`

export const dialogShellXlClass =
  "rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50 max-w-xl w-[calc(100vw-1rem)] sm:w-full max-h-[90vh] flex flex-col"

export const dialogHeaderClass = "p-4 sm:p-6 border-b shrink-0"

export const dialogBodyScrollClass = "p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0"

export const dialogFooterClass =
  "p-4 sm:p-6 border-t shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2"
