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
    const lastSyncedIsoRef = React.useRef(initialIso)

    const syncFromIso = React.useCallback((nextIso: string) => {
      const normalized = toIsoDateValue(nextIso)
      if (lastSyncedIsoRef.current === normalized) return
      lastSyncedIsoRef.current = normalized
      setIso(normalized)
      setText(isoDateToDisplay(normalized))
      if (pickerRef.current && pickerRef.current.value !== normalized) {
        pickerRef.current.value = normalized
      }
    }, [])

    React.useEffect(() => {
      if (!isControlled) return
      syncFromIso(toIsoDateValue(value ?? ""))
    }, [isControlled, value, syncFromIso])

    const assignHiddenRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        hiddenRef.current = node
        if (node && !(node as HTMLInputElement & { __dateInputPatched?: boolean }).__dateInputPatched) {
          const patched = node as HTMLInputElement & { __dateInputPatched?: boolean }
          patched.__dateInputPatched = true
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

    const setHiddenValue = (nextIso: string) => {
      const el = hiddenRef.current
      if (!el) return
      const proto = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )
      if (proto?.set) proto.set.call(el, nextIso)
      else el.value = nextIso
    }

    const commitIso = (nextIso: string) => {
      syncFromIso(nextIso)
      setHiddenValue(nextIso)
      emitValueChange(onChange, name, nextIso)
    }

    const handleTextChange = (raw: string) => {
      setText(raw)
      const parsed = displayDateToIso(raw)
      if (parsed == null) return
      syncFromIso(parsed)
      setHiddenValue(parsed)
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

    const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      if (!next || next === iso) return
      // Update without re-controlling the picker input value prop (keeps native close behavior)
      lastSyncedIsoRef.current = next
      setIso(next)
      setText(isoDateToDisplay(next))
      setHiddenValue(next)
      emitValueChange(onChange, name, next)
      // Force the native picker to dismiss after selection
      e.currentTarget.blur()
    }

    const openPicker = React.useCallback(() => {
      const el = pickerRef.current
      if (!el || disabled || readOnly) return
      if (typeof el.showPicker === "function") {
        try {
          el.showPicker()
          return
        } catch {
          // Unsupported or blocked — fall back to native click.
        }
      }
      el.click()
    }, [disabled, readOnly])

    const handleFieldClick = () => {
      if (disabled || readOnly) return
      openPicker()
    }

    const { "aria-label": ariaLabel, ...inputRest } = rest

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
          className={cn(
            dateInputClass,
            "pr-10",
            !disabled && !readOnly && "cursor-pointer",
            className
          )}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleTextBlur}
          onClick={handleFieldClick}
          aria-label={ariaLabel ?? `Date (${DATE_DISPLAY_FORMAT})`}
        />

        <div className="absolute inset-y-0 right-0 w-10">
          <span
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground",
              (disabled || readOnly) && "opacity-50"
            )}
            aria-hidden
          >
            <Calendar className="h-4 w-4" />
          </span>
          {/*
            Overlay native date input on the calendar icon.
            Uncontrolled (no React value prop) so selection auto-closes the picker.
          */}
          <input
            ref={pickerRef}
            type="date"
            min={min}
            max={max}
            disabled={disabled || readOnly}
            defaultValue={iso || undefined}
            aria-label="Open calendar"
            tabIndex={-1}
            className={cn(
              "absolute inset-0 h-full w-full cursor-pointer opacity-0",
              (disabled || readOnly) && "pointer-events-none"
            )}
            onChange={handlePickerChange}
          />
        </div>
      </div>
    )
  }
)
