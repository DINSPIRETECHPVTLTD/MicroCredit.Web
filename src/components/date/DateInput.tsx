import * as React from "react"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DATE_DISPLAY_FORMAT,
  displayDateToIso,
  isoDateToDisplay,
  toIsoDateValue,
} from "@/lib/date-time"

const dateInputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background " +
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50"

export type DateInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue"
> & {
  /** Form/API value as YYYY-MM-DD (also accepts ISO / Date-like strings). */
  value?: string
  defaultValue?: string
}

function emitValueChange(
  onChange: DateInputProps["onChange"],
  name: string | undefined,
  iso: string
) {
  if (!onChange) return
  const target = {
    value: iso,
    name: name ?? "",
  } as HTMLInputElement
  onChange({
    target,
    currentTarget: target,
  } as React.ChangeEvent<HTMLInputElement>)
}

/**
 * Shared date textbox with datepicker.
 * Always shows and accepts **DD/MM/YYYY**; stores/emits **YYYY-MM-DD** for forms/API.
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput(
    {
      className,
      value,
      defaultValue,
      onChange,
      onBlur,
      min,
      max,
      disabled,
      readOnly,
      id,
      name,
      placeholder = "dd/mm/yyyy",
      ...rest
    },
    ref
  ) {
    const isControlled = value !== undefined
    const hiddenRef = React.useRef<HTMLInputElement | null>(null)
    const pickerRef = React.useRef<HTMLInputElement>(null)

    const initialIso = toIsoDateValue(value ?? defaultValue ?? "")
    const [text, setText] = React.useState(() => isoDateToDisplay(initialIso))
    const [iso, setIso] = React.useState(initialIso)

    const syncFromIso = React.useCallback((nextIso: string) => {
      setIso(nextIso)
      setText(isoDateToDisplay(nextIso))
    }, [])

    React.useEffect(() => {
      if (!isControlled) return
      syncFromIso(toIsoDateValue(value ?? ""))
    }, [isControlled, value, syncFromIso])

    const assignHiddenRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        hiddenRef.current = node
        if (node) {
          const proto = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value"
          )
          if (proto?.get && proto.set) {
            Object.defineProperty(node, "value", {
              configurable: true,
              get() {
                return proto.get!.call(this)
              },
              set(v: string) {
                proto.set!.call(this, v)
                // react-hook-form reset/setValue writes here
                syncFromIso(toIsoDateValue(String(v ?? "")))
              },
            })
          }
        }
        if (typeof ref === "function") ref(node)
        else if (ref) ref.current = node
      },
      [ref, syncFromIso]
    )

    const commitIso = (nextIso: string) => {
      syncFromIso(nextIso)
      if (hiddenRef.current) hiddenRef.current.value = nextIso
      emitValueChange(onChange, name, nextIso)
    }

    const handleTextChange = (raw: string) => {
      setText(raw)
      const parsed = displayDateToIso(raw)
      if (parsed == null) return
      setIso(parsed)
      if (hiddenRef.current) hiddenRef.current.value = parsed
      emitValueChange(onChange, name, parsed)
    }

    const handleTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const parsed = displayDateToIso(text)
      if (parsed == null) {
        setText(isoDateToDisplay(iso))
      } else {
        commitIso(parsed)
      }
      onBlur?.(e)
    }

    const openPicker = () => {
      const el = pickerRef.current
      if (!el || disabled || readOnly) return
      // Keep picker value in sync before opening
      el.value = iso || toIsoDateValue(new Date())
      try {
        el.showPicker?.()
      } catch {
        el.click()
      }
    }

    const {
      "aria-label": ariaLabel,
      ...inputRest
    } = rest

    return (
      <div className="relative">
        {/* RHF / form value carrier (YYYY-MM-DD) */}
        <input
          ref={assignHiddenRef}
          type="text"
          name={name}
          value={isControlled ? toIsoDateValue(value ?? "") : undefined}
          defaultValue={isControlled ? undefined : initialIso}
          disabled={disabled}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />

        <input
          {...inputRest}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          className={cn(dateInputClass, "pr-10", className)}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleTextBlur}
          aria-label={ariaLabel ?? `Date (${DATE_DISPLAY_FORMAT})`}
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || readOnly}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground",
            "hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          )}
          aria-label="Open calendar"
          onClick={openPicker}
        >
          <Calendar className="h-4 w-4" />
        </button>

        {/* Native picker only — never shown; value stays YYYY-MM-DD */}
        <input
          ref={pickerRef}
          type="date"
          min={min}
          max={max}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={iso || ""}
          onChange={(e) => {
            const next = e.target.value
            if (next) commitIso(next)
          }}
        />
      </div>
    )
  }
)
